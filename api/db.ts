import pg from 'pg';
import dns from 'node:dns/promises';

const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_8fcPg4NwSnqA@ep-wandering-sunset-bc0jar90-pooler.c-16.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

let poolInstance: pg.Pool | null = null;

async function getPool(): Promise<pg.Pool> {
  if (poolInstance) return poolInstance;

  try {
    const url = new URL(connectionString);
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
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    } else {
      poolInstance = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    return poolInstance;
  } catch {
    poolInstance = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
    return poolInstance;
  }
}

export async function query(text: string, params?: any[]) {
  const p = await getPool();
  return p.query(text, params);
}
