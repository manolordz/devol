import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ProjectSelectPage from './pages/ProjectSelectPage'
import Layout from './components/Layout'
import InventarioPage from './pages/InventarioPage'
import GastosPage from './pages/GastosPage'
import PagosPage from './pages/PagosPage'
import ClientesPage from './pages/ClientesPage'
import TiendasPage from './pages/TiendasPage'
import PaqueteriaPage from './pages/PaqueteriaPage'
import ResumenPage from './pages/ResumenPage'
import AdminPage from './pages/AdminPage'

function AppRoutes() {
  const { user } = useAuth()

  const isLoggedIn = !!user
  const hasProject = !!user?.projectId

  return (
    <Routes>
      {/* Public */}
      <Route path="/admin" element={<AdminPage />} />

      {/* Auth flow */}
      <Route
        path="/"
        element={
          !isLoggedIn ? <LoginPage /> :
          !hasProject ? <Navigate to="/select-project" replace /> :
          <Navigate to="/app/inventario" replace />
        }
      />
      <Route
        path="/select-project"
        element={
          !isLoggedIn ? <Navigate to="/" replace /> :
          <ProjectSelectPage />
        }
      />

      {/* Main app */}
      <Route
        path="/app"
        element={
          !isLoggedIn ? <Navigate to="/" replace /> :
          !hasProject ? <Navigate to="/select-project" replace /> :
          <Layout />
        }
      >
        <Route index element={<Navigate to="inventario" replace />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="gastos" element={<GastosPage />} />
        <Route path="pagos" element={<PagosPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="tiendas" element={<TiendasPage />} />
        <Route path="paqueteria" element={<PaqueteriaPage />} />
        <Route
          path="resumen"
          element={
            user?.role === 'admin' ? <ResumenPage /> : <Navigate to="/app/inventario" replace />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
