const express = require('express');
const router = express.Router();
const { getDb, logActivity } = require('../db');
const { authenticate, requireProject } = require('../middleware/auth');

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const { data } = await getDb().from('stores').select('*').eq('project_id', req.user.projectId).order('name');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, async (req, res) => {
  try {
    const { name, city, zone, address, specialty } = req.body;
    if (!name || !city || !zone) return res.status(400).json({ error: 'Nombre, ciudad y zona son requeridos' });
    const { data: store } = await getDb().from('stores').insert({
      project_id: req.user.projectId, name, city, zone, address: address || null, specialty: specialty || null,
    }).select().single();
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'stores', recordId: store.id, fieldName: 'name', newValue: name });
    res.status(201).json(store);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('stores').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Tienda no encontrada' });
    const { name, city, zone, address, specialty } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (city !== undefined) updates.city = city;
    if (zone !== undefined) updates.zone = zone;
    if (address !== undefined) updates.address = address;
    if (specialty !== undefined) updates.specialty = specialty;
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'update', tableName: 'stores', recordId: parseInt(id), fieldName: 'name',
      oldValue: existing.name, newValue: name || existing.name });
    const { data: updated } = await db.from('stores').update(updates).eq('id', id).select().single();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('stores').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Tienda no encontrada' });
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'stores', recordId: parseInt(id), fieldName: 'name', oldValue: existing.name });
    await db.from('stores').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
