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
