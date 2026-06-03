import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, Shield, ArrowLeft, ChevronDown, Delete } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Modal, { FormField } from '../components/Modal'
import api from '../api'
import type { User, Project } from '../types'

// Admin auth state
interface AdminUser { userId: number; userName: string; role: 'admin' }

function decodeToken(token: string): AdminUser | null {
  try {
    const parts = token.split('.')
    const p = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (p.exp && p.exp * 1000 < Date.now()) return null
    return p
  } catch { return null }
}

// --- Admin Login Screen ---
function AdminLogin({ onLogin }: { onLogin: (user: AdminUser, token: string) => void }) {
  const [admins, setAdmins] = useState<{ id: number; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    api.get('/admin/admins').then(r => setAdmins(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (pin.length === 4 && selectedId) doLogin()
  }, [pin])

  const doLogin = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/admin/login', { userId: selectedId, pin })
      onLogin(decodeToken(data.token) as AdminUser, data.token)
    } catch (err: any) {
      setPin(''); setError(err.response?.data?.error || 'Error al iniciar sesión')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  const handleKey = (key: string) => {
    if (!selectedId) return setError('Selecciona un administrador')
    if (loading) return
    setError('')
    if (key === '⌫') setPin(p => p.slice(0, -1))
    else if (pin.length < 4) setPin(p => p + key)
  }

  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','']

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <Link to="/" className="absolute top-4 left-4 text-gray-400 hover:text-gold text-sm flex items-center gap-1 transition-colors">
        <ArrowLeft size={15} /> Volver
      </Link>
      <div className={`w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-navy" />
          </div>
          <div className="text-2xl font-bold text-white">Panel Admin</div>
          <div className="text-xs text-gray-500 mt-1">Devol · Acceso restringido</div>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Administrador</label>
            <div className="relative">
              <select value={selectedId ?? ''} onChange={e => { setSelectedId(e.target.value ? parseInt(e.target.value) : null); setPin(''); setError('') }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl appearance-none focus:outline-none focus:border-gold font-medium">
                <option value="">— Seleccionar —</option>
                {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="mb-4 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">PIN</p>
            <div className="flex justify-center gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-navy border-navy scale-110' : 'border-gray-300'}`} />
              ))}
            </div>
          </div>
          {error && <p className="text-center text-red-500 text-sm font-medium mb-3">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            {keys.map((key, idx) => key === '' ? <div key={idx} /> : (
              <button key={key} type="button" onClick={() => handleKey(key)} disabled={loading}
                className={`h-12 rounded-xl font-semibold text-lg transition-all active:scale-95 select-none disabled:opacity-50
                  ${key === '⌫' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-50 text-navy hover:bg-gray-100'}`}>
                {key === '⌫' ? <Delete size={18} className="mx-auto" /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}.animate-shake{animation:shake 0.4s ease-in-out}`}</style>
    </div>
  )
}

// --- Main Admin Panel ---
export default function AdminPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const t = localStorage.getItem('devol_admin_token')
    return t ? decodeToken(t) : null
  })
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('devol_admin_token'))
  const [tab, setTab] = useState<'users' | 'projects' | 'logs'>('users')

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', pin: '', role: 'user', enabled: true })
  const [editUser, setEditUser] = useState<User | null>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userError, setUserError] = useState('')

  // Projects state
  const [projects, setProjects] = useState<(Project & { users?: User[] })[]>([])
  const [projLoading, setProjLoading] = useState(false)
  const [projForm, setProjForm] = useState({ name: '', date: '', user_ids: [] as number[] })
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [projModalOpen, setProjModalOpen] = useState(false)
  const [projError, setProjError] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])

  // Logs state
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logProjectFilter, setLogProjectFilter] = useState('')

  const adminApi = (config: any) => {
    return api.request({ ...config, headers: { ...config.headers, Authorization: `Bearer ${adminToken}` } })
  }

  const handleLogin = (user: AdminUser, token: string) => {
    localStorage.setItem('devol_admin_token', token)
    setAdminToken(token)
    setAdminUser(user)
  }

  const handleLogout = () => {
    localStorage.removeItem('devol_admin_token')
    setAdminUser(null)
    setAdminToken(null)
  }

  useEffect(() => {
    if (!adminUser || !adminToken) return
    loadUsers()
    loadProjects()
  }, [adminUser, adminToken])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const { data } = await adminApi({ url: '/admin/users', method: 'GET' })
      setUsers(data)
      setAllUsers(data)
    } finally { setUsersLoading(false) }
  }

  const loadProjects = async () => {
    setProjLoading(true)
    try {
      const { data } = await adminApi({ url: '/admin/projects', method: 'GET' })
      setProjects(data)
    } finally { setProjLoading(false) }
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const url = logProjectFilter ? `/admin/logs?project_id=${logProjectFilter}` : '/admin/logs'
      const { data } = await adminApi({ url, method: 'GET' })
      setLogs(data)
    } finally { setLogsLoading(false) }
  }

  useEffect(() => {
    if (tab === 'logs' && adminUser) loadLogs()
  }, [tab, logProjectFilter])

  // User CRUD
  const handleUserSubmit = async () => {
    if (!userForm.name || (!editUser && !userForm.pin)) return setUserError('Nombre y PIN requeridos')
    if (userForm.pin && !/^\d{4}$/.test(userForm.pin)) return setUserError('El PIN debe ser de 4 dígitos')
    setUserError('')
    try {
      if (editUser) {
        const payload: any = { name: userForm.name, role: userForm.role, enabled: userForm.enabled }
        if (userForm.pin) payload.pin = userForm.pin
        const { data } = await adminApi({ url: `/admin/users/${editUser.id}`, method: 'PUT', data: payload })
        setUsers(prev => prev.map(u => u.id === editUser.id ? data : u))
      } else {
        const { data } = await adminApi({ url: '/admin/users', method: 'POST', data: userForm })
        setUsers(prev => [...prev, data])
      }
      setUserModalOpen(false); setEditUser(null)
      setUserForm({ name: '', pin: '', role: 'user', enabled: true })
    } catch (err: any) { setUserError(err.response?.data?.error || 'Error') }
  }

  const handleToggleUser = async (user: User) => {
    try {
      const { data } = await adminApi({ url: `/admin/users/${user.id}`, method: 'PUT', data: { enabled: !user.enabled } })
      setUsers(prev => prev.map(u => u.id === user.id ? data : u))
    } catch {}
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Eliminar usuario "${user.name}"?`)) return
    try {
      await adminApi({ url: `/admin/users/${user.id}`, method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch (err: any) { alert(err.response?.data?.error || 'Error') }
  }

  // Project CRUD
  const handleProjSubmit = async () => {
    if (!projForm.name) return setProjError('Nombre requerido')
    setProjError('')
    try {
      if (editProject) {
        const { data } = await adminApi({ url: `/admin/projects/${editProject.id}`, method: 'PUT', data: projForm })
        setProjects(prev => prev.map(p => p.id === editProject.id ? { ...data, users: projForm.user_ids.map(id => allUsers.find(u => u.id === id)!).filter(Boolean) } : p))
      } else {
        const { data } = await adminApi({ url: '/admin/projects', method: 'POST', data: projForm })
        setProjects(prev => [...prev, { ...data, users: [] }])
      }
      setProjModalOpen(false); setEditProject(null)
      setProjForm({ name: '', date: '', user_ids: [] })
    } catch (err: any) { setProjError(err.response?.data?.error || 'Error') }
  }

  const handleCloseProject = async (proj: Project) => {
    if (!confirm(`¿Marcar el proyecto "${proj.name}" como cerrado?`)) return
    try {
      await adminApi({ url: `/admin/projects/${proj.id}`, method: 'PUT', data: { status: 'closed' } })
      setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, status: 'closed' as const } : p))
    } catch {}
  }

  if (!adminUser || !adminToken) {
    return <AdminLogin onLogin={handleLogin} />
  }

  const tabClass = (t: string) => `px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t ? 'bg-gold text-navy' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gold transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-lg font-bold text-gold">Panel Admin</div>
            <div className="text-xs text-gray-400">Devol · {adminUser.userName}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gold transition-colors">
          Cerrar sesión
        </button>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button className={tabClass('users')} onClick={() => setTab('users')}>👤 Usuarios</button>
          <button className={tabClass('projects')} onClick={() => setTab('projects')}>📁 Proyectos</button>
          <button className={tabClass('logs')} onClick={() => setTab('logs')}>📋 Actividad</button>
        </div>

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-navy">Usuarios ({users.length})</h2>
              <button onClick={() => { setEditUser(null); setUserForm({ name: '', pin: '', role: 'user', enabled: true }); setUserError(''); setUserModalOpen(true) }}
                className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold">
                <Plus size={14} /> Nuevo usuario
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {usersLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="th">Nombre</th><th className="th">Rol</th>
                      <th className="th">Estado</th><th className="th">Registro</th><th className="th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className={`hover:bg-gray-50 ${!u.enabled ? 'opacity-50' : ''}`}>
                        <td className="td font-medium">{u.name}</td>
                        <td className="td">
                          <span className={`badge ${u.role === 'admin' ? 'bg-navy text-gold' : 'bg-gray-100 text-gray-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="td">
                          <span className={`badge ${u.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.enabled ? 'Activo' : 'Deshabilitado'}
                          </span>
                        </td>
                        <td className="td text-gray-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : '—'}</td>
                        <td className="td">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditUser(u); setUserForm({ name: u.name, pin: '', role: u.role, enabled: !!u.enabled }); setUserError(''); setUserModalOpen(true) }}
                              className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"><Edit2 size={13} /></button>
                            <button onClick={() => handleToggleUser(u)}
                              className={`p-1.5 rounded hover:bg-gray-100 ${u.enabled ? 'text-gray-400 hover:text-orange-500' : 'text-gray-400 hover:text-green-600'}`}>
                              <ToggleLeft size={13} />
                            </button>
                            <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {tab === 'projects' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-navy">Proyectos ({projects.length})</h2>
              <button onClick={() => { setEditProject(null); setProjForm({ name: '', date: '', user_ids: [] }); setProjError(''); setProjModalOpen(true) }}
                className="flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-lg text-sm font-bold">
                <Plus size={14} /> Nuevo proyecto
              </button>
            </div>
            <div className="space-y-3">
              {projLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : projects.map(proj => (
                <div key={proj.id} className={`bg-white rounded-xl border shadow-sm p-4 ${proj.status === 'closed' ? 'opacity-60 border-gray-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy">{proj.name}</h3>
                        <span className={`badge text-[10px] ${proj.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {proj.status === 'active' ? 'Activo' : 'Cerrado'}
                        </span>
                      </div>
                      {proj.date && <p className="text-xs text-gray-400 mt-0.5">{new Date(proj.date + 'T00:00:00').toLocaleDateString('es-MX')}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(proj.users || []).map(u => (
                          <span key={u.id} className="badge bg-blue-50 text-blue-700 text-[10px]">{u.name}</span>
                        ))}
                        {(!proj.users || proj.users.length === 0) && <span className="text-xs text-gray-400">Sin usuarios asignados</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => {
                        setEditProject(proj)
                        setProjForm({ name: proj.name, date: proj.date || '', user_ids: (proj.users || []).map(u => u.id) })
                        setProjError('')
                        setProjModalOpen(true)
                      }} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"><Edit2 size={13} /></button>
                      {proj.status === 'active' && (
                        <button onClick={() => handleCloseProject(proj)}
                          className="px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors">
                          Cerrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-navy">Registro de actividad</h2>
              <select className="select max-w-[180px] text-xs" value={logProjectFilter}
                onChange={e => setLogProjectFilter(e.target.value)}>
                <option value="">Todos los proyectos</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {logsLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="th">Fecha</th><th className="th">Usuario</th>
                        <th className="th">Acción</th><th className="th">Tabla</th>
                        <th className="th">Campo</th><th className="th">Antes</th><th className="th">Después</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay registros</td></tr>
                      ) : logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="td text-gray-400">{new Date(log.created_at).toLocaleString('es-MX')}</td>
                          <td className="td font-medium">{log.user_name || log.user_id}</td>
                          <td className="td">
                            <span className={`badge ${
                              log.action_type === 'create' ? 'bg-green-50 text-green-700' :
                              log.action_type === 'delete' ? 'bg-red-50 text-red-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>{log.action_type}</span>
                          </td>
                          <td className="td text-gray-500">{log.table_name}</td>
                          <td className="td text-gray-500">{log.field_name || '—'}</td>
                          <td className="td text-gray-400 max-w-[100px]"><div className="truncate">{log.old_value || '—'}</div></td>
                          <td className="td text-gray-700 max-w-[100px]"><div className="truncate">{log.new_value || '—'}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User modal */}
      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editUser ? 'Editar usuario' : 'Nuevo usuario'}
        footer={<>
          <button onClick={() => setUserModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleUserSubmit} className="btn-primary">Guardar</button>
        </>}>
        <FormField label="Nombre" required>
          <input className="input" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
        </FormField>
        <FormField label={editUser ? 'Nuevo PIN (dejar vacío para no cambiar)' : 'PIN (4 dígitos)'} required={!editUser}>
          <input className="input font-mono tracking-widest" type="password" maxLength={4} value={userForm.pin}
            onChange={e => setUserForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))} placeholder="••••" />
        </FormField>
        <FormField label="Rol">
          <select className="select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </FormField>
        <div className="flex items-center gap-3 mt-2">
          <input type="checkbox" id="enabled" className="w-4 h-4 accent-navy" checked={userForm.enabled}
            onChange={e => setUserForm(f => ({ ...f, enabled: e.target.checked }))} />
          <label htmlFor="enabled" className="text-sm text-gray-700">Usuario habilitado</label>
        </div>
        {userError && <p className="mt-3 text-red-500 text-sm">{userError}</p>}
      </Modal>

      {/* Project modal */}
      <Modal isOpen={projModalOpen} onClose={() => setProjModalOpen(false)} title={editProject ? 'Editar proyecto' : 'Nuevo proyecto'} size="md"
        footer={<>
          <button onClick={() => setProjModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleProjSubmit} className="btn-primary">Guardar</button>
        </>}>
        <FormField label="Nombre del proyecto" required>
          <input className="input" value={projForm.name} onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Japón 2025" />
        </FormField>
        <FormField label="Fecha del proyecto">
          <input type="date" className="input" value={projForm.date} onChange={e => setProjForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <FormField label="Asignar usuarios">
          <div className="space-y-2 max-h-40 overflow-y-auto p-1">
            {allUsers.map(u => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-navy"
                  checked={projForm.user_ids.includes(u.id)}
                  onChange={e => setProjForm(f => ({
                    ...f,
                    user_ids: e.target.checked ? [...f.user_ids, u.id] : f.user_ids.filter(id => id !== u.id)
                  }))} />
                <span className="text-sm">{u.name}</span>
                {u.role === 'admin' && <span className="badge bg-navy text-gold text-[10px]">admin</span>}
              </label>
            ))}
          </div>
        </FormField>
        {projError && <p className="mt-2 text-red-500 text-sm">{projError}</p>}
      </Modal>
    </div>
  )
}
