import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_simulator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding google_id column to users table...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE');
    console.log('✅ google_id column added.');

    console.log('Making password_hash nullable for OAuth users...');
    await client.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
    console.log('✅ password_hash is now nullable.');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
