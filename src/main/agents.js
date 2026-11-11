import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TABLE = [
  ['aider-desk', 'AiderDesk', '.aider-desk/skills/', '~/.aider-desk/skills/'],
  ['amp', 'Amp', '.agents/skills/', '~/.config/agents/skills/'],
  ['replit', 'Replit', '.agents/skills/', '~/.config/agents/skills/'],
  ['universal', 'Universal', '.agents/skills/', '~/.config/agents/skills/'],
  ['antigravity', 'Antigravity', '.agents/skills/', '~/.gemini/antigravity/skills/'],
  ['antigravity-cli', 'Antigravity CLI', '.agents/skills/', '~/.gemini/antigravity-cli/skills/'],
  ['astrbot', 'AstrBot', 'data/skills/', '~/.astrbot/data/skills/'],
  ['autohand-code', 'Autohand Code CLI', '.autohand/skills/', '~/.autohand/skills/'],
  ['augment', 'Augment', '.augment/skills/', '~/.augment/skills/'],
  ['bob', 'IBM Bob', '.bob/skills/', '~/.bob/skills/'],
  ['claude-code', 'Claude Code', '.claude/skills/', '~/.claude/skills/'],
  ['openclaw', 'OpenClaw', 'skills/', '~/.openclaw/skills/'],
  ['cline', 'Cline', '.agents/skills/', '~/.agents/skills/'],
  ['dexto', 'Dexto', '.agents/skills/', '~/.agents/skills/'],
  ['kimi-code-cli', 'Kimi Code CLI', '.agents/skills/', '~/.agents/skills/'],
  ['loaf', 'Loaf', '.agents/skills/', '~/.agents/skills/'],
  ['warp', 'Warp', '.agents/skills/', '~/.agents/skills/'],
  ['zed', 'Zed', '.agents/skills/', '~/.agents/skills/'],
  ['codearts-agent', 'CodeArts Agent', '.codeartsdoer/skills/', '~/.codeartsdoer/skills/'],
  ['codebuddy', 'CodeBuddy', '.codebuddy/skills/', '~/.codebuddy/skills/'],
  ['codemaker', 'Codemaker', '.codemaker/skills/', '~/.codemaker/skills/'],
  ['codestudio', 'Code Studio', '.codestudio/skills/', '~/.codestudio/skills/'],
  ['codex', 'Codex', '.agents/skills/', '~/.codex/skills/'],
  ['command-code', 'Command Code', '.commandcode/skills/', '~/.commandcode/skills/'],
  ['continue', 'Continue', '.continue/skills/', '~/.continue/skills/'],
  ['cortex', 'Cortex Code', '.cortex/skills/', '~/.snowflake/cortex/skills/'],
  ['crush', 'Crush', '.crush/skills/', '~/.config/crush/skills/'],
  ['cursor', 'Cursor', '.agents/skills/', '~/.cursor/skills/'],
  ['deepagents', 'Deep Agents', '.agents/skills/', '~/.deepagents/agent/skills/'],
  ['devin', 'Devin for Terminal', '.devin/skills/', '~/.config/devin/skills/'],
  ['droid', 'Droid', '.factory/skills/', '~/.factory/skills/'],
  ['eve', 'Eve', 'agent/skills/', ''],
  ['firebender', 'Firebender', '.agents/skills/', '~/.firebender/skills/'],
  ['forgecode', 'ForgeCode', '.forge/skills/', '~/.forge/skills/'],
  ['gemini-cli', 'Gemini CLI', '.agents/skills/', '~/.gemini/skills/'],
  ['github-copilot', 'GitHub Copilot', '.agents/skills/', '~/.copilot/skills/'],
  ['goose', 'Goose', '.goose/skills/', '~/.config/goose/skills/'],
  ['grok', 'Grok Build', '.grok/skills/', '~/.grok/skills/'],
  ['hermes-agent', 'Hermes Agent', '.hermes/skills/', '~/.hermes/skills/'],
  ['inference-sh', 'inference.sh', '.inferencesh/skills/', '~/.inferencesh/skills/'],
  ['jazz', 'Jazz', '.jazz/skills/', '~/.jazz/skills/'],
  ['junie', 'Junie', '.junie/skills/', '~/.junie/skills/'],
  ['iflow-cli', 'iFlow CLI', '.iflow/skills/', '~/.iflow/skills/'],
  ['kilo', 'Kilo Code', '.kilocode/skills/', '~/.kilocode/skills/'],
  ['kimchi', 'Kimchi', '.kimchi/skills/', '~/.config/kimchi/harness/skills/'],
  ['kiro-cli', 'Kiro CLI', '.kiro/skills/', '~/.kiro/skills/'],
  ['kode', 'Kode', '.kode/skills/', '~/.kode/skills/'],
  ['lingma', 'Lingma', '.lingma/skills/', '~/.lingma/skills/'],
  ['mcpjam', 'MCPJam', '.mcpjam/skills/', '~/.mcpjam/skills/'],
  ['minimax-code', 'MiniMax Code', '.minimax/skills/', '~/.minimax/skills/'],
  ['mistral-vibe', 'Mistral Vibe', '.vibe/skills/', '~/.vibe/skills/'],
  ['moxby', 'Moxby', '.moxby/skills/', '~/.moxby/skills/'],
  ['mux', 'Mux', '.mux/skills/', '~/.mux/skills/'],
  ['opencode', 'OpenCode', '.agents/skills/', '~/.config/opencode/skills/'],
  ['openhands', 'OpenHands', '.openhands/skills/', '~/.openhands/skills/'],
  ['ona', 'Ona', '.ona/skills/', '~/.ona/skills/'],
  ['pi', 'Pi', '.agents/skills/', '~/.agents/skills/'],
  ['posit-assistant', 'Posit Assistant', '.posit/assistant/skills/', '~/.posit/assistant/skills/'],
  ['qoder', 'Qoder', '.qoder/skills/', '~/.qoder/skills/'],
  ['qoder-cn', 'Qoder CN', '.qoder/skills/', '~/.qoder-cn/skills/'],
  ['qwen-code', 'Qwen Code', '.qwen/skills/', '~/.qwen/skills/'],
  ['reasonix', 'Reasonix', '.reasonix/skills/', '~/.reasonix/skills/'],
  ['rovodev', 'Rovo Dev', '.rovodev/skills/', '~/.rovodev/skills/'],
  ['roo', 'Roo Code', '.roo/skills/', '~/.roo/skills/'],
  ['tabnine-cli', 'Tabnine CLI', '.tabnine/agent/skills/', '~/.tabnine/agent/skills/'],
  ['terramind', 'Terramind', '.terramind/skills/', '~/.terramind/skills/'],
  ['tinycloud', 'Tinycloud', '.tinycloud/skills/', '~/.tinycloud/skills/'],
  ['trae', 'Trae', '.trae/skills/', '~/.trae/skills/'],
  ['trae-cn', 'Trae CN', '.trae/skills/', '~/.trae-cn/skills/'],
  ['windsurf', 'Windsurf', '.windsurf/skills/', '~/.codeium/windsurf/skills/'],
  ['zcode', 'ZCode', '.zcode/skills/', '~/.zcode/skills/'],
  ['zencoder', 'Zencoder', '.zencoder/skills/', '~/.zencoder/skills/'],
  ['zenflow', 'Zenflow', '.zencoder/skills/', '~/.zencoder/skills/'],
  ['neovate', 'Neovate', '.neovate/skills/', '~/.neovate/skills/'],
  ['pochi', 'Pochi', '.pochi/skills/', '~/.pochi/skills/'],
  ['promptscript', 'PromptScript', '.agents/skills/', ''],
  ['adal', 'AdaL', '.adal/skills/', '~/.adal/skills/']
]

function expandHome(value) {
  if (!value) return ''
  if (value.startsWith('~')) return join(homedir(), value.slice(1))
  return value
}

// Pi 1.8.0+ 把技能目录迁到通用 ~/.agents/skills，但安装检测仍以 ~/.pi/agent 是否存在为准
const DETECT_OVERRIDES = {
  pi: '~/.pi/agent'
}

export function listAgents() {
  return TABLE.map(([id, displayName, projectPath, globalPath]) => {
    const detectDir = expandHome(DETECT_OVERRIDES[id] || globalPath)
    return {
      id,
      displayName,
      projectPath,
      globalPath,
      detected: Boolean(detectDir) && existsSync(detectDir)
    }
  }).sort((a, b) => {
    if (a.detected !== b.detected) return a.detected ? -1 : 1
    return a.displayName.localeCompare(b.displayName)
  })
}
