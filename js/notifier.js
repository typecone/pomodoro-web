class Notifier {
  constructor() {
    this.audioContext = null;
    this.notificationPermission = Notification.permission;
  }

  async requestNotificationPermission() {
    if (this.notificationPermission === 'granted') return true;
    if (this.notificationPermission === 'denied') return false;

    const result = await Notification.requestPermission();
    this.notificationPermission = result;
    return result === 'granted';
  }

  playSound() {
    const settings = window.STORAGE?.settings;
    if (settings && !settings.soundEnabled) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(587.33, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  notify(title, body) {
    const settings = window.STORAGE?.settings;
    if (settings && !settings.notifyEnabled) return;

    if (this.notificationPermission === 'granted') {
      new Notification(title, { body, icon: '🍅' });
    } else {
      this.requestNotificationPermission().then(granted => {
        if (granted) new Notification(title, { body, icon: '🍅' });
      });
    }
  }

  notifyPhaseComplete(phaseLabel) {
    this.playSound();
    this.notify('番茄钟', `${phaseLabel}结束了！`);
  }

  notifyPomodoroComplete(count) {
    this.playSound();
    this.notify('番茄钟', `完成第 ${count} 个番茄！${count % 4 === 0 ? '该休息一下了' : '坚持住！'}`);
  }
}

export default new Notifier();
