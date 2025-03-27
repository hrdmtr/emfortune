const passport = require('passport');
// API v2対応のストラテジーを使用
const TwitterStrategy = require('passport-twitter-oauth2').Strategy;
require('dotenv').config();

// 認証設定
const setupAuth = (app) => {
  // Passportの初期化
  app.use(passport.initialize());
  app.use(passport.session());

  // ユーザー情報のシリアライズ
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // ユーザー情報のデシリアライズ
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // Twitter認証の設定
  // 環境に応じたコールバックURLを設定
  const callbackURL = process.env.NODE_ENV === 'production' 
    ? 'https://emfortune.onrender.com/auth/twitter/callback'
    : 'http://localhost:4000/auth/twitter/callback';
    
  passport.use(new TwitterStrategy({
    clientID: process.env.TWITTER_CLIENT_ID || process.env.TWITTER_CONSUMER_KEY,
    clientSecret: process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: callbackURL,
    scope: ['tweet.read', 'users.read', 'offline.access']
  },
  (token, tokenSecret, profile, done) => {
    // TwitterのプロファイルをそのままPassportに渡す
    return done(null, profile);
  }));

  // 認証ルート: Twitter認証を開始
  app.get('/auth/twitter', passport.authenticate('twitter'));

  // コールバックルート
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/unauthorized' }),
    (req, res) => {
      // 認証後、管理画面にリダイレクト
      res.redirect('/admin');
    }
  );

  // ログアウトルート
  app.get('/auth/logout', (req, res) => {
    req.logout(err => {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  // 権限なしページ
  app.get('/unauthorized', (req, res) => {
    res.render('unauthorized', { title: 'アクセス権限不足' });
  });
};

/**
 * 管理画面のアクセス制限が有効かどうかを確認する関数
 * 
 * 環境変数 ENABLE_ADMIN_AUTH の値に基づいて判定:
 * - 'true' または未設定の場合: アクセス制限有効（Twitter認証が必要）
 * - 'false' の場合: アクセス制限無効（誰でもアクセス可能）
 * 
 * @returns {boolean} アクセス制限が有効かどうか
 */
const isAuthEnabled = () => {
  const authSetting = process.env.ENABLE_ADMIN_AUTH;
  // 明示的に 'false' と設定されている場合のみ無効、それ以外は有効
  const enabled = authSetting !== 'false';
  console.log(`管理画面アクセス制限: ${enabled ? '有効' : '無効'}`);
  return enabled;
};

/**
 * 管理画面へのアクセスを制御する認証ミドルウェア
 * 
 * アクセス制限の動作:
 * 1. アクセス制限が無効の場合: すべてのリクエストを許可（誰でもアクセス可能）
 * 2. アクセス制限が有効の場合:
 *    - ログイン済みで管理者IDの場合: アクセス許可
 *    - ログイン済みだが管理者IDでない場合: 権限不足画面へリダイレクト
 *    - 未ログインの場合: Twitter認証へリダイレクト
 * 
 * @param {object} req - リクエストオブジェクト
 * @param {object} res - レスポンスオブジェクト
 * @param {function} next - 次のミドルウェアを呼び出す関数
 */
const ensureAuthenticated = (req, res, next) => {
  // アクセス制限が無効になっている場合は、誰でもアクセス可能
  if (!isAuthEnabled()) {
    console.log('アクセス制限無効: 管理画面へのアクセスを許可します');
    return next();
  }
  
  // 認証が有効な場合は、通常の認証フローを実行
  if (req.isAuthenticated()) {
    // Twitterユーザー名が管理者のIDと一致するか確認
    const twitterId = req.user.username || '';
    const adminId = process.env.ADMIN_TWITTER_ID;
    
    console.log(`ログイン確認: ${twitterId} (管理者ID: ${adminId})`);
    
    if (twitterId === adminId) {
      console.log('アクセス許可: 管理者としてログインしています');
      return next();
    }
    
    // 権限がない場合
    console.log('アクセス拒否: ログインしていますが管理者ではありません');
    return res.redirect('/unauthorized');
  }
  
  // 認証されていない場合
  console.log('認証リダイレクト: Twitter認証画面へ移動します');
  res.redirect('/auth/twitter');
};

module.exports = { setupAuth, ensureAuthenticated };