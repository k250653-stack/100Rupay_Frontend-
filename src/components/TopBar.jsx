import { useAuth } from '../context/AuthContext'
import { useIssues } from '../context/IssuesContext'

export default function TopBar() {
  const { user } = useAuth()
  const { issues } = useIssues()

  const activeCount = issues.filter(i => i.status === 'active').length
  const totalRaised = issues.reduce((sum, i) => sum + i.tokensPledged * 100, 0)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-[52px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-lime rounded-md flex items-center justify-center font-mono text-[10px] font-bold text-bg">
            ₨
          </div>
          <div>
            <div className="font-mono font-semibold text-sm tracking-tight text-txt leading-none">
              100 RUPAY
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 border border-border2 rounded-full">
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
