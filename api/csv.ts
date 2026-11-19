import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './db.js';

function escapeCsvCell(val: any): string {
  if (val === undefined || val === null) return '""';
  if (Array.isArray(val)) {
    const joined = val
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.url || item.path || JSON.stringify(item);
        return String(item);
      })
      .filter((u) => !u.startsWith('file://') && !u.startsWith('/Users/'))
      .join(' ; ');
    return `"${joined.replace(/"/g, '""')}"`;
  }
  if (typeof val === 'object') {
    if (val.url && typeof val.url === 'string') {
      return `"${val.url.replace(/"/g, '""')}"`;
    }
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (str.startsWith('file://') || str.startsWith('/Users/')) {
    return '""';
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS so Google Sheets (=IMPORTDATA) and Microsoft Excel can fetch live
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawSlug = (
    typeof req.query.slug === 'string'
      ? req.query.slug
      : Array.isArray(req.query.slug)
      ? req.query.slug[0]
      : req.query.id || req.query.formId || ''
  )
    .toString()
    .trim();

  try {
    let form: any = null;
    let fields: any[] = [];
    let submissions: any[] = [];

    if (rawSlug) {
      const cleanSlug = rawSlug.toLowerCase().replace(/\/+$/, '');
      const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

      // 1. Locate form in Postgres
      const formRes = await query(
        `SELECT * FROM forms 
         WHERE LOWER(slug) IN ($1, $2, $3, $4)
            OR LOWER(id) IN ($1, $2, $3, $4)
         LIMIT 1`,
        [cleanSlug, coreSlug, `event-form-${coreSlug}`, `form-${coreSlug}`]
      );

      if (formRes.rows.length > 0) {
        form = formRes.rows[0];

        // 2. Fetch form fields
        const fieldsRes = await query(
          `SELECT * FROM form_fields 
           WHERE form_id = $1 
           ORDER BY sort_order ASC, created_at ASC`,
          [form.id]
        );
        fields = fieldsRes.rows;

        // 3. Fetch submissions for this form
        const subsRes = await query(
          `SELECT * FROM submissions 
           WHERE form_id = $1 
           ORDER BY submitted_at DESC`,
          [form.id]
        );
        submissions = subsRes.rows;
      }
    }

    // Filter active data fields
    const dataFields = fields.filter(
      (f) => !['section_heading', 'info_text'].includes(f.field_type)
    );

    // Build CSV Headers
    const headers = [
      'Event Name',
      'Submitted At',
      'Status',
      'Player / Applicant Name',
      'Email Address',
      'Phone / WhatsApp',
      ...dataFields.map((f) => f.label || f.field_key),
      'Admin Notes / Remarks',
    ];

    const formTitle = form?.title || 'Event Registration';

    // Build CSV Rows
    const rows = submissions.map((sub) => {
      const data = sub.submission_data || {};
      const phone =
        data.whatsapp_number ||
        data.phone_number ||
        data.phone ||
        data.mobile ||
        data.contact_number ||
        '';

      const adminNote = sub.admin_notes || (data._admin_notes as string) || '';

      const rowValues = [
        escapeCsvCell(formTitle),
        escapeCsvCell(sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ''),
        escapeCsvCell(sub.status || 'confirmed'),
        escapeCsvCell(sub.applicant_name || data.full_name || data.name || ''),
        escapeCsvCell(sub.applicant_email || data.email || ''),
        escapeCsvCell(phone),
        ...dataFields.map((f) => escapeCsvCell(data[f.field_key])),
        escapeCsvCell(adminNote),
      ];

      return rowValues.join(',');
    });

    const csvContent = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','), ...rows].join(
      '\n'
    );

    const safeSlug = (form?.slug || rawSlug || 'responses')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeSlug}-live-responses-${dateStr}.csv"`
    );
    // Realtime live responses: never cache so Google Sheets & Excel always get fresh submissions
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Error generating live CSV:', err);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send(`Failed to generate CSV: ${err.message || String(err)}`);
  }
}
