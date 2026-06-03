import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronDown, Delete } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import type { User } from '../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (pin.length === 4 && selectedUserId) handleLogin()
  }, [pin])

  const handleKey = (key: string) => {
    if (!selectedUserId) return setError('Selecciona un usuario primero')
    if (loading) return
    setError('')
    if (key === '⌫') {
      setPin(p => p.slice(0, -1))
    } else if (pin.length < 4) {
      setPin(p => p + key)
    }
  }

  const handleLogin = async () => {
    if (!selectedUserId || pin.length !== 4) return
    setLoading(true)
    setError('')
    try {
      await login(selectedUserId, pin)
      navigate('/select-project')
    } catch (err: any) {
      setPin('')
      setError(err.response?.data?.error || 'Error al iniciar sesión')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','']

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative">
      {/* Admin link */}
      <Link to="/admin" className="absolute top-4 right-4 text-xs text-gray-500 hover:text-gold transition-colors font-medium">
        Admin
      </Link>

      <div className={`w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl font-bold text-gold tracking-tight mb-1">Devol</div>
          <div className="text-xs text-gray-500 tracking-widest uppercase">Business Manager</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* User selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Selecciona tu nombre
            </label>
            <div className="relative">
              <select
                value={selectedUserId ?? ''}
                onChange={e => {
                  setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)
                  setPin('')
                  setError('')
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-800 font-medium appearance-none focus:outline-none focus:border-gold transition-colors"
              >
                <option value="">— Seleccionar —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* PIN display */}
          <div className="mb-4 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">PIN</p>
            <div className="flex justify-center gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length ? 'bg-navy border-navy scale-110' : 'border-gray-300'
                }`} />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-center text-red-500 text-sm font-medium mb-3">{error}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {keys.map((key, idx) => (
              key === '' ? (
                <div key={idx} />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  disabled={loading}
                  className={`h-14 rounded-xl font-semibold text-xl transition-all active:scale-95 select-none
                    ${key === '⌫'
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'bg-gray-50 text-navy hover:bg-gray-100'
                    } disabled:opacity-50`}
                >
                  {key === '⌫' ? <Delete size={20} className="mx-auto" /> : key}
                </button>
              )
            ))}
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedUserId || pin.length !== 4 || loading}
            className="mt-4 w-full py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando...' : 'Entrar'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  )
}
