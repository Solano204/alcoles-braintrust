// pages/api/users/index.js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  // ── GET ALL ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const result = await query(`
        SELECT
          u.id, u.username, u.activo, u.created_at, u.curp_persona,
          t.valor AS tipo_persona, t.label AS tipo_persona_label,
          pn.valor AS primer_nombre,
          ap.valor AS apellido_paterno,
          sn.valor AS segundo_nombre,
          am.valor AS apellido_materno,
          p.rfc, p.fecha_nacimiento, p.edad
        FROM users u
        JOIN  cat_tipo_persona      t  ON t.id  = u.tipo_persona_id
        LEFT JOIN persons           p  ON p.curp = u.curp_persona
        LEFT JOIN cat_primer_nombre    pn ON pn.id = p.primer_nombre_id
        LEFT JOIN cat_apellido_paterno ap ON ap.id = p.apellido_paterno_id
        LEFT JOIN cat_segundo_nombre   sn ON sn.id = p.segundo_nombre_id
        LEFT JOIN cat_apellido_materno am ON am.id = p.apellido_materno_id
        ORDER BY t.valor, ap.valor, pn.valor
      `);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener usuarios: ' + err.message });
    }
  }

  // ── POST (CREATE) ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden crear usuarios.' });
    }

    const { curp_persona, username, password, tipo_persona } = req.body;

    if (!curp_persona || !username || !password || !tipo_persona) {
      return res.status(400).json({ error: 'Persona, usuario, contraseña y tipo son requeridos.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
      // Verify person exists
      const personCheck = await query(
        'SELECT curp FROM persons WHERE curp = $1', [curp_persona.toUpperCase()]
      );
      if (personCheck.rows.length === 0) {
        return res.status(404).json({ error: 'La persona con esa CURP no existe.' });
      }

      // Get tipo_persona_id
      const tipoCheck = await query(
        'SELECT id FROM cat_tipo_persona WHERE valor = $1', [tipo_persona]
      );
      if (tipoCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Tipo de persona inválido.' });
      }
      const tipo_persona_id = tipoCheck.rows[0].id;

      // Check duplicate role for same person
      const roleCheck = await query(
        'SELECT id FROM users WHERE curp_persona = $1 AND tipo_persona_id = $2',
        [curp_persona.toUpperCase(), tipo_persona_id]
      );
      if (roleCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Esta persona ya tiene una cuenta con ese rol.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const result = await query(`
        INSERT INTO users (curp_persona, username, password_hash, tipo_persona_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, activo, created_at, curp_persona
      `, [curp_persona.toUpperCase(), username.trim(), hash, tipo_persona_id]);

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        if (err.constraint?.includes('username')) {
          return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
        }
        return res.status(409).json({ error: 'Esta persona ya tiene una cuenta con ese rol.' });
      }
      return res.status(500).json({ error: 'Error al crear el usuario: ' + err.message });
    }
  }

  return res.status(405).end();
}