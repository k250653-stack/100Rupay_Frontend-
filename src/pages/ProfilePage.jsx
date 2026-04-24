import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useIssues } from '../context/IssuesContext'
import { motion } from 'framer-motion'
import { User, LogOut, Coins, Plus, Shield, TrendingUp } from 'lucide-react'

export default function ProfilePage() {
  const { user, login, logout, addTokens } = useAuth()
  const { issues } = useIssues()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [buyAmount, setBuyAmount] = useState(5)

  const userIssues = user ? issues.filter(i => i.reporterId === user.id) : []

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-lime/10 rounded-full flex items-center justify-center border border-lime/20 mb-4">
              <User size={28} className="text-lime" />
            </div>
            <h2 className="font-semibold text-xl text-txt">Welcome to 100 Rupay</h2>
            <p className="text-[11px] text-txt2 mt-1">Sign in to report and fund issues</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-surface2 border border-border2 rounded-lg text-txt text-sm outline-none focus:border-lime/50 transition"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2.5 bg-surface2 border border-border2 rounded-lg text-txt text-sm outline-none focus:border-lime/50 transition"
              />
            </div>
            <button
              onClick={() => { if (name && phone) login(name, phone) }}
              disabled={!name || !phone}
              className="w-full bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider py-3 rounded-lg hover:brightness-110 transition disabled:opacity-40"
            >
              Sign In →
            </button>
          </div>

          <p className="text-[9px] text-txt3 text-center mt-4">
            Demo mode — no real authentication. Your data is stored locally.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-lg mx-auto px-4 py-5">
        {/* User card */}
        <div className="bg-surface2 rounded-xl border border-border2 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-lime/10 rounded-full flex items-center justify-center border border-lime/20">
                <span className="font-mono text-lg font-bold text-lime">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-base text-txt">{user.name}</h3>
                <span className="font-mono text-[10px] text-txt3">{user.id}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-bg text-txt3 hover:text-urgent transition"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-bg rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Coins size={12} className="text-lime" />
                <span className="font-mono text-[9px] text-txt3 uppercase tracking-wider">Tokens</span>
              </div>
              <span className="font-mono text-lg font-bold text-txt">{user.tokens}</span>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-mint" />
                <span className="font-mono text-[9px] text-txt3 uppercase tracking-wider">Reported</span>
              </div>
              <span className="font-mono text-lg font-bold text-txt">{userIssues.length}</span>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield size={12} className="text-violet" />
                <span className="font-mono text-[9px] text-txt3 uppercase tracking-wider">Rep</span>
              </div>
              <span className="font-mono text-lg font-bold text-txt">{user.reputation}</span>
            </div>
          </div>
        </div>

        {/* Buy tokens */}
        <div className="bg-surface2 rounded-xl border border-border2 p-5 mb-5">
          <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-txt3 mb-4">
            Buy Tokens
          </h4>
          <p className="text-[11px] text-txt2 mb-4">
            Each token = ₨ 100. Buy tokens to fund civic issues in your area.
          </p>

          <div className="flex gap-2 mb-4">
            {[1, 5, 10, 25].map(n => (
              <button
                key={n}
                onClick={() => setBuyAmount(n)}
                className={`flex-1 py-2 rounded-lg font-mono text-[11px] font-semibold transition border ${
                  buyAmount === n
                    ? 'bg-lime/10 border-lime/30 text-lime'
                    : 'bg-bg border-border2 text-txt3'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-bg rounded-lg border border-border2 mb-3">
            <span className="text-[11px] text-txt2">Total</span>
            <span className="font-mono text-sm font-bold text-lime">₨ {(buyAmount * 100).toLocaleString()}</span>
          </div>

          <button
            onClick={() => addTokens(buyAmount)}
            className="w-full flex items-center justify-center gap-2 bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider py-2.5 rounded-lg hover:brightness-110 transition"
          >
            <Plus size={14} />
            Buy {buyAmount} Tokens
          </button>

          <p className="text-[8px] text-txt3 text-center mt-2">
            Demo mode — tokens are added instantly with no real payment.
          </p>
        </div>

        {/* My reports */}
        {userIssues.length > 0 && (
          <div>
            <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-txt3 mb-3">
              My Reports · {userIssues.length}
            </h4>
            <div className="space-y-2">
              {userIssues.map(iss => (
                <div key={iss.id} className="p-3 bg-surface2 rounded-lg border border-border2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-txt">{iss.title}</span>
                    <span className={`font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      iss.status === 'funded' ? 'bg-mint/10 text-mint' : 'bg-lime/10 text-lime'
                    }`}>
                      {iss.status}
                    </span>
                  </div>
                  <div className="h-1 bg-border2 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-lime rounded-full"
                      style={{ width: `${(iss.tokensPledged / iss.tokensGoal) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] text-txt3">
                    <span>{iss.tokensPledged}/{iss.tokensGoal} tokens</span>
                    <span>₨ {(iss.tokensPledged * 100).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
