import { STORAGE } from './storage.js';

class Stats {
  constructor(drawerId) {
    this.drawer = document.getElementById(drawerId);
    this.elements = {
      todayCount: document.getElementById('stat-today-count'),
      todayMin: document.getElementById('stat-today-min'),
      weekCount: document.getElementById('stat-week-count'),
      totalCount: document.getElementById('stat-total-count'),
      chartWeek: document.getElementById('chart-week'),
      chartMonth: document.getElementById('chart-month')
    };
    this.chartWeek = null;
    this.chartMonth = null;

    this.render();
  }

  getSessions() {
    return STORAGE.sessions;
  }

  getTodayData() {
    const today = new Date().toISOString().slice(0, 10);
    return this.getSessions().filter(s => s.date === today);
  }

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
  }

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
  }

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
  }

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
  }

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
              callback: (val, i) => i % 4 === 0 ? this.getLabelAt(labels, i) : ''
            }
          }
        }
      }
    });
  }

  getLabelAt(labels, index) {
    return labels[index] || '';
  }

  refresh() {
    this.render();
  }
}

export default Stats;
