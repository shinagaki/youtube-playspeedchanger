class YouTubeSpeedController {
	constructor() {
		this.observers = new Set();
		this.currentRate = 1.75;
		this.isLive = false;
		this.playerElement = null;
		this.init();
	}

	init() {
		this.loadSettings()
			.then((rate) => {
				this.currentRate = rate;
				this.setupObserver();
				this.setupStorageListener();
			})
			.catch((error) => {
				console.error("YouTube Speed Extension: Failed to load settings:", error);
				this.setupObserver();
				this.setupStorageListener();
			});
	}

	loadSettings() {
		return new Promise((resolve, reject) => {
			try {
				chrome.storage.sync.get(["playbackRate"], (result) => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
						return;
					}
					resolve(result.playbackRate || 1.75);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	setPlaybackRate(rate) {
		const videoElement = document.querySelector("video");
		if (videoElement && videoElement.readyState >= 1) {
			videoElement.playbackRate = rate;
			return true;
		}
		return false;
	}

	handleVideoLoad(rate) {
		const videoElement = document.querySelector("video");
		if (!videoElement) return;

		const setRate = () => {
			if (videoElement.readyState >= 1) {
				videoElement.playbackRate = rate;
			}
		};

		setRate();

		if (videoElement.readyState < 1) {
			videoElement.addEventListener("loadedmetadata", setRate, { once: true });
		}

		// 追加: 少し遅延して再度適用（YouTubeが内部的にリセットする場合に対応）
		setTimeout(() => {
			if (videoElement.readyState >= 1 && Math.abs(videoElement.playbackRate - rate) > 0.1) {
				videoElement.playbackRate = rate;
			}
		}, 500);
	}

	detectLiveStatus() {
		// より厳密なライブ検出
		const checks = {
			// 1. プレイヤー内の実際のライブクラス
			ytpLive: document.querySelector(".ytp-live:not([disabled])"),

			// 2. 時間表示エリア
			timeDisplay: document.querySelector(".ytp-time-display"),

			// 3. URLでのライブ判定
			isLiveUrl: window.location.pathname.includes("/live/"),

			// 4. 動画の長さ表示
			duration: document.querySelector(".ytp-bound-time-right")?.textContent,

			// 5. 進行バーの状態（ライブでは通常非表示）
			progressBar: document.querySelector(".ytp-progress-bar"),
		};

		// 時間表示の詳細解析
		const timeText = checks.timeDisplay?.textContent || "";

		// ライブ配信の場合、時間表示は通常 "•ライブ" のような形式
		const isLiveTimeFormat =
			timeText.includes("•ライブ") ||
			timeText.includes("• ライブ") ||
			(timeText.includes("•") && !timeText.includes("/"));

		// 動画長さの確認
		const hasDuration =
			checks.duration &&
			checks.duration !== "0:00" &&
			checks.duration.trim() !== "" &&
			checks.duration.includes(":");

		// 進行バーの表示状態確認
		const hasProgressBar = !!checks.progressBar;

		// 非常に厳密なライブ判定
		const liveConditions = [
			!!checks.ytpLive,
			checks.isLiveUrl,
			isLiveTimeFormat && !hasDuration && !hasProgressBar,
		];

		const isLive = liveConditions.some((condition) => condition);

		return isLive;
	}

	setupObserver() {
		this.cleanup();

		const bodyObserver = new MutationObserver(() => {
			const player = document.querySelector("#player");
			if (player && !this.playerElement) {
				this.playerElement = player;
				bodyObserver.disconnect();
				this.setupPlayerObserver();
			}
		});

		bodyObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
		this.observers.add(bodyObserver);
	}

	setupPlayerObserver() {
		const playerObserver = new MutationObserver(() => {
			const wasLive = this.isLive;
			this.isLive = this.detectLiveStatus();

			if (wasLive !== this.isLive) {
				const targetRate = this.isLive ? 1 : this.currentRate;
				this.handleVideoLoad(targetRate);
			}
		});

		playerObserver.observe(this.playerElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
		});
		this.observers.add(playerObserver);

		this.isLive = this.detectLiveStatus();
		const initialRate = this.isLive ? 1 : this.currentRate;
		this.handleVideoLoad(initialRate);
	}

	setupStorageListener() {
		chrome.storage.onChanged.addListener((changes, areaName) => {
			if (areaName === "sync" && changes.playbackRate) {
				this.currentRate = changes.playbackRate.newValue || 1.75;
				this.applyCurrentRate();
			}
		});
	}

	applyCurrentRate() {
		if (!this.isLive) {
			this.setPlaybackRate(this.currentRate);
		}
	}

	cleanup() {
		for (const observer of this.observers) {
			observer.disconnect();
		}
		this.observers.clear();
		this.playerElement = null;
	}
}

const controller = new YouTubeSpeedController();

window.addEventListener("beforeunload", () => {
	controller.cleanup();
});
