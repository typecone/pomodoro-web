// 番茄钟 - 单文件版本（支持 file:// 协议）

// ==================== Storage ====================
const STORAGE = {
  PREFIX: 'pomodoro:',
  VERSION: 1,

  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  get settings() {
    return this.get('settings') || this.defaultSettings;
  },

  set settings(value) {
    this.set('settings', value);
  },

  get defaultSettings() {
    return {
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      longBreakEvery: 4,
      autoStart: false,
      soundEnabled: true,
      notifyEnabled: true,
      theme: 'light'
    };
  },

  get tasks() {
    return this.get('tasks') || [];
  },

  set tasks(value) {
    this.set('tasks', value);
  },

  get sessions() {
    return this.get('sessions') || [];
  },

  set sessions(value) {
    this.set('sessions', value);
  },

  addSession(session) {
    const sessions = this.sessions;
    sessions.push(session);
    this.sessions = sessions;
  },

  migrate() {
    const currentVer = this.get('schema')?.version || 0;
    if (currentVer >= this.VERSION) return;

    if (currentVer === 0) {
      const settings = this.get('settings');
      if (settings && !('theme' in settings)) {
        settings.theme = 'light';
        this.settings = settings;
      }
      this.set('schema', { version: 1 });
    }
  },

  export() {
    const data = {
      settings: this.settings,
      tasks: this.tasks,
      sessions: this.sessions,
      version: this.VERSION,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pomodoro-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version) throw new Error('Invalid format');
      if (data.settings) this.settings = { ...this.defaultSettings, ...data.settings };
      if (Array.isArray(data.tasks)) this.tasks = data.tasks;
      if (Array.isArray(data.sessions)) this.sessions = data.sessions;
      return true;
    } catch {
      return false;
    }
  }
};

// ==================== Notifier ====================
const Notifier = {
  audioContext: null,
  notificationPermission: Notification.permission,

  async requestNotificationPermission() {
    if (this.notificationPermission === 'granted') return true;
    if (this.notificationPermission === 'denied') return false;

    const result = await Notification.requestPermission();
    this.notificationPermission = result;
    return result === 'granted';
  },

  playSound() {
    const settings = STORAGE.settings;
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
  },

  notify(title, body) {
    const settings = STORAGE.settings;
    if (settings && !settings.notifyEnabled) return;

    if (this.notificationPermission === 'granted') {
      new Notification(title, { body, icon: '🍅' });
    } else {
      this.requestNotificationPermission().then(granted => {
        if (granted) new Notification(title, { body, icon: '🍅' });
      });
    }
  },

  notifyPhaseComplete(phaseLabel) {
    this.playSound();
    this.notify('番茄钟', `${phaseLabel}结束了！`);
  },

  notifyPomodoroComplete(count) {
    this.playSound();
    this.notify('番茄钟', `完成第 ${count} 个番茄！${count % 4 === 0 ? '该休息一下了' : '坚持住！'}`);
  }
};

// ==================== Timer ====================
const PHASES = {
  focus: { label: '专注', hint: '保持专注，不要分心' },
  shortBreak: { label: '短休息', hint: '放松一下，喝口水' },
  longBreak: { label: '长休息', hint: '好好休息，为下一轮充电' }
};

