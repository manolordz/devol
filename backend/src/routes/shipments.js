const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDb, logActivity, getRates, toMXN } = require('../db');
const { uploadFile } = require('../storage');
const { authenticate, requireProject } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function enrichShipment(shipment, rates) {
  const { data: items } = await getDb().from('inventory')
    .select('*, stores(name), clients(name)').eq('shipment_id', shipment.id);
  const totalReal = (items || []).reduce((sum, i) => sum + toMXN(Number(i.price), i.currency, rates), 0);
  return {
    ...shipment,
    items: (items || []).map(i => ({ ...i, store_name: i.stores?.name || null, client_name: i.clients?.name || null, stores: undefined, clients: undefined })),
    valor_total_real: Math.round(totalReal * 100) / 100,
  };
}

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const rates = await getRates();
    const { data } = await getDb().from('shipments').select('*').eq('project_id', req.user.projectId).order('created_at', { ascending: false });
    res.json(await Promise.all((data || []).map(s => enrichShipment(s, rates))));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, upload.single('label_photo'), async (req, res) => {
  try {
    const { name, carrier, tracking_number, declared_value, item_ids } = req.body;
    if (!name || !carrier || !tracking_number) return res.status(400).json({ error: 'Nombre, paquetería y número de rastreo son requeridos' });
    const db = getDb();
    let label_photo = null;
    if (req.file) label_photo = await uploadFile(req.file.buffer, req.file.originalname, 'shipments');
    const { data: shipment } = await db.from('shipments').insert({
      project_id: req.user.projectId, name, carrier, tracking_number,
      declared_value: declared_value || null, label_photo,
    }).select().single();

    if (item_ids) {
      const ids = Array.isArray(item_ids) ? item_ids : JSON.parse(item_ids);
      if (ids.length > 0) {
        await Promise.all(ids.map(itemId => db.from('inventory').update({ shipment_id: shipment.id }).eq('id', itemId).eq('project_id', req.user.projectId)));
      }
    }
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'shipments', recordId: shipment.id, fieldName: 'name', newValue: name });
    const rates = await getRates();
    res.status(201).json(await enrichShipment(shipment, rates));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, upload.single('label_photo'), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('shipments').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Paquete no encontrado' });
    const { name, carrier, tracking_number, declared_value, item_ids } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (carrier !== undefined) updates.carrier = carrier;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (declared_value !== undefined) updates.declared_value = declared_value;
    if (req.file) updates.label_photo = await uploadFile(req.file.buffer, req.file.originalname, 'shipments');
    if (Object.keys(updates).length > 0) await db.from('shipments').update(updates).eq('id', id);

    if (item_ids !== undefined) {
      const ids = Array.isArray(item_ids) ? item_ids : JSON.parse(item_ids || '[]');
      await db.from('inventory').update({ shipment_id: null }).eq('shipment_id', id).eq('project_id', req.user.projectId);
      if (ids.length > 0) await Promise.all(ids.map(itemId => db.from('inventory').update({ shipment_id: parseInt(id) }).eq('id', itemId).eq('project_id', req.user.projectId)));
    }
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'update', tableName: 'shipments', recordId: parseInt(id), fieldName: 'name', oldValue: existing.name, newValue: name || existing.name });
    const rates = await getRates();
    const { data: updated } = await db.from('shipments').select('*').eq('id', id).single();
    res.json(await enrichShipment(updated, rates));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('shipments').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Paquete no encontrado' });
    await db.from('inventory').update({ shipment_id: null }).eq('shipment_id', id);
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'shipments', recordId: parseInt(id), fieldName: 'name', oldValue: existing.name });
    await db.from('shipments').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
