// pages/api/tasks/[id].js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, color } = req.body;
    try {
      // Only owner or admin can update
      const check = await query('SELECT user_id FROM tasks WHERE id=$1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada.' });
      if (check.rows[0].user_id !== user.id && user.tipo_persona !== 'ADMIN') {
        return res.status(403).json({ error: 'Sin permiso para modificar esta tarea.' });
      }
      const result = await query(`
        UPDATE tasks SET titulo=$1, descripcion=$2, fecha=$3, hora_inicio=$4, hora_fin=$5, color=$6
        WHERE id=$7 RETURNING *
      `, [titulo, descripcion || null, fecha, hora_inicio || null, hora_fin || null, color || '#3B82F6', id]);
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al actualizar la tarea.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const check = await query('SELECT user_id FROM tasks WHERE id=$1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada.' });
      if (check.rows[0].user_id !== user.id && user.tipo_persona !== 'ADMIN') {
        return res.status(403).json({ error: 'Sin permiso para eliminar esta tarea.' });
      }
      await query('DELETE FROM tasks WHERE id=$1', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al eliminar la tarea.' });
    }
  }

  return res.status(405).end();
}
