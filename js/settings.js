import { STORAGE } from './storage.js';

class Settings {
  constructor(drawerId) {
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
  }

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
  }

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
  }

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
  }

  applyTheme() {
    const theme = STORAGE.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

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
  }

  get(key) {
    return STORAGE.settings[key];
  }
}

export default Settings;
