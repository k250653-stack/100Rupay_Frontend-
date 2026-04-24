import { MapPin, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/helpers'

const FILTERS = ['all', 'urgent', 'road', 'sanitation', 'electrical', 'water', 'safety']

function formatRupees(rupees) {
  if (rupees < 100000) return `₨ ${rupees.toLocaleString()}`
  return `₨ ${(rupees / 100000).toFixed(1)}L`
}

function getStatusBadge(issue) {
  if (issue.severity >= 4 && issue.status !== 'funded') {
    return { label: 'URGENT', cls: 'bg-urgent/15 text-urgent border-urgent/30' }
  }
  if (issue.status === 'funded') {
    return { label: 'FUNDED', cls: 'bg-mint/15 text-mint border-mint/30' }
  }
  if (issue.status === 'active') {
    return { label: 'ACTIVE', cls: 'bg-lime/15 text-lime border-lime/30' }
  }
  return { label: 'PENDING', cls: 'bg-border2 text-txt3 border-border2' }
}

function getProgressColor(issue) {
  if (issue.status === 'funded') return '#60f5c0'
  if (issue.severity >= 4) return '#f55a5a'
  if (issue.severity === 3) return '#c8f560'
  if (issue.severity === 2) return '#f5a623'
  return '#5a635a'
}

function StatCell({ label, value, valueClass = 'text-txt' }) {
  return (
    <div className="bg-surface px-3 py-3 flex flex-col items-center gap-1">
      <span className="font-mono text-[8px] uppercase tracking-wider text-txt3 whitespace-nowrap">{label}</span>
      <span className={`font-mono text-base font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

function IssueCard({ issue, selected, onClick }) {
  const badge = getStatusBadge(issue)
  const color = getProgressColor(issue)
  const percent = Math.min(100, Math.round((issue.tokensPledged / issue.tokensGoal) * 100))
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border2 transition-colors ${
        selected ? 'bg-surface2' : 'hover:bg-surface2'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-sm text-txt leading-tight flex-1">{issue.title}</h4>
        <span className={`shrink-0 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="flex items-center gap-1 font-mono text-[9px] text-txt3 mb-2">
        <MapPin size={9} />
        {issue.lat.toFixed(4)}° N, {issue.lng.toFixed(4)}° E
      </div>
      <div className="h-1 bg-border2 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[9px] text-txt3">
        <span>{issue.tokensPledged} / {issue.tokensGoal} Units</span>
        <span className="text-lime font-semibold">
          ₨ {(issue.tokensPledged * 100).toLocaleString()} raised
        </span>
      </div>
    </button>
  )
}

export default function IssuesSidebar({
  allIssues,
  filteredIssues,
  filter,
  setFilter,
  onSelectIssue,
  selectedIssueId,
  onClose,
}) {
  const navigate = useNavigate()
  const activeCount = allIssues.filter(i => i.status === 'active').length
  const fundedCount = allIssues.filter(i => i.status === 'funded').length
  const totalRaised = allIssues.reduce((s, i) => s + i.tokensPledged * 100, 0)

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-border shrink-0">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all border ${
              filter === f
                ? 'bg-lime/15 border-lime/30 text-lime'
                : 'bg-transparent border-border2 text-txt3 hover:text-txt2'
            }`}
          >
            {f === 'all' ? 'All Issues' : f === 'urgent' ? '🔴 Urgent' : CATEGORIES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-px bg-border shrink-0">
        <StatCell label="Active Issues" value={activeCount} />
        <StatCell label="Total Raised" value={formatRupees(totalRaised)} valueClass="text-lime" />
        <StatCell label="Verify Rate" value="97%" valueClass="text-mint" />
      </div>

      {/* The Ballot header + Report button */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border shrink-0">
        <div>
          <h3 className="font-semibold text-sm text-txt leading-none">The Ballot</h3>
          <p className="font-mono text-[9px] text-txt3 mt-1.5">
            {activeCount} active · {fundedCount} fully funded
          </p>
        </div>
        <button
          onClick={() => {
            onClose?.()
            navigate('/report')
          }}
          className="flex items-center gap-1 bg-lime text-bg font-mono text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full hover:brightness-110 transition"
        >
          <Plus size={12} strokeWidth={3} /> Report
        </button>
      </div>

      {/* Scrollable issue list */}
      <div className="flex-1 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-[11px] text-txt3">
            No issues match this filter
          </div>
        ) : (
          filteredIssues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              selected={selectedIssueId === issue.id}
              onClick={() => onSelectIssue(issue)}
            />
          ))
        )}
      </div>
    </div>
  )
}
