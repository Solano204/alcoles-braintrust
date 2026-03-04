// pages/api/persons/index.js
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { resolvePersonCatalogs } from '../../../lib/catalogHelpers';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  // ── GET ALL ──────────────────────────────────────────────────────────────
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
          COALESCE(
            json_agg(
              json_build_object(
                'id', u.id,
                'username', u.username,
                'tipo_persona', t.valor,
                'tipo_persona_label', t.label,
                'activo', u.activo
              )
            ) FILTER (WHERE u.id IS NOT NULL), '[]'
          ) AS cuentas
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
        GROUP BY
          p.curp, pn.valor, sn.valor, ap.valor, am.valor,
          g.valor, ga.valor, pu.valor, n.valor,
          ca.valor, co.valor, mu.valor, e.valor, pa.valor
        ORDER BY ap.valor, pn.valor
      `);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener personas: ' + err.message });
    }
  }

  // ── POST (CREATE) ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (user.tipo_persona !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden crear personas.' });
    }
    const { curp, rfc, primer_nombre, apellido_paterno } = req.body;
    if (!curp || !primer_nombre || !apellido_paterno) {
      return res.status(400).json({ error: 'CURP, primer nombre y apellido paterno son requeridos.' });
    }
    if (curp.length !== 18) {
      return res.status(400).json({ error: 'La CURP debe tener exactamente 18 caracteres.' });
    }
    try {
      const dupCurp = await query('SELECT curp FROM persons WHERE curp = $1', [curp.toUpperCase()]);
      if (dupCurp.rows.length > 0) return res.status(409).json({ error: 'Ya existe una persona con esa CURP.' });

      if (rfc && rfc.trim()) {
        const dupRfc = await query('SELECT curp FROM persons WHERE rfc = $1', [rfc.toUpperCase()]);
        if (dupRfc.rows.length > 0) return res.status(409).json({ error: 'Ya existe una persona con ese RFC.' });
      }

      const catIds = await resolvePersonCatalogs(req.body);

      const result = await query(`
        INSERT INTO persons (
          curp, rfc,
          primer_nombre_id, apellido_paterno_id, segundo_nombre_id, apellido_materno_id,
          genero_id, grado_academico_id, puesto_id,
          fecha_nacimiento, edad, nacionalidad_id,
          numero, calle_id, colonia_id, municipio_id, estado_id, pais_id,
          codigo_postal, referencia,
          telefono, correo_electronico, facebook, instagram, tiktok,
          linkedin, twitter, url, www
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29
        ) RETURNING curp
      `, [
        curp.toUpperCase(),
        rfc?.trim() ? rfc.toUpperCase() : null,
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
      ]);
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        if (err.constraint?.includes('rfc')) return res.status(409).json({ error: 'Ya existe una persona con ese RFC.' });
        return res.status(409).json({ error: 'Ya existe una persona con esa CURP.' });
      }
      return res.status(500).json({ error: 'Error al crear: ' + err.message });
    }
  }

  return res.status(405).end();
}