# Skills Manager

[skills CLI](https://www.npmjs.com/package/skills) 的桌面端可视化客户端。用图形界面完成技能的查看、安装、卸载与更新，不必记忆命令行参数。

技术栈：Electron 33 + electron-vite 2 + React 18 + Vite 5，Markdown 渲染使用 marked + DOMPurify，技能元信息解析使用 yaml。

## 功能

- **技能库**：按「全局 / 项目」两种作用域列出一台机器上的技能，左侧列表、右侧渲染 `SKILL.md` 详情；支持打开技能目录、单项卸载、批量更新。
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

## 环境要求

| 依赖 | 说明 |
| --- | --- |
| Node.js | 18 及以上（仅开发/构建需要，最终用户无需安装） |
| npm | 随 Node.js 安装 |
| Git | 远程安装技能时依赖 `git clone`，需在用户机器上可用 |
| skills CLI | **已内置**（`dependencies` 中的 `skills` 包），随安装包分发，最终用户无需单独安装 |
| 操作系统 | Windows / macOS / Linux（Windows 下安装方式为复制，不使用软链接） |

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

`npm run dist` 调用 electron-builder 生成 NSIS 安装程序（`release/Skills Manager-<version>-setup.exe`），同时保留免安装目录 `release/win-unpacked/`。

打包相关要点：

- `skills` 已作为运行依赖内置，安装后无需用户额外安装 Node.js 或 CLI；
- `build.asarUnpack` 把 `node_modules/**` 解包到 `resources/app.asar.unpacked`，因为 CLI 需要以真实文件路径交给子进程执行，且其依赖需能被 Node 正常解析；
- 应用运行时用自身可执行文件（`ELECTRON_RUN_AS_NODE=1`）充当 Node，因此 Electron 版本必须满足 `skills` 的 Node 要求（当前 Electron 38 → Node 22.22）。升级 Electron 时需确认这一点，否则 CLI 会因缺少 Node 22 API 而启动失败。

## 使用说明

1. **首次使用**：打开「设置」，点「检测网络与依赖」，确认 `HTTP 可达`、`git 可用`、`CLI 就绪` 三项均为正常。
   - 应用会自动沿用系统代理，无需在应用内填写。若 `git` 检测失败，先确认系统代理已开启（浏览器能打开 github.com 不代表 git 能连，详见「配置说明」）。
2. **查看技能**：进入「技能库」，用顶部「全局 / 项目」切换作用域；项目作用域需要先选择项目目录。点列表项可在右侧查看技能说明。
3. **安装技能**：进入「安装技能」。
   - 「仓库 / 本地路径」页签：填入来源 → 预览技能 → 勾选要装的技能；
   - 「搜索 skills.sh」页签：输入关键词（至少 2 个字符）→ 搜索结果点「安装」自动回填来源；
   - 在右侧确认目标 Agent 与作用域后点「开始安装」。
4. **卸载 / 更新**：在「技能库」选中技能后点「卸载」，或点顶部「更新」批量更新已安装技能。

## 配置说明

- 设置项保存在 Electron 用户数据目录的 `settings.json` 中（Windows 位于 `%APPDATA%/skills-desktop/`），包含主题、默认 Agent、最近项目目录。
- CLI 路径解析顺序：**安装包内置**（`resources/app.asar.unpacked/node_modules/skills`，开发时为项目 `node_modules`）→ 全局 npm 目录。不提供手动指定入口，避免终端用户填错导致 CLI 不可用。
- 应用不提供手动代理配置，但会读取**系统代理**（与浏览器一致）并注入给 `skills` 子进程，因为 git 本身不读 Windows 的「Internet 选项」；若已设置 `HTTPS_PROXY` 等环境变量，则以环境变量为准。
- 渲染进程开启了 `contextIsolation`、关闭了 `nodeIntegration`，所有系统能力通过 preload 暴露的白名单 API 调用；读取技能详情前会校验路径必须在最近一次列表结果中。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 提示「内置的 skills CLI 缺失」 | 安装包不完整或 `resources/app.asar.unpacked` 被清理，重新安装应用即可 |
| 远程安装失败、日志显示 `Could not resolve host` | 本机无法解析 github.com。应用会自动跟随系统代理，请确认代理软件已开启“系统代理/TUN”；或改用本地路径安装 |
| 搜索 skills.sh 失败 | 确认能访问 skills.sh；该请求走 Electron 网络栈，遵循系统代理设置 |
| 预览不到技能 | 检查来源格式（`owner/repo` 或完整的绝对路径）与网络连接 |
| 技能列表为空 | 确认作用域（全局/项目）与项目目录是否正确，先安装至少一个技能 |
