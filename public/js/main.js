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