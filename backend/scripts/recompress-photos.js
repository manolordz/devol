#!/usr/bin/env node
/*
 * Recomprime las fotos que ya están guardadas en Supabase Storage.
 *
 * Uso (desde la carpeta backend/):
 *   npm run recompress-photos                      SIMULACIÓN: solo cuenta y estima. No cambia nada.
 *   npm run recompress-photos -- --apply --limit=3 Prueba real con solo 3 fotos.
 *   npm run recompress-photos -- --apply           Recomprime todas.
 *
 * Opciones:
 *   --apply        Ejecuta los cambios (sin esto solo simula).
 *   --limit=N      Procesa como máximo N fotos.
 *   --min-kb=300   Ignora fotos que ya pesan menos de esto (default 300).
 *
 * Por cada foto: la descarga, la comprime (mismos ajustes que las subidas nuevas),
 * sube la versión .webp, actualiza la URL en la base de datos y SOLO DESPUÉS borra
 * el archivo viejo. Si algo falla en el camino, deshace ese paso y deja la foto original.
 * También reporta (sin borrar) archivos huérfanos: fotos en Storage que ningún
 * registro de Inventario/Paquetería usa.
 */
const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) { /* dotenv opcional */ }
const { createClient } = require('@supabase/supabase-js');
const { compressImage, fmtSize } = require('../src/storage');

const BUCKET = 'devol';
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const TARGETS = [
  { table: 'inventory', column: 'photo' },
  { table: 'shipments', column: 'label_photo' },
];
const TYPICAL_AFTER_BYTES = 300 * 1024; // estimación para la simulación

function parseArgs(argv) {
  const opts = { apply: false, limit: Infinity, minKb: 300 };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    else if (a.startsWith('--limit=')) opts.limit = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--min-kb=')) opts.minKb = parseInt(a.split('=')[1], 10);
  }
  return opts;
}

function pathFromUrl(url) {
  const i = url.indexOf(PUBLIC_MARKER);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + PUBLIC_MARKER.length).split('?')[0]);
}

// Lee de la base de datos todas las URLs de fotos: Map(url -> { path, refs:[{table,column}] })
async function fetchReferences(sb) {
  const byUrl = new Map();
  for (const { table, column } of TARGETS) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select(`id, ${column}`)
        .not(column, 'is', null).order('id').range(from, from + 999);
      if (error) throw new Error(`No pude leer ${table}.${column}: ${error.message}`);
      for (const row of data) {
        const url = row[column];
        if (!url) continue;
        if (!byUrl.has(url)) byUrl.set(url, { url, path: pathFromUrl(url), refs: [] });
        byUrl.get(url).refs.push({ table, column });
      }
      if (data.length < 1000) break;
    }
  }
  return byUrl;
}

// Lista todos los archivos del bucket con su tamaño: Map(path -> bytes)
async function listAllFiles(storage, prefix = '', depth = 0, out = new Map()) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`No pude listar "${prefix}": ${error.message}`);
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null) { if (depth < 3) await listAllFiles(storage, full, depth + 1, out); }
      else out.set(full, item.metadata?.size ?? 0);
    }
    if (data.length < 1000) break;
  }
  return out;
}

