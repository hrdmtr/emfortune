// 画面遷移の際のアニメーション効果
document.addEventListener('DOMContentLoaded', function() {
  // ページ読み込み時に要素をフェードイン
  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.style.opacity = '0';
    mainContent.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
      mainContent.style.opacity = '1';
    }, 100);
  }
  
  // いいね機能の実装
  const likeButton = document.getElementById('like-button');
  if (likeButton) {
    // 既にいいね済みかどうか確認
    const resultType = likeButton.getAttribute('data-result');
    const isLiked = localStorage.getItem(`liked_${resultType}`);
    
    if (isLiked) {
      likeButton.classList.add('liked');
      likeButton.disabled = true;
      likeButton.innerHTML = '<span class="like-icon">👍</span> <span class="like-text">役に立った！</span>';
    }
    
    // いいねボタンのクリックイベント
    likeButton.addEventListener('click', function() {
      const resultType = this.getAttribute('data-result');
      
      // ボタンを一時的に無効化
      this.disabled = true;
      this.innerHTML = '<span class="like-icon">⏳</span> <span class="like-text">送信中...</span>';
      
      // サーバーにいいねを送信
      fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resultType: resultType })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // いいね成功
          localStorage.setItem(`liked_${resultType}`, 'true');
          
          // ボタンの表示を更新
          likeButton.classList.add('liked');
          likeButton.innerHTML = '<span class="like-icon">👍</span> <span class="like-text">役に立った！</span>';
          
          // メッセージを表示
          const likeMessage = document.getElementById('like-message');
          if (likeMessage) {
            likeMessage.textContent = `ありがとうございます！ これまでに ${data.likes} 人が役に立ったと評価しています`;
            likeMessage.style.display = 'block';
          }
        } else {
          // エラーの場合
          this.disabled = false;
          this.innerHTML = '<span class="like-icon">👍</span> <span class="like-text">役に立った！</span>';
          alert('評価の送信に失敗しました。しばらくしてからもう一度お試しください。');
        }
      })
      .catch(error => {
        console.error('いいね処理エラー:', error);
        this.disabled = false;
        this.innerHTML = '<span class="like-icon">👍</span> <span class="like-text">役に立った！</span>';
        alert('評価の送信に失敗しました。しばらくしてからもう一度お試しください。');
      });
    });
  }
  
  // 質問ページでいいね数を表示する
  const likesNumber = document.getElementById('likes-number');
  if (likesNumber) {
    fetch('/api/likes')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          likesNumber.textContent = data.likes;
        }
      })
      .catch(error => {
        console.error('いいね数取得エラー:', error);
      });
  }
  
  // 選択肢の画像が読み込めない場合のフォールバック処理
  const optionImages = document.querySelectorAll('.option-image');
  optionImages.forEach(imageDiv => {
    // 現在の背景画像URLを取得
    const bgImage = getComputedStyle(imageDiv).backgroundImage;
    if (bgImage === 'none' || !bgImage) {
      // 背景画像が設定されていない場合はデフォルト画像を設定
      const defaultImage = `/images/${imageDiv.classList.contains('option-a') ? 'option-a.png' : 
                              imageDiv.classList.contains('option-b') ? 'option-b.png' : 
                              imageDiv.classList.contains('option-c') ? 'option-c.png' : 
                              'option-d.png'}`;
      imageDiv.style.backgroundImage = `url(${defaultImage})`;
      imageDiv.style.backgroundSize = 'contain';
      imageDiv.style.backgroundPosition = 'center';
    } else {
      // 画像の読み込みテスト
      const url = bgImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
      const img = new Image();
      img.onerror = function() {
        // 画像が読み込めない場合はデフォルト画像を設定
        console.log('画像の読み込みに失敗しました:', url);
        const optionType = imageDiv.classList.contains('option-a') ? 'a' : 
                          imageDiv.classList.contains('option-b') ? 'b' : 
                          imageDiv.classList.contains('option-c') ? 'c' : 'd';
        const defaultImage = `/images/option-${optionType}.png`;
        imageDiv.style.backgroundImage = `url(${defaultImage})`;
        
        // 背景サイズとポジションを適切に設定
        imageDiv.style.backgroundSize = 'contain';
        imageDiv.style.backgroundPosition = 'center';
      };
      img.src = url;
    }
  });
  
  // 質問ページの選択肢がクリックされたときの効果
  const optionLabels = document.querySelectorAll('.option-label');
  optionLabels.forEach(label => {
    label.addEventListener('click', function() {
      // すでに選択されている要素のスタイルをリセット
      optionLabels.forEach(l => l.classList.remove('selected'));
      // クリックされた要素にselectedクラスを追加
      this.classList.add('selected');
    });
  });
});