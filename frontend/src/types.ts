export interface User {
  id: number
  name: string
  role: 'user' | 'admin'
  enabled?: boolean
  created_at?: string
}

export interface Project {
  id: number
  name: string
  date?: string
  status: 'active' | 'closed'
  created_at?: string
  users?: User[]
}

export interface Store {
  id: number
  project_id: number
  name: string
  city: string
  zone: string
  address?: string
  specialty?: string
  created_at?: string
}

export interface Client {
  id: number
  project_id: number
  name: string
  whatsapp?: string
  wishlist?: string
  factura: 'No' | 'Sí'
  anticipo: number
  created_at?: string
}

export type Currency = 'JPY' | 'USD' | 'MXN'
export type InventoryStatus = 'Visto' | 'Petición' | 'Comprado' | 'Reservado' | 'Cancelado'
export type ItemStatus = 'Apartado 50%' | 'Vendido' | 'Disponible' | 'Cancelado' | 'Devol'

export interface InventoryItem {
  id: number
  project_id: number
  photo?: string
  brand: string
  model: string
  price: number
  currency: Currency
  store_id?: number
  store_name?: string
  inventory_status: InventoryStatus
  status: ItemStatus
  client_id?: number
  client_name?: string
  delivered: boolean
  paqueteria: boolean
  precio_publicado?: string
  shipment_id?: number
  costo_mxn: number
  costo_sugerido: number
  created_at?: string
}

export type ExpenseCategory = 'Mercancía' | 'Vuelos' | 'Transporte' | 'Hospedaje' | 'Comidas' | 'Otros'

export interface Expense {
  id: number
  project_id: number
  description: string
  amount: number
  currency: Currency
  amount_mxn: number
  category: ExpenseCategory
  paid_by: number
  paid_by_name?: string
  created_at: string
}

export interface Payment {
  id: number
  project_id: number
  amount: number
  currency: Currency
  amount_mxn: number
  paid_by?: number
  paid_by_name?: string
  paid_to?: number
  paid_to_name?: string
  account?: string
  note?: string
  received: boolean
  received_at?: string
  created_at: string
}

export interface PendingBalance {
  client_id: number
  client_name: string
  comprado: number
  abonado: number
  pendiente: number
}

export interface Shipment {
  id: number
  project_id: number
  name: string
  carrier: string
  tracking_number: string
  declared_value?: string
  label_photo?: string
  items?: InventoryItem[]
  valor_total_real?: number
  created_at?: string
}

export interface CurrencyRates {
  jpy_to_mxn: number
  usd_to_mxn: number
}

export interface AuthUser {
  userId: number
  userName: string
  role: 'user' | 'admin'
  projectId?: number
  projectName?: string
}
