function setPlaybackRateOnLoad(event) {
    event.target.playbackRate = 1.75;
  }
  
  function findAndSetPlaybackRate() {
    const video = document.querySelector('video');
    if (video) {
      video.onloadedmetadata = setPlaybackRateOnLoad;
    } else {
      // 動画要素が見つからない場合は、少し待ってから再度試行します
      setTimeout(findAndSetPlaybackRate, 500);
    }
  }
  
  window.addEventListener('load', findAndSetPlaybackRate);
  
  setInterval(findAndSetPlaybackRate, 1000);
