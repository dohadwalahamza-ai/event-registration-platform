import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const slugOrId = (
        typeof req.query.slug === 'string'
          ? req.query.slug
          : typeof req.query.id === 'string'
          ? req.query.id
          : Array.isArray(req.query.slug)
          ? req.query.slug[0]
          : ''
      ).trim().toLowerCase();

      // If querying single form by slug or id
      if (slugOrId) {
        const clean = slugOrId.replace(/\/+$/, '');
        const core = clean.replace(/^(event-form-|form-)/, '');

        const formResult = await query(
          `SELECT * FROM forms 
           WHERE LOWER(slug) IN ($1, $2, $3, $4)
              OR LOWER(id) IN ($1, $2, $3, $4)
           LIMIT 1`,
          [clean, core, `event-form-${core}`, `form-${core}`]
        );

        if (formResult.rows.length === 0) {
          return res.status(404).json({ error: 'Form not found', slug: slugOrId });
        }

        const form = formResult.rows[0];

        // Fetch fields
        const fieldsResult = await query(
          `SELECT * FROM form_fields 
           WHERE form_id = $1 
           ORDER BY sort_order ASC, created_at ASC`,
          [form.id]
        );

        form.fields = fieldsResult.rows;

        // Set caching headers for public form GET (1 minute stale-while-revalidate)
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ form });
      }

      // Fetch all non-deleted forms
      const formsResult = await query(
        `SELECT * FROM forms 
         WHERE status != 'deleted' 
         ORDER BY created_at DESC 
         LIMIT 100`
      );

      const forms = formsResult.rows;

      // Attach fields for each form
      if (forms.length > 0) {
        const formIds = forms.map((f: any) => f.id);
        const fieldsResult = await query(
          `SELECT * FROM form_fields 
           WHERE form_id = ANY($1) 
           ORDER BY sort_order ASC`,
          [formIds]
        );

        const fieldMap = new Map<string, any[]>();
        for (const fld of fieldsResult.rows) {
          if (!fieldMap.has(fld.form_id)) fieldMap.set(fld.form_id, []);
          fieldMap.get(fld.form_id)!.push(fld);
        }

        for (const f of forms) {
          f.fields = fieldMap.get(f.id) || [];
        }
      }

      return res.status(200).json({ forms });
    }

    if (req.method === 'POST') {
      const form = req.body;
      if (!form || !form.id || !form.title) {
        return res.status(400).json({ error: 'Missing form id or title' });
      }

      const slug = form.slug || `event-form-${form.id.replace(/^form-/, '')}`;

      await query(
        `INSERT INTO forms (
          id, owner_id, title, slug, description, cover_image_url,
          event_date, event_end_date, venue, status, registration_deadline,
          theme_config, presentation_mode, success_message, redirect_url,
          published_version, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          cover_image_url = EXCLUDED.cover_image_url,
          event_date = EXCLUDED.event_date,
          event_end_date = EXCLUDED.event_end_date,
          venue = EXCLUDED.venue,
          status = EXCLUDED.status,
          registration_deadline = EXCLUDED.registration_deadline,
          theme_config = EXCLUDED.theme_config,
          presentation_mode = EXCLUDED.presentation_mode,
          success_message = EXCLUDED.success_message,
          redirect_url = EXCLUDED.redirect_url,
          published_version = EXCLUDED.published_version,
          updated_at = NOW()`,
        [
          form.id,
          form.owner_id || 'admin',
          form.title,
          slug,
          form.description || '',
          form.cover_image_url || null,
          form.event_date || null,
          form.event_end_date || null,
          form.venue || null,
          form.status || 'published',
          form.registration_deadline || null,
          JSON.stringify(form.theme_config || {}),
          form.presentation_mode || 'step_by_step',
          form.success_message || 'Thank you! Your registration has been submitted successfully.',
          form.redirect_url || null,
          form.published_version || 1
        ]
      );

      // If fields are passed, sync them
      if (Array.isArray(form.fields)) {
        await query(`DELETE FROM form_fields WHERE form_id = $1`, [form.id]);

        for (let idx = 0; idx < form.fields.length; idx++) {
          const f = form.fields[idx];
          await query(
            `INSERT INTO form_fields (
              id, form_id, field_key, label, field_type, description,
              placeholder, required, default_value, options,
              validation_rules, conditional_rules, sort_order, configuration
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )`,
            [
              f.id,
              form.id,
              f.field_key || `field_${idx}`,
              f.label || 'Untitled Field',
              f.field_type || 'short_text',
              f.description || null,
              f.placeholder || null,
              Boolean(f.required),
              f.default_value || null,
              f.options ? JSON.stringify(f.options) : null,
              f.validation_rules ? JSON.stringify(f.validation_rules) : null,
              f.conditional_rules ? JSON.stringify(f.conditional_rules) : null,
              idx + 1,
              f.configuration ? JSON.stringify(f.configuration) : null
            ]
          );
        }
      }

      return res.status(200).json({ success: true, form });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: 'Missing form id' });

      // Soft delete by updating status
      await query(`UPDATE forms SET status = 'deleted', updated_at = NOW() WHERE id = $1`, [id]);
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /api/forms error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
