const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// テンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ミドルウェアの設定
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'emfortune-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 1時間
}));

// ホームページのルート
app.get('/', (req, res) => {
  res.render('index', { title: '心理占いアプリ' });
});

// 質問ページのルート
app.get('/question', (req, res) => {
  res.render('question', { title: '質問', questionData: getRandomQuestion() });
});

// 結果を処理するルート
app.post('/result', (req, res) => {
  const answer = req.body.answer;
  const result = getResult(answer);
  res.render('result', { title: '診断結果', result });
});

// サンプルの質問を取得する関数
function getRandomQuestion() {
  const questions = [
    {
      id: 1,
      text: '休日の過ごし方として、最も魅力的なのはどれですか？',
      options: [
        { id: 'A', text: '友達と賑やかに過ごす', image: '/images/option-a.png' },
        { id: 'B', text: '自然の中でリラックス', image: '/images/option-b.png' },
        { id: 'C', text: '新しい場所を探検する', image: '/images/option-c.png' },
        { id: 'D', text: '家でゆっくり過ごす', image: '/images/option-d.png' }
      ]
    }
  ];

  return questions[0]; // 現在は固定の質問を返す
}

// 回答に基づく結果を取得する関数
function getResult(answer) {
  const results = {
    'A': {
      personality: '社交的なタイプ',
      description: 'あなたは人と一緒にいることで元気をもらうタイプです。コミュニケーション能力が高く、チームワークを大切にします。',
      workCompatibility: '営業、イベント企画、教育関連の仕事が向いています。',
      relationshipCompatibility: '内向的な人とペアを組むと、お互いの良さを引き出せることがあります。'
    },
    'B': {
      personality: '穏やかなタイプ',
      description: '自然や平和な環境を好み、安定したペースで物事を進めるタイプです。忍耐強く、信頼性があります。',
      workCompatibility: '農業、環境関連、カウンセリングなどの仕事が向いています。',
      relationshipCompatibility: '活動的な人と組むと、バランスの取れた関係を築けます。'
    },
    'C': {
      personality: '冒険好きなタイプ',
      description: '新しいことに挑戦することでワクワクするタイプです。適応力が高く、変化を恐れません。',
      workCompatibility: '旅行関連、フリーランス、起業家などの仕事が向いています。',
      relationshipCompatibility: '安定志向の人と組むと、お互いを補完し合える関係になります。'
    },
    'D': {
      personality: '思慮深いタイプ',
      description: '一人の時間を大切にし、物事を深く考察するタイプです。創造性と分析力に優れています。',
      workCompatibility: '研究職、ライター、プログラマーなどの仕事が向いています。',
      relationshipCompatibility: '社交的な人と組むと、視野が広がり成長できる関係になります。'
    }
  };

  return results[answer] || {
    personality: '不明',
    description: '回答が見つかりませんでした。',
    workCompatibility: '情報がありません。',
    relationshipCompatibility: '情報がありません。'
  };
}

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});