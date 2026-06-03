const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { getDb, getRates, toMXN } = require('../db');
const { authenticate, requireProject, requireAdmin } = require('../middleware/auth');

router.get('/rates', async (req, res) => {
  try { res.json(await getRates()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rates', authenticate, requireAdmin, async (req, res) => {
  try {
    const { jpy_to_mxn, usd_to_mxn } = req.body;
    if (!jpy_to_mxn || !usd_to_mxn) return res.status(400).json({ error: 'Ambas tasas son requeridas' });
    await getDb().from('currency_rates').insert({ jpy_to_mxn: parseFloat(jpy_to_mxn), usd_to_mxn: parseFloat(usd_to_mxn), updated_by: req.user.userId });
    res.json(await getRates());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function getResumenData(projectId) {
  const db = getDb();
  const [rates, { data: expenses }, { data: payments }, { data: users }, { data: upRows }] = await Promise.all([
    getRates(),
    db.from('expenses').select('*').eq('project_id', projectId),
    db.from('payments').select('*').eq('project_id', projectId),
    db.from('users').select('id,name'),
    db.from('user_projects').select('user_id').eq('project_id', projectId),
  ]);

  const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
  const projectUserIds = new Set((upRows || []).map(r => r.user_id));
  const exp = expenses || [], pay = payments || [];

  // Gastos by category
  const byCat = {};
  exp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount_mxn || 0); });
  const gastosByCategory = Object.entries(byCat).sort((a,b) => a[0].localeCompare(b[0]))
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }));

  // Gastos by user
  const byUserG = {};
  exp.forEach(e => { byUserG[e.paid_by] = (byUserG[e.paid_by] || 0) + Number(e.amount_mxn || 0); });
  const gastosByUser = Object.entries(byUserG)
    .map(([uid, total]) => ({ name: userMap[uid] || '—', total: Math.round(total * 100) / 100 }));

  const totalGastos = exp.reduce((s, e) => s + Number(e.amount_mxn || 0), 0);

  // Ingresos by user (received only)
  const received = pay.filter(p => p.received === 1);
  const byUserI = {};
  received.forEach(p => { byUserI[p.paid_to] = (byUserI[p.paid_to] || 0) + Number(p.amount_mxn || 0); });
  const ingresosByUser = Object.entries(byUserI)
    .map(([uid, total]) => ({ name: userMap[uid] || '—', total: Math.round(total * 100) / 100 }));

  const totalIngresos = received.reduce((s, p) => s + Number(p.amount_mxn || 0), 0);
  const totalPending = pay.filter(p => p.received !== 1).reduce((s, p) => s + Number(p.amount_mxn || 0), 0);

  // Balances per project user
  const balances = [...projectUserIds].map(uid => {
    const ingresos = received.filter(p => p.paid_to === uid).reduce((s,p) => s + Number(p.amount_mxn||0), 0);
    const gastos = exp.filter(e => e.paid_by === uid).reduce((s,e) => s + Number(e.amount_mxn||0), 0);
    return { name: userMap[uid] || '—', ingresos: Math.round(ingresos*100)/100, gastos: Math.round(gastos*100)/100, balance: Math.round((ingresos-gastos)*100)/100 };
  }).sort((a,b) => a.name.localeCompare(b.name));

  return { rates, gastosByCategory, gastosByUser, totalGastos: Math.round(totalGastos*100)/100,
    ingresosByUser, totalIngresos: Math.round(totalIngresos*100)/100, totalPending: Math.round(totalPending*100)/100, balances };
}

router.get('/', authenticate, requireProject, requireAdmin, async (req, res) => {
  try {
    const d = await getResumenData(req.user.projectId);
    res.json({
      rates: d.rates,
      gastos: { byCategory: d.gastosByCategory, byUser: d.gastosByUser, total: d.totalGastos },
      ingresos: { byUser: d.ingresosByUser, totalReceived: d.totalIngresos, totalPending: d.totalPending },
      utilidad: { totalGastos: d.totalGastos, totalIngresos: d.totalIngresos, utilidad: Math.round((d.totalIngresos - d.totalGastos)*100)/100 },
      balances: d.balances,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/pdf', authenticate, requireProject, requireAdmin, async (req, res) => {
  try {
    const { data: project } = await getDb().from('projects').select('*').eq('id', req.user.projectId).maybeSingle();
    const d = await getResumenData(req.user.projectId);
    const fmt = n => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
    const navy = '#1a1f3c', gold = '#f0c040';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resumen_${project?.name || 'devol'}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 80).fill(navy);
    doc.fillColor(gold).fontSize(28).font('Helvetica-Bold').text('DEVOL', 50, 25);
    doc.fillColor('white').fontSize(14).font('Helvetica').text(`Resumen: ${project?.name || ''}`, 50, 55);
    doc.moveDown(3);

    doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text('Tasas de Cambio', 50);
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(`JPY → MXN: ${d.rates.jpy_to_mxn}   |   USD → MXN: ${d.rates.usd_to_mxn}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor(navy).text('Gastos');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(gold); doc.moveDown(0.3);
    d.gastosByCategory.forEach(r => { doc.font('Helvetica').fontSize(10).fillColor('#333').text(`  ${r.category}`, 50, doc.y, { continued: true }); doc.text(fmt(r.total), { align: 'right' }); });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text('  Por usuario:', 50);
    d.gastosByUser.forEach(r => { doc.font('Helvetica').fontSize(10).fillColor('#333').text(`    ${r.name}`, 50, doc.y, { continued: true }); doc.text(fmt(r.total), { align: 'right' }); });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(navy).text(`Total Gastos: ${fmt(d.totalGastos)}`, 50);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor(navy).text('Ingresos');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(gold); doc.moveDown(0.3);
    d.ingresosByUser.forEach(r => { doc.font('Helvetica').fontSize(10).fillColor('#333').text(`  ${r.name}`, 50, doc.y, { continued: true }); doc.text(fmt(r.total), { align: 'right' }); });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(navy).text(`Total Ingresos: ${fmt(d.totalIngresos)}`, 50);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor(navy).text('Utilidad');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(gold); doc.moveDown(0.3);
    const utilidad = d.totalIngresos - d.totalGastos;
    doc.font('Helvetica').fontSize(11).fillColor('#333').text(`  Total Gastos: ${fmt(d.totalGastos)}`).text(`  Total Ingresos: ${fmt(d.totalIngresos)}`);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(utilidad >= 0 ? '#1a7a1a' : '#c0392b').text(`  Utilidad: ${fmt(utilidad)}`, 50);
    doc.moveDown();

    if (d.balances.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(navy).text('Balances por Usuario');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(gold); doc.moveDown(0.3);
      d.balances.forEach(r => {
        doc.font('Helvetica').fontSize(10).fillColor('#333').text(`  ${r.name}  `, 50, doc.y, { continued: true });
        doc.text(`Ingresos: ${fmt(r.ingresos)}  Gastos: ${fmt(r.gastos)}  `, { continued: true });
        doc.font('Helvetica-Bold').fillColor(r.balance >= 0 ? '#1a7a1a' : '#c0392b').text(`Balance: ${fmt(r.balance)}`, { align: 'right' });
      });
    }

    doc.end();
  } catch (e) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
});

module.exports = router;
