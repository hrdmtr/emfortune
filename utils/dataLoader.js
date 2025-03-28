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
        // 画像パスの修正関数
        const fixImagePath = (path) => {
          if (!path || path === '' || path === 'undefined') {
            return '';
          }
          
          // ""で囲まれている場合は削除
          if (path.startsWith('"') && path.endsWith('"')) {
            path = path.substring(1, path.length - 1);
          }
          
          return path;
        };
        
        // CSVから読み込んだデータを適切な形式に変換
        const question = {
          id: parseInt(data.id),
          title: data.title || '',
          category: data.category || '占い',
          text: data.text,
          options: [
            { id: 'A', text: data.optionA_text, image: fixImagePath(data.optionA_image) },
            { id: 'B', text: data.optionB_text, image: fixImagePath(data.optionB_image) },
            { id: 'C', text: data.optionC_text, image: fixImagePath(data.optionC_image) },
            { id: 'D', text: data.optionD_text, image: fixImagePath(data.optionD_image) }
          ],
          shareText: data.share_text || 'EMFortune心理占いアプリでこの質問に答えてみよう！'
        };
        questions.push(question);
      })
      .on('end', () => {
        console.log(`${questions.length}件の質問データを読み込みました`);
        resolve(questions);
      })
      .on('error', (error) => {
        console.error('質問データの読み込みエラー:', error);
        reject(error);
      });
  });
};

