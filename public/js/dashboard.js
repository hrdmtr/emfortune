document.addEventListener('DOMContentLoaded', function() {
  // チャートアニメーション
  setTimeout(() => {
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach(bar => {
      bar.style.opacity = '1';
    });
  }, 300);
  
  // 更新ボタン（将来的な機能）
  // const refreshButton = document.getElementById('refresh-stats');
  // if (refreshButton) {
  //   refreshButton.addEventListener('click', function() {
  //     location.reload();
  //   });
  // }
});