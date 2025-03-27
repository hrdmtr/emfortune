const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getRandomQuestion, getResult } = require('./utils/dataLoader');
const { 
  incrementQuestionView, 
  incrementResultView, 
  incrementReferrer,
  getStats 
} = require('./utils/statsManager');

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/questions/');
  },
  filename: function(req, file, cb) {
    // オリジナルのファイル名を保持しつつ、タイムスタンプを追加して一意にする
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'img-' + uniqueSuffix + extension);
  }
});

// ファイルフィルター（画像ファイルのみ許可）
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('画像ファイルのみアップロードできます'), false);
  }
};

// サイズ制限（1MB）
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 },  // 1MB
  fileFilter: fileFilter
});

const app = express();
const PORT = process.env.PORT || 4000;

// テンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ミドルウェアの設定
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
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
    const { loadQuestions } = require('./utils/dataLoader');
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

// 画像アップロードAPI
app.post('/admin/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }
    
    // アップロードされたファイルのパスを返す
    const filePath = '/uploads/questions/' + req.file.filename;
    res.json({ 
      success: true, 
      filePath: filePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('画像アップロードエラー:', error);
    res.status(500).json({ 
      error: '画像のアップロード中にエラーが発生しました',
      message: error.message 
    });
  }
});

// 画像トリミングAPI
app.post('/admin/crop', (req, res) => {
  try {
    console.log('トリミングリクエスト受信');
    const { imagePath, cropData } = req.body;
    
    if (!imagePath) {
      console.error('画像パスが指定されていません');
      return res.status(400).json({ error: '画像パスが指定されていません' });
    }
    
    console.log('処理対象の画像パス:', imagePath);
    
    // 元の画像のパスを取得（publicフォルダからの相対パス）
    const originalPath = path.join(__dirname, 'public', imagePath);
    console.log('元画像の絶対パス:', originalPath);
    
    // 新しいファイル名を生成（元のファイル名にcropped-をプレフィックスとして追加）
    const originalFilename = path.basename(imagePath);
    const originalDir = path.dirname(imagePath);
    const newFilename = 'cropped-' + Date.now() + '-' + originalFilename;
    
    // 相対パスを確実に正しい形式に
    let newRelativePath;
    if (originalDir.startsWith('/')) {
      // 既に/で始まっている場合は、先頭の/を削除して結合
      newRelativePath = path.join(originalDir.substring(1), newFilename).replace(/\\/g, '/');
    } else {
      newRelativePath = path.join(originalDir, newFilename).replace(/\\/g, '/');
    }
    
    // public内のフルパスを作成
    const newFullPath = path.join(__dirname, 'public', newRelativePath);
    
    console.log('新しい画像パス:', newRelativePath);
    console.log('新しい画像の絶対パス:', newFullPath);
    
    // ディレクトリが存在するか確認し、なければ作成
    const targetDir = path.dirname(newFullPath);
    if (!fs.existsSync(targetDir)) {
      console.log('ディレクトリを作成:', targetDir);
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Base64データをバッファに変換
    const base64Data = cropData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 新しいファイルへ書き込み
    fs.writeFileSync(newFullPath, buffer);
    console.log('画像を保存しました:', newFullPath);
    
    // 絶対パスではなく、webルートからの相対パスを返す
    const webPath = '/' + newRelativePath.replace(/\\/g, '/');
    console.log('Webアクセス用パス:', webPath);
    
    res.json({
      success: true,
      oldPath: imagePath,
      newPath: webPath
    });
  } catch (error) {
    console.error('画像トリミングエラー:', error);
    res.status(500).json({
      error: '画像のトリミング中にエラーが発生しました',
      message: error.message
    });
  }
});

// 質問保存API
app.post('/admin/question', async (req, res) => {
  try {
    const { saveQuestion } = require('./utils/dataLoader');
    const questionData = req.body;
    
    // 質問データの保存
    const result = await saveQuestion(questionData);
    
    if (result.success) {
      res.json({
        success: true,
        isNew: result.isNew,
        message: result.isNew ? '新しい質問が追加されました' : '質問が更新されました'
      });
    } else {
      res.status(500).json({ 
        error: '質問の保存中にエラーが発生しました',
        message: result.error
      });
    }
  } catch (error) {
    console.error('質問保存エラー:', error);
    res.status(500).json({ 
      error: '質問の保存中にエラーが発生しました', 
      message: error.message 
    });
  }
});

// 質問削除API
app.delete('/admin/question/:id', async (req, res) => {
  try {
    const { deleteQuestion } = require('./utils/dataLoader');
    const questionId = req.params.id;
    
    // 質問データの削除
    const result = await deleteQuestion(questionId);
    
    if (result.success) {
      res.json({
        success: true,
        message: '質問が削除されました'
      });
    } else {
      res.status(500).json({ 
        error: '質問の削除中にエラーが発生しました',
        message: result.error
      });
    }
  } catch (error) {
    console.error('質問削除エラー:', error);
    res.status(500).json({ 
      error: '質問の削除中にエラーが発生しました', 
      message: error.message 
    });
  }
});

// アップロード時のエラーハンドリング
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multerのエラー処理
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'ファイルサイズが大きすぎます', 
        message: 'アップロードできるのは1MB以下の画像ファイルのみです'
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});