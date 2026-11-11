# Skills Manager

[skills CLI](https://www.npmjs.com/package/skills) 的桌面端可视化客户端。用图形界面完成技能的查看、安装、卸载、更新与新建，不必记忆命令行参数。

技术栈：Electron 33 + electron-vite 2 + React 18 + Vite 5，Markdown 渲染使用 marked + DOMPurify，技能元信息解析使用 yaml。

## 功能

- **技能库**：按「全局 / 项目」两种作用域列出一台机器上的技能，左侧列表、右侧渲染 `SKILL.md` 详情；支持打开技能目录、单项卸载、批量更新。
- **安装技能**：
  - 输入 `owner/repo`、GitHub 地址或本地绝对路径，先预览仓库内全部技能再勾选安装；
  - 也可搜索 [skills.sh](https://skills.sh) 在线技能库；
  - 可指定安装到哪些 Agent（默认勾选本机已检测到的），支持 80+ 种 Agent；
  - 安装方式为复制到各 Agent 目录（Windows 未开启开发者模式，不使用符号链接）。
- **新建技能**：选择目录并填写名称，调用 CLI 生成规范的技能骨架（`SKILL.md`）。
- **设置**：
  - 网络代理（注入 `HTTP_PROXY` / `HTTPS_PROXY` 给 `skills` 子进程，供 git 克隆仓库使用）；
  - `skills` CLI 路径（留空自动探测）与连通性测试；
  - CLI 版本检查与一键更新（`npm i -g skills@latest`，使用 npmmirror 源）；
  - 浅色 / 深色主题切换。
- **实时日志**：所有 CLI 操作的过程输出在底部日志条中实时滚动，便于排查失败原因。

## 环境要求

| 依赖 | 说明 |
| --- | --- |
| Node.js | 18 及以上 |
| npm | 随 Node.js 安装 |
| Git | 远程安装技能时依赖 `git clone` |
| skills CLI | `npm i -g skills@latest`（应用本身是它的图形外壳，未安装时无法列出/安装技能） |
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

### 打包与预览

```powershell
npm run build   # 构建到 out/
npm run start   # 以生产模式预览构建结果
```

> 仓库只提供构建脚本，未配置安装包生成（electron-builder），`out/` 内为可直接运行的构建产物。

## 使用说明

1. **首次使用**：打开「设置」，点「测试连通性」，确认 `HTTP 可达`、`git 可用`、`CLI 已找到` 三项均为正常。
   - 若 `git` 连接 GitHub 失败（常见于国内网络），在「网络代理」填入本机代理地址（如 `127.0.0.1:7897`）并保存，再次测试。
2. **查看技能**：进入「技能库」，用顶部「全局 / 项目」切换作用域；项目作用域需要先选择项目目录。点列表项可在右侧查看技能说明。
3. **安装技能**：进入「安装技能」。
   - 「仓库 / 本地路径」页签：填入来源 → 预览技能 → 勾选要装的技能；
   - 「搜索 skills.sh」页签：输入关键词（至少 2 个字符）→ 搜索结果点「安装」自动回填来源；
   - 在右侧确认目标 Agent 与作用域后点「开始安装」。
4. **卸载 / 更新**：在「技能库」选中技能后点「卸载」，或点顶部「更新」批量更新已安装技能。
5. **新建技能**：进入「新建技能」，选择目录、填写名称（小写字母、数字、连字符），生成后用「技能库」查看。



## 配置说明

- 设置项保存在 Electron 用户数据目录的 `settings.json` 中（Windows 位于 `%APPDATA%/skills-desktop/`），包含代理、CLI 路径、主题、默认 Agent、最近项目目录。
- 代理只作用于本应用启动的 `skills` 子进程，不修改系统代理。
- 渲染进程开启了 `contextIsolation`、关闭了 `nodeIntegration`，所有系统能力通过 preload 暴露的白名单 API 调用；读取技能详情前会校验路径必须在最近一次列表结果中。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 提示「未找到 skills CLI」 | 执行 `npm i -g skills@latest`，或到设置页手动指定 `bin/cli.mjs` 路径 |
| 远程安装失败、日志显示 git 超时 | 在设置页填写代理后重新测试连通性；或改用本地路径安装 |
| 预览不到技能 | 检查来源格式（`owner/repo` 或完整的 GitHub URL），确认网络与代理 |
| 技能列表为空 | 确认作用域（全局/项目）与项目目录是否正确，先安装至少一个技能 |
