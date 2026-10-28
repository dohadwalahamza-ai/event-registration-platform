import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pxwrvkpefgeonbaflaqh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3J2a3BlZmdlb25iYWZsYXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDk1MjAsImV4cCI6MjEwODU4NTUyMH0.IV0QxHwSJ4Gx__8Ui5eaNKVe6h-Hz4CypAIzI6FPvyM';

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
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const cleanSlug = slug.replace(/\/+$/, '');
      const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

      const { data } = await supabase
        .from('forms')
        .select('title, description, cover_image_url')
        .or(`slug.eq.${cleanSlug},slug.eq.${coreSlug},slug.eq.event-form-${coreSlug},id.eq.${cleanSlug},id.eq.form-${coreSlug}`)
        .limit(1)
        .maybeSingle();

      if (data) {
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

  if (!html) {
    html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${metaSnippet}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).send(html);
}
