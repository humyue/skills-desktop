// 一个技能可能装在多个 Agent 目录里，分组后会重复出现，这是真实状态
export function groupByAgent(skills) {
  const map = new Map()
  for (const skill of skills) {
    const agents = skill.agents && skill.agents.length > 0 ? skill.agents : ['未知 Agent']
    for (const agent of agents) {
      if (!map.has(agent)) map.set(agent, [])
      map.get(agent).push(skill)
    }
  }
  return [...map.entries()]
    .map(([agent, list]) => ({
      agent,
      skills: [...list].sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => b.skills.length - a.skills.length || a.agent.localeCompare(b.agent))
}

export default function AgentGroups({
  groups,
  totalUnique,
  agents,
  collapsedKeys,
  onToggle,
  selected,
  onSelect,
  onUninstall
}) {
  return groups.map((group) => {
    const collapsed = collapsedKeys.includes(group.agent)
    const missingCount = Math.max(totalUnique - group.skills.length, 0)

    return (
      <section key={group.agent} className={`agent ${collapsed ? 'collapsed' : ''}`}>
        <button className="agent-head" onClick={() => onToggle(group.agent)}>
          <span className="caret" />
          <h3>{group.agent}</h3>
          <span className="cnt">{group.skills.length} 项</span>
          {agents.length > 1 && (
            <span className="gap">{missingCount > 0 ? `本组缺 ${missingCount} 项` : '本组已装全部'}</span>
          )}
        </button>

        <div className="agent-body">
          {group.skills.map((skill) => {
            const otherAgents = (skill.agents || []).filter((agent) => agent !== group.agent)
            const missingAgents = agents.filter((agent) => !(skill.agents || []).includes(agent))
            const meta = [
              otherAgents.length > 0 ? `也装 ${otherAgents.join('、')}` : '',
              missingAgents.length > 0 ? `未装 ${missingAgents.join('、')}` : ''
            ]
              .filter(Boolean)
              .join(' · ')

            const active = selected.name === skill.name && selected.agent === group.agent

            return (
              <div
                key={`${group.agent}-${skill.name}-${skill.path || 'missing'}`}
                className={`item ${active ? 'sel' : ''}`}
                onClick={() => onSelect(skill, group.agent)}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="name" style={{ display: 'block' }}>
                    {skill.name}
                  </span>
                  {agents.length > 1 && meta && <span className="agents-sm">{meta}</span>}
                </span>
                <button
                  className="un"
                  onClick={(event) => {
                    event.stopPropagation()
                    onUninstall(skill)
                  }}
                >
                  卸载
                </button>
              </div>
            )
          })}
        </div>
      </section>
    )
  })
}
