# 番茄钟

一个极简的番茄工作法 Web 应用，纯前端零依赖，双击即可运行。

## 功能

- ⏱️ 三种阶段计时（专注 25分钟 / 短休息 5分钟 / 长休息 15分钟），时长可自定义
- ✅ 任务管理（添加、删除、勾选完成，关联番茄数统计）
- 📊 数据统计（今日/本周/累计，7天柱状图 + 30天趋势图）
- 🔔 声音提醒 + 桌面通知
- 🌙 亮色/暗色主题切换
- 💾 数据全部存储在浏览器本地（localStorage），支持导出/导入备份

## 使用方法

### 方式一：直接打开

双击 `index.html` 即可在浏览器中运行。

### 方式二：本地服务器

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js (需要 http-server)
npx http-server

# 然后打开 http://localhost:8000
```

## 快速开始

1. 点击「开始」按钮开始专注
2. 倒计时结束后，会听到提示音并收到桌面通知
3. 按照提示休息，完成后自动切换到下一个阶段
4. 点击「任务」添加待办事项，完成后会自动记录番茄数
5. 点击「统计」查看专注数据

## 浏览器兼容性

推荐使用现代浏览器：
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

## 数据说明

所有数据存储在浏览器的 `localStorage` 中，命名空间为 `pomodoro:`。

清空浏览器数据（缓存/网站数据）会丢失所有记录，建议定期使用设置中的「导出数据」备份。

## 本地开发

项目使用原生 JavaScript (ES Modules)，无构建工具。

文件结构：
```
claude-two/
├── index.html          # 入口
├── css/
│   └── style.css       # 样式
├── js/
│   ├── main.js         # 入口，初始化各模块
│   ├── timer.js        # 计时核心
│   ├── tasks.js        # 任务管理
│   ├── settings.js     # 设置面板
│   ├── stats.js        # 数据统计
│   ├── notifier.js     # 提醒与通知
│   └── storage.js      # localStorage 封装
└── README.md
```

## License

MIT
