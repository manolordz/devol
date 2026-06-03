import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, DollarSign, CreditCard, Users, Store, Package, BarChart2, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/app/inventario', icon: ShoppingBag, label: 'Inventario', emoji: '👜' },
  { path: '/app/gastos', icon: DollarSign, label: 'Gastos', emoji: '💸' },
  { path: '/app/pagos', icon: CreditCard, label: 'Pagos', emoji: '💰' },
  { path: '/app/clientes', icon: Users, label: 'Clientes', emoji: '👤' },
  { path: '/app/tiendas', icon: Store, label: 'Tiendas', emoji: '🛍️' },
  { path: '/app/paqueteria', icon: Package, label: 'Paquetería', emoji: '📦' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleChangeProject = () => navigate('/select-project')

  const handleChangeUser = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-navy min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-navy-light">
        <div className="text-3xl font-bold text-gold tracking-tight">Devol</div>
        {user?.projectName && (
          <div className="text-xs text-gray-400 mt-1 truncate">{user.projectName}</div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gold text-navy'
                  : 'text-gray-300 hover:bg-navy-hover hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.emoji}</span>
            {item.label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/app/resumen"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gold text-navy'
                  : 'text-gray-300 hover:bg-navy-hover hover:text-white'
              }`
            }
          >
            <span className="text-base">🔐</span>
            Resumen
          </NavLink>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-navy-light space-y-1">
        <button
          onClick={handleChangeUser}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-navy-hover hover:text-white transition-colors text-left"
          title="Cambiar usuario"
        >
          <LogOut size={12} />
          <span>{user?.userName}</span>
          {user?.role === 'admin' && (
            <span className="text-gold text-[10px] font-semibold uppercase">Admin</span>
          )}
        </button>
        <button
          onClick={handleChangeProject}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-navy-hover hover:text-white transition-colors"
        >
          <RefreshCw size={15} />
          Cambiar Proyecto
        </button>
      </div>
    </aside>
  )
}
