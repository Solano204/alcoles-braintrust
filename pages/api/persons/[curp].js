// pages/api/persons/[curp].js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { resolvePersonCatalogs } from '../../../lib/catalogHelpers';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const curp = req.query.curp?.toUpperCase();

  // ── GET ONE ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const result = await query(`
        SELECT
          p.curp, p.rfc, p.numero, p.codigo_postal, p.referencia,
          p.fecha_nacimiento, p.edad,
          p.telefono, p.correo_electronico,
          p.facebook, p.instagram, p.tiktok, p.linkedin, p.twitter, p.url, p.www,
          p.primer_nombre_id, p.segundo_nombre_id,
          p.apellido_paterno_id, p.apellido_materno_id,
          p.genero_id, p.grado_academico_id, p.puesto_id,
          p.nacionalidad_id, p.calle_id, p.colonia_id,
          p.municipio_id, p.estado_id, p.pais_id,
          pn.valor AS primer_nombre,
          sn.valor AS segundo_nombre,
          ap.valor AS apellido_paterno,
          am.valor AS apellido_materno,
          g.valor  AS genero,
          ga.valor AS grado_academico,
          pu.valor AS puesto,
          n.valor  AS nacionalidad,
          ca.valor AS calle,
          co.valor AS colonia,
          mu.valor AS municipio,
          e.valor  AS estado,
          pa.valor AS pais,
          COALESCE(json_agg(
            json_build_object('id',u.id,'username',u.username,'tipo_persona',t.valor,'activo',u.activo)
          ) FILTER (WHERE u.id IS NOT NULL), '[]') AS cuentas
        FROM persons p
        LEFT JOIN cat_primer_nombre    pn ON pn.id = p.primer_nombre_id
        LEFT JOIN cat_segundo_nombre   sn ON sn.id = p.segundo_nombre_id
        LEFT JOIN cat_apellido_paterno ap ON ap.id = p.apellido_paterno_id
        LEFT JOIN cat_apellido_materno am ON am.id = p.apellido_materno_id
        LEFT JOIN cat_genero           g  ON g.id  = p.genero_id
        LEFT JOIN cat_grado_academico  ga ON ga.id = p.grado_academico_id
        LEFT JOIN cat_puesto           pu ON pu.id = p.puesto_id
        LEFT JOIN cat_nacionalidad     n  ON n.id  = p.nacionalidad_id
        LEFT JOIN cat_calle            ca ON ca.id = p.calle_id
        LEFT JOIN cat_colonia          co ON co.id = p.colonia_id
        LEFT JOIN cat_municipio        mu ON mu.id = p.municipio_id
        LEFT JOIN cat_estado           e  ON e.id  = p.estado_id
        LEFT JOIN cat_pais             pa ON pa.id = p.pais_id
        LEFT JOIN users                u  ON u.curp_persona = p.curp
        LEFT JOIN cat_tipo_persona     t  ON t.id  = u.tipo_persona_id
        WHERE p.curp = $1
        GROUP BY
          p.curp, pn.valor, sn.valor, ap.valor, am.valor,
          g.valor, ga.valor, pu.valor, n.valor,
          ca.valor, co.valor, mu.valor, e.valor, pa.valor
      `, [curp]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada.' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la persona.' });
    }
  }

  // ── PUT (UPDATE) ─────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden modificar personas.' });
    }
    if (!req.body.primer_nombre || !req.body.apellido_paterno) {
      return res.status(400).json({ error: 'Primer nombre y apellido paterno son requeridos.' });
    }
    try {
      const catIds = await resolvePersonCatalogs(req.body);
      const result = await query(`
        UPDATE persons SET
          primer_nombre_id=$1, apellido_paterno_id=$2,
          segundo_nombre_id=$3, apellido_materno_id=$4,
          genero_id=$5, grado_academico_id=$6, puesto_id=$7,
          fecha_nacimiento=$8, edad=$9, nacionalidad_id=$10,
          numero=$11, calle_id=$12, colonia_id=$13, municipio_id=$14,
          estado_id=$15, pais_id=$16, codigo_postal=$17, referencia=$18,
          telefono=$19, correo_electronico=$20,
          facebook=$21, instagram=$22, tiktok=$23,
          linkedin=$24, twitter=$25, url=$26, www=$27
        WHERE curp=$28 RETURNING curp
      `, [
        catIds.primer_nombre_id, catIds.apellido_paterno_id,
        catIds.segundo_nombre_id, catIds.apellido_materno_id,
        req.body.genero_id          || null,
        req.body.grado_academico_id || null,
        catIds.puesto_id,
        req.body.fecha_nacimiento   || null,
        req.body.edad               || null,
        req.body.nacionalidad_id    || null,
        req.body.numero?.trim()     || null,
        catIds.calle_id, catIds.colonia_id, catIds.municipio_id,
        req.body.estado_id          || null,
        catIds.pais_id,
        req.body.codigo_postal?.trim()      || null,
        req.body.referencia?.trim()         || null,
        req.body.telefono?.trim()           || null,
        req.body.correo_electronico?.trim() || null,
        req.body.facebook?.trim()  || null,
        req.body.instagram?.trim() || null,
        req.body.tiktok?.trim()    || null,
        req.body.linkedin?.trim()  || null,
        req.body.twitter?.trim()   || null,
        req.body.url?.trim()       || null,
        req.body.www?.trim()       || null,
        curp,
      ]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada.' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al actualizar: ' + err.message });
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar personas.' });
    }
    try {
      const linked = await query(
        `SELECT u.id, u.username, t.valor AS tipo_persona
         FROM users u JOIN cat_tipo_persona t ON t.id = u.tipo_persona_id
         WHERE u.curp_persona = $1`, [curp]
      );
      if (linked.rows.length > 0) {
        const accs = linked.rows.map(u => `${u.username} (${u.tipo_persona})`).join(', ');
        return res.status(409).json({
          error: `No se puede eliminar. Cuentas vinculadas: ${accs}. Elimínelas primero.`,
        });
      }
      const result = await query('DELETE FROM persons WHERE curp=$1 RETURNING curp', [curp]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada.' });
      return res.status(200).json({ ok: true, curp });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al eliminar.' });
    }
  }

  return res.status(405).end();
}