async function recompressOne(sb, cand) {
  const storage = sb.storage.from(BUCKET);

  const { data: blob, error: dlErr } = await storage.download(cand.path);
  if (dlErr) throw new Error(`descarga: ${dlErr.message}`);
  const original = Buffer.from(await blob.arrayBuffer());

  const result = await compressImage(original, path.basename(cand.path), { quiet: true });
  if (result.ext !== '.webp') return { skipped: true, before: original.length, after: original.length };

  const folder = path.posix.dirname(cand.path);
  const newPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
  const { error: upErr } = await storage.upload(newPath, result.buffer, {
    upsert: false, contentType: 'image/webp', cacheControl: '31536000',
  });
  if (upErr) throw new Error(`subida: ${upErr.message}`);
  const newUrl = storage.getPublicUrl(newPath).data.publicUrl;

  // Actualiza todas las filas que usaban la URL vieja; si algo falla, deshace y conserva el original
  const done = [];
  let rows = 0;
  try {
    for (const ref of cand.refs) {
      const { data, error } = await sb.from(ref.table)
        .update({ [ref.column]: newUrl }).eq(ref.column, cand.url).select('id');
      if (error) throw new Error(`base de datos (${ref.table}): ${error.message}`);
      done.push(ref);
      rows += data.length;
    }
    if (rows === 0) throw new Error('el registro cambió mientras se procesaba');
  } catch (err) {
    for (const ref of done) {
      await sb.from(ref.table).update({ [ref.column]: cand.url }).eq(ref.column, newUrl);
    }
    await storage.remove([newPath]);
    throw err;
  }

  const { error: rmErr } = await storage.remove([cand.path]);
  if (rmErr) console.warn(`   ⚠ No pude borrar el archivo viejo ${cand.path}: ${rmErr.message}`);

  return { skipped: false, before: original.length, after: result.buffer.length };
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY. Revisa backend/.env');
    return 1;
  }
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log('Leyendo base de datos y Storage...');
  const refs = await fetchReferences(sb);
  const files = await listAllFiles(sb.storage.from(BUCKET));

  const minBytes = opts.minKb * 1024;
  const candidates = [];
  let missing = 0, foreign = 0, alreadyWebp = 0, small = 0;
  for (const ref of refs.values()) {
    if (!ref.path) { foreign++; continue; }
    if (!files.has(ref.path)) { missing++; continue; }
    if (ref.path.toLowerCase().endsWith('.webp')) { alreadyWebp++; continue; }
    const size = files.get(ref.path);
    if (size < minBytes) { small++; continue; }
    candidates.push({ ...ref, size });
  }
  candidates.sort((a, b) => b.size - a.size); // primero las más pesadas

  const candBytes = candidates.reduce((s, c) => s + c.size, 0);
  const estAfter = candidates.reduce((s, c) => s + Math.min(c.size, TYPICAL_AFTER_BYTES), 0);
  const totalBytes = [...files.values()].reduce((s, n) => s + n, 0);

  const referencedPaths = new Set([...refs.values()].map(r => r.path).filter(Boolean));
  const orphans = [...files.entries()].filter(([p]) => !referencedPaths.has(p));
  const orphanBytes = orphans.reduce((s, [, n]) => s + n, 0);

  console.log('\n=== RESUMEN ===');
  console.log(`Espacio usado en el bucket "${BUCKET}": ${fmtSize(totalBytes)} (${files.size} archivos)`);
  console.log(`Fotos usadas por la app: ${refs.size}`);
  console.log(`   a recomprimir (> ${opts.minKb} KB, no .webp): ${candidates.length} (${fmtSize(candBytes)})`);
  console.log(`   ya .webp: ${alreadyWebp} · ya livianas: ${small} · URL externa: ${foreign} · archivo no encontrado: ${missing}`);
  if (candidates.length) {
    console.log(`Ahorro estimado: ~${fmtSize(candBytes - estAfter)} (estimación conservadora, típicamente quedan ~300 KB por foto)`);
  }
  console.log(`\nArchivos huérfanos (en Storage pero sin ningún registro que los use): ${orphans.length} (${fmtSize(orphanBytes)})`);
  if (orphans.length) {
    const report = path.join(process.cwd(), 'huerfanas.txt');
    fs.writeFileSync(report, orphans.sort((a, b) => b[1] - a[1]).map(([p, n]) => `${fmtSize(n)}\t${p}`).join('\n') + '\n');
    console.log(`   Lista completa guardada en: ${report}`);
    console.log('   (este script NO los borra; revísalos antes de decidir qué hacer)');
  }

  if (!opts.apply) {
    console.log('\nSIMULACIÓN: no se cambió nada. Para aplicar usa:  npm run recompress-photos -- --apply --limit=3');
    return 0;
  }

  const batch = candidates.slice(0, opts.limit);
  console.log(`\nRecomprimiendo ${batch.length} foto(s)...\n`);
  let before = 0, after = 0, ok = 0, failed = 0;
  for (let i = 0; i < batch.length; i++) {
    const c = batch[i];
    const label = `[${i + 1}/${batch.length}] ${c.path}`;
    try {
      const r = await recompressOne(sb, c);
      if (r.skipped) { console.log(`${label}: ya optimizada, sin cambios`); continue; }
      before += r.before; after += r.after; ok++;
      console.log(`${label}: ${fmtSize(r.before)} → ${fmtSize(r.after)}`);
    } catch (err) {
      failed++;
      console.error(`${label}: ERROR, se conservó la original (${err.message})`);
    }
  }

  console.log('\n=== LISTO ===');
  console.log(`Recomprimidas: ${ok} · con error: ${failed}`);
  console.log(`Antes: ${fmtSize(before)} → Después: ${fmtSize(after)} · Liberado: ${fmtSize(before - after)}`);
  console.log('Nota: el panel de Usage de Supabase puede tardar hasta 1 hora en reflejarlo.');
  return failed ? 2 : 0;
}

module.exports = { main, parseArgs, pathFromUrl };

if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => { console.error('FALLÓ:', err.message); process.exit(1); });
}
