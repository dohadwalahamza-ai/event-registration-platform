import { Form, Submission } from '../types';

const API_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function apiGetFormBySlug(slug: string): Promise<Form | null> {
  try {
    const res = await fetchWithTimeout(`/api/forms?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.form || null;
  } catch (e) {
    console.warn('apiGetFormBySlug error:', e);
    return null;
  }
}

export async function apiGetForms(): Promise<Form[] | null> {
  try {
    const res = await fetchWithTimeout('/api/forms');
    if (!res.ok) return null;
    const data = await res.json();
    return data.forms || null;
  } catch (e) {
    console.warn('apiGetForms error:', e);
    return null;
  }
}

export async function apiSaveForm(form: Form): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/forms', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    return res.ok;
  } catch (e) {
    console.warn('apiSaveForm error:', e);
    return false;
  }
}

export async function apiDeleteForm(id: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`/api/forms?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('apiDeleteForm error:', e);
    return false;
  }
}

export async function apiGetSubmissions(formId?: string): Promise<Submission[] | null> {
  try {
    const url = formId ? `/api/submissions?formId=${encodeURIComponent(formId)}` : '/api/submissions';
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.submissions || null;
  } catch (e) {
    console.warn('apiGetSubmissions error:', e);
    return null;
  }
}

export async function apiSaveSubmission(sub: Submission): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(sub),
    });
    return res.ok;
  } catch (e) {
    console.warn('apiSaveSubmission error:', e);
    return false;
  }
}

export async function apiUpdateSubmissionStatus(
  id: string,
  status?: string,
  adminNotes?: string
): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/submissions', {
      method: 'PATCH',
      body: JSON.stringify({ id, status, admin_notes: adminNotes }),
    });
    return res.ok;
  } catch (e) {
    console.warn('apiUpdateSubmissionStatus error:', e);
    return false;
  }
}

export async function apiDeleteSubmission(id: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`/api/submissions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('apiDeleteSubmission error:', e);
    return false;
  }
}