const Timer = {
  currentPhase: 'focus',
  remainingMs: 0,
  isRunning: false,
  endsAt: 0,
  interval: null,
  completedPomodoros: 0,
  timeDisplay: null,
  phaseHint: null,
  btnStart: null,
  btnSkip: null,
  btnReset: null,

  init() {
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
  },

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
  },

  bindEvents() {
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
  },

  setPhase(phase) {
    this.currentPhase = phase;
    this.remainingMs = this.duration;
    this.isRunning = false;
    this.stop();
    this.updateDisplay();
    this.saveState();
  },

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  },

  start() {
    if (this.isRunning) return;

    Notifier.requestNotificationPermission();

    this.isRunning = true;
    this.endsAt = Date.now() + this.remainingMs;
    this.btnStart.textContent = '暂停';

    this.interval = setInterval(() => this.tick(), 250);
    this.saveState();
  },

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.stop();
    this.btnStart.textContent = '继续';
    this.saveState();
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  skip() {
    if (confirm('确定要跳过当前阶段吗？')) {
      this.complete();
    }
  },

  reset() {
    this.pause();
    this.remainingMs = this.duration;
    this.btnStart.textContent = '开始';
    this.phaseHint.textContent = PHASES[this.currentPhase].hint;
    this.updateDisplay();
    this.saveState();
  },

  tick() {
    this.remainingMs = this.endsAt - Date.now();

    if (this.remainingMs <= 0) {
      this.complete();
      return;
    }

    this.updateDisplay();
  },

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
  },

  getNextPhase() {
    const settings = STORAGE.settings;
    if (this.currentPhase === 'focus') {
      return (this.completedPomodoros % settings.longBreakEvery) === 0
        ? 'longBreak'
        : 'shortBreak';
    }
    return 'focus';
  },

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
  },

  updatePhaseTabs() {
    document.querySelectorAll('.phase-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.phase === this.currentPhase);
    });
  },

  saveState() {
    sessionStorage.setItem('pomodoro:state', JSON.stringify({
      currentPhase: this.currentPhase,
      remainingMs: this.remainingMs,
      isRunning: this.isRunning,
      endsAt: this.endsAt,
      completedPomodoros: this.completedPomodoros
    }));
  },

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
  },

  updateSettings() {
    if (!this.isRunning) {
      this.remainingMs = this.duration;
      this.updateDisplay();
    }
  }
};

