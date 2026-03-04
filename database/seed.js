// database/seed.js
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // ── 1. Find or create primer_nombre in catalog ──────────────
    let pnResult = await client.query(
      `SELECT id FROM cat_primer_nombre WHERE valor_lower = 'administrador'`
    );
    let primer_nombre_id;
    if (pnResult.rows.length > 0) {
      primer_nombre_id = pnResult.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO cat_primer_nombre (valor, valor_lower) VALUES ('Administrador', 'administrador') RETURNING id`
      );
      primer_nombre_id = ins.rows[0].id;
    }

    // ── 2. Find or create apellido_paterno in catalog ────────────
    let apResult = await client.query(
      `SELECT id FROM cat_apellido_paterno WHERE valor_lower = 'sistema'`
    );
    let apellido_paterno_id;
    if (apResult.rows.length > 0) {
      apellido_paterno_id = apResult.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO cat_apellido_paterno (valor, valor_lower) VALUES ('Sistema', 'sistema') RETURNING id`
      );
      apellido_paterno_id = ins.rows[0].id;
    }

    // ── 3. Get nacionalidad_id for 'Mexicana' ────────────────────
    const nacResult = await client.query(
      `SELECT id FROM cat_nacionalidad WHERE valor = 'Mexicana'`
    );
    const nacionalidad_id = nacResult.rows[0]?.id || null;

    // ── 4. Get pais_id for 'México' ──────────────────────────────
    const paisResult = await client.query(
      `SELECT id FROM cat_pais WHERE valor_lower = 'méxico'`
    );
    const pais_id = paisResult.rows[0]?.id || null;

    // ── 5. Insert admin person ────────────────────────────────────
    await client.query(`
      INSERT INTO persons (
        curp, rfc,
        primer_nombre_id, apellido_paterno_id,
        fecha_nacimiento, edad,
        nacionalidad_id, pais_id
      )
      VALUES (
        'XAXX010101HDFXXX00', NULL,
        $1, $2,
        '1990-01-01', 35,
        $3, $4
      )
      ON CONFLICT (curp) DO NOTHING
    `, [primer_nombre_id, apellido_paterno_id, nacionalidad_id, pais_id]);

    // ── 6. Get tipo_persona_id for ADMIN ─────────────────────────
    const tipoResult = await client.query(
      `SELECT id FROM cat_tipo_persona WHERE valor = 'ADMIN'`
    );
    const tipo_persona_id = tipoResult.rows[0]?.id;
    if (!tipo_persona_id) {
      throw new Error('cat_tipo_persona does not have ADMIN row — did you run the schema?');
    }

    // ── 7. Hash password and insert user ─────────────────────────
    const hash = await bcrypt.hash('Admin123!', 10);

    await client.query(`
      INSERT INTO users (curp_persona, username, password_hash, tipo_persona_id)
      VALUES ('XAXX010101HDFXXX00', 'admin', $1, $2)
      ON CONFLICT DO NOTHING
    `, [hash, tipo_persona_id]);

    console.log('✅ Seed complete!');
    console.log('   Username : admin');
    console.log('   Password : Admin123!');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();