import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronUp, ChevronDown, Filter, Trash2, Edit2 } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import PinModal from '../components/PinModal'
import api from '../api'
import type { Payment, PendingBalance, Client, User, Currency } from '../types'

const CURRENCIES: Currency[] = ['MXN', 'JPY', 'USD']
const fmtMXN = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PagosPage() {
  const [tab, setTab] = useState<'recibidos' | 'pendientes'>('recibidos')
  const [payments, setPayments] = useState<Payment[]>([])
  const [pending, setPending] = useState<PendingBalance[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Payment | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinAction, setPinAction] = useState<(() => Promise<void>) | null>(null)
  const [sortField, setSortField] = useState<keyof Payment>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [form, setForm] = useState({ amount: '', currency: 'MXN' as Currency, paid_by: '', paid_to: '', account: '', note: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [pay, pend, cli, usr] = await Promise.all([
        api.get('/payments'),
        api.get('/payments/pending'),
        api.get('/clients'),
        api.get('/auth/users'),
      ])
      setPayments(pay.data)
      setPending(pend.data)
      setClients(cli.data)
      setUsers(usr.data)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let r = [...payments]
    Object.entries(filters).forEach(([field, val]) => {
      if (!val) return
      r = r.filter(p => String((p as any)[field] ?? '').toLowerCase().includes(val.toLowerCase()))
    })
    r.sort((a, b) => {
      const av = String((a as any)[sortField] ?? ''), bv = String((b as any)[sortField] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return r
  }, [payments, filters, sortField, sortDir])

  const handleSort = (field: keyof Payment) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const requirePin = (action: () => Promise<void>) => {
    setPinAction(() => action)
    setPinOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.amount) return setFormError('Cantidad requerida')
    setFormLoading(true); setFormError('')
    try {
      if (editItem) {
        const { data } = await api.put(`/payments/${editItem.id}`, form)
        setPayments(prev => prev.map(p => p.id === editItem.id ? data : p))
      } else {
        const { data } = await api.post('/payments', form)
        setPayments(prev => [data, ...prev])
      }
      setAddOpen(false); setEditItem(null)
      setForm({ amount: '', currency: 'MXN', paid_by: '', paid_to: '', account: '', note: '' })
      loadAll()
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error')
    } finally { setFormLoading(false) }
  }

  const handleToggleReceived = async (payment: Payment) => {
    requirePin(async () => {
      const { data } = await api.put(`/payments/${payment.id}`, { received: !payment.received })
      setPayments(prev => prev.map(p => p.id === payment.id ? data : p))
      loadAll()
    })
  }

  const openEdit = (item: Payment) => {
    requirePin(async () => {
      setEditItem(item)
      setForm({ amount: String(item.amount), currency: item.currency, paid_by: String(item.paid_by || ''), paid_to: String(item.paid_to || ''), account: item.account || '', note: item.note || '' })
      setAddOpen(true)
    })
  }

  const handleDelete = (item: Payment) => {
    requirePin(async () => {
      await api.delete(`/payments/${item.id}`)
      setPayments(prev => prev.filter(p => p.id !== item.id))
      loadAll()
    })
  }

  // Per-user totals
  const userTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    payments.filter(p => p.received).forEach(p => {
      const name = p.paid_to_name || 'Desconocido'
      totals[name] = (totals[name] || 0) + (p.amount_mxn || 0)
    })
    return totals
  }, [payments])

  const SortIcon = ({ field }: { field: keyof Payment }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando pagos...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Pagos</h1>
        <div className="flex gap-2">
          {tab === 'recibidos' && <>
            <button onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-gold text-navy' : 'bg-gray-100 text-gray-600'}`}>
              <Filter size={15} />
            </button>
            <button onClick={() => { setEditItem(null); setForm({ amount: '', currency: 'MXN', paid_by: '', paid_to: '', account: '', note: '' }); setAddOpen(true) }}
              className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark">
              <Plus size={16} /><span className="hidden sm:inline">Agregar</span>
            </button>
          </>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['recibidos', 'pendientes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'recibidos' ? '💰 Recibidos' : '⏳ Pendientes'}
          </button>
        ))}
      </div>

      {tab === 'recibidos' && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total recibido por usuario</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(userTotals).map(([name, total]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">{name}:</span>
                  <span className="text-sm font-bold text-navy">{fmtMXN(total)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-gray-600">Total:</span>
                <span className="text-sm font-bold text-navy">{fmtMXN(Object.values(userTotals).reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      { key: 'amount', label: 'Cantidad' }, { key: 'currency', label: 'Moneda' },
                      { key: 'amount_mxn', label: 'Pago MXN' }, { key: 'paid_by_name', label: 'Pagado por' },
                      { key: 'paid_to_name', label: 'Pagado a' }, { key: 'account', label: 'Cuenta' },
                      { key: 'note', label: 'Nota' }, { key: 'received', label: 'Recibido' },
                      { key: 'created_at', label: 'Fecha' }, { key: 'actions', label: '' },
                    ].map(col => (
                      <th key={col.key} className={`th ${col.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        onClick={() => col.key !== 'actions' && handleSort(col.key as keyof Payment)}>
                        {col.label} {col.key !== 'actions' && <SortIcon field={col.key as keyof Payment} />}
                      </th>
                    ))}
                  </tr>
                  {showFilters && (
                    <tr className="bg-white border-b border-gray-100">
                      {['amount','currency','amount_mxn','paid_by_name','paid_to_name','account','note','received','created_at',''].map((key, i) => (
                        <td key={i} className="px-2 py-1">
                          {key && (
                            <input className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gold"
                              placeholder="Filtrar..." value={filters[key] || ''}
                              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} />
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400">No hay pagos</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.received ? 'bg-green-50/40' : ''}`}>
                      <td className="td font-semibold">{Number(item.amount).toLocaleString('es-MX')}</td>
                      <td className="td"><span className="badge bg-gray-100 text-gray-600">{item.currency}</span></td>
                      <td className="td font-semibold text-navy">{fmtMXN(item.amount_mxn)}</td>
                      <td className="td">{item.paid_by_name || '—'}</td>
                      <td className="td">{item.paid_to_name || '—'}</td>
                      <td className="td text-gray-500 text-xs">{item.account || '—'}</td>
                      <td className="td text-gray-500 text-xs max-w-[120px] truncate">{item.note || '—'}</td>
                      <td className="td text-center">
                        <input type="checkbox" className="w-4 h-4 accent-green-600 cursor-pointer"
                          checked={item.received} onChange={() => handleToggleReceived(item)} />
                        {item.received_at && <div className="text-[10px] text-gray-400">{new Date(item.received_at).toLocaleDateString('es-MX')}</div>}
                      </td>
                      <td className="td text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString('es-MX')}</td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'pendientes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="th">Cliente</th>
                  <th className="th">Comprado</th>
                  <th className="th">Abonado</th>
                  <th className="th">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">No hay clientes</td></tr>
                ) : pending.map(row => {
                  const rowClass = row.pendiente === 0 ? 'bg-green-50' : row.pendiente < 0 ? 'bg-yellow-50' : ''
                  return (
                    <tr key={row.client_id} className={`${rowClass} hover:opacity-80 transition-opacity`}>
                      <td className="td font-medium">{row.client_name}</td>
                      <td className="td text-navy font-semibold">{fmtMXN(row.comprado)}</td>
                      <td className="td text-green-700 font-semibold">{fmtMXN(row.abonado)}</td>
                      <td className={`td font-bold text-base ${
                        row.pendiente === 0 ? 'text-green-700' : row.pendiente < 0 ? 'text-yellow-700' : 'text-red-600'
                      }`}>
                        {row.pendiente < 0 ? `(+${fmtMXN(Math.abs(row.pendiente))})` : fmtMXN(row.pendiente)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Editar pago' : 'Agregar pago'}
        footer={<>
          <button onClick={() => { setAddOpen(false); setEditItem(null) }} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={formLoading} className="btn-primary">{formLoading ? 'Guardando...' : 'Guardar'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cantidad" required>
            <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </FormField>
          <FormField label="Moneda">
            <select className="select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Pagado por (cliente)">
            <select className="select" value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Pagado a (usuario)">
            <select className="select" value={form.paid_to} onChange={e => setForm(f => ({ ...f, paid_to: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Cuenta (opcional)">
          <input className="input" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} placeholder="Ej: BBVA, PayPal..." />
        </FormField>
        <FormField label="Nota (opcional)">
          <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ej: Pago parcial..." />
        </FormField>
        {formError && <p className="mt-2 text-red-500 text-sm">{formError}</p>}
      </Modal>

      <PinModal isOpen={pinOpen} onClose={() => { setPinOpen(false); setPinAction(null) }}
        onSuccess={async () => { if (pinAction) await pinAction() }} title="Confirmar acción" />
    </div>
  )
}
