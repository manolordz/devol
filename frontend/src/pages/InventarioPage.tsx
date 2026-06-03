import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Save, ChevronUp, ChevronDown, Search, X, Filter } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageUpload, { SmallImageUpload } from '../components/ImageUpload'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import type { InventoryItem, Store, Client, Currency, InventoryStatus, ItemStatus } from '../types'

const INVENTORY_STATUSES: InventoryStatus[] = ['Visto', 'Petición', 'Comprado', 'Reservado', 'Cancelado']
const ITEM_STATUSES: ItemStatus[] = ['Disponible', 'Apartado 50%', 'Vendido', 'Cancelado', 'Devol']
const CURRENCIES: Currency[] = ['JPY', 'USD', 'MXN']

const inventoryColors: Record<InventoryStatus, string> = {
  'Visto': 'bg-blue-50 text-blue-700',
  'Petición': 'bg-yellow-50 text-yellow-700',
  'Comprado': 'bg-green-50 text-green-700',
  'Reservado': 'bg-purple-50 text-purple-700',
  'Cancelado': 'bg-gray-100 text-gray-500',
}
const statusColors: Record<ItemStatus, string> = {
  'Disponible': 'bg-green-50 text-green-700',
  'Apartado 50%': 'bg-yellow-50 text-yellow-700',
  'Vendido': 'bg-blue-50 text-blue-700',
  'Cancelado': 'bg-gray-100 text-gray-500',
  'Devol': 'bg-red-50 text-red-700',
}

const fmtMXN = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

type SortDir = 'asc' | 'desc'

