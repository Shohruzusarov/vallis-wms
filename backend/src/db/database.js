const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS models (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parts (
      id SERIAL PRIMARY KEY,
      model_id INTEGER REFERENCES models(id),
      part_code VARCHAR(100) UNIQUE NOT NULL,
      part_name VARCHAR(200) NOT NULL,
      quantity_per_kit INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(100) UNIQUE NOT NULL,
      model_id INTEGER REFERENCES models(id),
      total_kits INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'in_progress',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_kits (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      kit_number INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'incomplete',
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scan_logs (
      id SERIAL PRIMARY KEY,
      kit_id INTEGER REFERENCES order_kits(id),
      part_code VARCHAR(100) NOT NULL,
      scanned_part_name VARCHAR(200),
      result VARCHAR(50) NOT NULL,
      message TEXT,
      scanned_at TIMESTAMP DEFAULT NOW()
    );

    INSERT INTO models (code, name) VALUES
      ('DC001F24', 'Душевая кабина DC-001F24'),
      ('DC002K18', 'Душевая кабина DC-002K18'),
      ('MX500W',   'Смеситель MX-500W')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO parts (model_id, part_code, part_name) VALUES
      (1, 'DC001F24-LID-W',  'Крышка белая'),
      (1, 'DC001F24-BASE',   'Поддон'),
      (1, 'DC001F24-DOOR-L', 'Дверь левая'),
      (1, 'DC001F24-DOOR-R', 'Дверь правая'),
      (1, 'DC001F24-SHOWER', 'Лейка душа'),
      (1, 'DC001F24-SEAL',   'Уплотнитель'),
      (1, 'DC001F24-HANDLE', 'Ручка'),
      (2, 'DC002K18-LID-G',  'Крышка серая'),
      (2, 'DC002K18-BASE',   'Поддон угловой'),
      (2, 'DC002K18-DOOR',   'Дверь одинарная'),
      (2, 'DC002K18-SHOWER', 'Лейка тропик'),
      (2, 'DC002K18-SEAL',   'Уплотнитель'),
      (2, 'DC002K18-HANDLE', 'Ручка скоба')
    ON CONFLICT (part_code) DO NOTHING;
  `);
  console.log('Database initialized OK');
}

module.exports = { pool, initDB };
