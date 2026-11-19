import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const formId = (
        typeof req.query.formId === 'string'
          ? req.query.formId
          : typeof req.query.form_id === 'string'
          ? req.query.form_id
          : ''
      ).trim();

      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      // Project only necessary columns to minimize bandwidth and memory
      const SUBMISSION_COLUMNS = `
        id, form_id, form_version, applicant_name, applicant_email,
        submission_data, submitted_at, status, admin_notes, updated_at
      `;

      if (formId) {
        // Leverages idx_submissions_form_date for sub-millisecond paginated scan
        const result = await query(
          `SELECT ${SUBMISSION_COLUMNS} FROM submissions 
           WHERE form_id = $1 
           ORDER BY submitted_at DESC 
           LIMIT $2 OFFSET $3`,
          [formId, limit, offset]
        );
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return res.status(200).json({ submissions: result.rows });
      }

      const result = await query(
        `SELECT ${SUBMISSION_COLUMNS} FROM submissions 
         ORDER BY submitted_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      return res.status(200).json({ submissions: result.rows });
    }

    if (req.method === 'POST') {
      const sub = req.body;
      if (!sub || !sub.form_id) {
        return res.status(400).json({ error: 'Missing form_id or submission payload' });
      }

      const id = sub.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const submissionData = sub.submission_data || {};

      // Efficient insert returning only necessary confirmation columns (saving bandwidth during submission peaks)
      const result = await query(
        `INSERT INTO submissions (
          id, form_id, form_version, submission_data, submitted_at,
          status, applicant_name, applicant_email, admin_notes, updated_at
        ) VALUES (
          $1, $2, $3, $4, COALESCE($5, NOW()), $6, $7, $8, $9, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          submission_data = EXCLUDED.submission_data,
          status = EXCLUDED.status,
          applicant_name = EXCLUDED.applicant_name,
          applicant_email = EXCLUDED.applicant_email,
          updated_at = NOW()
        RETURNING id, form_id, status, submitted_at, applicant_name, applicant_email`,
        [
          id,
          sub.form_id,
          sub.form_version || 1,
          JSON.stringify(submissionData),
          sub.submitted_at || null,
          sub.status || 'confirmed',
          sub.applicant_name || null,
          sub.applicant_email || null,
          sub.admin_notes || null
        ]
      );

      return res.status(200).json({ success: true, submission: result.rows[0] });
    }

    if (req.method === 'PATCH') {
      const { id, status, admin_notes } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing submission id' });

      if (status !== undefined && admin_notes !== undefined) {
        await query(
          `UPDATE submissions SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3`,
          [status, admin_notes, id]
        );
      } else if (status !== undefined) {
        await query(
          `UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2`,
          [status, id]
        );
      } else if (admin_notes !== undefined) {
        await query(
          `UPDATE submissions SET admin_notes = $1, updated_at = NOW() WHERE id = $2`,
          [admin_notes, id]
        );
      }

      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: 'Missing submission id' });

      await query(`DELETE FROM submissions WHERE id = $1`, [id]);
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /api/submissions error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
