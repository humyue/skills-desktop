import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { parse as parseYaml } from 'yaml'
import { runCli, stripAnsi } from './cli.js'

export async function listSkills({ scope = 'global', projectPath, cliPath }) {
  const args = ['ls', '--json']
  const cwd = scope === 'global' ? homedir() : projectPath
  if (scope === 'global') args.push('-g')
  if (scope === 'project' && !cwd) throw new Error('请先选择项目目录')
  const { code, output } = await runCli(cliPath, args, { cwd })
  if (code !== 0) throw new Error(output || 'skills ls 执行失败')
  const start = output.indexOf('[')
  if (start === -1) return []
  try {
    return JSON.parse(output.slice(start))
  } catch {
    return []
  }
}

function parseRepoList(raw) {
  const lines = stripAnsi(raw).replace(/\r/g, '').split('\n')
  const start = lines.findIndex((line) => line.includes('Available Skills'))
  if (start === -1) return { skills: [] }
  const skills = []
  let current = null

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    if (line.includes('Use --skill')) break
    if (line.includes('Discover more skills')) break

    // 不依赖框线字符与缩进：按 2 个以上空白切分后取最后一段，兼容不同终端编码
    const parts = line.split(/\s{2,}/).filter(Boolean)
    const content = (parts.length > 1 ? parts[parts.length - 1] : line).trim()
    if (!content) continue
    if (!/[\p{L}\p{N}]/u.test(content)) continue // 纯框线/分隔行
    const isName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(content)
    if (isName) {
      current = { name: content, description: '', group: 'General' }
      skills.push(current)
    } else if (current && !current.description) {
      current.description = content
    }
  }

  return { skills }
}

function buildInstallArgs({ source, skills, agents, global, copy = true }) {
  const args = ['add', source]
  for (const name of skills) args.push('--skill', name)
  for (const agent of agents) args.push('--agent', agent)
  if (copy) args.push('--copy')
  if (global) args.push('-g')
  args.push('-y')
  return args
}

export async function previewRepo({ source, cliPath, onLog }) {
  const { code, output } = await runCli(cliPath, ['add', source, '-l'], { cwd: homedir(), onLog })
  const parsed = parseRepoList(output)
  if (parsed.skills.length === 0) {
    if (code !== 0) throw new Error(cliErrorSummary(output, code))
    const skipped = (stripAnsi(output).match(/\[SKILLS_SKILL_SKIPPED\]/g) || []).length
    if (skipped > 0) {
      throw new Error(`来源中的 ${skipped} 个 SKILL.md 缺少 name / description 前置字段，全部被跳过`)
    }
    const found = /Found (\d+) skills?/.exec(stripAnsi(output))
    if (found && Number(found[1]) > 0) {
      throw new Error(`CLI 报告发现 ${found[1]} 个技能，但界面未能解析出结果，请把下方日志反馈给开发者`)
    }
  }
  return { code, output, skills: parsed.skills }
}

// CLI 的失败原因藏在带错误码或 fatal 的行里，挑出来给界面展示，便于排查
const ERROR_HINTS = {
  SKILLS_NO_VALID_SKILLS:
    '该目录下没有可安装的技能：需要包含带 name 与 description 的 SKILL.md；若目录中有 skills-lock.json，清单里已登记的技能不会重复列出，请改选技能所在目录（如 .agents/skills）',
  SKILLS_LOCAL_PATH_NOT_FOUND: '本地路径不存在，请确认目录没有被移动或删除',
  SKILLS_GIT_CLONE_FAILED: '仓库克隆失败，请检查地址是否正确，以及当前网络能否访问 GitHub'
}

function cliErrorSummary(output, code) {
  const text = stripAnsi(output).replace(/\r/g, '')
  const codeMatch = /\[(SKILLS_[A-Z_]+)\]/.exec(text)
  if (codeMatch && ERROR_HINTS[codeMatch[1]]) return ERROR_HINTS[codeMatch[1]]

  const lines = text
    .split('\n')
    .map((line) => line.replace(/^[│└┌├◇◆■]\s*/, '').trim())
    .filter(Boolean)
  const hits = lines.filter((line) => /\[SKILLS_[A-Z_]+\]|fatal:|Could not resolve|EACCES|EPERM/.test(line))
  const detail = (hits.length > 0 ? hits.slice(0, 3) : lines.slice(-3)).join(' ')
  return detail || `预览失败（退出码 ${code}）`
}

export async function installSkills(options) {
  const { source, skills, agents, scope, projectPath, cliPath, onLog } = options
  if (!source) throw new Error('请填写技能来源')
  if (!skills || skills.length === 0) throw new Error('请至少选择一个技能')
  if (!agents || agents.length === 0) throw new Error('请至少选择一个 Agent')
  const global = scope === 'global'
  const cwd = global ? homedir() : projectPath
  if (!global && !cwd) throw new Error('请先选择项目目录')
  const args = buildInstallArgs({ source, skills, agents, global })
  return runCli(cliPath, args, { cwd, onLog, timeoutMs: 600000 })
}

export async function removeSkills(options) {
  const { names, agents, scope, projectPath, cliPath, onLog } = options
  if (!names || names.length === 0) throw new Error('请选择要卸载的技能')
  const args = ['remove', ...names]
  for (const agent of agents || []) args.push('--agent', agent)
  const global = scope === 'global'
  if (global) args.push('-g')
  args.push('-y')
  return runCli(cliPath, args, {
    cwd: global ? homedir() : projectPath,
    onLog
  })
}

export async function updateSkills(options) {
  const { names, scope, projectPath, cliPath, onLog } = options
  const args = ['update']
  for (const name of names || []) args.push(name)
  args.push(scope === 'global' ? '-g' : '-p')
  args.push('-y')
  return runCli(cliPath, args, {
    cwd: scope === 'global' ? homedir() : projectPath,
    onLog,
    timeoutMs: 600000
  })
}

export function readSkill(skillPath) {
  const file = join(skillPath, 'SKILL.md')
  if (!existsSync(file)) throw new Error('该技能目录下没有 SKILL.md')
  const raw = readFileSync(file, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: {}, body: raw }
  let frontmatter = {}
  try {
    frontmatter = parseYaml(match[1]) || {}
  } catch {
    frontmatter = {}
  }
  return { frontmatter, body: raw.slice(match[0].length) }
}
