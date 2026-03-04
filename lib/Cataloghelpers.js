// lib/catalogHelpers.js
// find_or_create: checks lowercase, inserts if not found, returns id
import { query } from './db';

/**
 * Given a table name and a display value, returns the existing id
 * (matched case-insensitively via valor_lower) or inserts a new row.
 * Returns null if value is empty/null.
 */
export async function findOrCreate(tableName, displayValue) {
  if (!displayValue || !String(displayValue).trim()) return null;

  const trimmed  = String(displayValue).trim();
  const lowerVal = trimmed.toLowerCase();

  const existing = await query(
    `SELECT id FROM ${tableName} WHERE valor_lower = $1`,
    [lowerVal]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  // Not found — insert with title-cased display value
  const capitalized = trimmed
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const inserted = await query(
    `INSERT INTO ${tableName} (valor, valor_lower) VALUES ($1, $2) RETURNING id`,
    [capitalized, lowerVal]
  );
  return inserted.rows[0].id;
}

/**
 * Resolves all catalog text fields in a person form body to their ids.
 */
export async function resolvePersonCatalogs(body) {
  const [
    primer_nombre_id,
    segundo_nombre_id,
    apellido_paterno_id,
    apellido_materno_id,
    puesto_id,
    calle_id,
    colonia_id,
    municipio_id,
    pais_id,
  ] = await Promise.all([
    findOrCreate('cat_primer_nombre',    body.primer_nombre),
    findOrCreate('cat_segundo_nombre',   body.segundo_nombre),
    findOrCreate('cat_apellido_paterno', body.apellido_paterno),
    findOrCreate('cat_apellido_materno', body.apellido_materno),
    findOrCreate('cat_puesto',           body.puesto),
    findOrCreate('cat_calle',            body.calle),
    findOrCreate('cat_colonia',          body.colonia),
    findOrCreate('cat_municipio',        body.municipio),
    findOrCreate('cat_pais',             body.pais),
  ]);

  return {
    primer_nombre_id,
    segundo_nombre_id,
    apellido_paterno_id,
    apellido_materno_id,
    puesto_id,
    calle_id,
    colonia_id,
    municipio_id,
    pais_id,
  };
}