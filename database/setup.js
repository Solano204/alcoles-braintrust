// // database/setup.js
// // Runs schema creation AND seed in one shot.
// // Usage: node database/setup.js
// require('dotenv').config({ path: '.env.local' });
// const { Pool } = require('pg');
// const bcrypt = require('bcryptjs');

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// async function setup() {
//   const client = await pool.connect();
//   try {
//     console.log('🔌 Connected to:', process.env.DATABASE_URL);
//     console.log('');

//     // ══════════════════════════════════════════════════════════
//     // STEP 1: DROP EVERYTHING
//     // ══════════════════════════════════════════════════════════
//     console.log('🗑  Dropping old tables...');
//     await client.query(`
//       DROP VIEW  IF EXISTS v_users   CASCADE;
//       DROP VIEW  IF EXISTS v_persons CASCADE;
//       DROP TABLE IF EXISTS tasks     CASCADE;
//       DROP TABLE IF EXISTS users     CASCADE;
//       DROP TABLE IF EXISTS persons   CASCADE;
//       DROP TABLE IF EXISTS cat_primer_nombre    CASCADE;
//       DROP TABLE IF EXISTS cat_segundo_nombre   CASCADE;
//       DROP TABLE IF EXISTS cat_apellido_paterno CASCADE;
//       DROP TABLE IF EXISTS cat_apellido_materno CASCADE;
//       DROP TABLE IF EXISTS cat_puesto           CASCADE;
//       DROP TABLE IF EXISTS cat_calle            CASCADE;
//       DROP TABLE IF EXISTS cat_colonia          CASCADE;
//       DROP TABLE IF EXISTS cat_municipio        CASCADE;
//       DROP TABLE IF EXISTS cat_pais             CASCADE;
//       DROP TABLE IF EXISTS cat_genero           CASCADE;
//       DROP TABLE IF EXISTS cat_grado_academico  CASCADE;
//       DROP TABLE IF EXISTS cat_tipo_persona     CASCADE;
//       DROP TABLE IF EXISTS cat_nacionalidad     CASCADE;
//       DROP TABLE IF EXISTS cat_estado           CASCADE;
//       DROP FUNCTION IF EXISTS find_or_create(TEXT, TEXT);
//       DROP FUNCTION IF EXISTS update_updated_at();
//     `);
//     console.log('✅ Dropped.');

//     // ══════════════════════════════════════════════════════════
//     // STEP 2: EXTENSIONS
//     // ══════════════════════════════════════════════════════════
//     await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

//     // ══════════════════════════════════════════════════════════
//     // STEP 3: CATALOG TABLES
//     // ══════════════════════════════════════════════════════════
//     console.log('📦 Creating catalog tables...');

//     await client.query(`
//       CREATE TABLE cat_primer_nombre (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_segundo_nombre (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_apellido_paterno (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_apellido_materno (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_puesto (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_calle (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(200) NOT NULL,
//         valor_lower VARCHAR(200) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_colonia (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(200) NOT NULL,
//         valor_lower VARCHAR(200) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_municipio (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_pais (
//         id          SERIAL PRIMARY KEY,
//         valor       VARCHAR(100) NOT NULL,
//         valor_lower VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_genero (
//         id    SERIAL PRIMARY KEY,
//         valor VARCHAR(50) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_grado_academico (
//         id    SERIAL PRIMARY KEY,
//         valor VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_tipo_persona (
//         id    SERIAL PRIMARY KEY,
//         valor VARCHAR(50) UNIQUE NOT NULL,
//         label VARCHAR(100) NOT NULL
//       );
//       CREATE TABLE cat_nacionalidad (
//         id    SERIAL PRIMARY KEY,
//         valor VARCHAR(100) UNIQUE NOT NULL
//       );
//       CREATE TABLE cat_estado (
//         id    SERIAL PRIMARY KEY,
//         valor VARCHAR(100) UNIQUE NOT NULL
//       );
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 4: SEED CATALOG DATA
//     // ══════════════════════════════════════════════════════════
//     console.log('📋 Seeding catalogs...');

//     await client.query(`
//       INSERT INTO cat_pais (valor, valor_lower) VALUES
//         ('México','méxico'),('Estados Unidos','estados unidos'),('Otro','otro');

//       INSERT INTO cat_genero (valor) VALUES
//         ('Masculino'),('Femenino'),('Otro');

