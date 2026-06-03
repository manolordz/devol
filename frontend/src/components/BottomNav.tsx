import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, DollarSign, CreditCard, Users, Menu, Store, Package, RefreshCw, BarChart2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const mainTabs = [
  { path: '/app/inventario', icon: ShoppingBag, label: 'Inventario' },
  { path: '/app/gastos', icon: DollarSign, label: 'Gastos' },
  { path: '/app/pagos', icon: CreditCard, label: 'Pagos' },
  { path: '/app/clientes', icon: Users, label: 'Clientes' },
]

export default function BottomNav() {
  const [masOpen, setMasOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleMasItem = (path: string) => {
    setMasOpen(false)
    if (path === 'logout') {
      navigate('/select-project')
    } else {
      navigate(path)
    }
  }

  return (
    <>
      {/* Backdrop for "Más" drawer */}
      {masOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setMasOpen(false)} />
      )}

      {/* "Más" slide-up drawer */}
      {masOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 p-4 pb-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy text-sm">Más opciones</h3>
            <button onClick={() => setMasOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Store, label: '🛍️ Tiendas', action: '/app/tiendas' },
              { icon: Package, label: '📦 Paquetería', action: '/app/paqueteria' },
              { icon: RefreshCw, label: '🔄 Cambiar Proyecto', action: 'logout' },
              ...(user?.role === 'admin' ? [{ icon: BarChart2, label: '🔐 Resumen', action: '/app/resumen' }] : []),
            ].map(item => (
              <button
                key={item.action}
                onClick={() => handleMasItem(item.action)}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-navy border-t border-navy-light"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {mainTabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 px-1 transition-colors ${
                  isActive ? 'text-gold' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              <tab.icon size={20} />
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMasOpen(!masOpen)}
            className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors ${
              masOpen ? 'text-gold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Menu size={20} />
            <span className="text-[10px] mt-0.5 font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
