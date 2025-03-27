const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

// 質問データの読み込み
const loadQuestions = () => {
  return new Promise((resolve, reject) => {
    const questions = [];
    fs.createReadStream(path.join(__dirname, '../data/questions/questions.csv'))
      .pipe(csvParser())
      .on('data', (data) => {
        // CSVから読み込んだデータを適切な形式に変換
        const question = {
          id: parseInt(data.id),
          text: data.text,
          options: [
            { id: 'A', text: data.optionA_text, image: data.optionA_image },
            { id: 'B', text: data.optionB_text, image: data.optionB_image },
            { id: 'C', text: data.optionC_text, image: data.optionC_image },
            { id: 'D', text: data.optionD_text, image: data.optionD_image }
          ]
        };
        questions.push(question);
      })
      .on('end', () => {
        resolve(questions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// 診断結果データの読み込み
const loadResults = () => {
  return new Promise((resolve, reject) => {
    const results = {};
    fs.createReadStream(path.join(__dirname, '../data/results/results.csv'))
      .pipe(csvParser())
      .on('data', (data) => {
        // CSVから読み込んだデータをオブジェクトに変換
        results[data.option] = {
          personality: data.personality,
          description: data.description,
          workCompatibility: data.workCompatibility,
          relationshipCompatibility: data.relationshipCompatibility
        };
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// ランダムな質問を取得（前回と異なる質問を返す）
const getRandomQuestion = async (previousId = null) => {
  try {
    const questions = await loadQuestions();
    
    // 質問が1つしかない場合はその質問を返す
    if (questions.length === 1) {
      return questions[0];
    }
    
    // 前回と異なる質問を選ぶ
    let availableQuestions = questions;
    if (previousId !== null) {
      availableQuestions = questions.filter(q => q.id !== previousId);
    }
    
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  } catch (error) {
    console.error('質問データの読み込みエラー:', error);
    // エラー時のフォールバック質問
    return {
      id: 0,
      text: '質問を読み込めませんでした。',
      options: [
        { id: 'A', text: 'オプションA', image: '/images/option-a.png' },
        { id: 'B', text: 'オプションB', image: '/images/option-b.png' },
        { id: 'C', text: 'オプションC', image: '/images/option-c.png' },
        { id: 'D', text: 'オプションD', image: '/images/option-d.png' }
      ]
    };
  }
};

// 回答に基づく結果を取得
const getResult = async (answer) => {
  try {
    const results = await loadResults();
    return results[answer] || {
      personality: '不明',
      description: '回答が見つかりませんでした。',
      workCompatibility: '情報がありません。',
      relationshipCompatibility: '情報がありません。'
    };
  } catch (error) {
    console.error('結果データの読み込みエラー:', error);
    return {
      personality: 'エラー',
      description: '結果データを読み込めませんでした。',
      workCompatibility: '情報がありません。',
      relationshipCompatibility: '情報がありません。'
    };
  }
};

module.exports = {
  loadQuestions,
  loadResults,
  getRandomQuestion,
  getResult
};