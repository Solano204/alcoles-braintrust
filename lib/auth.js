// lib/auth.js
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRY  = process.env.JWT_EXPIRY  || '8h';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

export function getTokenFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies.auth_token || null;
}

export function getUserFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) { res.status(401).json({ error: 'No autorizado. Inicie sesión.' }); return null; }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.tipo_persona !== 'ADMIN') {
    res.status(403).json({ error: 'Acceso denegado. Solo administradores.' }); return null;
  }
  return user;
}

export function cookieOptions(maxAge = 60 * 60 * 8) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge };
}