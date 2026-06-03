if (process.env.NODE_ENV !== "production") { try { require("dotenv").config({ path: require("path").join(__dirname, "../../backend/.env") }); } catch(e){} }
const express = require('express');
const cors = require('cors');
const { authenticate, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/stores',    require('./routes/stores'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/resumen',   require('./routes/resumen'));

app.use('/api/admin', (req, res, next) => {
  if (req.path === '/login' || req.path === '/admins') return next();
  authenticate(req, res, () => requireAdmin(req, res, next));
});
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Start local server only outside Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Devol backend running at http://localhost:${PORT}`));
}

module.exports = app;
