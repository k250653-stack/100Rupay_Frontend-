import { useAuth } from '../context/AuthContext'
import { useIssues } from '../context/IssuesContext'

export default function TopBar() {
  const { user } = useAuth()
  const { issues } = useIssues()

  const activeCount = issues.filter(i => i.status === 'active').length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-5 h-[78px]">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="100 Rupay"
          className="h-[66px] w-auto object-contain select-none"
          draggable={false}
        />

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-border2 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
            <span className="font-mono text-[9px] text-txt2">{activeCount} active</span>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-lime/10 border border-lime/20 rounded-full">
              <span className="font-mono text-[10px] font-semibold text-lime">
                {user.tokens} tokens
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