// ==================== Tasks ====================
const Tasks = {
  tasks: [],
  activeTaskId: null,
  taskList: null,
  taskForm: null,
  taskInput: null,
  taskEstimate: null,

  init() {
    this.taskList = document.getElementById('task-list');
    this.taskForm = document.getElementById('task-form');
    this.taskInput = document.getElementById('task-input');
    this.taskEstimate = document.getElementById('task-estimate');

    this.bindEvents();
    this.load();
  },

  bindEvents() {
    this.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.add();
    });

    this.taskList.addEventListener('click', (e) => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      const id = item.dataset.id;

      if (e.target.classList.contains('task-radio')) {
        this.setActive(id);
      } else if (e.target.classList.contains('task-check')) {
        this.toggleDone(id);
      } else if (e.target.classList.contains('task-delete')) {
        this.remove(id);
      } else if (e.target.classList.contains('task-title')) {
        this.startEdit(id, e.target);
      }
    });

    this.taskList.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('task-title-input')) {
        const id = e.target.closest('.task-item').dataset.id;
        if (e.key === 'Enter') {
          e.preventDefault();
          this.finishEdit(id, e.target);
        } else if (e.key === 'Escape') {
          this.cancelEdit(id);
        }
      }
    });

    this.taskList.addEventListener('blur', (e) => {
      if (e.target.classList.contains('task-title-input')) {
        const id = e.target.closest('.task-item').dataset.id;
        this.finishEdit(id, e.target);
      }
    }, true);
  },

  load() {
    this.tasks = STORAGE.tasks;
    this.render();
  },

  save() {
    STORAGE.tasks = this.tasks;
  },

  add() {
    const title = this.taskInput.value.trim();
    if (!title) return;

    const task = {
      id: crypto.randomUUID(),
      title,
      estimated: parseInt(this.taskEstimate.value) || 1,
      done: 0,
      completed: false,
      createdAt: Date.now()
    };

    this.tasks.push(task);
    this.save();
    this.render();
    this.taskInput.value = '';
    this.taskEstimate.value = '1';
    this.taskInput.focus();
  },

  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (this.activeTaskId === id) this.activeTaskId = null;
    this.save();
    this.render();
  },

  setActive(id) {
    this.activeTaskId = id;
    this.render();
  },

  toggleDone(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.save();
      this.render();
    }
  },

  incrementDone() {
    if (!this.activeTaskId) return;
    const task = this.tasks.find(t => t.id === this.activeTaskId);
    if (task && !task.completed) {
      task.done++;
      this.save();
      this.render();
    }
  },

  startEdit(id, titleEl) {
    const task = this.tasks.find(t => t.id === id);
    if (!task || task.completed) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-title-input';
    input.value = task.title;
    titleEl.replaceWith(input);
    input.focus();
    input.select();
  },

  finishEdit(id, inputEl) {
    const newTitle = inputEl.value.trim();
    if (newTitle) {
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.title = newTitle;
        this.save();
      }
    }
    this.render();
  },

  cancelEdit(id) {
    this.render();
  },

  getTodayCount() {
    const today = new Date().toISOString().slice(0, 10);
    return STORAGE.sessions.filter(s => s.date === today).length;
  },

  render() {
    this.taskList.innerHTML = '';

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.id === this.activeTaskId) li.classList.add('active');
      if (task.completed) li.classList.add('done');
      li.dataset.id = task.id;

      li.innerHTML = `
        <input type="radio" class="task-radio" name="active-task" ${task.id === this.activeTaskId ? 'checked' : ''} />
        <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} />
        <span class="task-title">${this.escapeHtml(task.title)}</span>
        <span class="task-pomos">🍅 ${task.done}/${task.estimated}</span>
        <button class="task-delete">×</button>
      `;

      this.taskList.appendChild(li);
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ==================== Settings ====================
const Settings = {
  drawer: null,
  inputs: {},
  btnExport: null,
  btnImport: null,
  fileImport: null,

  init(drawerId) {
    this.drawer = document.getElementById(drawerId);
    this.inputs = {
      focus: document.getElementById('set-focus'),
      short: document.getElementById('set-short'),
      long: document.getElementById('set-long'),
      longEvery: document.getElementById('set-long-every'),
      auto: document.getElementById('set-auto'),
      sound: document.getElementById('set-sound'),
      notify: document.getElementById('set-notify'),
      theme: document.getElementById('set-theme')
    };
    this.btnExport = document.getElementById('btn-export');
    this.btnImport = document.getElementById('btn-import');
    this.fileImport = document.getElementById('file-import');

    this.bindEvents();
    this.load();
    this.applyTheme();
  },

  bindEvents() {
    Object.entries(this.inputs).forEach(([key, input]) => {
      if (input.type === 'checkbox') {
        input.addEventListener('change', () => this.save(key));
      } else {
        input.addEventListener('input', () => this.save(key));
      }
    });

    this.btnExport.addEventListener('click', () => STORAGE.export());
    this.btnImport.addEventListener('click', () => this.fileImport.click());
    this.fileImport.addEventListener('change', (e) => this.handleImport(e));
  },

  load() {
    const s = STORAGE.settings;
    this.inputs.focus.value = s.focusMin;
    this.inputs.short.value = s.shortBreakMin;
    this.inputs.long.value = s.longBreakMin;
    this.inputs.longEvery.value = s.longBreakEvery;
    this.inputs.auto.checked = s.autoStart;
    this.inputs.sound.checked = s.soundEnabled;
    this.inputs.notify.checked = s.notifyEnabled;
    this.inputs.theme.checked = s.theme === 'dark';
  },

  save(changedKey) {
    const s = {
      focusMin: parseInt(this.inputs.focus.value) || 25,
      shortBreakMin: parseInt(this.inputs.short.value) || 5,
      longBreakMin: parseInt(this.inputs.long.value) || 15,
      longBreakEvery: parseInt(this.inputs.longEvery.value) || 4,
      autoStart: this.inputs.auto.checked,
      soundEnabled: this.inputs.sound.checked,
      notifyEnabled: this.inputs.notify.checked,
      theme: this.inputs.theme.checked ? 'dark' : 'light'
    };
    STORAGE.settings = s;

    if (changedKey === 'theme') {
      this.applyTheme();
    }
  },

  applyTheme() {
    const theme = STORAGE.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
  },

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (STORAGE.import(reader.result)) {
        alert('导入成功！页面将刷新以应用数据。');
        location.reload();
      } else {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  get(key) {
    return STORAGE.settings[key];
  }
};

// ==================== Stats ====================
const Stats = {
  drawer: null,
  elements: {},
  chartWeek: null,
  chartMonth: null,

  init(drawerId) {
    this.drawer = document.getElementById(drawerId);
    this.elements = {
      todayCount: document.getElementById('stat-today-count'),
      todayMin: document.getElementById('stat-today-min'),
      weekCount: document.getElementById('stat-week-count'),
      totalCount: document.getElementById('stat-total-count'),
      chartWeek: document.getElementById('chart-week'),
      chartMonth: document.getElementById('chart-month')
    };

    this.render();
  },

  getSessions() {
    return STORAGE.sessions;
  },

  getTodayData() {
    const today = new Date().toISOString().slice(0, 10);
    return this.getSessions().filter(s => s.date === today);
  },

  getWeekData() {
    const sessions = this.getSessions();
    const days = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days[dateStr] = 0;
    }

    sessions.forEach(s => {
      if (s.date in days) {
        days[s.date] += s.durationMin;
      }
    });

    return days;
  },

  getMonthData() {
    const sessions = this.getSessions();
    const days = {};
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days[dateStr] = 0;
    }

    sessions.forEach(s => {
      if (s.date in days) {
        days[s.date] += s.durationMin;
      }
    });

    return days;
  },

  render() {
    const todaySessions = this.getTodayData();
    const todayCount = todaySessions.length;
    const todayMin = todaySessions.reduce((sum, s) => sum + s.durationMin, 0);

    const weekDays = this.getWeekData();
    const weekCount = Object.entries(weekDays).reduce((sum, [_, min]) => sum + Math.ceil(min / STORAGE.settings.focusMin), 0);

    const totalCount = this.getSessions().length;

    this.elements.todayCount.textContent = todayCount;
    this.elements.todayMin.textContent = `${todayMin} 分`;
    this.elements.weekCount.textContent = weekCount;
    this.elements.totalCount.textContent = totalCount;

    this.renderWeekChart(weekDays);
    this.renderMonthChart(this.getMonthData());
  },

  renderWeekChart(data) {
    const ctx = this.elements.chartWeek.getContext('2d');
    const labels = Object.keys(data).map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const values = Object.values(data);

    if (this.chartWeek) this.chartWeek.destroy();

    this.chartWeek = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '分钟',
          data: values,
          backgroundColor: '#d94f4f',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 25 },
            grid: { display: true, drawBorder: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  },

  renderMonthChart(data) {
    const ctx = this.elements.chartMonth.getContext('2d');
    const labels = Object.keys(data).map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const values = Object.values(data);

    if (this.chartMonth) this.chartMonth.destroy();

    this.chartMonth = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '分钟',
          data: values,
          borderColor: '#d94f4f',
          backgroundColor: 'rgba(217, 79, 79, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 25 },
            grid: { display: true, drawBorder: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 7,
              callback: (val, i) => i % 4 === 0 ? labels[i] : ''
            }
          }
        }
      }
    });
  },

  refresh() {
    this.render();
  }
};

