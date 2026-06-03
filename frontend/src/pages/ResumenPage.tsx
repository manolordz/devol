import { useState, useEffect } from 'react'
import { Download, RefreshCw, TrendingUp, TrendingDown, DollarSign, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

interface ResumenData {
  rates: { jpy_to_mxn: number; usd_to_mxn: number }
  gastos: {
    byCategory: { category: string; total: number }[]
    byUser: { name: string; total: number }[]
    total: number
  }
  ingresos: {
    byUser: { name: string; total: number }[]
    totalReceived: number
    totalPending: number
  }
  utilidad: { totalGastos: number; totalIngresos: number; utilidad: number }
  balances: { name: string; ingresos: number; gastos: number; balance: number }[]
}

const fmtMXN = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ResumenPage() {
  const { rates, refreshRates } = useAuth()
  const [data, setData] = useState<ResumenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [jpyRate, setJpyRate] = useState('')
  const [usdRate, setUsdRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [rateMsg, setRateMsg] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setJpyRate(String(rates.jpy_to_mxn))
    setUsdRate(String(rates.usd_to_mxn))
  }, [rates])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: resumen } = await api.get('/resumen')
      setData(resumen)
      setJpyRate(String(resumen.rates.jpy_to_mxn))
      setUsdRate(String(resumen.rates.usd_to_mxn))
    } catch {
    } finally { setLoading(false) }
  }

  const saveRates = async () => {
    if (!jpyRate || !usdRate) return
    setSaving(true)
    setRateMsg('')
    try {
      await api.put('/resumen/rates', { jpy_to_mxn: parseFloat(jpyRate), usd_to_mxn: parseFloat(usdRate) })
      await refreshRates()
      await loadData()
      setRateMsg('✓ Tasas actualizadas correctamente')
      setTimeout(() => setRateMsg(''), 3000)
    } catch (err: any) {
      setRateMsg('Error al guardar tasas')
    } finally { setSaving(false) }
  }

  const downloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const response = await api.get('/resumen/pdf', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'resumen_devol.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
    } finally { setDownloadingPdf(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando resumen...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Error al cargar datos</div>

  const isPositive = data.utilidad.utilidad >= 0

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">🔐 Resumen</h1>
        <div className="flex gap-2">
          <button onClick={loadData} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            <RefreshCw size={15} />
          </button>
          <button onClick={downloadPdf} disabled={downloadingPdf}
            className="flex items-center gap-1.5 bg-navy text-gold px-3 py-2 rounded-lg text-sm font-bold hover:bg-navy-light transition-colors disabled:opacity-60">
            <Download size={15} />
            {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Currency rates */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-gold" />
          Tasas de Cambio
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">JPY → MXN</label>
            <input type="number" step="0.001" className="input" value={jpyRate}
              onChange={e => setJpyRate(e.target.value)} placeholder="0.12" />
            <p className="text-[10px] text-gray-400 mt-1">¥1 = {jpyRate || '?'} MXN</p>
          </div>
          <div>
            <label className="label">USD → MXN</label>
            <input type="number" step="0.01" className="input" value={usdRate}
              onChange={e => setUsdRate(e.target.value)} placeholder="17.00" />
            <p className="text-[10px] text-gray-400 mt-1">$1 = {usdRate || '?'} MXN</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveRates} disabled={saving}
            className="flex items-center gap-1.5 bg-gold text-navy px-4 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-60 transition-colors">
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar tasas'}
          </button>
          {rateMsg && <span className={`text-sm font-medium ${rateMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{rateMsg}</span>}
        </div>
      </div>

      {/* Utilidad highlight */}
      <div className={`rounded-xl p-4 shadow-sm ${isPositive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPositive ? <TrendingUp size={20} className="text-green-600" /> : <TrendingDown size={20} className="text-red-600" />}
            <h2 className="font-bold text-sm text-gray-700">Utilidad</h2>
          </div>
          <span className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {fmtMXN(data.utilidad.utilidad)}
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-600">
          <span>Gastos: <strong>{fmtMXN(data.utilidad.totalGastos)}</strong></span>
          <span>Ingresos: <strong>{fmtMXN(data.utilidad.totalIngresos)}</strong></span>
        </div>
      </div>

      {/* Gastos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-bold text-navy mb-3">💸 Gastos</h2>
        <div className="space-y-1 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por categoría</p>
          {data.gastos.byCategory.map(r => (
            <div key={r.category} className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-700">{r.category}</span>
              <span className="text-sm font-semibold text-navy">{fmtMXN(r.total)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-bold text-gray-800">Total</span>
            <span className="text-base font-bold text-navy">{fmtMXN(data.gastos.total)}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por usuario</p>
          {data.gastos.byUser.map(r => (
            <div key={r.name} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-700">{r.name || '—'}</span>
              <span className="text-sm font-semibold">{fmtMXN(r.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Balances */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-bold text-navy mb-3">⚖️ Balances</h2>
        {!data.balances?.length ? (
          <p className="text-sm text-gray-400">Sin datos de usuarios</p>
        ) : (
          <div className="space-y-3">
            {data.balances.map(r => {
              const positive = r.balance >= 0
              return (
                <div key={r.name} className={`rounded-lg p-3 ${positive ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-gray-800">{r.name}</span>
                    <span className={`text-base font-bold ${positive ? 'text-green-700' : 'text-red-700'}`}>
                      {positive ? '' : '-'}{fmtMXN(Math.abs(r.balance))}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Ingresos: <span className="font-semibold text-green-700">{fmtMXN(r.ingresos)}</span></span>
                    <span>Gastos: <span className="font-semibold text-red-600">{fmtMXN(r.gastos)}</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ingresos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-bold text-navy mb-3">💰 Ingresos</h2>
        <div className="space-y-1">
          {data.ingresos.byUser.map(r => (
            <div key={r.name} className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-700">{r.name || '—'}</span>
              <span className="text-sm font-semibold text-green-700">{fmtMXN(r.total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total recibido:</span>
            <span className="font-bold text-green-700">{fmtMXN(data.ingresos.totalReceived)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pendiente por recibir:</span>
            <span className="font-semibold text-yellow-700">{fmtMXN(data.ingresos.totalPending)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
