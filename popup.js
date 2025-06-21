class PopupManager {
	constructor() {
		this.playbackRateInput = null;
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

		if (!this.playbackRateInput) {
			return;
		}

		this.createStatusElement();
		this.loadSettings();
		this.setupEventListeners();
	}

	createStatusElement() {
		this.statusElement = document.createElement("div");
		this.statusElement.id = "status";
		this.statusElement.style.display = "none";
		this.playbackRateInput.parentNode.parentNode.appendChild(this.statusElement);
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
		}, 2000);
	}

	async loadSettings() {
		try {
			const result = await this.getStorageData(["playbackRate"]);
			const playbackRate = result.playbackRate || 1.75;

			this.playbackRateInput.value = playbackRate;
			this.selectOptionByValue(playbackRate);
		} catch (error) {
			this.showStatus("設定の読み込みに失敗", true);
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
		// セレクトボックスの変更で自動保存
		this.playbackRateInput.addEventListener("change", async () => {
			try {
				const playbackRate = Number.parseFloat(this.playbackRateInput.value);
				if (!Number.isNaN(playbackRate) && playbackRate > 0) {
					await this.setStorageData({ playbackRate });
					this.showStatus(`✅ ${playbackRate}倍速に設定しました`);
				}
			} catch (error) {
				this.showStatus("❌ 保存に失敗しました", true);
			}
		});
	}
}

new PopupManager();
