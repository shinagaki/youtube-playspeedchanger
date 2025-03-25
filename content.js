function setPlaybackRate(rate) {
	const videoElement = document.querySelector("video");
	if (videoElement) {
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
}

function observeAndSetPlaybackRate(rate) {
	const bodyObserver = new MutationObserver((mutations) => {
		const player = document.querySelector("#player .ytp-time-display");
		if (player) {
			// #player .ytp-time-display が存在する場合の処理
			console.log("#player .ytp-time-display が読み込まれました");
			bodyObserver.disconnect(); // body の監視を停止

			// #player .ytp-time-display を監視する observer を設定
			const playerObserver = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.attributeName === "class") {
						if (player.classList.contains("ytp-live")) {
							// ytp-live クラスが追加された場合の処理
							setPlaybackRate(1);
							console.log("ライブ動画");
						} else {
							// ytp-live クラスが削除された場合の処理
							setPlaybackRate(rate);
							console.log("通常動画");
						}
					}
				}
			});
			playerObserver.observe(player, {
				attributes: true,
				attributeFilter: ["class"],
			});
		}
	});

	bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// 設定値で適用
let playbackRate = 1.75; // デフォルト値
chrome.storage.sync.get(["playbackRate"], (result) => {
	if (result.playbackRate) {
		playbackRate = result.playbackRate;
	}
	console.log(`現在の再生スピードは ${playbackRate}`);
	observeAndSetPlaybackRate(playbackRate);
});
