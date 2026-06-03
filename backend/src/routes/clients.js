const express = require('express');
const router = express.Router();
const { getDb, logActivity } = require('../db');
const { authenticate, requireProject } = require('../middleware/auth');

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const { data } = await getDb().from('clients').select('*').eq('project_id', req.user.projectId).order('name');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, async (req, res) => {
  try {
    const { name, whatsapp, wishlist, factura, anticipo } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const db = getDb();
    const { data: existing } = await db.from('clients').select('id').eq('project_id', req.user.projectId).eq('name', name).maybeSingle();
    if (existing) return res.status(409).json({ error: 'El cliente ya existe. Asegúrate de que realmente sea un nuevo cliente. Si comparte el nombre con un cliente existente, agrega una palabra para diferenciarlos.', duplicate: true });
    const { data: client } = await db.from('clients').insert({
      project_id: req.user.projectId, name, whatsapp: whatsapp || null, wishlist: wishlist || null,
      factura: factura || 'No', anticipo: anticipo ? parseFloat(anticipo) : 0,
    }).select().single();
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'clients', recordId: client.id, fieldName: 'name', newValue: name });
    res.status(201).json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('clients').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });
    const { name, whatsapp, wishlist, factura, anticipo } = req.body;
    if (name && name !== existing.name) {
      const { data: dup } = await db.from('clients').select('id').eq('project_id', req.user.projectId).eq('name', name).neq('id', id).maybeSingle();
      if (dup) return res.status(409).json({ error: 'Ya existe un cliente con ese nombre', duplicate: true });
    }
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (wishlist !== undefined) updates.wishlist = wishlist;
    if (factura !== undefined) updates.factura = factura;
    if (anticipo !== undefined) updates.anticipo = parseFloat(anticipo);
    for (const [field, newVal] of Object.entries(updates)) {
      await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
        actionType: 'update', tableName: 'clients', recordId: parseInt(id), fieldName: field, oldValue: existing[field], newValue: newVal });
    }
    const { data: updated } = await db.from('clients').update(updates).eq('id', id).select().single();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('clients').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'clients', recordId: parseInt(id), fieldName: 'name', oldValue: existing.name });
    await db.from('clients').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