//       INSERT INTO cat_grado_academico (valor) VALUES
//         ('Primaria'),('Secundaria'),('Preparatoria'),('Técnico Superior'),
//         ('Licenciatura'),('Maestría'),('Doctorado'),('Posdoctorado');

//       INSERT INTO cat_tipo_persona (valor, label) VALUES
//         ('ADMIN','Administrador'),('TEACHER','Docente'),
//         ('STUDENT','Alumno'),('TUTOR','Tutor'),('SECRETARY','Secretaria');

//       INSERT INTO cat_nacionalidad (valor) VALUES
//         ('Mexicana'),('Estadounidense'),('Otra');

//       INSERT INTO cat_estado (valor) VALUES
//         ('Aguascalientes'),('Baja California'),('Baja California Sur'),('Campeche'),
//         ('Chiapas'),('Chihuahua'),('Ciudad de México'),('Coahuila'),('Colima'),
//         ('Durango'),('Guanajuato'),('Guerrero'),('Hidalgo'),('Jalisco'),
//         ('México'),('Michoacán'),('Morelos'),('Nayarit'),('Nuevo León'),
//         ('Oaxaca'),('Puebla'),('Querétaro'),('Quintana Roo'),('San Luis Potosí'),
//         ('Sinaloa'),('Sonora'),('Tabasco'),('Tamaulipas'),('Tlaxcala'),
//         ('Veracruz'),('Yucatán'),('Zacatecas');
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 5: MAIN TABLES
//     // ══════════════════════════════════════════════════════════
//     console.log('🏗  Creating main tables...');

//     await client.query(`
//       CREATE TABLE persons (
//         curp                    VARCHAR(18) PRIMARY KEY,
//         rfc                     VARCHAR(13) UNIQUE,
//         primer_nombre_id        INTEGER REFERENCES cat_primer_nombre(id),
//         apellido_paterno_id     INTEGER REFERENCES cat_apellido_paterno(id),
//         segundo_nombre_id       INTEGER REFERENCES cat_segundo_nombre(id),
//         apellido_materno_id     INTEGER REFERENCES cat_apellido_materno(id),
//         genero_id               INTEGER REFERENCES cat_genero(id),
//         grado_academico_id      INTEGER REFERENCES cat_grado_academico(id),
//         puesto_id               INTEGER REFERENCES cat_puesto(id),
//         fecha_nacimiento        DATE,
//         edad                    INTEGER,
//         nacionalidad_id         INTEGER REFERENCES cat_nacionalidad(id),
//         numero                  VARCHAR(20),
//         calle_id                INTEGER REFERENCES cat_calle(id),
//         colonia_id              INTEGER REFERENCES cat_colonia(id),
//         municipio_id            INTEGER REFERENCES cat_municipio(id),
//         estado_id               INTEGER REFERENCES cat_estado(id),
//         pais_id                 INTEGER REFERENCES cat_pais(id),
//         codigo_postal           VARCHAR(10),
//         referencia              TEXT,
//         telefono                VARCHAR(20),
//         correo_electronico      VARCHAR(200),
//         facebook                VARCHAR(200),
//         instagram               VARCHAR(200),
//         tiktok                  VARCHAR(200),
//         linkedin                VARCHAR(200),
//         twitter                 VARCHAR(200),
//         url                     VARCHAR(500),
//         www                     VARCHAR(500),
//         created_at              TIMESTAMP DEFAULT NOW(),
//         updated_at              TIMESTAMP DEFAULT NOW()
//       );

//       CREATE TABLE users (
//         id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//         curp_persona    VARCHAR(18) REFERENCES persons(curp) ON DELETE RESTRICT,
//         username        VARCHAR(100) UNIQUE NOT NULL,
//         password_hash   VARCHAR(255) NOT NULL,
//         tipo_persona_id INTEGER NOT NULL REFERENCES cat_tipo_persona(id),
//         activo          BOOLEAN DEFAULT TRUE,
//         created_at      TIMESTAMP DEFAULT NOW(),
//         updated_at      TIMESTAMP DEFAULT NOW(),
//         UNIQUE (curp_persona, tipo_persona_id)
//       );

