const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const passport = require('passport');
require('dotenv').config();
const { setupAuth, ensureAuthenticated } = require('./utils/auth');
const { getRandomQuestion, getResult } = require('./utils/dataLoader');
const { 
  incrementQuestionView, 
  incrementResultView, 
  incrementReferrer,
  incrementLike,
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
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // サイズ制限を10MBに増加
app.use(express.json({ limit: '10mb' })); // JSONリクエストのサイズ制限を10MBに増加
app.use(session({
  secret: process.env.SESSION_SECRET || 'emfortune-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 60 * 60 * 1000, // 1時間
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  proxy: process.env.NODE_ENV === 'production' // プロキシ環境（Render等）で必要
}));

// 認証設定
setupAuth(app);

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
  const enableAdminAuth = process.env.ENABLE_ADMIN_AUTH !== 'false';
  
  // SEO対策のために完全なURL情報を生成
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  res.render('index', { 
    title: '心理占いアプリ',
    enableAdminAuth: enableAdminAuth,
    baseUrl: baseUrl
  });
});

// 質問ページのルート
app.get('/question', async (req, res) => {
  try {
    // URLからquestion_idパラメータを取得
    const requestedQuestionId = req.query.id ? parseInt(req.query.id) : null;
    let questionData;
    
    if (requestedQuestionId) {
      // 特定の質問IDが指定されている場合
      const { loadQuestions } = require('./utils/dataLoader');
      const questions = await loadQuestions();
      questionData = questions.find(q => q.id === requestedQuestionId);
      
      // 指定された質問が見つからない場合はランダムな質問を提供
      if (!questionData) {
        console.log(`指定された質問ID ${requestedQuestionId} が見つかりません。ランダムな質問を提供します。`);
        questionData = await getRandomQuestion();
      }
    } else {
      // セッションから前回の質問IDを取得
      const previousQuestionId = req.session.lastQuestionId || null;
      
      // 前回と異なる質問を取得
      questionData = await getRandomQuestion(previousQuestionId);
    }
    
    // 画像パスを確認して修正
    questionData.options.forEach(option => {
      // 画像パスのチェックと修正
      if (!option.image || option.image === '' || option.image === 'undefined') {
        // デフォルト画像を設定
        option.image = `/images/option-${option.id.toLowerCase()}.png`;
      } else if (option.image.startsWith('http://')) {
        // httpから始まる場合は修正
        option.image = option.image.replace(/^http:\/\/[^\/]+/, '');
      }
      
      // パスが/で始まっていない場合は修正
      if (option.image && !option.image.startsWith('/')) {
        option.image = '/' + option.image;
      }
      
      console.log(`質問 ${questionData.id} の選択肢 ${option.id} の画像パス: ${option.image}`);
    });
    
    // 今回の質問IDをセッションに保存
    req.session.lastQuestionId = questionData.id;
    
    // 質問表示の統計を記録
    incrementQuestionView(questionData.id);
    
    // アプリのベースURLを取得
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const shareUrl = `${baseUrl}/question?id=${questionData.id}`;
    
    res.render('question', { 
      title: '質問', 
      questionData,
      shareUrl
    });
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
    
    // アプリのベースURLを取得（共有用）
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.render('result', { 
      title: `${result.personality} | EMFortune診断結果`, 
      result,
      baseUrl
    });
  } catch (error) {
    console.error('結果の処理中にエラーが発生しました:', error);
    res.status(500).send('結果の処理中にエラーが発生しました');
  }
});

// 管理画面ルート（認証必須）
app.get('/admin', ensureAuthenticated, async (req, res) => {
  try {
    const { loadQuestions, loadResults } = require('./utils/dataLoader');
    const questions = await loadQuestions();
    const results = await loadResults();
    
    // 統計情報を取得
    const stats = getStats();
    
    // 認証設定
    const enableAdminAuth = process.env.ENABLE_ADMIN_AUTH !== 'false';
    
    res.render('admin', {
      title: '管理画面',
      questions,
      results,
      stats,
      user: req.user, // Twitter認証情報をテンプレートに渡す
      enableAdminAuth: enableAdminAuth
    });
  } catch (error) {
    console.error('管理画面の読み込みエラー:', error);
    res.status(500).send('管理画面の読み込み中にエラーが発生しました');
  }
});

// ダッシュボード専用ルート（認証必須）
app.get('/admin/dashboard', ensureAuthenticated, (req, res) => {
  try {
    const stats = getStats();
    
    // 認証設定
    const enableAdminAuth = process.env.ENABLE_ADMIN_AUTH !== 'false';
    
    res.render('dashboard', {
      title: 'アクセス統計ダッシュボード',
      stats,
      user: req.user, // Twitter認証情報をテンプレートに渡す
      enableAdminAuth: enableAdminAuth
    });
  } catch (error) {
    console.error('ダッシュボードの読み込みエラー:', error);
    res.status(500).send('ダッシュボードの読み込み中にエラーが発生しました');
  }
});

