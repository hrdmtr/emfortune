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