import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FolderOpen, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProjectSelectPage() {
  const navigate = useNavigate()
  const { user, projects, selectProject, logout } = useAuth()
  const [selecting, setSelecting] = useState<number | null>(null)
  const [error, setError] = useState('')

  const handleSelect = async (projectId: number) => {
    setSelecting(projectId)
    setError('')
    try {
      await selectProject(projectId)
      navigate('/app/inventario')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al seleccionar proyecto')
    } finally {
      setSelecting(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
      <Link to="/admin" className="absolute top-4 right-4 text-xs text-gray-500 hover:text-gold transition-colors font-medium">
        Admin
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-gold mb-1">Devol</div>
          <div className="text-gray-400 text-sm">
            Hola, <span className="text-white font-medium">{user?.userName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Selecciona un proyecto para continuar</div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No tienes proyectos asignados</p>
            <p className="text-xs mt-1 text-gray-500">Contacta al administrador</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                disabled={selecting !== null}
                className="w-full bg-white rounded-2xl p-4 text-left flex items-center gap-4 hover:bg-gray-50 transition-all shadow-lg disabled:opacity-60 active:scale-[0.99] group"
              >
                <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center flex-shrink-0 group-hover:bg-navy-light transition-colors">
                  <FolderOpen size={22} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-navy text-base truncate">{project.name}</div>
                  {project.date && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                      <Calendar size={11} />
                      {new Date(project.date + 'T00:00:00').toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
                {selecting === project.id ? (
                  <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="text-gray-300 text-lg">›</div>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