// 質問データ取得API（認証必須）
app.get('/admin/question/:id', ensureAuthenticated, async (req, res) => {
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

// 診断結果データ取得API（認証必須）
app.get('/admin/result/:option', ensureAuthenticated, async (req, res) => {
  try {
    const { loadResults } = require('./utils/dataLoader');
    const option = req.params.option.toUpperCase();
    
    // 有効なオプションかチェック
    if (!['A', 'B', 'C', 'D'].includes(option)) {
      return res.status(400).json({ error: '無効なオプションです' });
    }
    
    const results = await loadResults();
    const result = results[option];
    
    if (!result) {
      return res.status(404).json({ error: '指定された診断結果が見つかりません' });
    }
    
    // オプション情報を追加
    result.option = option;
    
    res.json(result);
  } catch (error) {
    console.error('診断結果データの取得エラー:', error);
    res.status(500).json({ error: '診断結果データの取得中にエラーが発生しました' });
  }
});

// 画像アップロードAPI（認証必須）
app.post('/admin/upload', ensureAuthenticated, upload.single('image'), (req, res) => {
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

// 画像トリミングAPI（認証必須）
app.post('/admin/crop', ensureAuthenticated, (req, res) => {
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
    
    // Base64データからMIME型を抽出して適切な拡張子を決定
    const mimeTypeMatch = cropData.match(/^data:image\/(\w+);base64,/);
    let fileExtension = '.png'; // デフォルト拡張子
    
    if (mimeTypeMatch && mimeTypeMatch[1]) {
      const mimeType = mimeTypeMatch[1].toLowerCase();
      // MIMEタイプに基づいて適切な拡張子を設定
      switch (mimeType) {
        case 'jpeg':
        case 'jpg':
          fileExtension = '.jpg';
          break;
        case 'png':
          fileExtension = '.png';
          break;
        case 'gif':
          fileExtension = '.gif';
          break;
        case 'webp':
          fileExtension = '.webp';
          break;
        case 'svg+xml':
          fileExtension = '.svg';
          break;
        default:
          fileExtension = '.png'; // デフォルト拡張子
      }
      console.log(`検出されたMIMEタイプ: ${mimeType}, 使用する拡張子: ${fileExtension}`);
    } else {
      console.log('MIMEタイプが検出できませんでした。デフォルト拡張子(.png)を使用します。');
    }
    
    // 拡張子を変更（元の拡張子を新しい拡張子に置換）
    const baseFileName = newFullPath.replace(/\.[^/.]+$/, ""); // 拡張子を除いたベース名
    const newFilePathWithCorrectExt = baseFileName + fileExtension;
    
    // Base64データをバッファに変換
    const base64Data = cropData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 新しいファイルへ書き込み
    fs.writeFileSync(newFilePathWithCorrectExt, buffer);
    console.log('画像を保存しました:', newFilePathWithCorrectExt);
    
    // 相対パスの拡張子も更新
    newRelativePath = newRelativePath.replace(/\.[^/.]+$/, "") + fileExtension;
    
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

// 質問保存API（認証必須）
app.post('/admin/question', ensureAuthenticated, async (req, res) => {
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

// 診断結果保存API（認証必須）
app.post('/admin/result', ensureAuthenticated, async (req, res) => {
  try {
    const { saveResult } = require('./utils/dataLoader');
    const resultData = req.body;
    
    console.log('診断結果の保存リクエスト:', resultData);
    
    // 診断結果データの保存
    const result = await saveResult(resultData);
    
    if (result.success) {
      res.json({
        success: true,
        message: '診断結果が更新されました'
      });
    } else {
      res.status(500).json({ 
        error: '診断結果の保存中にエラーが発生しました',
        message: result.error
      });
    }
  } catch (error) {
    console.error('診断結果保存エラー:', error);
    res.status(500).json({ 
      error: '診断結果の保存中にエラーが発生しました', 
      message: error.message 
    });
  }
});

// 質問削除API（認証必須）
app.delete('/admin/question/:id', ensureAuthenticated, express.json(), async (req, res) => {
  try {
    const { deleteQuestion } = require('./utils/dataLoader');
    const questionId = req.params.id;
    const deleteKey = req.body.deleteKey;
    
    // 削除キーの検証（0618に設定）
    const VALID_DELETE_KEY = '0618';
    
    if (!deleteKey) {
      return res.status(400).json({
        success: false,
        error: '削除キーが提供されていません',
        message: '削除を実行するには削除キーが必要です'
      });
    }
    
    if (deleteKey !== VALID_DELETE_KEY) {
      return res.status(403).json({
        success: false,
        error: '削除キーが正しくありません',
        message: '正しい削除キーを入力してください'
      });
    }
    
    // 正しい削除キーが確認できたら、質問データの削除を実行
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
  console.error('エラーハンドリングミドルウェア:', err);
  
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
  
  // request entityエラーの処理
  if (err.type === 'entity.too.large' || err.message?.includes('request entity too large')) {
    console.error('リクエストが大きすぎます:', err);
    return res.status(413).json({
      error: 'リクエストが大きすぎます',
      message: '画像サイズが大きすぎます。より小さな画像を選択するか、小さな範囲でトリミングしてください。'
    });
  }
  
  next(err);
});

// サムアップAPI
app.post('/api/like', async (req, res) => {
  try {
    const { resultType } = req.body;
    
    // resultTypeが有効かチェック
    if (!resultType || !['A', 'B', 'C', 'D'].includes(resultType)) {
      return res.status(400).json({ 
        success: false, 
        error: '無効な結果タイプです'
      });
    }
    
    // いいねを増やす
    const success = incrementLike(resultType);
    
    if (success) {
      // 現在の統計情報を取得
      const stats = getStats();
      res.json({
        success: true,
        likes: stats.likes.total,
        message: 'サムアップしました！'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '統計情報の更新に失敗しました'
      });
    }
  } catch (error) {
    console.error('サムアップエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サムアップ処理中にエラーが発生しました'
    });
  }
});

// サムアップ数の取得API
app.get('/api/likes', (req, res) => {
  try {
    const stats = getStats();
    if (!stats.likes) {
      stats.likes = { total: 0, byType: { A: 0, B: 0, C: 0, D: 0 } };
    }
    
    res.json({
      success: true,
      likes: stats.likes.total
    });
  } catch (error) {
    console.error('いいね数取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'いいね数の取得中にエラーが発生しました'
    });
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});