//       CREATE TABLE tasks (
//         id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//         titulo      VARCHAR(255) NOT NULL,
//         descripcion TEXT,
//         fecha       DATE NOT NULL,
//         hora_inicio TIME,
//         hora_fin    TIME,
//         color       VARCHAR(20) DEFAULT '#3B82F6',
//         user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
//         created_at  TIMESTAMP DEFAULT NOW(),
//         updated_at  TIMESTAMP DEFAULT NOW()
//       );
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 6: INDEXES
//     // ══════════════════════════════════════════════════════════
//     await client.query(`
//       CREATE INDEX idx_users_curp  ON users(curp_persona);
//       CREATE INDEX idx_tasks_user  ON tasks(user_id);
//       CREATE INDEX idx_tasks_fecha ON tasks(fecha);
//       CREATE INDEX idx_cat_pnombre ON cat_primer_nombre(valor_lower);
//       CREATE INDEX idx_cat_snombre ON cat_segundo_nombre(valor_lower);
//       CREATE INDEX idx_cat_apater  ON cat_apellido_paterno(valor_lower);
//       CREATE INDEX idx_cat_amater  ON cat_apellido_materno(valor_lower);
//       CREATE INDEX idx_cat_puesto  ON cat_puesto(valor_lower);
//       CREATE INDEX idx_cat_calle   ON cat_calle(valor_lower);
//       CREATE INDEX idx_cat_colonia ON cat_colonia(valor_lower);
//       CREATE INDEX idx_cat_munic   ON cat_municipio(valor_lower);
//       CREATE INDEX idx_cat_pais    ON cat_pais(valor_lower);
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 7: TRIGGERS
//     // ══════════════════════════════════════════════════════════
//     await client.query(`
//       CREATE OR REPLACE FUNCTION update_updated_at()
//       RETURNS TRIGGER AS $$
//       BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
//       $$ LANGUAGE plpgsql;

//       CREATE TRIGGER trg_persons_updated BEFORE UPDATE ON persons
//         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
//       CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
//         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
//       CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
//         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 8: FIND-OR-CREATE FUNCTION
//     // ══════════════════════════════════════════════════════════
//     await client.query(`
//       CREATE OR REPLACE FUNCTION find_or_create(tbl TEXT, display_val TEXT)
//       RETURNS INTEGER AS $$
//       DECLARE
//         lower_val TEXT;
//         result_id INTEGER;
//       BEGIN
//         IF display_val IS NULL OR TRIM(display_val) = '' THEN RETURN NULL; END IF;
//         lower_val := LOWER(TRIM(display_val));
//         EXECUTE format('SELECT id FROM %I WHERE valor_lower = $1', tbl)
//           INTO result_id USING lower_val;
//         IF result_id IS NULL THEN
//           EXECUTE format('INSERT INTO %I (valor, valor_lower) VALUES ($1, $2) RETURNING id', tbl)
//             INTO result_id USING INITCAP(TRIM(display_val)), lower_val;
//         END IF;
//         RETURN result_id;
//       END;
//       $$ LANGUAGE plpgsql;
//     `);

//     // ══════════════════════════════════════════════════════════
//     // STEP 9: VIEWS
//     // ══════════════════════════════════════════════════════════
//     await client.query(`
//       CREATE OR REPLACE VIEW v_persons AS
//       SELECT
//         p.curp, p.rfc, p.numero, p.codigo_postal, p.referencia,
//         p.fecha_nacimiento, p.edad,
//         p.telefono, p.correo_electronico,
//         p.facebook, p.instagram, p.tiktok, p.linkedin, p.twitter, p.url, p.www,
//         p.created_at, p.updated_at,
//         p.primer_nombre_id, p.segundo_nombre_id,
//         p.apellido_paterno_id, p.apellido_materno_id,
//         p.genero_id, p.grado_academico_id, p.puesto_id,
//         p.nacionalidad_id, p.calle_id, p.colonia_id,
//         p.municipio_id, p.estado_id, p.pais_id,
//         pn.valor AS primer_nombre,  sn.valor AS segundo_nombre,
//         ap.valor AS apellido_paterno, am.valor AS apellido_materno,
//         g.valor  AS genero,         ga.valor AS grado_academico,
//         pu.valor AS puesto,         n.valor  AS nacionalidad,
//         ca.valor AS calle,          co.valor AS colonia,
//         mu.valor AS municipio,      e.valor  AS estado,
//         pa.valor AS pais
//       FROM persons p
//       LEFT JOIN cat_primer_nombre    pn ON pn.id = p.primer_nombre_id
//       LEFT JOIN cat_segundo_nombre   sn ON sn.id = p.segundo_nombre_id
//       LEFT JOIN cat_apellido_paterno ap ON ap.id = p.apellido_paterno_id
//       LEFT JOIN cat_apellido_materno am ON am.id = p.apellido_materno_id
//       LEFT JOIN cat_genero           g  ON g.id  = p.genero_id
//       LEFT JOIN cat_grado_academico  ga ON ga.id = p.grado_academico_id
//       LEFT JOIN cat_puesto           pu ON pu.id = p.puesto_id
//       LEFT JOIN cat_nacionalidad     n  ON n.id  = p.nacionalidad_id
//       LEFT JOIN cat_calle            ca ON ca.id = p.calle_id
//       LEFT JOIN cat_colonia          co ON co.id = p.colonia_id
//       LEFT JOIN cat_municipio        mu ON mu.id = p.municipio_id
//       LEFT JOIN cat_estado           e  ON e.id  = p.estado_id
//       LEFT JOIN cat_pais             pa ON pa.id = p.pais_id;

