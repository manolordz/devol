const { createClient } = require('@supabase/supabase-js');

let _db;

function getDb() {
  if (!_db) {
    _db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _db;
}

async function getRates() {
  const { data } = await getDb()
    .from('currency_rates')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || { jpy_to_mxn: 0.12, usd_to_mxn: 17.0 };
}

function toMXN(amount, currency, rates) {
  if (currency === 'MXN') return amount;
  if (currency === 'JPY') return amount * (rates?.jpy_to_mxn || 0.12);
  if (currency === 'USD') return amount * (rates?.usd_to_mxn || 17.0);
  return amount;
}

async function logActivity({ projectId, userId, userName, actionType, tableName, recordId, fieldName, oldValue, newValue }) {
  try {
    await getDb().from('activity_log').insert({
      project_id:  projectId  || null,
      user_id:     userId,
      user_name:   userName   || null,
      action_type: actionType,
      table_name:  tableName,
      record_id:   recordId   || null,
      field_name:  fieldName  || null,
      old_value:   oldValue  != null ? String(oldValue)  : null,
      new_value:   newValue  != null ? String(newValue)  : null,
    });
  } catch (e) {
    console.error('logActivity error:', e.message);
  }
}

module.exports = { getDb, getRates, toMXN, logActivity };
