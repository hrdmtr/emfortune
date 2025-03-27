const fs = require('fs');
const path = require('path');

const STATS_FILE_PATH = path.join(__dirname, '../data/stats/stats.json');

// 統計情報を読み込む
const loadStats = () => {
  try {
    if (!fs.existsSync(STATS_FILE_PATH)) {
      // ファイルが存在しない場合は初期データを作成
      const initialStats = {
        questions: {
          total: 0,
          byId: {}
        },
        results: {
          total: 0,
          byType: {
            A: 0,
            B: 0,
            C: 0, 
            D: 0
          }
        },
        sources: {
          direct: 0,
          twitter: 0,
          other: 0
        },
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(STATS_FILE_PATH, JSON.stringify(initialStats, null, 2));
      return initialStats;
    }
    
    const data = fs.readFileSync(STATS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('統計情報の読み込みエラー:', error);
    return null;
  }
};

// 統計情報を保存する
const saveStats = (stats) => {
  try {
    stats.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATS_FILE_PATH, JSON.stringify(stats, null, 2));
    return true;
  } catch (error) {
    console.error('統計情報の保存エラー:', error);
    return false;
  }
};

// 質問表示のカウントを増やす
const incrementQuestionView = (questionId) => {
  const stats = loadStats();
  if (!stats) return false;
  
  // 合計カウントを増やす
  stats.questions.total += 1;
  
  // 質問IDごとのカウントを増やす
  if (!stats.questions.byId[questionId]) {
    stats.questions.byId[questionId] = 0;
  }
  stats.questions.byId[questionId] += 1;
  
  return saveStats(stats);
};

// 結果表示のカウントを増やす
const incrementResultView = (resultType) => {
  const stats = loadStats();
  if (!stats) return false;
  
  // 合計カウントを増やす
  stats.results.total += 1;
  
  // 結果タイプごとのカウントを増やす
  if (stats.results.byType[resultType] !== undefined) {
    stats.results.byType[resultType] += 1;
  }
  
  return saveStats(stats);
};

// リファラー（流入元）のカウントを増やす
const incrementReferrer = (referrer) => {
  const stats = loadStats();
  if (!stats) return false;
  
  // リファラーに応じてカウントを増やす
  if (referrer && referrer.includes('twitter.com')) {
    stats.sources.twitter += 1;
  } else if (!referrer) {
    stats.sources.direct += 1;
  } else {
    stats.sources.other += 1;
  }
  
  return saveStats(stats);
};

// 統計情報を取得する
const getStats = () => {
  return loadStats();
};

module.exports = {
  incrementQuestionView,
  incrementResultView,
  incrementReferrer,
  getStats
};