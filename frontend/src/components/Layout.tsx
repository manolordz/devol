import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function Layout() {
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-navy px-4 py-3 flex items-center justify-between flex-shrink-0 md:hidden">
          <div>
            <div className="text-xl font-bold text-gold tracking-tight">Devol</div>
            {user?.projectName && (
              <div className="text-[10px] text-gray-400 leading-none">{user.projectName}</div>
            )}
          </div>
          <Link
            to="/admin"
            className="text-[10px] text-gray-400 hover:text-gold transition-colors font-medium uppercase tracking-wide"
          >
            Admin
          </Link>
        </header>

        {/* Desktop header bar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-100 px-6 py-3 flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-800 capitalize">
              {user?.projectName || 'Proyecto'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-xs text-gray-500 hover:text-navy transition-colors font-medium"
            >
              Admin
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
