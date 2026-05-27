import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

async function run() {
  try {
    console.log("Resetting database schema...");
    const client = await pool.connect();
    
    // Drop existing to ensure fresh schema
    await client.query(`
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS portfolio CASCADE;
      DROP TABLE IF EXISTS price_history CASCADE;
      DROP TABLE IF EXISTS stocks CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS friends CASCADE;
      DROP TABLE IF EXISTS portfolio_history CASCADE;
    `);

    const __dirname = path.resolve();
    const schemaPath = path.join(__dirname, 'src', 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(sql);
    client.release();

    console.log("Schema applied completely and successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error applying schema:", err);
    process.exit(1);
  }
}

run();
