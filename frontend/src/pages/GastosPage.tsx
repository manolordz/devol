import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronUp, ChevronDown, Filter, Trash2, Edit2 } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import PinModal from '../components/PinModal'
import api from '../api'
import type { Expense, User, ExpenseCategory, Currency } from '../types'

const CATEGORIES: ExpenseCategory[] = ['Mercancía', 'Vuelos', 'Transporte', 'Hospedaje', 'Comidas', 'Otros']
const CURRENCIES: Currency[] = ['MXN', 'JPY', 'USD']

const catColors: Record<string, string> = {
  'Mercancía': 'bg-purple-50 text-purple-700',
  'Vuelos': 'bg-sky-50 text-sky-700',
  'Transporte': 'bg-orange-50 text-orange-700',
  'Hospedaje': 'bg-teal-50 text-teal-700',
  'Comidas': 'bg-rose-50 text-rose-700',
  'Otros': 'bg-gray-100 text-gray-600',
}

const fmtMXN = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinAction, setPinAction] = useState<(() => Promise<void>) | null>(null)
  const [sortField, setSortField] = useState<keyof Expense>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', currency: 'MXN' as Currency, category: 'Mercancía' as ExpenseCategory, paid_by: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [exp, usr] = await Promise.all([api.get('/expenses'), api.get('/auth/users')])
      setExpenses(exp.data)
      setUsers(usr.data)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let r = [...expenses]
    Object.entries(filters).forEach(([field, val]) => {
      if (!val) return
      r = r.filter(e => String((e as any)[field] ?? '').toLowerCase().includes(val.toLowerCase()))
    })
    r.sort((a, b) => {
      const av = String((a as any)[sortField] ?? ''), bv = String((b as any)[sortField] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return r
  }, [expenses, filters, sortField, sortDir])

  const handleSort = (field: keyof Expense) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const requirePin = (action: () => Promise<void>) => {
    setPinAction(() => action)
    setPinOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.paid_by) return setFormError('Todos los campos marcados son requeridos')
    setFormLoading(true); setFormError('')
    try {
      if (editItem) {
        const { data } = await api.put(`/expenses/${editItem.id}`, form)
        setExpenses(prev => prev.map(e => e.id === editItem.id ? data : e))
      } else {
        const { data } = await api.post('/expenses', form)
        setExpenses(prev => [data, ...prev])
      }
      setAddOpen(false); setEditItem(null)
      setForm({ description: '', amount: '', currency: 'MXN', category: 'Mercancía', paid_by: '' })
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error')
    } finally { setFormLoading(false) }
  }

  const openEdit = (item: Expense) => {
    requirePin(async () => {
      setEditItem(item)
      setForm({ description: item.description, amount: String(item.amount), currency: item.currency, category: item.category, paid_by: String(item.paid_by) })
      setAddOpen(true)
    })
  }

  const handleDelete = (item: Expense) => {
    requirePin(async () => {
      await api.delete(`/expenses/${item.id}`)
      setExpenses(prev => prev.filter(e => e.id !== item.id))
    })
  }

  // Per-user totals
  const userTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    expenses.forEach(e => {
      const name = e.paid_by_name || 'Desconocido'
      totals[name] = (totals[name] || 0) + (e.amount_mxn || 0)
    })
    return totals
  }, [expenses])

  const SortIcon = ({ field }: { field: keyof Expense }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando gastos...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Gastos</h1>
          <p className="text-xs text-gray-400">{expenses.length} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-gold text-navy' : 'bg-gray-100 text-gray-600'}`}>
            <Filter size={15} />
          </button>
          <button onClick={() => { setEditItem(null); setForm({ description: '', amount: '', currency: 'MXN', category: 'Mercancía', paid_by: '' }); setAddOpen(true) }}
            className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors">
            <Plus size={16} /><span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total por usuario</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(userTotals).map(([name, total]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-gray-600">{name}:</span>
              <span className="text-sm font-bold text-navy">{fmtMXN(total)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-600 font-semibold">Total:</span>
            <span className="text-sm font-bold text-navy">{fmtMXN(expenses.reduce((s, e) => s + (e.amount_mxn || 0), 0))}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: 'description', label: 'Descripción' },
                  { key: 'amount', label: 'Gasto' },
                  { key: 'currency', label: 'Moneda' },
                  { key: 'amount_mxn', label: 'Gasto MXN' },
                  { key: 'category', label: 'Categoría' },
                  { key: 'paid_by_name', label: 'Pagado por' },
                  { key: 'created_at', label: 'Fecha' },
                  { key: 'actions', label: '' },
                ].map(col => (
                  <th key={col.key}
                    className={`th ${col.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => col.key !== 'actions' && handleSort(col.key as keyof Expense)}>
                    {col.label} {col.key !== 'actions' && <SortIcon field={col.key as keyof Expense} />}
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="bg-white border-b border-gray-100">
                  {['description','amount','currency','amount_mxn','category','paid_by_name','created_at',''].map((key, i) => (
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
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No hay gastos</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-medium">{item.description}</td>
                  <td className="td">{Number(item.amount).toLocaleString('es-MX')}</td>
                  <td className="td"><span className="badge bg-gray-100 text-gray-600">{item.currency}</span></td>
                  <td className="td font-semibold text-navy">{fmtMXN(item.amount_mxn)}</td>
                  <td className="td"><span className={`badge ${catColors[item.category] || 'bg-gray-100 text-gray-600'}`}>{item.category}</span></td>
                  <td className="td">{item.paid_by_name}</td>
                  <td className="td text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString('es-MX')}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Editar gasto' : 'Agregar gasto'}
        footer={<>
          <button onClick={() => { setAddOpen(false); setEditItem(null) }} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={formLoading} className="btn-primary">{formLoading ? 'Guardando...' : 'Guardar'}</button>
        </>}>
        <FormField label="Descripción" required>
          <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Artículo en Akihabara" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Gasto" required>
            <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </FormField>
          <FormField label="Moneda">
            <select className="select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Categoría" required>
            <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Pagado por" required>
            <select className="select" value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>
        {formError && <p className="mt-2 text-red-500 text-sm">{formError}</p>}
      </Modal>

      <PinModal isOpen={pinOpen} onClose={() => { setPinOpen(false); setPinAction(null) }}
        onSuccess={async () => { if (pinAction) await pinAction() }} title="Confirmar acción" />
    </div>
  )
}
