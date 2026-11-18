const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const path = require('path');

// Evita retener imágenes en caché de memoria (importante en funciones serverless)
sharp.cache(false);

// Ajustes de compresión: suficiente calidad para fotos de producto, mucho menos peso
const MAX_DIMENSION = 1600; // px en el lado más largo
const WEBP_QUALITY = 80;

let _sb;
function getSB() {
  if (!_sb) {
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

function fmtSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

// Redimensiona (máx. 1600px), corrige la orientación EXIF y convierte a WebP.
// Si algo falla o el resultado no es más liviano, devuelve el archivo original
// para que la subida nunca se rompa por culpa de la compresión.
async function compressImage(buffer, originalname, { quiet = false } = {}) {
  const originalExt = path.extname(originalname) || '.jpg';
  const log = quiet ? () => {} : console.log;
  try {
    const compressed = await sharp(buffer, { failOn: 'none' })
      .rotate() // aplica la orientación EXIF antes de que se pierda el metadata
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (compressed.length >= buffer.length) {
      log(`[storage] ${originalname}: ya optimizada (${fmtSize(buffer.length)}), se sube el original`);
      return { buffer, ext: originalExt, contentType: undefined };
    }

    log(`[storage] ${originalname}: ${fmtSize(buffer.length)} → ${fmtSize(compressed.length)}`);
    return { buffer: compressed, ext: '.webp', contentType: 'image/webp' };
  } catch (err) {
    console.error(`[storage] No se pudo comprimir ${originalname}, se sube el original:`, err.message);
    return { buffer, ext: originalExt, contentType: undefined };
  }
}

async function uploadFile(buffer, originalname, folder = 'uploads') {
  const { buffer: finalBuffer, ext, contentType } = await compressImage(buffer, originalname);
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
  const sb = getSB();
  const { error } = await sb.storage.from('devol').upload(filename, finalBuffer, {
    upsert: false,
    // Los nombres son únicos, así que el navegador puede cachearlas un año (menos egress)
    cacheControl: '31536000',
    ...(contentType ? { contentType } : {}),
  });
  if (error) throw error;
  const { data } = sb.storage.from('devol').getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { uploadFile, compressImage, fmtSize };
