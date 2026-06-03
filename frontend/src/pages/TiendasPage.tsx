import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronUp, ChevronDown, Filter, Trash2, Edit2, Store } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import PinModal from '../components/PinModal'
import api from '../api'
import type { Store as StoreType } from '../types'

export default function TiendasPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<StoreType | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinAction, setPinAction] = useState<(() => Promise<void>) | null>(null)
  const [sortField, setSortField] = useState<keyof StoreType>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', zone: '', address: '', specialty: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadStores() }, [])

  const loadStores = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/stores')
      setStores(data)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let r = [...stores]
    Object.entries(filters).forEach(([field, val]) => {
      if (!val) return
      r = r.filter(s => String((s as any)[field] ?? '').toLowerCase().includes(val.toLowerCase()))
    })
    r.sort((a, b) => {
      const av = String((a as any)[sortField] ?? ''), bv = String((b as any)[sortField] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return r
  }, [stores, filters, sortField, sortDir])

  const handleSort = (field: keyof StoreType) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const requirePin = (action: () => Promise<void>) => {
    setPinAction(() => action); setPinOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.city || !form.zone) return setFormError('Nombre, ciudad y zona son requeridos')
    setFormLoading(true); setFormError('')
    try {
      if (editItem) {
        const { data } = await api.put(`/stores/${editItem.id}`, form)
        setStores(prev => prev.map(s => s.id === editItem.id ? data : s))
      } else {
        const { data } = await api.post('/stores', form)
        setStores(prev => [...prev, data])
      }
      setAddOpen(false); setEditItem(null)
      setForm({ name: '', city: '', zone: '', address: '', specialty: '' })
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error')
    } finally { setFormLoading(false) }
  }

  const openEdit = (item: StoreType) => {
    requirePin(async () => {
      setEditItem(item)
      setForm({ name: item.name, city: item.city, zone: item.zone, address: item.address || '', specialty: item.specialty || '' })
      setAddOpen(true)
    })
  }

  const handleDelete = (item: StoreType) => {
    requirePin(async () => {
      await api.delete(`/stores/${item.id}`)
      setStores(prev => prev.filter(s => s.id !== item.id))
    })
  }

  const SortIcon = ({ field }: { field: keyof StoreType }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando tiendas...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Tiendas</h1>
          <p className="text-xs text-gray-400">{stores.length} tiendas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-gold text-navy' : 'bg-gray-100 text-gray-600'}`}>
            <Filter size={15} />
          </button>
          <button onClick={() => { setEditItem(null); setForm({ name: '', city: '', zone: '', address: '', specialty: '' }); setAddOpen(true) }}
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
                  { key: 'name', label: 'Tienda' }, { key: 'city', label: 'Ciudad' },
                  { key: 'zone', label: 'Zona' }, { key: 'address', label: 'Dirección' },
                  { key: 'specialty', label: 'Especialidad' }, { key: 'actions', label: '' },
                ].map(col => (
                  <th key={col.key} className={`th ${col.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => col.key !== 'actions' && handleSort(col.key as keyof StoreType)}>
                    {col.label} {col.key !== 'actions' && <SortIcon field={col.key as keyof StoreType} />}
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="bg-white border-b border-gray-100">
                  {['name','city','zone','address','specialty',''].map((key, i) => (
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
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Store size={36} className="mx-auto mb-2 opacity-30" />
                  No hay tiendas registradas
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-semibold text-navy">{item.name}</td>
                  <td className="td">{item.city}</td>
                  <td className="td text-gray-500">{item.zone}</td>
                  <td className="td text-gray-500 text-xs">{item.address || '—'}</td>
                  <td className="td text-gray-500 text-xs">{item.specialty || '—'}</td>
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
        title={editItem ? 'Editar tienda' : 'Agregar tienda'}
        footer={<>
          <button onClick={() => { setAddOpen(false); setEditItem(null) }} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={formLoading} className="btn-primary">{formLoading ? 'Guardando...' : 'Guardar'}</button>
        </>}>
        <FormField label="Nombre de la tienda" required>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Akihabara Electric Town" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ciudad" required>
            <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ej: Tokio" />
          </FormField>
          <FormField label="Zona" required>
            <input className="input" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ej: Akihabara" />
          </FormField>
        </div>
        <FormField label="Dirección (opcional)">
          <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección completa..." />
        </FormField>
        <FormField label="Especialidad (opcional)">
          <input className="input" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ej: Electrónica, Anime, Ropa..." />
        </FormField>
        {formError && <p className="mt-2 text-red-500 text-sm">{formError}</p>}
      </Modal>

      <PinModal isOpen={pinOpen} onClose={() => { setPinOpen(false); setPinAction(null) }}
        onSuccess={async () => { if (pinAction) await pinAction() }} title="Confirmar acción" />
    </div>
  )
}
