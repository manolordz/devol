const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate, signToken } = require('../middleware/auth');

router.get('/users', async (req, res) => {
  try {
    const { data } = await getDb().from('users').select('id,name,role').eq('enabled', 1).order('name');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) return res.status(400).json({ error: 'userId y PIN requeridos' });

    const { data: user } = await getDb().from('users').select('*').eq('id', userId).eq('enabled', 1).maybeSingle();
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado o deshabilitado' });
    if (user.pin !== String(pin)) return res.status(401).json({ error: 'PIN incorrecto' });

    const token = signToken({ userId: user.id, userName: user.name, role: user.role });

    let projectsQuery = getDb().from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false });
    if (user.role !== 'admin') {
      const { data: up } = await getDb().from('user_projects').select('project_id').eq('user_id', user.id);
      const ids = (up || []).map(r => r.project_id);
      if (ids.length === 0) return res.json({ token, user: { id: user.id, name: user.name, role: user.role }, projects: [] });
      projectsQuery = projectsQuery.in('id', ids);
    }
    const { data: projects } = await projectsQuery;
    res.json({ token, user: { id: user.id, name: user.name, role: user.role }, projects: projects || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/select-project', authenticate, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId requerido' });

    const { data: project } = await getDb().from('projects').select('*').eq('id', projectId).maybeSingle();
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (req.user.role !== 'admin') {
      const { data: access } = await getDb().from('user_projects')
        .select('user_id').eq('user_id', req.user.userId).eq('project_id', projectId).maybeSingle();
      if (!access) return res.status(403).json({ error: 'Sin acceso a este proyecto' });
    }

    const token = signToken({
      userId: req.user.userId, userName: req.user.userName,
      role: req.user.role, projectId: project.id, projectName: project.name,
    });
    res.json({ token, project });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-pin', authenticate, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN requerido' });
    const { data: user } = await getDb().from('users').select('pin').eq('id', req.user.userId).maybeSingle();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.pin !== String(pin)) return res.status(401).json({ error: 'PIN incorrecto', valid: false });
    res.json({ valid: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', authenticate, (req, res) => res.json(req.user));

module.exports = router;
