const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDb, getRates, toMXN, logActivity } = require('../db');
const { uploadFile } = require('../storage');
const { authenticate, requireProject } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function extractGPS(buffer) {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.default.gps(buffer);
    return gps ? { lat: gps.latitude, lng: gps.longitude } : { lat: null, lng: null };
  } catch (e) {
    return { lat: null, lng: null };
  }
}

async function enrichItem(item, rates) {
  const costoMXN = toMXN(Number(item.price), item.currency, rates);
  return {
    ...item, price: Number(item.price),
    costo_mxn: Math.round(costoMXN * 100) / 100,
    costo_sugerido: Math.round(costoMXN * 1.45 * 100) / 100,
  };
}

router.get('/', authenticate, requireProject, async (req, res) => {
  try {
    const rates = await getRates();
    const { data } = await getDb().from('inventory')
      .select('*, stores(name), clients(name)')
      .eq('project_id', req.user.projectId)
      .order('created_at', { ascending: false });
    res.json(await Promise.all((data || []).map(async item => ({
      ...await enrichItem(item, rates),
      store_name: item.stores?.name || null,
      client_name: item.clients?.name || null,
      stores: undefined, clients: undefined,
    }))));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/unshipped', authenticate, requireProject, async (req, res) => {
  try {
    const rates = await getRates();
    const { data } = await getDb().from('inventory')
      .select('*').eq('project_id', req.user.projectId).eq('paqueteria', 1).is('shipment_id', null);
    res.json(await Promise.all((data || []).map(i => enrichItem(i, rates))));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireProject, upload.single('photo'), async (req, res) => {
  try {
    const { brand, model, price, currency, store_id, inventory_status, nota } = req.body;
    if (!brand || !model || !price) return res.status(400).json({ error: 'Marca, modelo y precio son requeridos' });
    const rates = await getRates();
    let photo = null, lat = null, lng = null;
    if (req.file) {
      const gps = await extractGPS(req.file.buffer);
      lat = gps.lat; lng = gps.lng;
      photo = await uploadFile(req.file.buffer, req.file.originalname, 'inventory');
    }
    const { data: item } = await getDb().from('inventory').insert({
      project_id: req.user.projectId, brand, model,
      price: parseFloat(price), currency: currency || 'JPY',
      store_id: store_id ? parseInt(store_id) : null,
      inventory_status: inventory_status || 'Visto',
      nota: nota || null, photo, lat, lng,
    }).select().single();
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'create', tableName: 'inventory', recordId: item.id, fieldName: 'brand', newValue: brand });
    res.status(201).json(await enrichItem(item, rates));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireProject, upload.single('photo'), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: existing } = await db.from('inventory').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Artículo no encontrado' });

    const fields = ['brand','model','price','currency','store_id','inventory_status','status',
                    'client_id','delivered','paqueteria','precio_publicado','shipment_id','nota'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.file) {
      const gps = await extractGPS(req.file.buffer);
      if (gps.lat) { updates.lat = gps.lat; updates.lng = gps.lng; }
      updates.photo = await uploadFile(req.file.buffer, req.file.originalname, 'inventory');
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No hay cambios' });

    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.store_id !== undefined) updates.store_id = updates.store_id ? parseInt(updates.store_id) : null;
    if (updates.client_id !== undefined) updates.client_id = updates.client_id ? parseInt(updates.client_id) : null;

    for (const [field, newVal] of Object.entries(updates)) {
      await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
        actionType: 'update', tableName: 'inventory', recordId: parseInt(id),
        fieldName: field, oldValue: existing[field], newValue: newVal });
    }

    const { data: updated } = await db.from('inventory').update(updates).eq('id', id)
      .select('*, stores(name), clients(name)').single();
    const rates = await getRates();
    res.json({ ...await enrichItem(updated, rates),
      store_name: updated.stores?.name || null, client_name: updated.clients?.name || null,
      stores: undefined, clients: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireProject, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { data: item } = await db.from('inventory').select('*').eq('id', id).eq('project_id', req.user.projectId).maybeSingle();
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
    await logActivity({ projectId: req.user.projectId, userId: req.user.userId, userName: req.user.userName,
      actionType: 'delete', tableName: 'inventory', recordId: parseInt(id), fieldName: 'brand', oldValue: item.brand });
    await db.from('inventory').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
