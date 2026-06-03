const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { signToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) return res.status(400).json({ error: 'Usuario y PIN requeridos' });
    const { data: user } = await getDb().from('users').select('*').eq('id', userId).eq('role', 'admin').eq('enabled', 1).maybeSingle();
    if (!user) return res.status(401).json({ error: 'No encontrado o sin permisos de admin' });
    if (user.pin !== String(pin)) return res.status(401).json({ error: 'PIN incorrecto' });
    const token = signToken({ userId: user.id, userName: user.name, role: 'admin', isAdminPanel: true });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admins', async (req, res) => {
  try {
    const { data } = await getDb().from('users').select('id,name').eq('role', 'admin').eq('enabled', 1).order('name');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const { data } = await getDb().from('users').select('id,name,role,enabled,created_at').order('name');
    res.json((data || []).map(u => ({ ...u, enabled: u.enabled === 1 })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, pin, role } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Nombre y PIN requeridos' });
    if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' });
    const { data: user } = await getDb().from('users').insert({ name, pin: String(pin), role: role || 'user', enabled: 1 }).select('id,name,role,enabled').single();
    res.status(201).json({ ...user, enabled: user.enabled === 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin, role, enabled } = req.body;
    if (pin !== undefined && !/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (pin !== undefined) updates.pin = String(pin);
    if (role !== undefined) updates.role = role;
    if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;
    const { data: user } = await getDb().from('users').update(updates).eq('id', id).select('id,name,role,enabled').single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ...user, enabled: user.enabled === 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: user } = await db.from('users').select('*').eq('id', id).maybeSingle();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.role === 'admin') {
      const { count } = await db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('enabled', 1);
      if (count <= 1) return res.status(400).json({ error: 'No se puede eliminar el único admin' });
    }
    await db.from('users').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/projects', async (req, res) => {
  try {
    const db = getDb();
    const [{ data: projects }, { data: upRows }, { data: users }] = await Promise.all([
      db.from('projects').select('*').order('created_at', { ascending: false }),
      db.from('user_projects').select('project_id,user_id'),
      db.from('users').select('id,name,role'),
    ]);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    res.json((projects || []).map(p => ({
      ...p,
      users: (upRows || []).filter(u => u.project_id === p.id).map(u => ({ id: u.user_id, name: userMap[u.user_id]?.name, role: userMap[u.user_id]?.role })),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/projects', async (req, res) => {
  try {
    const { name, date, user_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const db = getDb();
    const { data: project } = await db.from('projects').insert({ name, date: date || null }).select().single();
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      await db.from('user_projects').upsert(user_ids.map(uid => ({ user_id: uid, project_id: project.id })), { onConflict: 'user_id,project_id', ignoreDuplicates: true });
    }
    res.status(201).json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, date, status, user_ids } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (date !== undefined) updates.date = date;
    if (status !== undefined) updates.status = status;
    if (Object.keys(updates).length > 0) await db.from('projects').update(updates).eq('id', id);
    if (user_ids !== undefined) {
      await db.from('user_projects').delete().eq('project_id', id);
      if (Array.isArray(user_ids) && user_ids.length > 0) {
        await db.from('user_projects').upsert(user_ids.map(uid => ({ user_id: uid, project_id: parseInt(id) })), { onConflict: 'user_id,project_id', ignoreDuplicates: true });
      }
    }
    const { data: project } = await db.from('projects').select('*').eq('id', id).maybeSingle();
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/projects/:id/users', async (req, res) => {
  try {
    const { user_id } = req.body;
    await getDb().from('user_projects').upsert({ user_id, project_id: parseInt(req.params.id) }, { onConflict: 'user_id,project_id', ignoreDuplicates: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/projects/:id/users/:userId', async (req, res) => {
  try {
    await getDb().from('user_projects').delete().eq('project_id', req.params.id).eq('user_id', req.params.userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/logs', async (req, res) => {
  try {
    const { project_id, limit = 100, offset = 0 } = req.query;
    let q = getDb().from('activity_log').select('*').order('created_at', { ascending: false }).range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (project_id) q = q.eq('project_id', project_id);
    const { data } = await q;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
