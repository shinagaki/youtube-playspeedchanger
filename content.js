function setPlaybackRate(videoElement, rate) {
	function handler(event) {
		if (event.target instanceof HTMLVideoElement) {
			event.target.playbackRate = rate;
		}
	}

	// すぐに適用（動画がすでに読み込まれている場合にも対応）
	handler({ target: videoElement });

	// メタデータが読み込まれたときにも適用
	videoElement.onloadedmetadata = handler;
}

function observeAndSetPlaybackRate(rate) {
	// 既存の video 要素がある場合はすぐに適用
	const video = document.querySelector("video");
	if (video) {
		setPlaybackRate(video, rate);
	}

	// 動画が後から追加される場合に対応
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLVideoElement) {
					setPlaybackRate(node, rate);
					observer.disconnect(); // 1つ見つかったら監視をやめる（必要なら削除）
				}
			}
		}
	});

	// `document.body` を監視（video 要素が追加されるのを待つ）
	observer.observe(document.body, { childList: true, subtree: true });
}

// 1.75倍速で適用
observeAndSetPlaybackRate(1.75);
