console.log('main.js loading...');
import Timer from './timer.js';
console.log('Timer imported');
import Tasks from './tasks.js';
import Settings from './settings.js';
import Stats from './stats.js';
import notifier from './notifier.js';
import { STORAGE } from './storage.js';

window.STORAGE = STORAGE;

STORAGE.migrate();

const timer = new Timer();
const tasks = new Tasks();
const settings = new Settings('drawer-settings');
const stats = new Stats('drawer-stats');

const todayCountEl = document.getElementById('today-count');
const todayTomatoesEl = document.getElementById('today-tomatoes');

function updateTodayCount() {
  const count = tasks.getTodayCount();
  todayCountEl.textContent = count;
  todayTomatoesEl.textContent = '🍅'.repeat(count);
}
updateTodayCount();

document.addEventListener('pomodoro-complete', (e) => {
  const { count } = e.detail;
  const phaseLabel = { focus: '专注', shortBreak: '短休息', longBreak: '长休息' };

  STORAGE.addSession({
    startedAt: Date.now() - STORAGE.settings.focusMin * 60 * 1000,
    durationMin: STORAGE.settings.focusMin,
    taskId: tasks.activeTaskId,
    date: new Date().toISOString().slice(0, 10)
  });

  tasks.incrementDone();
  updateTodayCount();
  stats.refresh();

  notifier.notifyPomodoroComplete(count);
});

document.addEventListener('phase-change', (e) => {
  const { phase } = e.detail;
  const labels = { focus: '专注', shortBreak: '短休息', longBreak: '长休息' };
  notifier.notifyPhaseComplete(labels[phase]);
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
    if (id === 'drawer-stats') stats.refresh();
  }
}

function closeDrawers() {
  document.querySelectorAll('.drawer').forEach(d => d.hidden = true);
  document.getElementById('overlay').hidden = true;
}

console.log('🍅 番茄钟已加载');
