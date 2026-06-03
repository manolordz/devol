import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronUp, ChevronDown, Filter, Trash2, Edit2, User } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import PinModal from '../components/PinModal'
import api from '../api'
import type { Client } from '../types'

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Client | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinAction, setPinAction] = useState<(() => Promise<void>) | null>(null)
  const [sortField, setSortField] = useState<keyof Client>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [form, setForm] = useState({ name: '', whatsapp: '', wishlist: '', factura: 'No' as 'No' | 'Sí', anticipo: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [dupWarning, setDupWarning] = useState('')

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/clients')
      setClients(data)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let r = [...clients]
    Object.entries(filters).forEach(([field, val]) => {
      if (!val) return
      r = r.filter(c => String((c as any)[field] ?? '').toLowerCase().includes(val.toLowerCase()))
    })
    r.sort((a, b) => {
      const av = String((a as any)[sortField] ?? ''), bv = String((b as any)[sortField] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return r
  }, [clients, filters, sortField, sortDir])

  const handleSort = (field: keyof Client) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const requirePin = (action: () => Promise<void>) => {
    setPinAction(() => action)
    setPinOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name) return setFormError('Nombre requerido')
    setFormLoading(true); setFormError(''); setDupWarning('')
    try {
      const payload = { ...form, anticipo: form.anticipo ? parseFloat(form.anticipo) : 0 }
      if (editItem) {
        const { data } = await api.put(`/clients/${editItem.id}`, payload)
        setClients(prev => prev.map(c => c.id === editItem.id ? data : c))
      } else {
        const { data } = await api.post('/clients', payload)
        setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setAddOpen(false); setEditItem(null)
      setForm({ name: '', whatsapp: '', wishlist: '', factura: 'No', anticipo: '' })
    } catch (err: any) {
      if (err.response?.data?.duplicate) {
        setDupWarning(err.response.data.error)
      } else {
        setFormError(err.response?.data?.error || 'Error')
      }
    } finally { setFormLoading(false) }
  }

  const openEdit = (item: Client) => {
    requirePin(async () => {
      setEditItem(item)
      setForm({ name: item.name, whatsapp: item.whatsapp || '', wishlist: item.wishlist || '', factura: item.factura, anticipo: String(item.anticipo || '') })
      setAddOpen(true)
    })
  }

  const handleDelete = (item: Client) => {
    requirePin(async () => {
      await api.delete(`/clients/${item.id}`)
      setClients(prev => prev.filter(c => c.id !== item.id))
    })
  }

  const SortIcon = ({ field }: { field: keyof Client }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando clientes...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Clientes</h1>
          <p className="text-xs text-gray-400">{clients.length} clientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-gold text-navy' : 'bg-gray-100 text-gray-600'}`}>
            <Filter size={15} />
          </button>
          <button onClick={() => { setEditItem(null); setForm({ name: '', whatsapp: '', wishlist: '', factura: 'No', anticipo: '' }); setDupWarning(''); setAddOpen(true) }}
            className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark">
            <Plus size={16} /><span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: 'name', label: 'Nombre' }, { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'wishlist', label: 'Wishlist' }, { key: 'factura', label: 'Factura' },
                  { key: 'anticipo', label: 'Anticipo' }, { key: 'created_at', label: 'Registro' },
                  { key: 'actions', label: '' },
                ].map(col => (
                  <th key={col.key} className={`th ${col.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => col.key !== 'actions' && handleSort(col.key as keyof Client)}>
                    {col.label} {col.key !== 'actions' && <SortIcon field={col.key as keyof Client} />}
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="bg-white border-b border-gray-100">
                  {['name','whatsapp','wishlist','factura','anticipo','created_at',''].map((key, i) => (
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
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <User size={36} className="mx-auto mb-2 opacity-30" />
                  No hay clientes registrados
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-semibold text-navy">{item.name}</td>
                  <td className="td text-gray-500">{item.whatsapp || '—'}</td>
                  <td className="td text-gray-500 text-xs max-w-[180px]">
                    <div className="truncate">{item.wishlist || '—'}</div>
                  </td>
                  <td className="td">
                    <span className={`badge ${item.factura === 'Sí' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.factura}
                    </span>
                  </td>
                  <td className="td">{item.anticipo > 0 ? `$${Number(item.anticipo).toLocaleString('es-MX')}` : '—'}</td>
                  <td className="td text-gray-400 text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString('es-MX') : '—'}</td>
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

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Editar cliente' : 'Agregar cliente'}
        footer={<>
          <button onClick={() => { setAddOpen(false); setEditItem(null) }} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={formLoading} className="btn-primary">{formLoading ? 'Guardando...' : 'Guardar'}</button>
        </>}>
        {dupWarning && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
            ⚠️ {dupWarning}
          </div>
        )}
        <FormField label="Nombre completo" required>
          <input className="input" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setDupWarning('') }} placeholder="Ej: María García" />
        </FormField>
        <FormField label="WhatsApp">
          <input className="input" type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+52 55 1234 5678" />
        </FormField>
        <FormField label="Wishlist">
          <textarea className="input min-h-[80px] resize-none" value={form.wishlist} onChange={e => setForm(f => ({ ...f, wishlist: e.target.value }))} placeholder="Artículos que busca..." />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Factura">
            <select className="select" value={form.factura} onChange={e => setForm(f => ({ ...f, factura: e.target.value as 'No' | 'Sí' }))}>
              <option>No</option>
              <option>Sí</option>
            </select>
          </FormField>
          <FormField label="Anticipo pagado">
            <input type="number" className="input" value={form.anticipo} onChange={e => setForm(f => ({ ...f, anticipo: e.target.value }))} placeholder="0" />
          </FormField>
        </div>
        {formError && <p className="mt-2 text-red-500 text-sm">{formError}</p>}
      </Modal>

      <PinModal isOpen={pinOpen} onClose={() => { setPinOpen(false); setPinAction(null) }}
        onSuccess={async () => { if (pinAction) await pinAction() }} title="Confirmar acción" />
    </div>
  )
}
