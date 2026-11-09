import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pxwrvkpefgeonbaflaqh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3J2a3BlZmdlb25iYWZsYXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDk1MjAsImV4cCI6MjEwODU4NTUyMH0.IV0QxHwSJ4Gx__8Ui5eaNKVe6h-Hz4CypAIzI6FPvyM';

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let form: any = null;
    let fields: any[] = [];
    let submissions: any[] = [];

    if (rawSlug) {
      const cleanSlug = rawSlug.toLowerCase().replace(/\/+$/, '');
      const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

      // 1. Locate form in Supabase
      const { data: formData } = await supabase
        .from('forms')
        .select('*')
        .or(
          `slug.eq.${cleanSlug},slug.eq.${coreSlug},slug.eq.event-form-${coreSlug},slug.eq.form-${coreSlug},id.eq.${cleanSlug},id.eq.form-${coreSlug}`
        )
        .limit(1)
        .maybeSingle();

      form = formData;

      if (!form) {
        // Fallback search across forms
        const { data: allForms } = await supabase.from('forms').select('*').limit(50);
        if (allForms && Array.isArray(allForms)) {
          form = allForms.find((f: any) => {
            const fs = (f.slug || '').toLowerCase();
            const fi = (f.id || '').toLowerCase();
            return (
              fs === cleanSlug ||
              fi === cleanSlug ||
              fs === `event-form-${coreSlug}` ||
              fi === `form-${coreSlug}` ||
              fs.replace(/^(event-form-|form-)/, '') === coreSlug
            );
          });
        }
      }

      if (form) {
        // 2. Fetch form fields
        const { data: fieldsData } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', form.id)
          .order('sort_order', { ascending: true });

        if (fieldsData && Array.isArray(fieldsData)) {
          fields = fieldsData;
        }

        // 3. Fetch submissions for this form
        const { data: subsData } = await supabase
          .from('submissions')
          .select('*')
          .eq('form_id', form.id)
          .order('submitted_at', { ascending: false });

        if (subsData && Array.isArray(subsData)) {
          submissions = subsData;
        }
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
