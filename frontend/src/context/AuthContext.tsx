import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'
import type { AuthUser, CurrencyRates, Project } from '../types'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  rates: CurrencyRates
  projects: Project[]
  login: (userId: number, pin: string) => Promise<void>
  selectProject: (projectId: number) => Promise<void>
  logout: () => void
  refreshRates: () => Promise<void>
  toMXN: (amount: number, currency: string) => number
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEFAULT_RATES: CurrencyRates = { jpy_to_mxn: 0.12, usd_to_mxn: 17.0 }

function decodeToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    const payload = JSON.parse(json)
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('devol_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = localStorage.getItem('devol_token')
    return t ? decodeToken(t) : null
  })
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('devol_projects') || '[]')
    } catch { return [] }
  })
  const [rates, setRates] = useState<CurrencyRates>(DEFAULT_RATES)

  const refreshRates = useCallback(async () => {
    try {
      const { data } = await api.get('/resumen/rates')
      setRates(data)
    } catch {
      // Use defaults if not accessible
    }
  }, [])

  useEffect(() => {
    refreshRates()
  }, [refreshRates])

  const saveToken = (newToken: string) => {
    localStorage.setItem('devol_token', newToken)
    setToken(newToken)
    const decoded = decodeToken(newToken)
    setUser(decoded)
    return decoded
  }

  const login = async (userId: number, pin: string) => {
    const { data } = await api.post('/auth/login', { userId, pin })
    saveToken(data.token)
    const activeProjects = (data.projects || []).filter((p: Project) => p.status === 'active')
    setProjects(activeProjects)
    sessionStorage.setItem('devol_projects', JSON.stringify(activeProjects))
  }

  const selectProject = async (projectId: number) => {
    const { data } = await api.post('/auth/select-project', { projectId })
    saveToken(data.token)
    await refreshRates()
  }

  const logout = () => {
    localStorage.removeItem('devol_token')
    sessionStorage.removeItem('devol_projects')
    setToken(null)
    setUser(null)
    setProjects([])
  }

  const toMXN = useCallback((amount: number, currency: string): number => {
    if (currency === 'MXN') return amount
    if (currency === 'JPY') return amount * rates.jpy_to_mxn
    if (currency === 'USD') return amount * rates.usd_to_mxn
    return amount
  }, [rates])

  return (
    <AuthContext.Provider value={{ user, token, rates, projects, login, selectProject, logout, refreshRates, toMXN }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
