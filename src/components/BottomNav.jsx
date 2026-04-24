import { Map, Camera, Images, User, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isMobile } from '../utils/helpers'
import { motion } from 'framer-motion'

const TABS = [
  { path: '/', icon: Map, label: 'Map', showAlways: true },
  { path: '/capture', icon: Camera, label: 'Capture', mobileOnly: true },
  { path: '/report', icon: Plus, label: 'Report', showAlways: true },
  { path: '/gallery', icon: Images, label: 'My Photos', showAlways: true },
  { path: '/profile', icon: User, label: 'Profile', showAlways: true },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const mobile = isMobile()

  const visibleTabs = TABS.filter(tab => {
    if (tab.mobileOnly && !mobile) return false
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="max-w-lg mx-auto flex">
        {visibleTabs.map((tab) => {
          const active = location.pathname === tab.path
          const Icon = tab.icon

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${
                active ? 'text-lime' : 'text-txt3'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-[20%] right-[20%] h-[2px] bg-lime rounded-b"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
