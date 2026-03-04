// pages/api/catalogs.js
// Returns all catalog data in one request.
// Also handles POST to add a new value (find-or-create).
import { query } from '../../lib/db';
import { requireAuth } from '../../lib/auth';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  // ── GET: return all catalogs ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const [
        primer_nombres, segundo_nombres,
        apellidos_paterno, apellidos_materno,
        puestos, calles, colonias, municipios, paises,
        generos, grados, tipos, nacionalidades, estados,
      ] = await Promise.all([
        query('SELECT id, valor FROM cat_primer_nombre    ORDER BY valor'),
        query('SELECT id, valor FROM cat_segundo_nombre   ORDER BY valor'),
        query('SELECT id, valor FROM cat_apellido_paterno ORDER BY valor'),
        query('SELECT id, valor FROM cat_apellido_materno ORDER BY valor'),
        query('SELECT id, valor FROM cat_puesto           ORDER BY valor'),
        query('SELECT id, valor FROM cat_calle            ORDER BY valor'),
        query('SELECT id, valor FROM cat_colonia          ORDER BY valor'),
        query('SELECT id, valor FROM cat_municipio        ORDER BY valor'),
        query('SELECT id, valor FROM cat_pais             ORDER BY valor'),
        query('SELECT id, valor FROM cat_genero           ORDER BY valor'),
        query('SELECT id, valor FROM cat_grado_academico  ORDER BY id'),
        query('SELECT id, valor, label FROM cat_tipo_persona ORDER BY id'),
        query('SELECT id, valor FROM cat_nacionalidad     ORDER BY valor'),
        query('SELECT id, valor FROM cat_estado           ORDER BY valor'),
      ]);

      return res.status(200).json({
        primer_nombres:    primer_nombres.rows,
        segundo_nombres:   segundo_nombres.rows,
        apellidos_paterno: apellidos_paterno.rows,
        apellidos_materno: apellidos_materno.rows,
        puestos:           puestos.rows,
        calles:            calles.rows,
        colonias:          colonias.rows,
        municipios:        municipios.rows,
        paises:            paises.rows,
        generos:           generos.rows,
        grados:            grados.rows,
        tipos:             tipos.rows,
        nacionalidades:    nacionalidades.rows,
        estados:           estados.rows,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener catálogos.' });
    }
  }

  return res.status(405).end();
}