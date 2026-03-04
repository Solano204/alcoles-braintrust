// pages/api/auth/login.js
import { query } from '../../../lib/db';
import { signToken, cookieOptions } from '../../../lib/auth';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }
  try {
    const result = await query(`
      SELECT
        u.id, u.username, u.password_hash, u.activo, u.curp_persona,
        t.valor AS tipo_persona,
        pn.valor AS primer_nombre,
        ap.valor AS apellido_paterno
      FROM users u
      JOIN  cat_tipo_persona      t  ON t.id  = u.tipo_persona_id
      LEFT JOIN persons           p  ON p.curp = u.curp_persona
      LEFT JOIN cat_primer_nombre    pn ON pn.id = p.primer_nombre_id
      LEFT JOIN cat_apellido_paterno ap ON ap.id = p.apellido_paterno_id
      WHERE u.username = $1
    `, [username.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    const u = result.rows[0];
    if (!u.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }
    const valid = await bcrypt.compare(password, u.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    const nombre = [u.primer_nombre, u.apellido_paterno].filter(Boolean).join(' ') || u.username;
    const token = signToken({
      id: u.id,
      username: u.username,
      tipo_persona: u.tipo_persona,
      curp_persona: u.curp_persona,
      nombre,
    });
    res.setHeader('Set-Cookie', serialize('auth_token', token, cookieOptions()));
    return res.status(200).json({
      id: u.id,
      username: u.username,
      tipo_persona: u.tipo_persona,
      nombre,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}