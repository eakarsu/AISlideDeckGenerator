const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  if (process.env.MIGRATE_ON_START !== 'true') return;
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('runtime admin credentials are required');
  await pool.query(await fs.readFile(path.join(__dirname, 'migrations', '001_deck_workflow.sql'), 'utf8'));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer', created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(120),
      input_data JSONB, result TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'viewer'");
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,'admin')
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password,name=EXCLUDED.name,role='admin'`,
    [email.toLowerCase(), hash, process.env.PROVISION_ADMIN_NAME || 'Runtime Admin']
  );
  await pool.end();
}

main().catch((error) => {
  console.error('Runtime bootstrap failed:', error.message);
  process.exit(1);
});
