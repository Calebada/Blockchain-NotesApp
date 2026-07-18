const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { loadEnvFile } = require("../src/config/env");

loadEnvFile(path.join(__dirname, "..", ".env"));

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");

async function setupDatabase() {
  if (!connectionString) {
    throw new Error(
      "SUPABASE_DB_URL is required to run database setup. Copy the Supabase Postgres connection string into backend/.env."
    );
  }

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, "utf8");
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    await client.query(sql);
    console.log("Supabase database schema is ready.");
  } finally {
    await client.end();
  }
}

setupDatabase().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
