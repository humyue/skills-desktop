# Skills Manager

[skills CLI](https://www.npmjs.com/package/skills) 的桌面端可视化客户端。用图形界面完成技能的查看、安装、卸载与更新，不必记忆命令行参数。

技术栈：Electron 33 + electron-vite 2 + React 18 + Vite 5，Markdown 渲染使用 marked + DOMPurify，技能元信息解析使用 yaml。

## 功能

- **技能库**：按全局作用域列出一台机器上的技能，左侧列表、右侧渲染 `SKILL.md` 详情；支持打开技能目录、单项卸载、批量更新。
- **安装技能**：
  - 输入 `owner/repo`、GitHub 地址或本地绝对路径，先预览仓库内全部技能再勾选安装；
  - 也可搜索 [skills.sh](https://skills.sh) 在线技能库；
  - 可指定安装到哪些 Agent（默认勾选本机已检测到的），支持 80+ 种 Agent；
  - 安装方式为复制到各 Agent 目录（Windows 未开启开发者模式，不使用符号链接）。
- **设置**：
  - 运行环境检测（HTTP 连通性 / git 可用性 / CLI 就绪状态）；
  - 内置 CLI 的版本、来源与实际路径展示，以及对照官方源的版本检查；
  - 浅色 / 深色主题切换。
- **实时日志**：所有 CLI 操作的过程输出在底部日志条中实时滚动，便于排查失败原因。
- **版本更新提示**：启动时查询 GitHub Releases 的最新 tag，高于当前版本时在顶部提示「前往下载」（仅提示，不自动安装）。



## 快速开始

```powershell
# 1. 进入项目目录
cd skills-desktop

# 2. 安装依赖（国内网络建议加镜像）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install

# 3. 启动开发模式（自动打开应用窗口）
npm run dev
```

### 构建与打包

```powershell
npm run build   # 仅构建到 out/
npm run start   # 以生产模式预览构建结果
npm run dist    # 生成 Windows 安装包，输出到 release/
```


## 使用说明

1. **首次使用**：打开「设置」，点「检测网络与依赖」，确认 `HTTP 可达`、`git 可用`、`CLI 就绪` 三项均为正常。
   - 应用会自动沿用系统代理，无需在应用内填写。若 `git` 检测失败，先确认系统代理已开启（浏览器能打开 github.com 不代表 git 能连，详见「配置说明」）。
2. **查看技能**：进入「技能库」，用顶部「全局 / 项目」切换作用域；项目作用域需要先选择项目目录。点列表项可在右侧查看技能说明。
3. **安装技能**：进入「安装技能」。
   - 「仓库 / 本地路径」页签：填入来源 → 预览技能 → 勾选要装的技能；
   - 「搜索 skills.sh」页签：输入关键词（至少 2 个字符）→ 搜索结果点「安装」自动回填来源；
   - 在右侧确认目标 Agent 与作用域后点「开始安装」。
4. **卸载 / 更新**：在「技能库」选中技能后点「卸载」，或点顶部「更新」批量更新已安装技能。



