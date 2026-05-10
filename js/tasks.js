import { STORAGE } from './storage.js';

class Tasks {
  constructor() {
    this.tasks = [];
    this.activeTaskId = null;
    this.taskList = document.getElementById('task-list');
    this.taskForm = document.getElementById('task-form');
    this.taskInput = document.getElementById('task-input');
    this.taskEstimate = document.getElementById('task-estimate');

    this.bindEvents();
    this.load();
  }

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
  }

  load() {
    this.tasks = STORAGE.tasks;
    this.render();
  }

  save() {
    STORAGE.tasks = this.tasks;
  }

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
  }

  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (this.activeTaskId === id) this.activeTaskId = null;
    this.save();
    this.render();
  }

  setActive(id) {
    this.activeTaskId = id;
    this.render();
  }

  toggleDone(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.save();
      this.render();
    }
  }

  incrementDone() {
    if (!this.activeTaskId) return;
    const task = this.tasks.find(t => t.id === this.activeTaskId);
    if (task && !task.completed) {
      task.done++;
      this.save();
      this.render();
    }
  }

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
  }

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
  }

  cancelEdit(id) {
    this.render();
  }

  getTodayCount() {
    const today = new Date().toISOString().slice(0, 10);
    return STORAGE.sessions.filter(s => s.date === today).length;
  }

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
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default Tasks;
