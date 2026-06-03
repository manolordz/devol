-- ============================================================
-- DEVOL — Supabase PostgreSQL Schema
-- Run this once in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  pin       TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'user',
  enabled   SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  date       TEXT,
  status     TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_projects (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS currency_rates (
  id         SERIAL PRIMARY KEY,
  jpy_to_mxn NUMERIC NOT NULL DEFAULT 0.12,
  usd_to_mxn NUMERIC NOT NULL DEFAULT 17.0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stores (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  city       TEXT NOT NULL,
  zone       TEXT NOT NULL,
  address    TEXT,
  specialty  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  whatsapp   TEXT,
  wishlist   TEXT,
  factura    TEXT DEFAULT 'No',
  anticipo   NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  carrier         TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  declared_value  TEXT,
  label_photo     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  photo            TEXT,
  brand            TEXT NOT NULL,
  model            TEXT NOT NULL,
  price            NUMERIC NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'JPY',
  store_id         INTEGER REFERENCES stores(id),
  inventory_status TEXT DEFAULT 'Visto',
  status           TEXT DEFAULT 'Disponible',
  client_id        INTEGER REFERENCES clients(id),
  delivered        SMALLINT DEFAULT 0,
  paqueteria       SMALLINT DEFAULT 0,
  precio_publicado TEXT,
  shipment_id      INTEGER REFERENCES shipments(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'MXN',
  amount_mxn  NUMERIC,
  category    TEXT NOT NULL,
  paid_by     INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'MXN',
  amount_mxn  NUMERIC,
  paid_by     INTEGER REFERENCES clients(id),
  paid_to     INTEGER REFERENCES users(id),
  account     TEXT,
  note        TEXT,
  received    SMALLINT DEFAULT 0,
  received_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER,
  user_id     INTEGER NOT NULL,
  user_name   TEXT,
  action_type TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   INTEGER,
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS so the service_role key has full access
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects         DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects    DISABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates   DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores           DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients          DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments        DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory        DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments         DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     DISABLE ROW LEVEL SECURITY;

-- Seed default admin user
INSERT INTO users (name, pin, role, enabled)
VALUES ('Admin', '1234', 'admin', 1)
ON CONFLICT DO NOTHING;

-- Seed default currency rates
INSERT INTO currency_rates (jpy_to_mxn, usd_to_mxn)
SELECT 0.12, 17.0
WHERE NOT EXISTS (SELECT 1 FROM currency_rates);