export default function InventarioPage() {
  const { user, toMXN, rates } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<InventoryItem>>>({})
  const [photoFiles, setPhotoFiles] = useState<Record<number, File>>({})
  const [sortField, setSortField] = useState<keyof InventoryItem>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

  // Add form state
  const [form, setForm] = useState({ brand: '', model: '', price: '', currency: 'JPY' as Currency, store_id: '', inventory_status: 'Visto' as InventoryStatus })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [inv, str, cli] = await Promise.all([
        api.get('/inventory'),
        api.get('/stores'),
        api.get('/clients'),
      ])
      setItems(inv.data)
      setStores(str.data)
      setClients(cli.data)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filteredItems = useMemo(() => {
    let result = [...items]
    Object.entries(filters).forEach(([field, val]) => {
      if (!val) return
      result = result.filter(item => {
        const v = item[field as keyof InventoryItem]
        return String(v ?? '').toLowerCase().includes(val.toLowerCase())
      })
    })
    result.sort((a, b) => {
      const av = a[sortField] ?? '', bv = b[sortField] ?? ''
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [items, filters, sortField, sortDir])

  const hasPending = Object.keys(pendingChanges).length > 0

  const handleCellChange = (itemId: number, field: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value }
    }))
  }

  const handlePhotoChange = (itemId: number, file: File | null) => {
    if (file) {
      setPhotoFiles(prev => ({ ...prev, [itemId]: file }))
      setPendingChanges(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}) } }))
    }
  }

  const saveAllChanges = async () => {
    const saves = Object.entries(pendingChanges).map(async ([idStr, changes]) => {
      const id = parseInt(idStr)
      const formData = new FormData()
      Object.entries(changes).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, String(v))
      })
      if (photoFiles[id]) formData.append('photo', photoFiles[id])
      await api.put(`/inventory/${id}`, formData)
    })
    await Promise.all(saves)
    setPendingChanges({})
    setPhotoFiles({})
    await loadAll()
  }

  const handleAdd = async () => {
    if (!form.brand || !form.model || !form.price) return setAddError('Marca, modelo y precio son requeridos')
    setAddLoading(true)
    setAddError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (photoFile) fd.append('photo', photoFile)
      const { data } = await api.post('/inventory', fd)
      setItems(prev => [data, ...prev])
      setAddOpen(false)
      setForm({ brand: '', model: '', price: '', currency: 'JPY', store_id: '', inventory_status: 'Visto' })
      setPhotoFile(null)
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Error al agregar')
    } finally {
      setAddLoading(false)
    }
  }

  const SortIcon = ({ field }: { field: keyof InventoryItem }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />
      : <span className="opacity-0 group-hover:opacity-50"><ChevronUp size={12} className="inline" /></span>

  const getValue = (item: InventoryItem, field: string): any =>
    (pendingChanges[item.id] as any)?.[field] ?? (item as any)[field]

  const costoMXN = (item: InventoryItem) => {
    const price = (pendingChanges[item.id] as any)?.price ?? item.price
    const currency = (pendingChanges[item.id] as any)?.currency ?? item.currency
    return toMXN(parseFloat(price), currency)
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando inventario...</div>

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Inventario</h1>
          <p className="text-xs text-gray-400">{items.length} artículos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || Object.values(filters).some(f => f) ? 'bg-gold text-navy' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter size={15} />
          </button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Pending changes bar */}
      {hasPending && (
        <div className="sticky top-0 z-20 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between shadow-md">
          <span className="text-sm font-medium text-yellow-800">
            {Object.keys(pendingChanges).length} cambio(s) pendiente(s)
          </span>
          <div className="flex gap-2">
            <button onClick={() => { setPendingChanges({}); setPhotoFiles({}) }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded">
              Cancelar
            </button>
            <button onClick={() => setPinOpen(true)}
              className="flex items-center gap-1.5 bg-navy text-gold text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-navy-light transition-colors">
              <Save size={14} />
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: 'photo', label: 'Foto', sortable: false },
                  { key: 'brand', label: 'Marca', sortable: true },
                  { key: 'model', label: 'Modelo', sortable: true },
                  { key: 'price', label: 'Precio', sortable: true },
                  { key: 'currency', label: 'Moneda', sortable: true },
                  { key: 'costo_mxn', label: 'Costo MXN', sortable: true },
                  { key: 'costo_sugerido', label: 'Sugerido', sortable: false },
                  { key: 'precio_publicado', label: 'Publicado', sortable: false },
                  { key: 'inventory_status', label: 'Inventario', sortable: true },
                  { key: 'status', label: 'Estado', sortable: true },
                  { key: 'client_name', label: 'Cliente', sortable: true },
                  { key: 'delivered', label: 'Entregado', sortable: false },
                  { key: 'paqueteria', label: 'Paquetería', sortable: false },
                  { key: 'store_name', label: 'Tienda', sortable: true },
                ].map(col => (
                  <th key={col.key}
                    className={`th group ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key as keyof InventoryItem)}>
                    {col.label} <SortIcon field={col.key as keyof InventoryItem} />
                  </th>
                ))}
              </tr>
              {/* Filter row */}
              {showFilters && (
                <tr className="bg-white border-b border-gray-100">
                  {['photo','brand','model','price','currency','costo_mxn','costo_sugerido','precio_publicado','inventory_status','status','client_name','delivered','paqueteria','store_name'].map(key => (
                    <td key={key} className="px-2 py-1">
                      {!['photo','costo_mxn','costo_sugerido','delivered','paqueteria'].includes(key) && (
                        <input
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gold"
                          placeholder="Filtrar..."
                          value={filters[key] || ''}
                          onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.length === 0 ? (
                <tr><td colSpan={14} className="text-center py-12 text-gray-400">No hay artículos</td></tr>
              ) : filteredItems.map(item => {
                const isDirty = !!pendingChanges[item.id] || !!photoFiles[item.id]
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isDirty ? 'bg-yellow-50/60' : ''}`}>
                    {/* Photo */}
                    <td className="td">
                      <SmallImageUpload
                        value={photoFiles[item.id] ? undefined : item.photo}
                        preview={photoFiles[item.id] ? URL.createObjectURL(photoFiles[item.id]) : undefined}
                        onChange={f => handlePhotoChange(item.id, f)}
                      />
                    </td>
                    {/* Brand */}
                    <td className="td">
                      <input className="w-24 input py-1 text-xs" value={getValue(item, 'brand') ?? ''}
                        onChange={e => handleCellChange(item.id, 'brand', e.target.value)} />
                    </td>
                    {/* Model */}
                    <td className="td">
                      <input className="w-28 input py-1 text-xs" value={getValue(item, 'model') ?? ''}
                        onChange={e => handleCellChange(item.id, 'model', e.target.value)} />
                    </td>
                    {/* Price */}
                    <td className="td">
                      <input type="number" className="w-20 input py-1 text-xs" value={getValue(item, 'price') ?? ''}
                        onChange={e => handleCellChange(item.id, 'price', e.target.value)} />
                    </td>
                    {/* Currency */}
                    <td className="td">
                      <select className="select py-1 text-xs w-16" value={getValue(item, 'currency')}
                        onChange={e => handleCellChange(item.id, 'currency', e.target.value)}>
                        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    {/* Costo MXN */}
                    <td className="td font-medium text-navy whitespace-nowrap">
                      {fmtMXN(costoMXN(item))}
                    </td>
                    {/* Sugerido */}
                    <td className="td text-gray-500 whitespace-nowrap">
                      {fmtMXN(costoMXN(item) * 1.45)}
                    </td>
                    {/* Publicado */}
                    <td className="td">
                      <input className="w-24 input py-1 text-xs" value={getValue(item, 'precio_publicado') ?? ''}
                        onChange={e => handleCellChange(item.id, 'precio_publicado', e.target.value)}
                        placeholder="—" />
                    </td>
                    {/* Inventario status */}
                    <td className="td">
                      <select className={`select py-1 text-xs w-28 font-medium ${inventoryColors[getValue(item, 'inventory_status') as InventoryStatus]}`}
                        value={getValue(item, 'inventory_status')}
                        onChange={e => handleCellChange(item.id, 'inventory_status', e.target.value)}>
                        {INVENTORY_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    {/* Item status */}
                    <td className="td">
                      <select className={`select py-1 text-xs w-28 font-medium ${statusColors[getValue(item, 'status') as ItemStatus]}`}
                        value={getValue(item, 'status')}
                        onChange={e => handleCellChange(item.id, 'status', e.target.value)}>
                        {ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    {/* Cliente */}
                    <td className="td">
                      <select className="select py-1 text-xs w-28"
                        value={getValue(item, 'client_id') ?? ''}
                        onChange={e => handleCellChange(item.id, 'client_id', e.target.value || null)}>
                        <option value="">—</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    {/* Entregado */}
                    <td className="td text-center">
                      <input type="checkbox" className="w-4 h-4 accent-navy rounded cursor-pointer"
                        checked={getValue(item, 'delivered') == 1 || getValue(item, 'delivered') === true}
                        onChange={e => handleCellChange(item.id, 'delivered', e.target.checked ? 1 : 0)} />
                    </td>
                    {/* Paquetería */}
                    <td className="td text-center">
                      <input type="checkbox" className="w-4 h-4 accent-gold rounded cursor-pointer"
                        checked={getValue(item, 'paqueteria') == 1 || getValue(item, 'paqueteria') === true}
                        onChange={e => handleCellChange(item.id, 'paqueteria', e.target.checked ? 1 : 0)} />
                    </td>
                    {/* Tienda */}
                    <td className="td">
                      <select className="select py-1 text-xs w-24"
                        value={getValue(item, 'store_id') ?? ''}
                        onChange={e => handleCellChange(item.id, 'store_id', e.target.value || null)}>
                        <option value="">—</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Agregar artículo"
        footer={<>
          <button onClick={() => setAddOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleAdd} disabled={addLoading} className="btn-primary">{addLoading ? 'Guardando...' : 'Guardar'}</button>
        </>}>
        <div className="flex gap-4 mb-4">
          <ImageUpload value={undefined} onChange={f => setPhotoFile(f)} />
          <div className="flex-1 space-y-3">
            <FormField label="Marca" required>
              <input className="input" placeholder="Ej: Sony" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </FormField>
            <FormField label="Modelo" required>
              <input className="input" placeholder="Ej: WH-1000XM5" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </FormField>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Precio" required>
            <input type="number" className="input" placeholder="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </FormField>
          <FormField label="Moneda">
            <select className="select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Tienda">
            <select className="select" value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Inventario">
            <select className="select" value={form.inventory_status} onChange={e => setForm(f => ({ ...f, inventory_status: e.target.value as InventoryStatus }))}>
              {INVENTORY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
        {form.price && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Costo MXN:</span>
              <span className="font-semibold text-navy">{fmtMXN(toMXN(parseFloat(form.price) || 0, form.currency))}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Precio sugerido (×1.45):</span>
              <span className="font-semibold text-navy">{fmtMXN(toMXN(parseFloat(form.price) || 0, form.currency) * 1.45)}</span>
            </div>
          </div>
        )}
        {addError && <p className="mt-2 text-red-500 text-sm">{addError}</p>}
      </Modal>

      {/* PIN Modal */}
      <PinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={saveAllChanges}
        title="Confirmar cambios"
      />
    </div>
  )
}