// ==================== Main ====================
document.addEventListener('DOMContentLoaded', () => {
  STORAGE.migrate();

  Timer.init();
  Tasks.init();
  Settings.init('drawer-settings');
  Stats.init('drawer-stats');

  const todayCountEl = document.getElementById('today-count');
  const todayTomatoesEl = document.getElementById('today-tomatoes');

  function updateTodayCount() {
    const count = Tasks.getTodayCount();
    todayCountEl.textContent = count;
    todayTomatoesEl.textContent = '🍅'.repeat(count);
  }
  updateTodayCount();

  document.addEventListener('pomodoro-complete', (e) => {
    const { count } = e.detail;

    STORAGE.addSession({
      startedAt: Date.now() - STORAGE.settings.focusMin * 60 * 1000,
      durationMin: STORAGE.settings.focusMin,
      taskId: Tasks.activeTaskId,
      date: new Date().toISOString().slice(0, 10)
    });

    Tasks.incrementDone();
    updateTodayCount();
    Stats.refresh();

    Notifier.notifyPomodoroComplete(count);
  });

  document.addEventListener('phase-change', (e) => {
    const { phase } = e.detail;
    const labels = { focus: '专注', shortBreak: '短休息', longBreak: '长休息' };
    Notifier.notifyPhaseComplete(labels[phase]);
  });

  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drawerId = 'drawer-' + btn.dataset.open;
      openDrawer(drawerId);
    });
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closeDrawers);
  });

  document.getElementById('overlay').addEventListener('click', closeDrawers);

  function openDrawer(id) {
    closeDrawers();
    const drawer = document.getElementById(id);
    const overlay = document.getElementById('overlay');
    if (drawer) {
      drawer.hidden = false;
      overlay.hidden = false;
      if (id === 'drawer-stats') Stats.refresh();
    }
  }

  function closeDrawers() {
    document.querySelectorAll('.drawer').forEach(d => d.hidden = true);
    document.getElementById('overlay').hidden = true;
  }

  console.log('🍅 番茄钟已加载');
});