//       CREATE OR REPLACE VIEW v_users AS
//       SELECT
//         u.id, u.username, u.activo, u.created_at, u.curp_persona,
//         t.valor AS tipo_persona, t.label AS tipo_persona_label,
//         pn.valor AS primer_nombre, ap.valor AS apellido_paterno,
//         sn.valor AS segundo_nombre, am.valor AS apellido_materno,
//         p.rfc, p.fecha_nacimiento, p.edad
//       FROM users u
//       JOIN cat_tipo_persona          t  ON t.id  = u.tipo_persona_id
//       LEFT JOIN persons              p  ON p.curp = u.curp_persona
//       LEFT JOIN cat_primer_nombre    pn ON pn.id  = p.primer_nombre_id
//       LEFT JOIN cat_apellido_paterno ap ON ap.id  = p.apellido_paterno_id
//       LEFT JOIN cat_segundo_nombre   sn ON sn.id  = p.segundo_nombre_id
//       LEFT JOIN cat_apellido_materno am ON am.id  = p.apellido_materno_id;
//     `);

//     console.log('✅ Schema created.');

//     // ══════════════════════════════════════════════════════════
//     // STEP 10: CREATE ADMIN USER
//     // ══════════════════════════════════════════════════════════
//     console.log('👤 Creating admin user...');

//     // Insert name catalogs
//     const pn = await client.query(`
//       INSERT INTO cat_primer_nombre (valor, valor_lower)
//       VALUES ('Administrador', 'administrador')
//       ON CONFLICT (valor_lower) DO UPDATE SET valor = EXCLUDED.valor
//       RETURNING id
//     `);
//     const ap = await client.query(`
//       INSERT INTO cat_apellido_paterno (valor, valor_lower)
//       VALUES ('Sistema', 'sistema')
//       ON CONFLICT (valor_lower) DO UPDATE SET valor = EXCLUDED.valor
//       RETURNING id
//     `);

//     const nacId  = (await client.query(`SELECT id FROM cat_nacionalidad WHERE valor = 'Mexicana'`)).rows[0].id;
//     const paisId = (await client.query(`SELECT id FROM cat_pais WHERE valor_lower = 'méxico'`)).rows[0].id;
//     const tipoId = (await client.query(`SELECT id FROM cat_tipo_persona WHERE valor = 'ADMIN'`)).rows[0].id;

//     await client.query(`
//       INSERT INTO persons (curp, primer_nombre_id, apellido_paterno_id, fecha_nacimiento, edad, nacionalidad_id, pais_id)
//       VALUES ('XAXX010101HDFXXX00', $1, $2, '1990-01-01', 35, $3, $4)
//       ON CONFLICT (curp) DO NOTHING
//     `, [pn.rows[0].id, ap.rows[0].id, nacId, paisId]);

//     const hash = await bcrypt.hash('Admin123!', 10);

//     await client.query(`
//       INSERT INTO users (curp_persona, username, password_hash, tipo_persona_id)
//       VALUES ('XAXX010101HDFXXX00', 'admin', $1, $2)
//       ON CONFLICT DO NOTHING
//     `, [hash, tipoId]);

//     console.log('');
//     console.log('🎉 Setup complete!');
//     console.log('   Username : admin');
//     console.log('   Password : Admin123!');
//     console.log('   URL      : http://localhost:3000');

//   } catch (err) {
//     console.error('❌ Setup error:', err.message);
//     console.error(err);
//   } finally {
//     client.release();
//     await pool.end();
//   }
// }

// setup();