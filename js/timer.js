console.log('timer.js loading...');
import { STORAGE } from './storage.js';
import notifier from './notifier.js';

console.log('timer.js loaded, STORAGE:', STORAGE);
const PHASES = {
  focus: { label: '专注', hint: '保持专注，不要分心' },
  shortBreak: { label: '短休息', hint: '放松一下，喝口水' },
  longBreak: { label: '长休息', hint: '好好休息，为下一轮充电' }
};

class Timer {
  constructor() {
    console.log('Timer constructor called');
    this.currentPhase = 'focus';
    this.remainingMs = 0;
    this.isRunning = false;
    this.endsAt = 0;
    this.interval = null;
    this.completedPomodoros = 0;

    this.timeDisplay = document.getElementById('time-display');
    this.phaseHint = document.getElementById('phase-hint');
    this.btnStart = document.getElementById('btn-start');
    this.btnSkip = document.getElementById('btn-skip');
    this.btnReset = document.getElementById('btn-reset');

    console.log('Timer elements:', {
      timeDisplay: !!this.timeDisplay,
      btnStart: !!this.btnStart,
      btnSkip: !!this.btnSkip,
      btnReset: !!this.btnReset
    });

    if (!this.btnStart) {
      console.error('Timer: btn-start element not found');
      return;
    }

    this.bindEvents();
    this.restoreState();
    this.updateDisplay();
    console.log('Timer initialized');
  }
    this.currentPhase = 'focus';
    this.remainingMs = 0;
    this.isRunning = false;
    this.endsAt = 0;
    this.interval = null;
    this.completedPomodoros = 0;

    this.timeDisplay = document.getElementById('time-display');
    this.phaseHint = document.getElementById('phase-hint');
    this.btnStart = document.getElementById('btn-start');
    this.btnSkip = document.getElementById('btn-skip');
    this.btnReset = document.getElementById('btn-reset');

    if (!this.btnStart) {
      console.error('Timer: btn-start element not found');
      return;
    }

    this.bindEvents();
    this.restoreState();
    this.updateDisplay();
  }

  get duration() {
    const settings = STORAGE.settings;
    switch (this.currentPhase) {
      case 'focus':
        return settings.focusMin * 60 * 1000;
      case 'shortBreak':
        return settings.shortBreakMin * 60 * 1000;
      case 'longBreak':
        return settings.longBreakMin * 60 * 1000;
      default:
        return 25 * 60 * 1000;
    }
  }

  bindEvents() {
    console.log('bindEvents called, btnStart:', this.btnStart);
    document.querySelectorAll('.phase-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!this.isRunning) {
          this.setPhase(tab.dataset.phase);
        }
      });
    });

    this.btnStart.addEventListener('click', () => this.toggle());
    this.btnSkip.addEventListener('click', () => this.skip());
    this.btnReset.addEventListener('click', () => this.reset());
    console.log('Events bound');
  }

  setPhase(phase) {
    this.currentPhase = phase;
    this.remainingMs = this.duration;
    this.isRunning = false;
    this.stop();
    this.updateDisplay();
    this.saveState();
  }

  toggle() {
    console.log('Timer.toggle() called, isRunning:', this.isRunning);
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    console.log('Timer.start() called');
    if (this.isRunning) return;

    notifier.requestNotificationPermission();

    this.isRunning = true;
    this.endsAt = Date.now() + this.remainingMs;
    this.btnStart.textContent = '暂停';
    console.log('Timer started, endsAt:', this.endsAt);

    this.interval = setInterval(() => this.tick(), 250);
    this.saveState();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.stop();
    this.btnStart.textContent = '继续';
    this.saveState();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  skip() {
    if (confirm('确定要跳过当前阶段吗？')) {
      this.complete();
    }
  }

  reset() {
    this.pause();
    this.remainingMs = this.duration;
    this.btnStart.textContent = '开始';
    this.phaseHint.textContent = PHASES[this.currentPhase].hint;
    this.updateDisplay();
    this.saveState();
  }

  tick() {
    this.remainingMs = this.endsAt - Date.now();

    if (this.remainingMs <= 0) {
      this.complete();
      return;
    }

    this.updateDisplay();
  }

  complete() {
    this.pause();
    this.remainingMs = 0;
    this.updateDisplay();

    if (this.currentPhase === 'focus') {
      this.completedPomodoros++;
      document.dispatchEvent(new CustomEvent('pomodoro-complete', {
        detail: { count: this.completedPomodoros }
      }));
    }

    const nextPhase = this.getNextPhase();
    this.currentPhase = nextPhase;
    this.remainingMs = this.duration;
    this.updateDisplay();

    const settings = STORAGE.settings;
    if (settings.autoStart) {
      this.start();
    } else {
      this.btnStart.textContent = '开始';
    }

    this.saveState();
    this.updatePhaseTabs();

    document.dispatchEvent(new CustomEvent('phase-change', {
      detail: { phase: nextPhase, previousPhase: this.currentPhase }
    }));
  }

  getNextPhase() {
    const settings = STORAGE.settings;
    if (this.currentPhase === 'focus') {
      return (this.completedPomodoros % settings.longBreakEvery) === 0
        ? 'longBreak'
        : 'shortBreak';
    }
    return 'focus';
  }

  updateDisplay() {
    const totalSeconds = Math.max(0, Math.ceil(this.remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.timeDisplay.textContent = timeStr;
    document.title = `${timeStr} · ${PHASES[this.currentPhase].label}`;

    if (this.remainingMs === 0) {
      this.phaseHint.textContent = '完成了！';
    } else if (this.isRunning) {
      this.phaseHint.textContent = '进行中...';
    } else {
      this.phaseHint.textContent = PHASES[this.currentPhase].hint;
    }
  }

  updatePhaseTabs() {
    document.querySelectorAll('.phase-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.phase === this.currentPhase);
    });
  }

  saveState() {
    sessionStorage.setItem('pomodoro:state', JSON.stringify({
      currentPhase: this.currentPhase,
      remainingMs: this.remainingMs,
      isRunning: this.isRunning,
      endsAt: this.endsAt,
      completedPomodoros: this.completedPomodoros
    }));
  }

  restoreState() {
    try {
      const saved = sessionStorage.getItem('pomodoro:state');
      if (!saved) {
        this.setPhase('focus');
        return;
      }

      const state = JSON.parse(saved);
      this.currentPhase = state.currentPhase;
      this.remainingMs = state.remainingMs;
      this.completedPomodoros = state.completedPomodoros || 0;

      if (state.isRunning && state.endsAt > Date.now()) {
        this.endsAt = state.endsAt;
        this.isRunning = true;
        this.btnStart.textContent = '暂停';
        this.interval = setInterval(() => this.tick(), 250);
      } else {
        this.isRunning = false;
        this.btnStart.textContent = '开始';
      }

      this.updatePhaseTabs();
    } catch {
      this.setPhase('focus');
    }
  }

  updateSettings() {
    if (!this.isRunning) {
      this.remainingMs = this.duration;
      this.updateDisplay();
    }
  }
}

export default Timer;
