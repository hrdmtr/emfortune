const express = require('express');
const session = require('express-session');
const path = require('path');
const { getRandomQuestion, getResult } = require('./utils/dataLoader');
const { 
  incrementQuestionView, 
  incrementResultView, 
  incrementReferrer,
  getStats 
} = require('./utils/statsManager');

const app = express();
const PORT = process.env.PORT || 4000;

// テンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ミドルウェアの設定
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'emfortune-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 60 * 60 * 1000, // 1時間
    secure: process.env.NODE_ENV === 'production'
  }
}));

// リファラー情報を収集するミドルウェア
app.use((req, res, next) => {
  const referrer = req.get('Referrer');
  if (req.path === '/' || req.path === '/question') {
    incrementReferrer(referrer);
  }
  next();
});

// ホームページのルート
app.get('/', (req, res) => {
  res.render('index', { title: '心理占いアプリ' });
});

// 質問ページのルート
app.get('/question', async (req, res) => {
  try {
    // セッションから前回の質問IDを取得
    const previousQuestionId = req.session.lastQuestionId || null;
    
    // 前回と異なる質問を取得
    const questionData = await getRandomQuestion(previousQuestionId);
    
    // 今回の質問IDをセッションに保存
    req.session.lastQuestionId = questionData.id;
    
    // 質問表示の統計を記録
    incrementQuestionView(questionData.id);
    
    res.render('question', { title: '質問', questionData });
  } catch (error) {
    console.error('質問の取得中にエラーが発生しました:', error);
    res.status(500).send('質問の読み込み中にエラーが発生しました');
  }
});

// 結果を処理するルート
app.post('/result', async (req, res) => {
  try {
    const answer = req.body.answer;
    const result = await getResult(answer);
    
    // 結果表示の統計を記録
    incrementResultView(answer);
    
    res.render('result', { title: '診断結果', result });
  } catch (error) {
    console.error('結果の処理中にエラーが発生しました:', error);
    res.status(500).send('結果の処理中にエラーが発生しました');
  }
});

// 管理画面ルート
app.get('/admin', async (req, res) => {
  try {
    const { loadQuestions, loadResults } = require('./utils/dataLoader');
    const questions = await loadQuestions();
    const results = await loadResults();
    
    // 統計情報を取得
    const stats = getStats();
    
    res.render('admin', {
      title: '管理画面',
      questions,
      results,
      stats
    });
  } catch (error) {
    console.error('管理画面の読み込みエラー:', error);
    res.status(500).send('管理画面の読み込み中にエラーが発生しました');
  }
});

// ダッシュボード専用ルート
app.get('/admin/dashboard', (req, res) => {
  try {
    const stats = getStats();
    res.render('dashboard', {
      title: 'アクセス統計ダッシュボード',
      stats
    });
  } catch (error) {
    console.error('ダッシュボードの読み込みエラー:', error);
    res.status(500).send('ダッシュボードの読み込み中にエラーが発生しました');
  }
});

// 質問データ取得API
app.get('/admin/question/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const questions = await loadQuestions();
    const question = questions.find(q => q.id === questionId);
    
    if (!question) {
      return res.status(404).json({ error: '質問が見つかりません' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('質問データの取得エラー:', error);
    res.status(500).json({ error: '質問データの取得中にエラーが発生しました' });
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});