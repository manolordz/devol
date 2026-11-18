const { createClient } = require('@supabase/supabase-js');
const path = require('path');

let _sb;
function getSB() {
  if (!_sb) {
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

async function uploadFile(buffer, originalname, folder = 'uploads') {
  const ext = path.extname(originalname) || '.jpg';
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
  const sb = getSB();
  const { error } = await sb.storage.from('devol').upload(filename, buffer, { upsert: false });
  if (error) throw error;
  const { data } = sb.storage.from('devol').getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { uploadFile };
