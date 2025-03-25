document.addEventListener("DOMContentLoaded", () => {
	const playbackRateInput = document.getElementById("playbackRate");
	const saveButton = document.getElementById("save");

	// 保存された値を読み込む
	chrome.storage.sync.get(["playbackRate"], (result) => {
		const playbackRate = result.playbackRate || 1.75; // デフォルト値を設定
		playbackRateInput.value = playbackRate;

		// プルダウンの選択肢を設定
		for (let i = 0; i < playbackRateInput.options.length; i++) {
			if (
				Number.parseFloat(playbackRateInput.options[i].value) === playbackRate
			) {
				playbackRateInput.options[i].selected = true;
				break;
			}
		}
	});

	// 保存処理
	saveButton.addEventListener("click", () => {
		const playbackRate = Number.parseFloat(playbackRateInput.value);
		chrome.storage.sync.set({ playbackRate: playbackRate }, () => {
			console.log(`Playback rate is set to ${playbackRate}`);
		});
	});
});
