document.addEventListener('DOMContentLoaded', function() {
  // モーダル関連の要素
  const questionModal = document.getElementById('question-modal');
  const resultModal = document.getElementById('result-modal');
  const closeButtons = document.querySelectorAll('.close, .modal-cancel');
  
  // 画像パスのプレビュー機能
  const imageInputs = document.querySelectorAll('input[id$="-image"]');
  imageInputs.forEach(input => {
    const previewId = 'preview-' + input.id.replace('-image', '');
    const previewDiv = document.getElementById(previewId);
    
    if (previewDiv) {
      // 初期値があればプレビューに表示
      if (input.value) {
        previewDiv.style.backgroundImage = `url(${input.value})`;
      }
      
      // 入力が変更されたらプレビューを更新
      input.addEventListener('input', function() {
        previewDiv.style.backgroundImage = input.value ? `url(${input.value})` : 'none';
      });
    }
  });
  
  // 質問追加ボタン
  const addQuestionBtn = document.getElementById('add-question-btn');
  
  // 編集ボタン
  const editQuestionBtns = document.querySelectorAll('.edit-btn[data-id]');
  const editResultBtns = document.querySelectorAll('.edit-btn[data-option]');
  
  // 削除ボタン
  const deleteQuestionBtns = document.querySelectorAll('.delete-btn');
  
  // モーダルを閉じる機能
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      questionModal.style.display = 'none';
      resultModal.style.display = 'none';
    });
  });
  
  // 背景クリックでモーダルを閉じる
  window.addEventListener('click', function(event) {
    if (event.target === questionModal) {
      questionModal.style.display = 'none';
    }
    if (event.target === resultModal) {
      resultModal.style.display = 'none';
    }
  });
  
  // 質問追加ボタンのイベントリスナー
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', function() {
      document.getElementById('modal-title').textContent = '質問を追加';
      document.getElementById('question-form').reset();
      questionModal.style.display = 'block';
    });
  }
  
  // 質問編集ボタンのイベントリスナー
  editQuestionBtns.forEach(button => {
    button.addEventListener('click', function() {
      const questionId = this.getAttribute('data-id');
      
      // 本来はここでサーバーから質問データを取得する
      // ここでは簡易的に実装
      document.getElementById('modal-title').textContent = '質問を編集';
      
      // フォームに質問データをセット（実際の実装では非同期通信で取得）
      // ここではモックデータを使用
      document.getElementById('question-text').value = '質問内容がここに表示されます';
      document.getElementById('optionA-text').value = 'オプションAのテキスト';
      document.getElementById('optionA-image').value = '/images/option-a.png';
      // 他のオプションも同様に設定
      
      questionModal.style.display = 'block';
    });
  });
  
  // 結果編集ボタンのイベントリスナー
  editResultBtns.forEach(button => {
    button.addEventListener('click', function() {
      const option = this.getAttribute('data-option');
      
      // 本来はここでサーバーから結果データを取得する
      // ここでは簡易的に実装
      document.getElementById('result-option').value = option;
      
      // フォームに結果データをセット（実際の実装では非同期通信で取得）
      // ここではモックデータを使用
      document.getElementById('personality').value = 'タイプ名';
      document.getElementById('description').value = '説明文がここに表示されます。';
      document.getElementById('workCompatibility').value = '仕事との相性の説明';
      document.getElementById('relationshipCompatibility').value = '人間関係の相性の説明';
      
      resultModal.style.display = 'block';
    });
  });
  
  // 質問削除ボタンのイベントリスナー
  deleteQuestionBtns.forEach(button => {
    button.addEventListener('click', function() {
      const questionId = this.getAttribute('data-id');
      if (confirm('この質問を削除してもよろしいですか？')) {
        // 本来はここでサーバーへ削除リクエストを送信
        console.log('質問ID ' + questionId + ' を削除します');
        // 成功したら行を削除
        this.closest('tr').remove();
      }
    });
  });
  
  // 質問フォーム送信
  const questionForm = document.getElementById('question-form');
  if (questionForm) {
    questionForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // フォームデータの取得
      const formData = new FormData(this);
      const questionData = {};
      
      for (const [key, value] of formData.entries()) {
        questionData[key] = value;
      }
      
      // 本来はここでサーバーへ送信
      console.log('質問データを送信:', questionData);
      
      // モーダルを閉じる
      questionModal.style.display = 'none';
      
      // 成功したら通知
      alert('質問が保存されました');
    });
  }
  
  // 結果フォーム送信
  const resultForm = document.getElementById('result-form');
  if (resultForm) {
    resultForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // フォームデータの取得
      const formData = new FormData(this);
      const resultData = {};
      
      for (const [key, value] of formData.entries()) {
        resultData[key] = value;
      }
      
      // 本来はここでサーバーへ送信
      console.log('結果データを送信:', resultData);
      
      // モーダルを閉じる
      resultModal.style.display = 'none';
      
      // 成功したら通知
      alert('診断結果が保存されました');
    });
  }
});