// 質問データの保存
const saveQuestion = async (questionData) => {
  try {
    // 既存の質問を読み込む
    const questions = await loadQuestions();
    let isNewQuestion = true;
    let maxId = 0;
    
    // 最大IDを取得し、既存の質問かどうかを確認
    questions.forEach(question => {
      maxId = Math.max(maxId, question.id);
      if (questionData.id && question.id === parseInt(questionData.id)) {
        // 既存の質問を更新
        question.title = questionData.title || '';
        question.category = questionData.category || '占い';
        question.text = questionData.text;
        question.options[0].text = questionData.optionA_text;
        question.options[0].image = questionData.optionA_image;
        question.options[1].text = questionData.optionB_text;
        question.options[1].image = questionData.optionB_image;
        question.options[2].text = questionData.optionC_text;
        question.options[2].image = questionData.optionC_image;
        question.options[3].text = questionData.optionD_text;
        question.options[3].image = questionData.optionD_image;
        isNewQuestion = false;
      }
    });
    
    // 新しい質問の場合は追加
    if (isNewQuestion) {
      const newQuestion = {
        id: questionData.id ? parseInt(questionData.id) : maxId + 1,
        title: questionData.title || '',
        category: questionData.category || '占い',
        text: questionData.text,
        options: [
          { id: 'A', text: questionData.optionA_text, image: questionData.optionA_image },
          { id: 'B', text: questionData.optionB_text, image: questionData.optionB_image },
          { id: 'C', text: questionData.optionC_text, image: questionData.optionC_image },
          { id: 'D', text: questionData.optionD_text, image: questionData.optionD_image }
        ],
        shareText: questionData.share_text || 'EMFortune心理占いアプリでこの質問に答えてみよう！'
      };
      questions.push(newQuestion);
    }
    
    // 質問データをCSVに変換
    const header = 'id,title,category,text,optionA_text,optionA_image,optionB_text,optionB_image,optionC_text,optionC_image,optionD_text,optionD_image,share_text\n';
    const rows = questions.map(q => {
      return [
        q.id,
        q.title || '',
        q.category || '占い',
        q.text,
        q.options[0].text,
        q.options[0].image,
        q.options[1].text,
        q.options[1].image,
        q.options[2].text,
        q.options[2].image,
        q.options[3].text,
        q.options[3].image,
        q.shareText || ''
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    // CSVファイルに保存
    const csvContent = header + rows;
    await fs.promises.writeFile(
      path.join(__dirname, '../data/questions/questions.csv'),
      csvContent
    );
    
    return isNewQuestion ? { success: true, isNew: true } : { success: true, isNew: false };
  } catch (error) {
    console.error('質問データ保存エラー:', error);
    return { success: false, error: error.message };
  }
};

// 質問データの削除
const deleteQuestion = async (questionId) => {
  try {
    // 既存の質問を読み込む
    const questions = await loadQuestions();
    const initialCount = questions.length;
    
    // 指定されたIDの質問を除外する
    const filteredQuestions = questions.filter(q => q.id !== parseInt(questionId));
    
    // 質問が見つからなかった場合
    if (filteredQuestions.length === initialCount) {
      return { success: false, error: '指定された質問が見つかりません' };
    }
    
    // 質問データをCSVに変換
    const header = 'id,text,optionA_text,optionA_image,optionB_text,optionB_image,optionC_text,optionC_image,optionD_text,optionD_image\n';
    const rows = filteredQuestions.map(q => {
      return [
        q.id,
        q.text,
        q.options[0].text,
        q.options[0].image,
        q.options[1].text,
        q.options[1].image,
        q.options[2].text,
        q.options[2].image,
        q.options[3].text,
        q.options[3].image
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    // CSVファイルに保存
    const csvContent = header + rows;
    await fs.promises.writeFile(
      path.join(__dirname, '../data/questions/questions.csv'),
      csvContent
    );
    
    return { success: true };
  } catch (error) {
    console.error('質問データ削除エラー:', error);
    return { success: false, error: error.message };
  }
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
          relationshipCompatibility: data.relationshipCompatibility,
          image: data.image || `/images/results/default-${data.option.toLowerCase()}.png`
        };
        
        // 画像パスが設定されている場合、ファイルの存在を確認
        if (results[data.option].image) {
          const imagePath = path.join(__dirname, '../public', results[data.option].image.startsWith('/') ? 
                                      results[data.option].image.substring(1) : 
                                      results[data.option].image);
          
          if (!fs.existsSync(imagePath)) {
            console.log(`警告: 画像ファイルが見つかりません: ${imagePath}`);
            console.log(`デフォルト画像を使用します: /images/results/default-type.png`);
            // 見つからない場合はデフォルトのフォールバック画像を使用
            results[data.option].image = `/images/results/default-type.png`;
          }
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// 診断結果データの保存
const saveResult = async (resultData) => {
  try {
    // 既存の結果を読み込む
    const results = await loadResults();
    
    // 指定されたオプションの結果を更新
    if (resultData.option && ['A', 'B', 'C', 'D'].includes(resultData.option)) {
      // 既存の結果を更新または新規作成
      results[resultData.option] = {
        personality: resultData.personality,
        description: resultData.description,
        workCompatibility: resultData.workCompatibility,
        relationshipCompatibility: resultData.relationshipCompatibility,
        image: resultData.image || `/images/results/default-${resultData.option.toLowerCase()}.png`
      };
    } else {
      return { success: false, error: '無効なオプションが指定されています' };
    }
    
    // 結果データをCSVに変換
    const header = 'option,personality,description,workCompatibility,relationshipCompatibility,image\n';
    const rows = Object.keys(results).map(option => {
      const r = results[option];
      return [
        option,
        r.personality,
        r.description,
        r.workCompatibility,
        r.relationshipCompatibility,
        r.image
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    // CSVファイルに保存
    const csvContent = header + rows;
    await fs.promises.writeFile(
      path.join(__dirname, '../data/results/results.csv'),
      csvContent
    );
    
    return { success: true };
  } catch (error) {
    console.error('診断結果データ保存エラー:', error);
    return { success: false, error: error.message };
  }
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
    const result = results[answer] || {
      personality: '不明',
      description: '回答が見つかりませんでした。',
      workCompatibility: '情報がありません。',
      relationshipCompatibility: '情報がありません。',
      image: `/images/results/default-${answer.toLowerCase()}.png`
    };
    
    // 結果オブジェクトにタイプ（選択肢ID）を追加
    result.type = answer;
    
    // 画像パスの検証と修正
    if (!result.image || result.image === '' || result.image === 'undefined') {
      // デフォルト画像を設定
      result.image = `/images/results/default-type.png`;
      console.log(`診断結果 ${answer} に画像が設定されていません。デフォルト画像を使用します。`);
    } else if (result.image.startsWith('http://')) {
      // httpから始まる場合は修正
      result.image = result.image.replace(/^http:\/\/[^\/]+/, '');
    }
    
    // パスが/で始まっていない場合は修正
    if (result.image && !result.image.startsWith('/')) {
      result.image = '/' + result.image;
    }
    
    // 画像ファイルの存在を確認
    const imagePath = path.join(__dirname, '../public', result.image.startsWith('/') ? 
                               result.image.substring(1) : 
                               result.image);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`警告: 画像ファイルが見つかりません: ${imagePath}`);
      console.log(`代替のデフォルト画像を使用します: /images/results/default-type.png`);
      result.image = `/images/results/default-type.png`;
    }
    
    console.log(`診断結果 ${answer} の画像パス: ${result.image}`);
    
    return result;
  } catch (error) {
    console.error('結果データの読み込みエラー:', error);
    return {
      personality: 'エラー',
      description: '結果データを読み込めませんでした。',
      workCompatibility: '情報がありません。',
      relationshipCompatibility: '情報がありません。',
      type: answer,
      image: `/images/results/default-type.png`
    };
  }
};

module.exports = {
  loadQuestions,
  loadResults,
  getRandomQuestion,
  getResult,
  saveQuestion,
  saveResult,
  deleteQuestion
};