import { useState, useEffect, useMemo } from 'react'
import { Plus, Package, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import Modal, { FormField } from '../components/Modal'
import api from '../api'
import type { Shipment, InventoryItem } from '../types'

const fmtMXN = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function PaqueteriaPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [unshipped, setUnshipped] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editShipment, setEditShipment] = useState<Shipment | null>(null)
  const [viewItem, setViewItem] = useState<Shipment | null>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [labelFile, setLabelFile] = useState<File | null>(null)
  const [form, setForm] = useState({ name: '', carrier: '', tracking_number: '', declared_value: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [sortField, setSortField] = useState<keyof Shipment>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ship, unship] = await Promise.all([
        api.get('/shipments'),
        api.get('/inventory/unshipped'),
      ])
      setShipments(ship.data)
      setUnshipped(unship.data)
    } finally { setLoading(false) }
  }

  const sorted = useMemo(() => {
    return [...shipments].sort((a, b) => {
      const av = String((a as any)[sortField] ?? ''), bv = String((b as any)[sortField] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [shipments, sortField, sortDir])

  const handleSort = (field: keyof Shipment) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleItem = (id: number) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const selectedTotal = useMemo(() => {
    return unshipped
      .filter(i => selectedItems.includes(i.id))
      .reduce((sum, i) => sum + (i.costo_mxn || 0), 0)
  }, [unshipped, selectedItems])

  const openEdit = (ship: Shipment) => {
    setEditShipment(ship)
    setForm({ name: ship.name, carrier: ship.carrier, tracking_number: ship.tracking_number, declared_value: ship.declared_value || '' })
    setSelectedItems((ship.items || []).map(i => i.id))
    setLabelFile(null)
    setFormError('')
  }

  const closeForm = () => {
    setAddOpen(false)
    setEditShipment(null)
    setForm({ name: '', carrier: '', tracking_number: '', declared_value: '' })
    setSelectedItems([])
    setLabelFile(null)
    setFormError('')
  }

  const handleSubmit = async () => {
    if (!form.name || !form.carrier || !form.tracking_number) {
      return setFormError('Nombre, paquetería y número de rastreo son requeridos')
    }
    setFormLoading(true); setFormError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      fd.append('item_ids', JSON.stringify(selectedItems))
      if (labelFile) fd.append('label_photo', labelFile)

      if (editShipment) {
        const { data } = await api.put(`/shipments/${editShipment.id}`, fd)
        setShipments(prev => prev.map(s => s.id === data.id ? data : s))
      } else {
        const { data } = await api.post('/shipments', fd)
        setShipments(prev => [data, ...prev])
      }
      closeForm()
      await loadAll()
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error')
    } finally { setFormLoading(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/shipments/${id}`)
      setShipments(prev => prev.filter(s => s.id !== id))
      setDeleteId(null)
      await loadAll()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const SortIcon = ({ field }: { field: keyof Shipment }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 py-20">Cargando paquetería...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Paquetería</h1>
          <p className="text-xs text-gray-400">{shipments.length} paquetes • {unshipped.length} artículos sin asignar</p>
        </div>
        <button onClick={() => { closeForm(); setAddOpen(true) }}
          className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold hover:bg-gold-dark">
          <Plus size={16} /><span className="hidden sm:inline">Nuevo paquete</span>
        </button>
      </div>

      {/* Shipments table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: 'name', label: 'Nombre' }, { key: 'carrier', label: 'Paquetería' },
                  { key: 'tracking_number', label: 'Rastreo' }, { key: 'valor_total_real', label: 'Valor Real' },
                  { key: 'declared_value', label: 'Declarado' }, { key: 'items', label: 'Artículos' },
                  { key: 'created_at', label: 'Fecha' }, { key: 'actions', label: '' },
                ].map(col => (
                  <th key={col.key} className={`th ${!['items','actions'].includes(col.key) ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => !['items','actions'].includes(col.key) && handleSort(col.key as keyof Shipment)}>
                    {col.label} {!['items','actions'].includes(col.key) && <SortIcon field={col.key as keyof Shipment} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  No hay paquetes registrados
                </td></tr>
              ) : sorted.map(ship => (
                <tr key={ship.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-semibold text-navy">{ship.name}</td>
                  <td className="td">{ship.carrier}</td>
                  <td className="td font-mono text-xs text-gray-600">{ship.tracking_number}</td>
                  <td className="td font-semibold">{ship.valor_total_real ? fmtMXN(ship.valor_total_real) : '—'}</td>
                  <td className="td text-gray-500">{ship.declared_value || '—'}</td>
                  <td className="td">
                    <button onClick={() => setViewItem(ship)}
                      className="flex items-center gap-1 text-navy hover:text-gold transition-colors text-xs font-medium">
                      <Package size={12} />
                      {(ship.items?.length || 0)} artículo(s)
                    </button>
                  </td>
                  <td className="td text-gray-400 text-xs">{ship.created_at ? new Date(ship.created_at).toLocaleDateString('es-MX') : '—'}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {ship.label_photo && (
                        <a href={ship.label_photo} target="_blank" rel="noopener noreferrer">
                          <img src={ship.label_photo} alt="etiqueta" className="w-8 h-8 rounded object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      )}
                      <button onClick={() => openEdit(ship)} className="p-1.5 text-gray-400 hover:text-navy rounded transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(ship.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Shipment Modal */}
      <Modal isOpen={addOpen || !!editShipment} onClose={closeForm} title={editShipment ? `Editar: ${editShipment.name}` : 'Nuevo paquete'} size="lg"
        footer={<>
          <button onClick={closeForm} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={formLoading} className="btn-primary">{formLoading ? 'Guardando...' : editShipment ? 'Guardar cambios' : 'Crear paquete'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormField label="Nombre del paquete" required>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Paquete Japón 1" />
          </FormField>
          <FormField label="Paquetería" required>
            <input className="input" value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} placeholder="Ej: DHL, FedEx..." />
          </FormField>
          <FormField label="Número de rastreo" required>
            <input className="input font-mono" value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} placeholder="1Z999AA10123456784" />
          </FormField>
          <FormField label="Valor declarado">
            <input className="input" value={form.declared_value} onChange={e => setForm(f => ({ ...f, declared_value: e.target.value }))} placeholder="Ej: $500 USD" />
          </FormField>
        </div>

        {/* Label photo upload */}
        <FormField label="Foto de la guía (opcional)">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" className="input text-xs"
              onChange={e => setLabelFile(e.target.files?.[0] || null)} />
            {labelFile && <span className="text-xs text-green-600 font-medium">✓ {labelFile.name}</span>}
          </div>
        </FormField>

        {/* Item selection */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Contenido del paquete</label>
            {selectedItems.length > 0 && (
              <span className="text-xs text-navy font-semibold">
                {selectedItems.length} selec. • Valor real: {fmtMXN(selectedTotal)}
              </span>
            )}
          </div>
          {unshipped.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
              No hay artículos marcados para paquetería sin asignar
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
              {unshipped.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`cursor-pointer rounded-xl border-2 p-2 transition-all select-none ${
                    selectedItems.includes(item.id)
                      ? 'border-gold bg-gold/10'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {item.photo && (
                    <img src={item.photo} alt="" className="w-full h-16 object-cover rounded-lg mb-1" />
                  )}
                  {!item.photo && (
                    <div className="w-full h-16 bg-gray-100 rounded-lg mb-1 flex items-center justify-center">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                  <p className="text-[10px] font-semibold text-navy truncate">{item.brand}</p>
                  <p className="text-[10px] text-gray-500 truncate">{item.model}</p>
                  <p className="text-[10px] font-medium text-gold">
                    ${Number(item.costo_mxn || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {formError && <p className="mt-2 text-red-500 text-sm">{formError}</p>}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar paquete" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">Eliminar</button>
        </>}>
        <p className="text-sm text-gray-600">¿Seguro que quieres eliminar este paquete? Los artículos que contenía quedarán sin asignar.</p>
      </Modal>

      {/* View shipment items modal */}
      {viewItem && (
        <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={viewItem.name} size="md">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paquetería:</span>
              <span className="font-medium">{viewItem.carrier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rastreo:</span>
              <span className="font-mono text-xs">{viewItem.tracking_number}</span>
            </div>
            {viewItem.valor_total_real && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor total:</span>
                <span className="font-bold text-navy">{fmtMXN(viewItem.valor_total_real)}</span>
              </div>
            )}
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Artículos ({viewItem.items?.length || 0})</p>
          <div className="space-y-2">
            {(viewItem.items || []).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                {item.photo && <img src={item.photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{item.brand} {item.model}</p>
                  <p className="text-xs text-gray-500">{fmtMXN(item.costo_mxn || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
