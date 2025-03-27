document.addEventListener('DOMContentLoaded', function() {
  // モーダル関連の要素
  const questionModal = document.getElementById('question-modal');
  const resultModal = document.getElementById('result-modal');
  const closeButtons = document.querySelectorAll('.close, .modal-cancel');
  
  // 画像プレビューモーダル
  const imagePreviewModal = document.getElementById('image-preview-modal');
  const previewModalImage = document.getElementById('preview-modal-image');
  
  // 画像トリミングモーダル
  const imageCropModal = document.getElementById('image-crop-modal');
  const cropImage = document.getElementById('crop-image');
  const cropApplyButton = document.getElementById('crop-apply');
  const cropCancelButton = document.getElementById('crop-cancel');
  
  // クロッパーのインスタンス
  let cropper = null;
  
  // 現在処理中の画像情報
  let currentImageInfo = {
    targetInput: null,
    originalPath: null
  };
  
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
      previewDiv.addEventListener('click', function(e) {
        if (input.value && !previewDiv.classList.contains('error') && !previewDiv.classList.contains('empty')) {
          // Shiftキーを押しながらクリックするとトリミングモードになる
          if (e.shiftKey) {
            // トリミングモードを開始
            openCropModal(input.value, input);
          } else {
            // 通常の拡大表示
            previewModalImage.src = input.value;
            imagePreviewModal.style.display = 'block';
            
            // 画像読み込みエラー時の処理
            previewModalImage.onerror = function() {
              imagePreviewModal.style.display = 'none';
              alert('画像を読み込めませんでした: ' + input.value);
            };
          }
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
  
  // トリミングモーダルを開く関数
  function openCropModal(imagePath, inputElement) {
    console.log('トリミングモーダルを開く:', imagePath);
    
    // 現在の画像情報を保存
    currentImageInfo.targetInput = inputElement;
    currentImageInfo.originalPath = imagePath;
    
    // クロップモーダルを表示
    imageCropModal.style.display = 'block';
    
    // 画像をセット
    console.log('画像をセット:', imagePath);
    cropImage.src = imagePath;
    
    // 既存のクロッパーがあれば破棄
    if (cropper) {
      console.log('既存のクロッパーを破棄');
      cropper.destroy();
      cropper = null;
    }
    
    // 画像が読み込まれたらクロッパーを初期化
    cropImage.onload = function() {
      console.log('画像が読み込まれた、クロッパーを初期化');
      try {
        cropper = new Cropper(cropImage, {
          aspectRatio: NaN, // アスペクト比制限なし（自由な形状で選択可能）
          viewMode: 1,    // 画像全体が見えるモード
          guides: true,   // ガイドラインを表示
          autoCropArea: 0.8, // 自動選択エリアの大きさ（0〜1）
          responsive: true,
          restore: false,
          dragMode: 'crop',  // デフォルトのドラッグモードを 'crop' に設定
          cropBoxMovable: true,  // 選択範囲の移動を許可
          cropBoxResizable: true, // 選択範囲のサイズ変更を許可
          toggleDragModeOnDblclick: true // ダブルクリックでドラッグモードを切り替え
        });
        console.log('クロッパー初期化成功');
      } catch (error) {
        console.error('クロッパー初期化エラー:', error);
        alert('画像のトリミング機能の初期化に失敗しました。ブラウザのコンソールを確認してください。');
      }
    };
    
    // 画像読み込みエラー時の処理
    cropImage.onerror = function(error) {
      console.error('画像読み込みエラー:', error);
      alert('画像の読み込みに失敗しました: ' + imagePath);
      imageCropModal.style.display = 'none';
    };
  }
  
  // トリミングを適用
  cropApplyButton.addEventListener('click', function() {
    console.log('トリミングを適用ボタンがクリックされました');
    
    if (!cropper) {
      console.error('クロッパーが初期化されていません');
      alert('トリミングツールが初期化されていません。ページを再読み込みして再試行してください。');
      return;
    }
    
    try {
      console.log('クロップデータを取得中...');
      // クロップデータをBase64形式で取得
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 800,      // 最大幅
        maxHeight: 800,     // 最大高さ
        fillColor: '#fff',  // 背景色
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      if (!canvas) {
        console.error('クロップキャンバスが取得できませんでした');
        alert('トリミングデータの取得に失敗しました。選択領域を確認してください。');
        return;
      }
      
      console.log('クロップキャンバスが取得できました、データURLに変換中...');
      const cropData = canvas.toDataURL('image/jpeg', 0.9); // 90%品質のJPEG
      console.log('データURLの長さ:', cropData.length);
      
      console.log('サーバーにクロップデータを送信中...');
      console.log('元画像パス:', currentImageInfo.originalPath);
      
      // サーバーにクロップデータを送信
      fetch('/admin/crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imagePath: currentImageInfo.originalPath,
          cropData: cropData
        })
      })
      .then(response => {
        console.log('サーバーからのレスポンス:', response.status);
        if (!response.ok) {
          throw new Error('サーバーからエラーレスポンス: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log('サーバーからのデータ:', data);
        if (data.success) {
          console.log('トリミング成功、新しいパス:', data.newPath);
          
          // 入力フィールドを新しいパスで更新
          // ブラウザのキャッシュを回避するためにユニークなタイムスタンプを追加
          const cacheBuster = '?t=' + new Date().getTime();
          const newPathWithCache = data.newPath + cacheBuster;
          
          currentImageInfo.targetInput.value = data.newPath; // 実際のフォームデータには元のパスを保存
          
          // プレビューの更新
          const previewId = 'preview-' + currentImageInfo.targetInput.id.replace('-image', '');
          const previewDiv = document.getElementById(previewId);
          console.log('プレビュー要素を更新:', previewId);
          console.log('キャッシュ回避用パス:', newPathWithCache);
          updateImagePreview(previewDiv, newPathWithCache);
          
          // モーダルを閉じる
          imageCropModal.style.display = 'none';
          
          // クロッパーをクリーンアップ
          if (cropper) {
            cropper.destroy();
            cropper = null;
          }
          
          // 成功メッセージを表示
          const statusId = 'status-' + currentImageInfo.targetInput.id.replace('-image', '');
          console.log('ステータス要素ID:', statusId);
          const statusEl = document.getElementById(statusId);
          if (statusEl) {
            statusEl.innerHTML = '✓ トリミング完了！新しい画像を適用しました';
            statusEl.className = 'upload-status success';
            
            // 数秒後にステータスメッセージをクリア
            setTimeout(() => {
              statusEl.textContent = '';
            }, 5000);
          } else {
            console.warn('ステータス要素が見つかりません:', statusId);
            alert('画像のトリミングが完了しました');
          }
        } else {
          throw new Error(data.error || 'トリミングに失敗しました');
        }
      })
      .catch(error => {
        console.error('トリミングエラー:', error);
        alert('トリミングに失敗しました: ' + error.message);
      });
    } catch (error) {
      console.error('トリミング処理エラー:', error);
      alert('トリミング処理中にエラーが発生しました: ' + error.message);
    }
  });
  
  // トリミングをキャンセル
  cropCancelButton.addEventListener('click', function() {
    console.log('トリミングがキャンセルされました');
    imageCropModal.style.display = 'none';
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });
  
  // モーダルのクローズボタンでトリミングをキャンセル
  const cropModalCloseBtn = imageCropModal.querySelector('.close');
  if (cropModalCloseBtn) {
    cropModalCloseBtn.addEventListener('click', function() {
      console.log('トリミングモーダルのクローズボタンがクリックされました');
      imageCropModal.style.display = 'none';
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
    });
  } else {
    console.error('トリミングモーダルのクローズボタンが見つかりません');
  }
  
  // 背景クリックでトリミングモーダルを閉じる
  imageCropModal.addEventListener('click', function(event) {
    if (event.target === imageCropModal) {
      imageCropModal.style.display = 'none';
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
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
          const previewEl = document.getElementById('preview-' + targetId.replace('-image', ''));
          updateImagePreview(previewEl, data.filePath);
          
          // ステータスメッセージを更新
          statusEl.innerHTML = 'アップロード完了: ' + data.originalName + 
                              ' <a href="#" class="crop-link">トリミングする</a>';
          statusEl.className = 'upload-status success';
          
          // トリミングリンクにイベントリスナーを追加
          const cropLink = statusEl.querySelector('.crop-link');
          if (cropLink) {
            cropLink.addEventListener('click', function(e) {
              e.preventDefault();
              openCropModal(data.filePath, targetInput);
            });
          }
          
          // 数秒後にステータスメッセージをクリア
          setTimeout(() => {
            statusEl.textContent = '';
          }, 10000);
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
    
    // 画像パスが正しい形式かチェック
    let imgSrc = imagePath;
    
    // http://で始まるURLを修正 (相対パスに変換)
    if (imgSrc.startsWith('http://')) {
      console.warn('http://で始まるURLが検出されました、修正します:', imgSrc);
      imgSrc = imgSrc.replace(/^http:\/\/[^\/]+/, '');
      console.log('修正後のパス:', imgSrc);
    }
    
    // パスの先頭に/がなければ追加
    if (!imgSrc.startsWith('/')) {
      console.warn('相対パスが/で始まっていません、修正します:', imgSrc);
      imgSrc = '/' + imgSrc;
      console.log('修正後のパス:', imgSrc);
    }
    
    console.log('画像読み込み試行:', imgSrc);
    
    // 画像の存在確認
    const img = new Image();
    img.onload = function() {
      console.log('画像読み込み成功:', imgSrc);
      previewElement.style.backgroundImage = `url(${imgSrc})`;
      previewElement.classList.remove('loading');
    };
    img.onerror = function() {
      console.error('画像読み込みエラー:', imgSrc);
      previewElement.style.backgroundImage = 'none';
      previewElement.classList.remove('loading');
      previewElement.classList.add('error');
    };
    img.src = imgSrc;
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
      
      // 質問IDを空にする（新規追加モード）
      document.getElementById('question-id').value = '';
      
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
          document.getElementById('question-id').value = data.id; // 質問IDをセット
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
      const row = this.closest('tr');
      
      if (confirm('この質問を削除してもよろしいですか？')) {
        // 削除中の状態表示
        button.textContent = '削除中...';
        button.disabled = true;
        
        // サーバーに削除リクエストを送信
        fetch(`/admin/question/${questionId}`, {
          method: 'DELETE'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('サーバーエラー: ' + response.status);
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            // 成功したら行を削除
            row.remove();
            alert('質問が削除されました');
          } else {
            throw new Error(data.error || '不明なエラーが発生しました');
          }
        })
        .catch(error => {
          console.error('質問削除エラー:', error);
          alert('質問の削除に失敗しました: ' + error.message);
          
          // ボタンを元に戻す
          button.textContent = '削除';
          button.disabled = false;
        });
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
      
      // 送信中の状態表示
      const submitButton = this.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = '保存中...';
      submitButton.disabled = true;
      
      // サーバーへ送信
      fetch('/admin/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('サーバーエラー: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // モーダルを閉じる
          questionModal.style.display = 'none';
          
          // 保存成功の通知
          alert(data.message);
          
          // ページをリロードして更新された質問一覧を表示
          window.location.reload();
        } else {
          throw new Error(data.error || '不明なエラーが発生しました');
        }
      })
      .catch(error => {
        console.error('質問保存エラー:', error);
        alert('質問の保存に失敗しました: ' + error.message);
        
        // ボタンを元に戻す
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      });
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