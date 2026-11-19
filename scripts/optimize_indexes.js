import dns from 'node:dns/promises';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Please provide POSTGRES_URL or DATABASE_URL');
  process.exit(1);
}
const url = new URL(connectionString);
const host = url.hostname;

async function addOptimizedIndexes() {
  console.log('Resolving host for index optimization...');
  const ips = await dns.resolve4(host);

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

  await client.connect();
  console.log('Connected! Creating peak-traffic indexes on Neon Postgres...');

  // 1. Lowercase expression indexes for ultra-fast slug/ID matching
  await client.query(`CREATE INDEX IF NOT EXISTS idx_forms_lower_slug ON forms(LOWER(slug));`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_forms_lower_id ON forms(LOWER(id));`);
  console.log('✓ Created idx_forms_lower_slug & idx_forms_lower_id');

  // 2. Status index for fast filtering
  await client.query(`CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);`);
  console.log('✓ Created idx_forms_status');

  // 3. Composite index on form_fields (form_id, sort_order) for instant field rendering
  await client.query(`CREATE INDEX IF NOT EXISTS idx_form_fields_form_sort ON form_fields(form_id, sort_order ASC);`);
  console.log('✓ Created idx_form_fields_form_sort');

  // 4. Composite index on submissions (form_id, submitted_at DESC) for fast paginated responses
  await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_form_date ON submissions(form_id, submitted_at DESC);`);
  console.log('✓ Created idx_submissions_form_date');

  // Analyze tables so query planner has fresh statistics
  await client.query(`ANALYZE forms;`);
  await client.query(`ANALYZE form_fields;`);
  await client.query(`ANALYZE submissions;`);
  console.log('✓ Analyzed tables for PostgreSQL query planner');

  await client.end();
  console.log('All performance indexes successfully created!');
}

addOptimizedIndexes().catch(err => {
  console.error('Index creation error:', err);
  process.exit(1);
});
