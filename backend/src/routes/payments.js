const express = require('express');
const router = express.Router();
const { getDb, logActivity, getRates, toMXN } = require('../db');
const { authenticate, requireProject } = require('../middleware/auth');

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const { data } = await getDb().from('payments')
      .select('*, clients(name), users(name)')
      .eq('project_id', req.user.projectId).order('created_at', { ascending: false });
    res.json((data || []).map(p => ({
      ...p, received: p.received === 1,
      paid_by_name: p.clients?.name || null, paid_to_name: p.users?.name || null,
      clients: undefined, users: undefined,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/pending', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const pid = req.user.projectId;
    const [{ data: clients }, { data: items }, { data: payments }] = await Promise.all([
      db.from('clients').select('id,name').eq('project_id', pid),
      db.from('inventory').select('client_id,precio_publicado').eq('project_id', pid).not('precio_publicado', 'is', null).neq('precio_publicado', ''),
      db.from('payments').select('paid_by,amount_mxn').eq('project_id', pid).eq('received', 1),
    ]);
    const rows = (clients || []).map(c => {
      const comprado = Math.round((items || []).filter(i => i.client_id === c.id)
        .reduce((s, i) => s + parseFloat(i.precio_publicado || 0), 0) * 100) / 100;
      const abonado = Math.round((payments || []).filter(p => p.paid_by === c.id)
        .reduce((s, p) => s + Number(p.amount_mxn || 0), 0) * 100) / 100;
      return { client_id: c.id, client_name: c.name, comprado, abonado, pendiente: Math.round((comprado - abonado) * 100) / 100 };
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, async (req, res) => {
  try {
    const { amount, currency, paid_by, paid_to, account, note } = req.body;
    if (!amount) return res.status(400).json({ error: 'Cantidad requerida' });
    const rates = await getRates();
    const amountMXN = Math.round(toMXN(parseFloat(amount), currency || 'MXN', rates) * 100) / 100;
    const { data: payment } = await getDb().from('payments').insert({
      project_id: req.user.projectId, amount: parseFloat(amount), currency: currency || 'MXN',
      amount_mxn: amountMXN, paid_by: paid_by ? parseInt(paid_by) : null,
      paid_to: paid_to ? parseInt(paid_to) : null, account: account || null, note: note || null,
    }).select('*, clients(name), users(name)').single();
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'payments', recordId: payment.id, fieldName: 'amount', newValue: amount });
    res.status(201).json({ ...payment, received: payment.received === 1,
      paid_by_name: payment.clients?.name || null, paid_to_name: payment.users?.name || null,
      clients: undefined, users: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('payments').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Pago no encontrado' });
    const { amount, currency, paid_by, paid_to, account, note, received } = req.body;

    let amountMXN = Number(existing.amount_mxn);
    if (amount !== undefined || currency !== undefined) {
      const rates = await getRates();
      amountMXN = Math.round(toMXN(
        amount !== undefined ? parseFloat(amount) : Number(existing.amount),
        currency || existing.currency, rates
      ) * 100) / 100;
    }

    const isReceived = received === true || received === 1 || received === 'true';
    const wasReceived = existing.received === 1;
    const received_at = received !== undefined
      ? (isReceived && !wasReceived ? new Date().toISOString() : (!isReceived ? null : existing.received_at))
      : existing.received_at;

    const updates = { amount_mxn: amountMXN, received_at };
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (currency !== undefined) updates.currency = currency;
    if (paid_by !== undefined) updates.paid_by = paid_by ? parseInt(paid_by) : null;
    if (paid_to !== undefined) updates.paid_to = paid_to ? parseInt(paid_to) : null;
    if (account !== undefined) updates.account = account;
    if (note !== undefined) updates.note = note;
    if (received !== undefined) {
      updates.received = isReceived ? 1 : 0;
      await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
        actionType: 'update', tableName: 'payments', recordId: parseInt(id),
        fieldName: 'received', oldValue: existing.received, newValue: updates.received });
    }

    const { data: updated } = await db.from('payments').update(updates).eq('id', id)
      .select('*, clients(name), users(name)').single();
    res.json({ ...updated, received: updated.received === 1,
      paid_by_name: updated.clients?.name || null, paid_to_name: updated.users?.name || null,
      clients: undefined, users: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('payments').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Pago no encontrado' });
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'payments', recordId: parseInt(id), fieldName: 'amount', oldValue: existing.amount });
    await db.from('payments').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
