import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { query } from './db.js';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';
const DEFAULT_TITLE = 'EventForm - Dynamic Event Registration';
const DEFAULT_DESC =
  'Dynamic Event Form Builder & Registration Platform - Create, customize, and share registration forms.';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = (typeof req.query.slug === 'string' ? req.query.slug : Array.isArray(req.query.slug) ? req.query.slug[0] : '')
    .trim()
    .toLowerCase();

  let formTitle = DEFAULT_TITLE;
  let formDesc = DEFAULT_DESC;
  let formImage = DEFAULT_IMAGE;
  const canonicalUrl = `https://event.khargharjamaat.org/e/${slug || ''}`;

  if (slug) {
    try {
      const cleanSlug = slug.replace(/\/+$/, '');
      const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

      const result = await query(
        `SELECT title, description, cover_image_url FROM forms 
         WHERE LOWER(slug) IN ($1, $2, $3, $4) 
            OR LOWER(id) IN ($1, $2, $3, $4) 
         LIMIT 1`,
        [cleanSlug, coreSlug, `event-form-${coreSlug}`, `form-${coreSlug}`]
      );

      if (result.rows.length > 0) {
        const data = result.rows[0];
        if (data.title) formTitle = `${data.title} | Event Registration`;
        if (data.description) formDesc = data.description;
        else formDesc = `Register online for ${data.title}. Fill out the official registration form to participate.`;
        if (data.cover_image_url) formImage = data.cover_image_url;
      }
    } catch (e) {
      console.warn('Error fetching form for metadata:', e);
    }
  }

  const safeTitle = escapeHtml(formTitle);
  const safeDesc = escapeHtml(formDesc);
  const safeImage = escapeHtml(formImage);
  const safeUrl = escapeHtml(canonicalUrl);

  const metaSnippet = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />

    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="EventForm Platform" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${safeUrl}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />

    <link rel="canonical" href="${safeUrl}" />
  `;

  // Try reading compiled dist/index.html to preserve exact Vite hashed bundle script and css links
  let html = '';
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      const rawHtml = fs.readFileSync(indexPath, 'utf8');
      html = rawHtml
        .replace(/<title>.*?<\/title>/i, '')
        .replace(/<meta name="description".*?\/>/i, '')
        .replace('</head>', `${metaSnippet}</head>`);
    }
  } catch {}

  // Fallback to minimal shell if dist/index.html is not yet built
  if (!html) {
    html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${metaSnippet}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).send(html);
}
