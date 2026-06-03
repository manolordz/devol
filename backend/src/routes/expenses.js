const express = require('express');
const router = express.Router();
const { getDb, logActivity, getRates, toMXN } = require('../db');
const { authenticate, requireProject } = require('../middleware/auth');

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const { data } = await getDb().from('expenses').select('*, users(name)')
      .eq('project_id', req.user.projectId).order('created_at', { ascending: false });
    res.json((data || []).map(e => ({ ...e, paid_by_name: e.users?.name || null, users: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, async (req, res) => {
  try {
    const { description, amount, currency, category, paid_by } = req.body;
    if (!description || !amount || !category || !paid_by)
      return res.status(400).json({ error: 'Descripción, gasto, categoría y pagado por son requeridos' });
    const rates = await getRates();
    const amountMXN = Math.round(toMXN(parseFloat(amount), currency || 'MXN', rates) * 100) / 100;
    const { data: expense } = await getDb().from('expenses').insert({
      project_id: req.user.projectId, description, amount: parseFloat(amount),
      currency: currency || 'MXN', amount_mxn: amountMXN, category, paid_by: parseInt(paid_by),
    }).select('*, users(name)').single();
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'expenses', recordId: expense.id, fieldName: 'description', newValue: description });
    res.status(201).json({ ...expense, paid_by_name: expense.users?.name || null, users: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('expenses').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
    const { description, amount, currency, category, paid_by } = req.body;
    const rates = await getRates();
    const cur = currency || existing.currency;
    const amt = amount !== undefined ? parseFloat(amount) : Number(existing.amount);
    const amountMXN = Math.round(toMXN(amt, cur, rates) * 100) / 100;
    const updates = {};
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (currency !== undefined) updates.currency = currency;
    if (category !== undefined) updates.category = category;
    if (paid_by !== undefined) updates.paid_by = parseInt(paid_by);
    updates.amount_mxn = amountMXN;
    for (const [field, newVal] of Object.entries(updates)) {
      if (field !== 'amount_mxn') await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
        actionType: 'update', tableName: 'expenses', recordId: parseInt(id), fieldName: field, oldValue: existing[field], newValue: newVal });
    }
    const { data: updated } = await db.from('expenses').update(updates).eq('id', id).select('*, users(name)').single();
    res.json({ ...updated, paid_by_name: updated.users?.name || null, users: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('expenses').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'expenses', recordId: parseInt(id), fieldName: 'description', oldValue: existing.description });
    await db.from('expenses').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
