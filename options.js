class OptionsManager {
	constructor() {
		this.playbackRateInput = null;
		this.forceNormalSpeedOnLiveInput = null;
		this.saveButton = null;
		this.statusElement = null;
		this.init();
	}

	init() {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => this.setupElements());
		} else {
			this.setupElements();
		}
	}

	setupElements() {
		this.playbackRateInput = document.getElementById("playbackRate");
		this.forceNormalSpeedOnLiveInput = document.getElementById("forceNormalSpeedOnLive");
		this.saveButton = document.getElementById("save");
		this.resetButton = document.getElementById("reset");

		if (!this.playbackRateInput || !this.forceNormalSpeedOnLiveInput || !this.saveButton) {
			return;
		}

		this.createStatusElement();
		this.loadSettings();
		this.setupEventListeners();
		this.setupStorageListener();
	}

	createStatusElement() {
		this.statusElement = document.createElement("div");
		this.statusElement.id = "status";
		this.statusElement.style.display = "none";
		this.saveButton.parentNode.parentNode.appendChild(this.statusElement);
	}

	showStatus(message, isError = false) {
		if (!this.statusElement) return;

		this.statusElement.textContent = message;
		this.statusElement.style.backgroundColor = isError ? "#ffebee" : "#e8f5e8";
		this.statusElement.style.color = isError ? "#c62828" : "#2e7d32";
		this.statusElement.style.display = "block";

		setTimeout(() => {
			if (this.statusElement) {
				this.statusElement.style.display = "none";
			}
		}, 3000);
	}

	async loadSettings() {
		try {
			const result = await this.getStorageData(["playbackRate", "forceNormalSpeedOnLive"]);
			const playbackRate = result.playbackRate || 1.75;
			const forceNormalSpeedOnLive = result.forceNormalSpeedOnLive !== false; // デフォルトはtrue

			this.playbackRateInput.value = playbackRate;
			this.selectOptionByValue(playbackRate);
			this.forceNormalSpeedOnLiveInput.checked = forceNormalSpeedOnLive;
		} catch (error) {
			this.showStatus("設定の読み込みに失敗しました", true);
		}
	}

	getStorageData(keys) {
		return new Promise((resolve, reject) => {
			try {
				chrome.storage.sync.get(keys, (result) => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
						return;
					}
					resolve(result);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	setStorageData(data) {
		return new Promise((resolve, reject) => {
			try {
				chrome.storage.sync.set(data, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
						return;
					}
					resolve();
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	selectOptionByValue(value) {
		for (let i = 0; i < this.playbackRateInput.options.length; i++) {
			const optionValue = Number.parseFloat(this.playbackRateInput.options[i].value);
			if (Math.abs(optionValue - value) < 0.001) {
				this.playbackRateInput.options[i].selected = true;
				break;
			}
		}
	}

	setupEventListeners() {
		this.saveButton.addEventListener("click", async () => {
			try {
				this.saveButton.disabled = true;
				const playbackRate = Number.parseFloat(this.playbackRateInput.value);
				const forceNormalSpeedOnLive = this.forceNormalSpeedOnLiveInput.checked;

				if (Number.isNaN(playbackRate) || playbackRate <= 0) {
					throw new Error("無効な再生倍速です");
				}

				await this.setStorageData({ playbackRate, forceNormalSpeedOnLive });
				this.showStatus(
					`✅ 設定を保存しました：${playbackRate}倍速, ライブ${forceNormalSpeedOnLive ? "1倍速" : "指定速度"}`
				);
			} catch (error) {
				this.showStatus(`❌ 保存に失敗しました: ${error.message}`, true);
			} finally {
				this.saveButton.disabled = false;
			}
		});

		if (this.resetButton) {
			this.resetButton.addEventListener("click", async () => {
				try {
					this.resetButton.disabled = true;
					this.playbackRateInput.value = 1.75;
					this.selectOptionByValue(1.75);
					this.forceNormalSpeedOnLiveInput.checked = true;
					await this.setStorageData({ playbackRate: 1.75, forceNormalSpeedOnLive: true });
					this.showStatus("🔄 設定をデフォルト値にリセットしました");
				} catch (error) {
					this.showStatus(`❌ リセットに失敗しました: ${error.message}`, true);
				} finally {
					this.resetButton.disabled = false;
				}
			});
		}
	}

	setupStorageListener() {
		chrome.storage.onChanged.addListener((changes, namespace) => {
			if (namespace === "sync") {
				if (changes.playbackRate && changes.playbackRate.newValue !== undefined) {
					this.playbackRateInput.value = changes.playbackRate.newValue;
					this.selectOptionByValue(changes.playbackRate.newValue);
				}
				if (
					changes.forceNormalSpeedOnLive &&
					changes.forceNormalSpeedOnLive.newValue !== undefined
				) {
					this.forceNormalSpeedOnLiveInput.checked = changes.forceNormalSpeedOnLive.newValue;
				}
			}
		});
	}
}

new OptionsManager();
