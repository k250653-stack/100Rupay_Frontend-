import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Simple auth — in production this would hit your backend
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('100rupay_user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (user) localStorage.setItem('100rupay_user', JSON.stringify(user))
    else localStorage.removeItem('100rupay_user')
  }, [user])

  const login = (name, phone) => {
    const id = 'USR-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    setUser({ id, name, phone, tokens: 10, reputation: 0, createdAt: Date.now() })
  }

  const logout = () => setUser(null)

  const addTokens = (n) => {
    setUser(prev => prev ? { ...prev, tokens: prev.tokens + n } : prev)
  }

  const spendTokens = (n) => {
    if (!user || user.tokens < n) return false
    setUser(prev => ({ ...prev, tokens: prev.tokens - n }))
    return true
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, addTokens, spendTokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
