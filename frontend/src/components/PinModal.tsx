import { useState, useEffect, useRef } from 'react'
import { X, Delete } from 'lucide-react'
import api from '../api'

interface PinModalProps {
  isOpen: boolean
  onSuccess: () => void
  onClose: () => void
  title?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export default function PinModal({ isOpen, onSuccess, onClose, title = 'Confirmar con PIN' }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (isOpen) { setPin(''); setError('') }
  }, [isOpen])

  useEffect(() => {
    if (pin.length === 4) verifyPin()
  }, [pin])

  const verifyPin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/verify-pin', { pin })
      if (data.valid) {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setPin('')
      setError(err.response?.data?.error || 'PIN incorrecto')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (key: string) => {
    if (loading) return
    if (key === '⌫') {
      setPin(p => p.slice(0, -1))
      setError('')
    } else if (key === '✓') {
      if (pin.length === 4) verifyPin()
    } else if (pin.length < 4) {
      setPin(p => p + key)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 ${shake ? 'animate-shake' : ''}`}
        style={{ animation: shake ? 'shake 0.4s ease-in-out' : undefined }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-navy text-center mb-1">{title}</h2>
        <p className="text-xs text-gray-500 text-center mb-5">Ingresa tu PIN de 4 dígitos</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length ? 'bg-navy border-navy scale-110' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mb-3 font-medium">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map(key => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={loading}
              className={`
                h-14 rounded-xl font-semibold text-lg transition-all active:scale-95 select-none
                ${key === '✓'
                  ? 'bg-navy text-gold hover:bg-navy-hover'
                  : key === '⌫'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-50 text-navy hover:bg-gray-100'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {key === '⌫' ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  )
}
