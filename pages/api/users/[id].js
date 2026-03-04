// pages/api/users/[id].js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await query(`
        SELECT u.*, t.valor AS tipo_persona, t.label AS tipo_persona_label,
               p.primer_nombre, p.apellido_paterno, p.rfc, p.fecha_nacimiento
        FROM users u
        JOIN cat_tipo_persona t ON t.id = u.tipo_persona_id
        LEFT JOIN persons p     ON p.curp = u.curp_persona
        WHERE u.id = $1
      `, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Error al obtener el usuario.' });
    }
  }

  if (req.method === 'PUT') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden modificar usuarios.' });
    }
    const { username, password, activo } = req.body;
    try {
      if (password && password.trim().length >= 6) {
        const hash = await bcrypt.hash(password, 10);
        const result = await query(
          `UPDATE users SET username=$1, activo=$2, password_hash=$3 WHERE id=$4
           RETURNING id, username, activo`,
          [username?.trim(), activo ?? true, hash, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        return res.status(200).json(result.rows[0]);
      }
      const result = await query(
        `UPDATE users SET username=$1, activo=$2 WHERE id=$3 RETURNING id, username, activo`,
        [username?.trim(), activo ?? true, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
      return res.status(500).json({ error: 'Error al actualizar.' });
    }
  }

  if (req.method === 'DELETE') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar usuarios.' });
    }
    if (id === user.id) {
      return res.status(409).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }
    try {
      const result = await query('DELETE FROM users WHERE id=$1 RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Error al eliminar.' });
    }
  }

  return res.status(405).end();
}