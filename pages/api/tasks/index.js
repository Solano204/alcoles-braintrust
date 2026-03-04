// pages/api/tasks/index.js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      let result;
      if (user.tipo_persona === 'ADMIN') {
        result = await query(`
          SELECT t.*, u.username, tp.valor AS tipo_persona,
                 p.primer_nombre, p.apellido_paterno
          FROM tasks t
          LEFT JOIN users u ON u.id = t.user_id
          LEFT JOIN cat_tipo_persona tp ON tp.id = u.tipo_persona_id
          LEFT JOIN persons p ON p.curp = u.curp_persona
          ORDER BY t.fecha, t.hora_inicio
        `);
      } else {
        result = await query(
          `SELECT * FROM tasks WHERE user_id=$1 ORDER BY fecha, hora_inicio`,
          [user.id]
        );
      }
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Error al obtener tareas.' });
    }
  }

  if (req.method === 'POST') {
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, color } = req.body;
    if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son requeridos.' });
    try {
      const result = await query(`
        INSERT INTO tasks (titulo, descripcion, fecha, hora_inicio, hora_fin, color, user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [titulo, descripcion || null, fecha, hora_inicio || null, hora_fin || null,
          color || '#3B82F6', user.id]);
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Error al crear la tarea.' });
    }
  }

  return res.status(405).end();
}