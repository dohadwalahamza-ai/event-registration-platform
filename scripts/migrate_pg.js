import dns from 'node:dns/promises';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import pg from 'pg';
const { Client } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing POSTGRES_URL or DATABASE_URL environment variable');
  process.exit(1);
}

const url = new URL(connectionString);
const host = url.hostname;

async function run() {
  console.log('Resolving host via Google DNS...');
  const ips = await dns.resolve4(host);
  console.log('Resolved IPs:', ips);

  const client = new Client({
    host: ips[0],
    port: parseInt(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: {
      rejectUnauthorized: false,
      servername: host
    }
  });

  console.log('Connecting to Neon Postgres...');
  await client.connect();
  console.log('✓ CONNECTED TO NEON POSTGRESQL SUCCESSFULLY!');

  const ping = await client.query('SELECT NOW() as current_time, current_database() as db_name');
  console.log('Connection info:', ping.rows[0]);

  console.log('\n--- Creating Tables in Neon Postgres ---');

  // 1. forms table
  await client.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id VARCHAR(128) PRIMARY KEY,
      owner_id VARCHAR(128) DEFAULT 'admin',
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      cover_image_url TEXT,
      event_date TIMESTAMPTZ,
      event_end_date TIMESTAMPTZ,
      venue VARCHAR(255),
      status VARCHAR(50) DEFAULT 'published',
      registration_deadline TIMESTAMPTZ,
      theme_config JSONB DEFAULT '{}'::jsonb,
      presentation_mode VARCHAR(50) DEFAULT 'step_by_step',
      success_message TEXT DEFAULT 'Thank you! Your registration has been submitted successfully.',
      redirect_url TEXT,
      published_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ forms table ready');

  // 2. form_fields table
  await client.query(`
    CREATE TABLE IF NOT EXISTS form_fields (
      id VARCHAR(128) PRIMARY KEY,
      form_id VARCHAR(128) NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      field_key VARCHAR(128) NOT NULL,
      label VARCHAR(255) NOT NULL,
      field_type VARCHAR(50) NOT NULL,
      description TEXT,
      placeholder VARCHAR(255),
      required BOOLEAN DEFAULT FALSE,
      default_value TEXT,
      options JSONB,
      validation_rules JSONB,
      conditional_rules JSONB,
      sort_order INT DEFAULT 0,
      configuration JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ form_fields table ready');

  // 3. submissions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id VARCHAR(128) PRIMARY KEY,
      form_id VARCHAR(128) NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      form_version INT DEFAULT 1,
      submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'confirmed',
      applicant_name VARCHAR(255),
      applicant_email VARCHAR(255),
      admin_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ submissions table ready');

  // 4. users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(128) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ users table ready');

  // Indices
  await client.query('CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);');
  await client.query('CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);');
  await client.query('CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);');
  await client.query('CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);');
  console.log('✓ Performance indexes verified');

  const formsRes = await client.query('SELECT count(*) FROM forms');
  const fieldsRes = await client.query('SELECT count(*) FROM form_fields');

  console.log('\n=============================================');
  console.log(`MIGRATION STATUS: SUCCESSFUL!`);
  console.log(`- Verified Forms in Neon Postgres: ${formsRes.rows[0].count}`);
  console.log(`- Verified Fields in Neon Postgres: ${fieldsRes.rows[0].count}`);
  console.log('=============================================\n');

  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
