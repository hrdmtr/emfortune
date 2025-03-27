document.addEventListener('DOMContentLoaded', function() {
  // モーダル関連の要素
  const questionModal = document.getElementById('question-modal');
  const resultModal = document.getElementById('result-modal');
  const closeButtons = document.querySelectorAll('.close, .modal-cancel');
  
  // 画像プレビューモーダル
  const imagePreviewModal = document.getElementById('image-preview-modal');
  const previewModalImage = document.getElementById('preview-modal-image');
  
  // ファイルアップロード関連
  const fileInputs = document.querySelectorAll('.file-input');
  
  // 画像パスのプレビュー機能
  const imageInputs = document.querySelectorAll('input[id$="-image"]');
  imageInputs.forEach(input => {
    const previewId = 'preview-' + input.id.replace('-image', '');
    const previewDiv = document.getElementById(previewId);
    
    if (previewDiv) {
      // 初期状態を設定
      updateImagePreview(previewDiv, input.value);
      
      // 入力が変更されたらプレビューを更新
      input.addEventListener('input', function() {
        updateImagePreview(previewDiv, input.value);
      });
      
      // プレビューをクリックしたら拡大表示
      previewDiv.addEventListener('click', function() {
        if (input.value && !previewDiv.classList.contains('error') && !previewDiv.classList.contains('empty')) {
          previewModalImage.src = input.value;
          imagePreviewModal.style.display = 'block';
          
          // 画像読み込みエラー時の処理
          previewModalImage.onerror = function() {
            imagePreviewModal.style.display = 'none';
            alert('画像を読み込めませんでした: ' + input.value);
          };
        }
      });
    }
  });
  
  // プレビューモーダルを閉じる
  imagePreviewModal.querySelector('.close').addEventListener('click', function() {
    imagePreviewModal.style.display = 'none';
  });
  
  // 背景クリックでプレビューモーダルを閉じる
  imagePreviewModal.addEventListener('click', function(event) {
    if (event.target === imagePreviewModal) {
      imagePreviewModal.style.display = 'none';
    }
  });
  
  // ファイルアップロード処理
  fileInputs.forEach(input => {
    input.addEventListener('change', function(e) {
      const targetId = this.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      const statusEl = document.getElementById('status-' + targetId.replace('-image', ''));
      
      if (!this.files || !this.files[0]) {
        return;
      }
      
      const file = this.files[0];
      
      // ファイルサイズチェック (1MB = 1024 * 1024)
      if (file.size > 1024 * 1024) {
        statusEl.textContent = 'エラー: ファイルサイズは1MB以下にしてください';
        statusEl.className = 'upload-status error';
        return;
      }
      
      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        statusEl.textContent = 'エラー: 画像ファイルのみアップロードできます';
        statusEl.className = 'upload-status error';
        return;
      }
      
      // フォームデータ作成
      const formData = new FormData();
      formData.append('image', file);
      
      // ステータスを「アップロード中」に更新
      statusEl.textContent = 'アップロード中...';
      statusEl.className = 'upload-status loading';
      
      // アップロードリクエスト
      fetch('/admin/upload', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('アップロードに失敗しました');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // アップロード成功
          targetInput.value = data.filePath;
          updateImagePreview(document.getElementById('preview-' + targetId.replace('-image', '')), data.filePath);
          statusEl.textContent = 'アップロード完了: ' + data.originalName;
          statusEl.className = 'upload-status success';
          
          // 数秒後にステータスメッセージをクリア
          setTimeout(() => {
            statusEl.textContent = '';
          }, 5000);
        } else {
          throw new Error(data.error || 'アップロードに失敗しました');
        }
      })
      .catch(error => {
        console.error('アップロードエラー:', error);
        statusEl.textContent = 'エラー: ' + (error.message || 'アップロードに失敗しました');
        statusEl.className = 'upload-status error';
      });
    });
  });
  
  // 画像プレビューを更新する関数
  function updateImagePreview(previewElement, imagePath) {
    // クラスをリセット
    previewElement.classList.remove('loading', 'error', 'empty');
    
    if (!imagePath) {
      // 画像パスが空の場合
      previewElement.style.backgroundImage = 'none';
      previewElement.classList.add('empty');
      return;
    }
    
    // ローディング状態にする
    previewElement.classList.add('loading');
    
    // 画像の存在確認
    const img = new Image();
    img.onload = function() {
      previewElement.style.backgroundImage = `url(${imagePath})`;
      previewElement.classList.remove('loading');
    };
    img.onerror = function() {
      previewElement.style.backgroundImage = 'none';
      previewElement.classList.remove('loading');
      previewElement.classList.add('error');
    };
    img.src = imagePath;
  }
  
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
      
      // すべてのプレビューを空の状態に更新
      ['A', 'B', 'C', 'D'].forEach(letter => {
        const previewDiv = document.getElementById(`preview-option${letter}`);
        if (previewDiv) {
          updateImagePreview(previewDiv, '');
        }
      });
      
      questionModal.style.display = 'block';
    });
  }
  
  // 質問編集ボタンのイベントリスナー
  editQuestionBtns.forEach(button => {
    button.addEventListener('click', function() {
      const questionId = this.getAttribute('data-id');
      const questionRow = this.closest('tr');
      
      // ローディング表示
      document.getElementById('modal-title').textContent = '質問を編集中...';
      document.getElementById('question-form').reset();
      
      // 実際のデータを取得（テーブルから）
      const questionText = questionRow.querySelector('td:nth-child(2)').textContent;
      
      // 非同期でCSVから該当の質問データを取得
      fetch(`/admin/question/${questionId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('質問データの取得に失敗しました');
          }
          return response.json();
        })
        .then(data => {
          // 取得したデータをフォームにセット
          document.getElementById('modal-title').textContent = '質問を編集';
          document.getElementById('question-text').value = data.text;
          
          // 選択肢のデータをセット
          data.options.forEach(option => {
            const idLower = option.id.toLowerCase();
            document.getElementById(`option${option.id}-text`).value = option.text;
            document.getElementById(`option${option.id}-image`).value = option.image;
            
            // プレビューも更新
            const previewDiv = document.getElementById(`preview-option${option.id}`);
            updateImagePreview(previewDiv, option.image);
          });
        })
        .catch(error => {
          console.error('エラー:', error);
          alert('質問データの取得に失敗しました。');
          
          // フォールバックとして簡易データを使用
          document.getElementById('modal-title').textContent = '質問を編集';
          document.getElementById('question-text').value = questionText;
          ['A', 'B', 'C', 'D'].forEach(letter => {
            document.getElementById(`option${letter}-text`).value = `選択肢${letter}`;
            document.getElementById(`option${letter}-image`).value = '';
            
            // 空のプレビューを表示
            const previewDiv = document.getElementById(`preview-option${letter}`);
            updateImagePreview(previewDiv, '');
          });
        });
      
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