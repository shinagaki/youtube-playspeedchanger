class YouTubeSpeedController {
	constructor() {
		this.observers = new Set();
		this.currentRate = 1.75;
		this.isLive = false;
		this.playerElement = null;
		this.isNearLiveEdge = false;
		this.liveEdgeCheckInterval = null;
		this.init();
	}

	init() {
		this.loadSettings()
			.then((rate) => {
				this.currentRate = rate;
				this.setupObserver();
				this.setupStorageListener();
				this.setupFullscreenListener();
			})
			.catch((error) => {
				console.error("YouTube Speed Extension: Failed to load settings:", error);
				this.setupObserver();
				this.setupStorageListener();
				this.setupFullscreenListener();
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

	findVideoElement() {
		// 全画面表示と通常表示の両方に対応した動画要素検出
		return (
			document.querySelector("video") ||
			document.fullscreenElement?.querySelector("video") ||
			document.querySelector("#player video")
		);
	}

	setPlaybackRate(rate) {
		const videoElement = this.findVideoElement();
		if (videoElement && videoElement.readyState >= 1) {
			videoElement.playbackRate = rate;
			return true;
		}
		return false;
	}

	handleVideoLoad(rate) {
		const videoElement = this.findVideoElement();
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

	checkLiveEdgeDistance() {
		const videoElement = this.findVideoElement();
		if (!videoElement || !this.isLive) {
			return { nearEdge: false, distance: 0 };
		}

		try {
			// バッファの終端位置を取得
			const buffered = videoElement.buffered;
			if (buffered.length === 0) {
				return { nearEdge: false, distance: 0 };
			}

			const currentTime = videoElement.currentTime;
			const bufferEnd = buffered.end(buffered.length - 1);
			const distance = bufferEnd - currentTime;

			// ライブ端との距離が5秒以内なら「近い」と判定
			const nearEdge = distance <= 5;

			return { nearEdge, distance };
		} catch (error) {
			return { nearEdge: false, distance: 0 };
		}
	}

	startLiveEdgeMonitoring() {
		if (this.liveEdgeCheckInterval) {
			clearInterval(this.liveEdgeCheckInterval);
		}

		this.liveEdgeCheckInterval = setInterval(() => {
			if (!this.isLive) {
				this.stopLiveEdgeMonitoring();
				return;
			}

			const { nearEdge, distance } = this.checkLiveEdgeDistance();

			if (nearEdge && !this.isNearLiveEdge) {
				// ライブ端に近づいた - 1倍速に戻す
				this.isNearLiveEdge = true;
				this.setPlaybackRate(1);
			} else if (!nearEdge && this.isNearLiveEdge && distance > 10) {
				// ライブ端から離れた（10秒以上の差） - 設定速度に戻す
				this.isNearLiveEdge = false;
				this.setPlaybackRate(this.currentRate);
			}
		}, 1000);
	}

	stopLiveEdgeMonitoring() {
		if (this.liveEdgeCheckInterval) {
			clearInterval(this.liveEdgeCheckInterval);
			this.liveEdgeCheckInterval = null;
		}
		this.isNearLiveEdge = false;
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
		const playerObserver = new MutationObserver((mutations) => {
			this.handlePlayerMutations(mutations);
		});

		playerObserver.observe(this.playerElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
		});
		this.observers.add(playerObserver);

		// さらに、動画要素を直接監視するオブザーバーも追加
		this.setupVideoObserver();

		this.isLive = this.detectLiveStatus();
		const initialRate = this.currentRate;
		this.handleVideoLoad(initialRate);
	}

	handlePlayerMutations(mutations) {
		let shouldCheckVideo = false;

		for (const mutation of mutations) {
			if (this.shouldCheckForVideoChanges(mutation)) {
				shouldCheckVideo = true;
				break;
			}
		}

		if (shouldCheckVideo) {
			this.handleVideoStatusChange();
		}
	}

	shouldCheckForVideoChanges(mutation) {
		// 新しい動画要素が追加されたかチェック
		if (mutation.type === "childList") {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					if (node.tagName === "VIDEO" || node.querySelector("video")) {
						return true;
					}
				}
			}
		}
		// クラス変更（ライブ状態の変化など）もチェック
		if (mutation.type === "attributes" && mutation.attributeName === "class") {
			return true;
		}
		return false;
	}

	handleVideoStatusChange() {
		const wasLive = this.isLive;
		this.isLive = this.detectLiveStatus();
		const targetRate = this.currentRate;

		// ライブ状態が変わった場合、または新しい動画要素が検出された場合
		if (wasLive !== this.isLive) {
			this.handleVideoLoad(targetRate);

			// ライブ配信の場合、ライブ端監視を開始
			if (this.isLive) {
				this.startLiveEdgeMonitoring();
			} else {
				this.stopLiveEdgeMonitoring();
			}
		}
	}

	setupVideoObserver() {
		const checkVideoElement = () => this.checkAndProcessVideoElement();

		// 初回チェック
		checkVideoElement();

		// 定期的にチェック（YouTubeのSPA遷移に対応）
		const videoCheckInterval = setInterval(checkVideoElement, 1000);

		// クリーンアップ時にインターバルを停止
		this.observers.add({
			disconnect: () => clearInterval(videoCheckInterval),
		});
	}

	checkAndProcessVideoElement() {
		const videoElement = this.findVideoElement();
		if (videoElement && !videoElement.hasAttribute("data-speed-applied")) {
			this.processNewVideoElement(videoElement);
		}
	}

	processNewVideoElement(videoElement) {
		// 新しい動画要素を発見
		videoElement.setAttribute("data-speed-applied", "true");

		const applySpeed = () => {
			this.isLive = this.detectLiveStatus();
			const targetRate = this.currentRate;
			this.handleVideoLoad(targetRate);

			// ライブ配信の場合、ライブ端監視を開始
			if (this.isLive) {
				this.startLiveEdgeMonitoring();
			} else {
				this.stopLiveEdgeMonitoring();
			}
		};

		// 動画の準備ができた時点で速度を適用
		if (videoElement.readyState >= 1) {
			applySpeed();
		} else {
			videoElement.addEventListener("loadedmetadata", applySpeed, { once: true });
			videoElement.addEventListener("canplay", applySpeed, { once: true });
		}

		// 動画の変化を監視（src変更、時間リセットなど）
		this.setupVideoChangeTracking(videoElement);
		this.setupVideoCleanupObserver(videoElement);
	}

	setupVideoChangeTracking(videoElement) {
		let lastSrc = videoElement.src;
		let lastCurrentTime = videoElement.currentTime;

		const checkVideoChange = () => {
			if (this.hasVideoChanged(videoElement, lastSrc, lastCurrentTime)) {
				// 新しい動画に切り替わった
				videoElement.removeAttribute("data-speed-applied");
				lastSrc = videoElement.src;
				lastCurrentTime = videoElement.currentTime;

				// 少し遅延してから速度適用
				setTimeout(() => this.checkAndProcessVideoElement(), 100);
			}
			lastCurrentTime = videoElement.currentTime;
		};

		videoElement.addEventListener("timeupdate", checkVideoChange);
		videoElement.addEventListener("loadstart", () => {
			videoElement.removeAttribute("data-speed-applied");
			setTimeout(() => this.checkAndProcessVideoElement(), 100);
		});
	}

	hasVideoChanged(videoElement, lastSrc, lastCurrentTime) {
		return (
			videoElement.src !== lastSrc ||
			(videoElement.currentTime < lastCurrentTime && videoElement.currentTime < 10)
		);
	}

	setupVideoCleanupObserver(videoElement) {
		// 動画要素が削除されたら属性をリセット
		const resetObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.removedNodes) {
					if (node === videoElement) {
						resetObserver.disconnect();
						return;
					}
				}
			}
		});

		const observeTarget = document.fullscreenElement || document.body;
		resetObserver.observe(observeTarget, { childList: true, subtree: true });
		this.observers.add(resetObserver);
	}

	setupStorageListener() {
		chrome.storage.onChanged.addListener((changes, areaName) => {
			if (areaName === "sync") {
				if (changes.playbackRate) {
					this.currentRate = changes.playbackRate.newValue || 1.75;
					this.applyCurrentRate();
				}
			}
		});
	}

	applyCurrentRate() {
		this.isLive = this.detectLiveStatus();
		const targetRate = this.isNearLiveEdge ? 1 : this.currentRate;
		this.setPlaybackRate(targetRate);

		// ライブ配信の場合、ライブ端監視を開始/停止
		if (this.isLive) {
			this.startLiveEdgeMonitoring();
		} else {
			this.stopLiveEdgeMonitoring();
		}
	}

	setupFullscreenListener() {
		// 全画面状態の変化を監視
		document.addEventListener("fullscreenchange", () => {
			// 全画面切り替え時に動画要素の監視を再初期化
			setTimeout(() => {
				const videoElement = this.findVideoElement();
				if (videoElement) {
					// 全画面切り替え後に速度を再適用
					videoElement.removeAttribute("data-speed-applied");
					this.isLive = this.detectLiveStatus();
					const targetRate = this.currentRate;
					this.handleVideoLoad(targetRate);
				}
			}, 100);
		});
	}

	cleanup() {
		for (const observer of this.observers) {
			observer.disconnect();
		}
		this.observers.clear();
		this.playerElement = null;
		this.stopLiveEdgeMonitoring();
	}
}

const controller = new YouTubeSpeedController();

window.addEventListener("beforeunload", () => {
	controller.cleanup();
});
