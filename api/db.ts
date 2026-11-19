import pg from 'pg';
import dns from 'node:dns/promises';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

async function getPool(): Promise<pg.Pool> {
  if (poolInstance) return poolInstance;

  const conn = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('Database connection error: Neither POSTGRES_URL nor DATABASE_URL environment variable is configured.');
  }

  try {
    const url = new URL(conn);
    const host = url.hostname;

    // Check if system DNS resolves host
    let targetHost = host;
    try {
      await dns.lookup(host);
    } catch {
      // Local ISP DNS lag fallback: resolve via public DNS (Google / Cloudflare)
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const ips = await dns.resolve4(host);
        if (ips && ips.length > 0) {
          targetHost = ips[0];
        }
      } catch {}
    }

    if (targetHost !== host) {
      poolInstance = new Pool({
        host: targetHost,
        port: parseInt(url.port) || 5432,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
        ssl: {
          rejectUnauthorized: false,
          servername: host,
        },
        max: 3, // Optimal for Serverless concurrency with PgBouncer
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      poolInstance = new Pool({
        connectionString: conn,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 3, // Optimal for Serverless concurrency with PgBouncer
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
    }

    return poolInstance;
  } catch {
    poolInstance = new Pool({
      connectionString: conn,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    return poolInstance;
  }
}

export async function query(text: string, params?: any[]) {
  const p = await getPool();
  return p.query(text, params);
}
