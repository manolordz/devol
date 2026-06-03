const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'devol-secret-key-2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Se requiere acceso de administrador' });
  }
  next();
}

function requireProject(req, res, next) {
  if (!req.user?.projectId) {
    return res.status(400).json({ error: 'No se ha seleccionado un proyecto' });
  }
  next();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticate, requireAdmin, requireProject, signToken, JWT_SECRET };
