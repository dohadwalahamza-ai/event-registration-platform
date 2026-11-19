import { Form, FormField, Submission, DashboardStats, FormThemeConfig } from '../types';
import { SAMPLE_FORMS, INITIAL_SUBMISSIONS } from './seedData';
import { getSupabaseClient } from './supabaseClient';
import { MAX_PHOTO_SIZE_BYTES } from '../utils/imageCompressor';
import {
  apiGetFormBySlug,
  apiGetForms,
  apiSaveForm,
  apiDeleteForm,
  apiGetSubmissions,
  apiSaveSubmission,
  apiUpdateSubmissionStatus,
  apiDeleteSubmission,
} from './apiClient';

const STORAGE_KEYS = {
  FORMS: 'eventform_forms_v1',
  SUBMISSIONS: 'eventform_submissions_v1',
  DELETED_FORM_IDS: 'eventform_deleted_ids_v1',
  DELETED_SUBMISSION_IDS: 'eventform_deleted_submission_ids_v1',
};

export const KNOWN_DELETED_FORM_IDS = [
  'form-kpcl-season-5',
  'kpcl-season-5',
  'event-form-kpcl-season-5',
  'form-robotics-ai-hackathon',
  'robotics-ai-hackathon-2026',
  'form-mvqx7ulk',
  'form-mvqyem44',
  'form-mvqbgcvt',
  'form-mvqx7u1k',
  'form-mvph0jx2',
  'form-mvqlnbt2',
];

export const KNOWN_DELETED_SUBMISSION_IDS = [
  'sub-1',
  'sub-2',
  'sub-3',
  'sub-1793035405097-1py7q',
  'sub-1793178218862-x4gd5',
  'sub-1794244075459-c526e',
  'sub-1793178152166-13cda',
  'sub-1794241883514-fw1u3',
  'sub-1794243169316-j09fq',
  'sub-1793182924900-tmjc3',
  'sub-1794242263051-fijyy',
  'sub-1794240584186-frk4i',
];

function getDeletedFormIds(): Set<string> {
  const set = new Set<string>(KNOWN_DELETED_FORM_IDS);
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_FORM_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => set.add(String(id).toLowerCase().trim()));
      }
    }
  } catch {}
  return set;
}

function addDeletedFormId(id: string) {
  if (typeof window === 'undefined') return;
  const set = getDeletedFormIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_FORM_IDS, JSON.stringify(Array.from(set)));
}

function getDeletedSubmissionIds(): Set<string> {
  const set = new Set<string>(KNOWN_DELETED_SUBMISSION_IDS);
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => set.add(String(id).trim()));
      }
    }
  } catch {}
  return set;
}

function addDeletedSubmissionId(id: string) {
  if (typeof window === 'undefined') return;
  const set = getDeletedSubmissionIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS, JSON.stringify(Array.from(set)));
}

export const SYSTEM_STATE_FORM_ID = '__app_system_state__';

export const isSystemForm = (f: any): boolean => {
  if (!f || !f.id) return true;
  const id = String(f.id).trim();
  return id === SYSTEM_STATE_FORM_ID || id.startsWith('__');
};

let cachedBlacklistInMemory: { formIds: Set<string>; subIds: Set<string>; timestamp: number } | null = null;
const BLACKLIST_CACHE_TTL_MS = 60000; // 60s cache to avoid repeated pinging for deleted blacklist

/**
 * Fetch remote deleted blacklist from Supabase to keep all devices (mobile, desktop) in sync
 */
export async function syncRemoteDeletedBlacklist(force = false): Promise<{ formIds: Set<string>; subIds: Set<string> }> {
  const localFormIds = getDeletedFormIds();
  const localSubIds = getDeletedSubmissionIds();

  if (!force && cachedBlacklistInMemory && Date.now() - cachedBlacklistInMemory.timestamp < BLACKLIST_CACHE_TTL_MS) {
    // Return fast in-memory copy
    return {
      formIds: new Set([...cachedBlacklistInMemory.formIds, ...localFormIds]),
      subIds: new Set([...cachedBlacklistInMemory.subIds, ...localSubIds]),
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { formIds: localFormIds, subIds: localSubIds };

  try {
    const { data } = await supabase
      .from('forms')
      .select('theme_config')
      .eq('id', SYSTEM_STATE_FORM_ID)
      .maybeSingle();

    if (data?.theme_config) {
      let cfg: any = data.theme_config;
      if (typeof cfg === 'string') {
        try {
          cfg = JSON.parse(cfg);
        } catch {}
      }
      if (Array.isArray(cfg?.deleted_form_ids)) {
        cfg.deleted_form_ids.forEach((id: string) => {
          if (id) {
            const clean = String(id).toLowerCase().trim();
            localFormIds.add(clean);
            const core = clean.replace(/^(event-form-|form-)/, '');
            if (core) {
              localFormIds.add(core);
              localFormIds.add(`form-${core}`);
              localFormIds.add(`event-form-${core}`);
            }
          }
        });
      }
      if (Array.isArray(cfg?.deleted_submission_ids)) {
        cfg.deleted_submission_ids.forEach((id: string) => {
          if (id) localSubIds.add(String(id).trim());
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.DELETED_FORM_IDS, JSON.stringify(Array.from(localFormIds)));
        localStorage.setItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS, JSON.stringify(Array.from(localSubIds)));
      }

      // If local has additional deleted IDs, bidirectional sync them up to Supabase
      const remoteFormCount = Array.isArray(cfg?.deleted_form_ids) ? cfg.deleted_form_ids.length : 0;
      const remoteSubCount = Array.isArray(cfg?.deleted_submission_ids) ? cfg.deleted_submission_ids.length : 0;
      if (localFormIds.size > remoteFormCount || localSubIds.size > remoteSubCount) {
        Promise.resolve(
          supabase.from('forms').upsert({
            id: SYSTEM_STATE_FORM_ID,
            owner_id: 'system',
            title: '__SYSTEM_STATE__',
            slug: SYSTEM_STATE_FORM_ID,
            status: 'draft',
            theme_config: {
              deleted_form_ids: Array.from(localFormIds),
              deleted_submission_ids: Array.from(localSubIds),
              updated_at: new Date().toISOString(),
            },
          })
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Failed to sync remote deleted blacklist:', e);
  }

  cachedBlacklistInMemory = {
    formIds: new Set(localFormIds),
    subIds: new Set(localSubIds),
    timestamp: Date.now(),
  };

  return { formIds: localFormIds, subIds: localSubIds };
}

/**
 * Record a deleted ID both locally and in the Supabase global blacklist
 */
export async function recordDeletedId(deletedFormId?: string, deletedSubId?: string): Promise<void> {
  cachedBlacklistInMemory = null;
  if (deletedFormId) {
    const clean = deletedFormId.toLowerCase().trim();
    addDeletedFormId(clean);
    const core = clean.replace(/^(event-form-|form-)/, '');
    if (core) {
      addDeletedFormId(core);
      addDeletedFormId(`form-${core}`);
      addDeletedFormId(`event-form-${core}`);
    }
  }

  if (deletedSubId) {
    addDeletedSubmissionId(deletedSubId.trim());
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { formIds, subIds } = await syncRemoteDeletedBlacklist();
    if (deletedFormId) {
      const clean = deletedFormId.toLowerCase().trim();
      formIds.add(clean);
      const core = clean.replace(/^(event-form-|form-)/, '');
      if (core) {
        formIds.add(core);
        formIds.add(`form-${core}`);
        formIds.add(`event-form-${core}`);
      }
    }
    if (deletedSubId) {
      subIds.add(deletedSubId.trim());
    }

    await supabase.from('forms').upsert({
      id: SYSTEM_STATE_FORM_ID,
      owner_id: 'system',
      title: '__SYSTEM_STATE__',
      slug: SYSTEM_STATE_FORM_ID,
      status: 'draft',
      theme_config: {
        deleted_form_ids: Array.from(formIds),
        deleted_submission_ids: Array.from(subIds),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn('Failed to record deleted ID to Supabase:', e);
  }
}

/**
 * Check if a form or form identifier is marked as deleted in the system
 */
export const isDeletedForm = (f: any, deletedIds?: Set<string>): boolean => {
  if (isSystemForm(f)) return true;
  const ids = deletedIds || getDeletedFormIds();
  const fId = (f?.id || '').toLowerCase().trim();
  const fSlug = (f?.slug || '').toLowerCase().trim();
  const fCore = fId.replace(/^(event-form-|form-)/, '');
  const sCore = fSlug.replace(/^(event-form-|form-)/, '');
  return (
    ids.has(fId) ||
    ids.has(fSlug) ||
    (fCore !== '' && (ids.has(fCore) || ids.has(`form-${fCore}`) || ids.has(`event-form-${fCore}`))) ||
    (sCore !== '' && (ids.has(sCore) || ids.has(`form-${sCore}`) || ids.has(`event-form-${sCore}`)))
  );
};

/**
 * Check if a submission is marked as deleted or belongs to a deleted form
 */
export const isDeletedSubmission = (
  s: any,
  deletedSubIds?: Set<string>,
  deletedFormIds?: Set<string>
): boolean => {
  if (!s || !s.id) return true;
  const subIds = deletedSubIds || getDeletedSubmissionIds();
  if (subIds.has(String(s.id).trim())) return true;
  if (s.form_id) {
    const formIds = deletedFormIds || getDeletedFormIds();
    const sFormId = String(s.form_id).toLowerCase().trim();
    const sCore = sFormId.replace(/^(event-form-|form-)/, '');
    if (
      formIds.has(sFormId) ||
      (sCore !== '' && (formIds.has(sCore) || formIds.has(`form-${sCore}`) || formIds.has(`event-form-${sCore}`)))
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Parse registration deadline string with timezone and date-boundary awareness (Task 32)
 */
export function parseFormDeadline(deadlineStr?: string | null): Date | null {
  if (!deadlineStr || typeof deadlineStr !== 'string') return null;
  const trimmed = deadlineStr.trim();
  if (!trimmed) return null;

  // If date-only format like 'YYYY-MM-DD', treat deadline as end of that day (23:59:59.999)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const endOfDay = new Date(`${trimmed}T23:59:59.999`);
    if (!isNaN(endOfDay.getTime())) return endOfDay;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

/**
 * Checks whether a form's registration deadline has passed (Task 32)
 */
export function isFormExpired(form: { registration_deadline?: string; status?: string } | null | undefined): boolean {
  if (!form) return false;
  if (form.status === 'closed') return true;

  const deadline = parseFormDeadline(form.registration_deadline);
  if (!deadline) return false;

  return deadline.getTime() <= Date.now();
}

// Initialize local storage - keep forms clean so mobile browsers don't load stale samples
function initializeStorage() {
  if (typeof window === 'undefined') return;
  const deletedFormIds = getDeletedFormIds();
  const deletedSubIds = getDeletedSubmissionIds();

  // 1. Purge dummy fallback forms, system forms, and deleted forms from localStorage
  try {
    const existingForms = localStorage.getItem(STORAGE_KEYS.FORMS);
    if (existingForms) {
      const parsed: Form[] = JSON.parse(existingForms);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (f) =>
            !isSystemForm(f) &&
            !f.id.startsWith('form-fallback-') &&
            !isDeletedForm(f, deletedFormIds)
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(cleaned));
        }
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify([]));
    }
  } catch {}

  // 2. Purge dummy, deleted, or orphaned submissions from localStorage
  try {
    const existingSubs = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (existingSubs) {
      const parsedSubs: Submission[] = JSON.parse(existingSubs);
      if (Array.isArray(parsedSubs)) {
        const realSubs = parsedSubs.filter(
          (s) =>
            !['sub-1', 'sub-2', 'sub-3'].includes(s.id) &&
            !['Rohit Verma', 'Zaheer Khan', 'Dinesh Karthik'].includes(s.applicant_name || '') &&
            !isDeletedSubmission(s, deletedSubIds, deletedFormIds)
        );
        if (realSubs.length !== parsedSubs.length) {
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(realSubs));
        }
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
    }
  } catch {}

  // 3. Persist the updated blacklist to localStorage so Mobile has it permanently
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_FORM_IDS, JSON.stringify(Array.from(deletedFormIds)));
    localStorage.setItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS, JSON.stringify(Array.from(deletedSubIds)));
  } catch {}
}

initializeStorage();

export function parseThemeConfig(raw: any): FormThemeConfig {
  let val = raw;
  while (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      break;
    }
  }
  if (val && typeof val === 'object') {
    return {
      ...val,
      accentColor: val.accentColor || '#4f46e5',
      headerStyle: val.headerStyle || 'banner',
      themeMode: val.themeMode || 'light',
      backgroundStyle: val.backgroundStyle || 'banner_glass',
      borderRadius: val.borderRadius || 'xl',
      customBackgroundColor: val.customBackgroundColor || '#0f172a',
      presentationMode: val.presentationMode || 'step_by_step',
      section_routes: val.section_routes,
    };
  }
  return {
    accentColor: '#4f46e5',
    headerStyle: 'banner',
    themeMode: 'light',
    backgroundStyle: 'banner_glass',
    borderRadius: 'xl',
    customBackgroundColor: '#0f172a',
    presentationMode: 'step_by_step',
  };
}

/**
 * Pack a form definition into a compact, URL-safe base64 string
 * Enables 100% reliable QR code and link sharing on any device even without remote DB
 */
export function packFormToUrlPayload(form: Form): string {
  try {
    const compact = {
      i: form.id,
      t: form.title,
      s: form.slug,
      d: form.description || '',
      c: form.cover_image_url || '',
      v: form.venue || '',
      ed: form.event_date || '',
      st: form.status || 'published',
      sm: form.success_message || '',
      rl: form.response_limit || 'multiple',
      pm: form.presentation_mode || 'all_at_once',
      th: form.theme_config || {},
      f: (form.fields || []).map((f) => ({
        i: f.id,
        k: f.field_key,
        l: f.label,
        t: f.field_type,
        d: f.description || '',
        p: f.placeholder || '',
        r: f.required ? 1 : 0,
        o: f.options ? f.options.map((o) => ({ i: o.id, l: o.label, v: o.value })) : undefined,
        vld: f.validation_rules,
        cnd: f.conditional_rules,
        so: f.sort_order,
      })),
    };
    const json = JSON.stringify(compact);
    const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(utf8)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.warn('Failed to pack form payload', e);
    return '';
  }
}

/**
 * Unpack a compact, URL-safe base64 string into a complete Form definition
 */
export function unpackFormFromUrlPayload(payload: string): Form | null {
  try {
    if (!payload || typeof payload !== 'string') return null;
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const utf8 = Array.from(binary)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    const json = decodeURIComponent(utf8);
    const raw = JSON.parse(json);
    if (!raw || !raw.t) return null;

    const form: Form = {
      id: raw.i || `form-${raw.s || Date.now().toString(36)}`,
      owner_id: 'organizer',
      title: raw.t,
      slug: raw.s || raw.i || `event-form-${Date.now().toString(36)}`,
      description: raw.d || '',
      cover_image_url: raw.c || undefined,
      venue: raw.v || undefined,
      event_date: raw.ed || undefined,
      status: (raw.st as any) || 'published',
      success_message: raw.sm || 'Thank you for registering! We have recorded your submission.',
      response_limit: raw.rl || 'multiple',
      presentation_mode: raw.pm || raw.th?.presentationMode || 'step_by_step',
      published_version: 1,
      theme_config: parseThemeConfig(raw.th),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: (raw.f || []).map((f: any, idx: number) => ({
        id: f.i || `f-${idx + 1}`,
        form_id: raw.i || '',
        field_key: f.k || `field_${idx + 1}`,
        label: f.l || `Question ${idx + 1}`,
        field_type: f.t || 'short_text',
        description: f.d || undefined,
        placeholder: f.p || undefined,
        required: f.r === 1,
        options: f.o
          ? f.o.map((o: any) => ({
              id: o.i || `opt-${Math.random().toString(36).substring(2, 6)}`,
              label: o.l || o.label || '',
              value: o.v || o.value || '',
            }))
          : undefined,
        validation_rules: f.vld,
        conditional_rules: f.cnd,
        sort_order: f.so ?? idx + 1,
      })),
    };
    return form;
  } catch (err) {
    console.warn('Failed to unpack form payload from URL', err);
    return null;
  }
}

/**
 * Extract ?d= payload parameter from the current browser location
 */
export function getFormPayloadFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const href = window.location.href || '';

    const searchMatch = search.match(/[?&]d=([A-Za-z0-9_-]+)/);
    if (searchMatch && searchMatch[1]) return searchMatch[1];

    const hashMatch = hash.match(/[?&]d=([A-Za-z0-9_-]+)/);
    if (hashMatch && hashMatch[1]) return hashMatch[1];

    const hrefMatch = href.match(/[?&]d=([A-Za-z0-9_-]+)/);
    if (hrefMatch && hrefMatch[1]) return hrefMatch[1];

    const decodedHref = decodeURIComponent(href);
    const decodedMatch = decodedHref.match(/[?&]d=([A-Za-z0-9_-]+)/);
    if (decodedMatch && decodedMatch[1]) return decodedMatch[1];
  } catch (e) {
    console.warn('Error reading form payload from URL', e);
  }
  return null;
}

function sanitizeTimestamp(val: any): string | null {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

let cachedFormsInMemory: { data: Form[]; timestamp: number } | null = null;
let cachedSubsInMemory: { data: Submission[]; timestamp: number } | null = null;
const cachedFormSubsInMemory = new Map<string, { data: Submission[]; timestamp: number }>();
const publicFormCache = new Map<string, { form: Form; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15s in-memory TTL to prevent redundant Supabase bandwidth egress
const PUBLIC_FORM_CACHE_TTL_MS = 5 * 60 * 1000; // 5m isolated cache for public forms

export const FORM_QUERY_COLUMNS =
  'id, owner_id, title, slug, description, cover_image_url, event_date, event_end_date, venue, status, registration_deadline, theme_config, presentation_mode, success_message, redirect_url, published_version, created_at, updated_at, fields:form_fields(id, form_id, field_key, label, field_type, description, placeholder, required, default_value, options, validation_rules, conditional_rules, sort_order, configuration)';

export function invalidatePublicFormCache(formId?: string, slug?: string): void {
  if (formId) {
    const cleanId = String(formId).toLowerCase().trim();
    const coreId = cleanId.replace(/^(event-form-|form-)/, '');
    publicFormCache.delete(cleanId);
    publicFormCache.delete(`form_${cleanId}`);
    if (coreId) {
      publicFormCache.delete(coreId);
      publicFormCache.delete(`form_${coreId}`);
      publicFormCache.delete(`event-form-${coreId}`);
      publicFormCache.delete(`form-${coreId}`);
    }
  }
  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim();
    const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');
    publicFormCache.delete(cleanSlug);
    publicFormCache.delete(`form_${cleanSlug}`);
    if (coreSlug) {
      publicFormCache.delete(coreSlug);
      publicFormCache.delete(`form_${coreSlug}`);
    }
  }
}

export function invalidateStorageCache(): void {
  cachedFormsInMemory = null;
  cachedSubsInMemory = null;
  cachedFormSubsInMemory.clear();
  cachedBlacklistInMemory = null;
  publicFormCache.clear();
}

export class StorageService {
  /**
   * Fetch all forms - seamlessly merges Supabase remote and local storage with in-memory caching
   */
  static async getForms(forceFresh = false): Promise<Form[]> {
    if (!forceFresh && cachedFormsInMemory && Date.now() - cachedFormsInMemory.timestamp < CACHE_TTL_MS) {
      return cachedFormsInMemory.data;
    }

    // 0. Synchronize remote deleted blacklist from Supabase first
    const { formIds: deletedIds } = await syncRemoteDeletedBlacklist();

    // 0b. Primary: Query Vercel Postgres API
    try {
      const apiForms = await apiGetForms();
      if (apiForms && Array.isArray(apiForms) && apiForms.length > 0) {
        const cleanApiForms = apiForms
          .filter((f) => !isDeletedForm(f, deletedIds))
          .map((f) => ({
            ...f,
            theme_config: parseThemeConfig(f.theme_config),
            fields: (f.fields || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
          }));
        if (cleanApiForms.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(cleanApiForms));
          } catch {}
          cachedFormsInMemory = { data: cleanApiForms, timestamp: Date.now() };
          return cleanApiForms;
        }
      }
    } catch (e) {
      console.warn('Vercel API getForms error:', e);
    }

    // 1. Read locally cached forms
    let localForms: Form[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localForms = parsed
            .filter((f: Form) => !isDeletedForm(f, deletedIds))
            .map((f: Form) => ({
              ...f,
              theme_config: parseThemeConfig(f.theme_config),
            }));
          if (localForms.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(localForms));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse local forms:', e);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select(FORM_QUERY_COLUMNS)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const supabaseForms = data
            .filter((f: any) => !isDeletedForm(f, deletedIds))
            .map((f: any) => ({
              ...f,
              theme_config: parseThemeConfig(f.theme_config),
              fields: (f.fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
            }));

          // Merge by form ID & slug: prefer local if newer or not yet in Supabase
          const map = new Map<string, Form>();
          for (const sf of supabaseForms) {
            map.set(sf.id, sf);
            if (sf.slug) map.set(sf.slug.toLowerCase(), sf);
          }

          for (const lf of localForms) {
            if (isDeletedForm(lf, deletedIds)) continue;
            const existing = map.get(lf.id) || (lf.slug ? map.get(lf.slug.toLowerCase()) : undefined);
            if (!existing) {
              map.set(lf.id, lf);
            } else {
              const localTime = new Date(lf.updated_at || 0).getTime();
              const supaTime = new Date(existing.updated_at || 0).getTime();
              if (localTime >= supaTime) {
                map.set(lf.id, lf);
                if (lf.slug) map.set(lf.slug.toLowerCase(), lf);
              }
            }
          }

          const unique = Array.from(new Set(Array.from(map.values()))).filter((f) => !isDeletedForm(f, deletedIds));
          try {
            localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(unique));
          } catch {}
          cachedFormsInMemory = { data: unique, timestamp: Date.now() };
          return unique;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local storage', err);
      }
    }

    const fallbackResult = localForms.filter((f) => !isDeletedForm(f, deletedIds));
    cachedFormsInMemory = { data: fallbackResult, timestamp: Date.now() };
    return fallbackResult;
  }

  /**
   * Update the local cache for a specific form (keeping it fresh without polluting with stale samples)
   */
  static updateLocalFormCache(freshForm: Form): void {
    if (typeof window === 'undefined' || !freshForm) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      const currentForms: Form[] = raw ? JSON.parse(raw) : [];
      const cleanSlug = freshForm.slug.toLowerCase();
      const existingIdx = currentForms.findIndex(
        (f) =>
          f.id === freshForm.id ||
          f.slug.toLowerCase() === cleanSlug
      );
      if (existingIdx >= 0) {
        currentForms[existingIdx] = freshForm;
      } else {
        currentForms.unshift(freshForm);
      }
      localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(currentForms));
    } catch (e) {
      console.warn('Failed to update local form cache:', e);
    }
  }

  /**
   * Purge stale cached forms and temporary draft data to guarantee fresh view
   */
  static clearStaleFormCache(keepSlug?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed: Form[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleanKeep = (keepSlug || '').trim().toLowerCase();
          const cleaned = parsed.filter((f) => {
            if (cleanKeep && (f.slug.toLowerCase() === cleanKeep || f.id.toLowerCase() === cleanKeep)) {
              return true;
            }
            if (f.id.startsWith('form-fallback-')) return false;
            return true;
          });
          localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(cleaned));
        }
      }
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.warn('Failed to clear stale form cache:', e);
    }
  }

  /**
   * Automatically check all forms and transition any expired published forms to 'closed' (Task 32)
   * Can be invoked periodically, on app start, or via Supabase / server function
   */
  static async checkAndTransitionExpiredForms(): Promise<string[]> {
    const transitionedIds: string[] = [];
    try {
      let allForms: Form[] = [];
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.FORMS) : null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allForms = parsed;
          }
        } catch {}
      }
      if (allForms.length === 0) {
        allForms = await this.getForms();
      }
      const now = Date.now();

      for (const form of allForms) {
        if (form.status === 'published' && form.registration_deadline) {
          const deadline = parseFormDeadline(form.registration_deadline);
          if (deadline && deadline.getTime() <= now) {
            transitionedIds.push(form.id);
            const updatedForm: Form = {
              ...form,
              status: 'closed',
              updated_at: new Date().toISOString(),
            };
            await this.saveForm(updatedForm);
          }
        }
      }

      if (transitionedIds.length > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('forms_expired', { detail: transitionedIds }));
      }
    } catch (e) {
      console.warn('Error checking expired forms:', e);
    }
    return transitionedIds;
  }

  /**
   * Fetch a single form by unique slug or ID (prioritizes remote server to prevent stale mobile cache)
   */
  static async getFormBySlug(slug: string): Promise<Form | null> {
    const { formIds: deletedIds } = await syncRemoteDeletedBlacklist();
    const cleanSlug = decodeURIComponent(slug.trim()).toLowerCase().replace(/\/+$/, '');
    const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

    const isDeletedCandidate = (idOrSlug: string): boolean => {
      if (!idOrSlug) return false;
      return isDeletedForm({ id: idOrSlug, slug: idOrSlug }, deletedIds);
    };

    if (isDeletedCandidate(cleanSlug) || (coreSlug && isDeletedCandidate(coreSlug))) {
      return null;
    }

    // 0. Check isolated in-memory cache for this specific form ID / slug
    const cachedEntry = publicFormCache.get(cleanSlug) || (coreSlug ? publicFormCache.get(coreSlug) : null);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < PUBLIC_FORM_CACHE_TTL_MS) {
      return cachedEntry.form;
    }

    // 0b. Extract self-contained form definition from URL payload (?d=...)
    // This guarantees immediate, 100% reliable loading on any mobile phone from QR code or shared link
    const urlPayload = getFormPayloadFromUrl();
    if (urlPayload) {
      const unpacked = unpackFormFromUrlPayload(urlPayload);
      if (unpacked && !isDeletedForm(unpacked, deletedIds)) {
        publicFormCache.set(cleanSlug, { form: unpacked, timestamp: Date.now() });
        if (coreSlug) publicFormCache.set(coreSlug, { form: unpacked, timestamp: Date.now() });
        this.updateLocalFormCache(unpacked);
        return unpacked;
      }
    }

    // Pre-read locally cached forms to compare recency against remote Supabase data
    let localForms: Form[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localForms = parsed.map((f: Form) => ({
            ...f,
            theme_config: parseThemeConfig(f.theme_config),
          }));
        }
      }
    } catch {}

    const localFound = localForms.find(
      (f) =>
        !isDeletedForm(f, deletedIds) &&
        (f.slug.toLowerCase() === cleanSlug ||
          f.id.toLowerCase() === cleanSlug ||
          f.slug.toLowerCase() === `event-form-${coreSlug}` ||
          f.slug.toLowerCase() === `form-${coreSlug}` ||
          f.id.toLowerCase() === `form-${coreSlug}` ||
          f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug ||
          f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug)
    );

    // 0c. Primary: Query Vercel Postgres API
    try {
      const apiForm =
        (await apiGetFormBySlug(cleanSlug)) ||
        (coreSlug && coreSlug !== cleanSlug ? await apiGetFormBySlug(coreSlug) : null);
      if (apiForm && !isDeletedForm(apiForm, deletedIds)) {
        const parsedTheme = parseThemeConfig(apiForm.theme_config);
        const resolved: Form = {
          ...apiForm,
          theme_config: parsedTheme,
          presentation_mode:
            apiForm.presentation_mode || parsedTheme.presentationMode || 'step_by_step',
          fields: (apiForm.fields || []).sort(
            (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
          ),
        };
        publicFormCache.set(cleanSlug, { form: resolved, timestamp: Date.now() });
        if (coreSlug) publicFormCache.set(coreSlug, { form: resolved, timestamp: Date.now() });
        this.updateLocalFormCache(resolved);
        return resolved;
      }
    } catch (apiErr) {
      console.warn('Vercel API getFormBySlug error:', apiErr);
    }

    // 1. Single, targeted PostgREST query to Supabase (replaces previous 10-query waterfall)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const candidateFilters = [
          `slug.ilike.${cleanSlug}`,
          `id.eq.${cleanSlug}`,
        ];
        if (coreSlug && coreSlug !== cleanSlug) {
          candidateFilters.push(`slug.ilike.${coreSlug}`);
          candidateFilters.push(`slug.ilike.event-form-${coreSlug}`);
          candidateFilters.push(`slug.ilike.form-${coreSlug}`);
          candidateFilters.push(`id.eq.form-${coreSlug}`);
          candidateFilters.push(`id.eq.${coreSlug}`);
        }

        const { data, error } = await supabase
          .from('forms')
          .select(FORM_QUERY_COLUMNS)
          .or(candidateFilters.join(','))
          .limit(1)
          .maybeSingle();

        if (!error && data && !isDeletedForm(data, deletedIds)) {
          const parsedSupaTheme = parseThemeConfig(data.theme_config);
          const fields = Array.isArray(data.fields)
            ? data.fields.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            : [];

          const supaForm: Form = {
            ...data,
            theme_config: parsedSupaTheme,
            presentation_mode: data.presentation_mode || parsedSupaTheme.presentationMode || 'step_by_step',
            fields,
          };

          // If local cache has a newer version than remote Supabase, prefer local user changes
          if (localFound) {
            const localTime = new Date(localFound.updated_at || 0).getTime();
            const supaTime = new Date(supaForm.updated_at || 0).getTime();
            if (localTime >= supaTime) {
              publicFormCache.set(cleanSlug, { form: localFound, timestamp: Date.now() });
              if (coreSlug) publicFormCache.set(coreSlug, { form: localFound, timestamp: Date.now() });
              return localFound;
            }
          }

          // Otherwise synchronize fresh remote version into local storage & cache
          publicFormCache.set(cleanSlug, { form: supaForm, timestamp: Date.now() });
          if (coreSlug) publicFormCache.set(coreSlug, { form: supaForm, timestamp: Date.now() });
          this.updateLocalFormCache(supaForm);
          return supaForm;
        }
      } catch (err) {
        console.warn('Supabase fetch by slug failed, checking local storage', err);
      }
    }

    // 2. Query locally cached forms if Supabase is offline or didn't return a newer match
    if (localFound) {
      publicFormCache.set(cleanSlug, { form: localFound, timestamp: Date.now() });
      if (coreSlug) publicFormCache.set(coreSlug, { form: localFound, timestamp: Date.now() });
      return localFound;
    }

    // 3. Query pre-seeded forms only if not found in local user cache
    const seedFound = SAMPLE_FORMS.find(
      (f) =>
        !isDeletedForm(f, deletedIds) &&
        (f.slug.toLowerCase() === cleanSlug ||
          f.id.toLowerCase() === cleanSlug ||
          f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug ||
          f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug)
    );
    if (seedFound) {
      publicFormCache.set(cleanSlug, { form: seedFound, timestamp: Date.now() });
      if (coreSlug) publicFormCache.set(coreSlug, { form: seedFound, timestamp: Date.now() });
      this.updateLocalFormCache(seedFound);
      return seedFound;
    }

    // 4. Fallback: Query all merged forms
    try {
      const all = await this.getForms();
      const match = all.find(
        (f) =>
          !isDeletedForm(f, deletedIds) &&
          f.title !== 'Event Registration Form' &&
          (f.slug.toLowerCase() === cleanSlug ||
            f.id.toLowerCase() === cleanSlug ||
            f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug ||
            f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug)
      );
      if (match) return match;
    } catch {}

    // 5. If not found in Supabase, sample templates, or local cache, return null so no form is ever hijacked or misrouted
    return null;
  }

  /**
   * Check if Supabase write permissions (RLS) are active or blocked
   */
  static async checkSupabaseWriteStatus(): Promise<{ connected: boolean; rlsBlocked: boolean; quotaExceeded: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { connected: false, rlsBlocked: false, quotaExceeded: false, message: 'Supabase client not initialized.' };
    }

    try {
      const { error: pingError } = await supabase.from('forms').select('id').limit(1);
      if (pingError) {
        const isQuota = pingError.message?.includes('exceed_egress_quota') || pingError.message?.includes('restricted');
        return {
          connected: false,
          rlsBlocked: pingError.code === '42501' || pingError.message?.includes('row-level security'),
          quotaExceeded: isQuota,
          message: isQuota
            ? 'Supabase egress bandwidth quota exceeded. The project is restricted by Supabase. Please remove spend caps or upgrade your plan in Supabase to restore cloud synchronization.'
            : pingError.message,
        };
      }
      return { connected: true, rlsBlocked: false, quotaExceeded: false, message: 'Cloud sync active and ready.' };
    } catch (err: any) {
      return { connected: false, rlsBlocked: false, quotaExceeded: false, message: err?.message || 'Connection error' };
    }
  }

  private static lastLocalFormsSyncTime = 0;

  /**
   * Automatically synchronize all locally cached forms to remote Supabase database (debounced to avoid startup bursts)
   */
  static async syncLocalFormsToRemote(force = false): Promise<void> {
    if (!force && Date.now() - StorageService.lastLocalFormsSyncTime < 10 * 60 * 1000) {
      return;
    }
    StorageService.lastLocalFormsSyncTime = Date.now();

    const supabase = getSupabaseClient();
    if (!supabase || typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (!raw) return;
      const forms: Form[] = JSON.parse(raw);
      if (!Array.isArray(forms) || forms.length === 0) return;

      const { formIds: deletedIds } = await syncRemoteDeletedBlacklist();

      for (const form of forms) {
        if (isSystemForm(form) || isDeletedForm(form, deletedIds)) continue;

        try {
          const formPayload = {
            id: form.id,
            owner_id: form.owner_id || 'admin',
            title: form.title || 'Untitled Event Form',
            slug: form.slug,
            description: form.description || '',
            cover_image_url: form.cover_image_url?.trim() || null,
            event_date: sanitizeTimestamp(form.event_date),
            event_end_date: sanitizeTimestamp(form.event_end_date),
            venue: form.venue?.trim() || null,
            status: form.status || 'published',
            registration_deadline: sanitizeTimestamp(form.registration_deadline),
            theme_config: form.theme_config || {},
            success_message: form.success_message || 'Thank you! Your registration has been submitted successfully.',
            redirect_url: form.redirect_url?.trim() || null,
            published_version: form.published_version || 1,
            updated_at: form.updated_at || new Date().toISOString(),
          };

          const { error: formError } = await supabase.from('forms').upsert(formPayload);

          if (!formError && form.fields && form.fields.length > 0) {
            await supabase.from('form_fields').delete().eq('form_id', form.id);
            await supabase.from('form_fields').insert(
              form.fields.map((f, idx) => ({
                id: f.id,
                form_id: form.id,
                field_key: f.field_key,
                label: f.label,
                field_type: f.field_type,
                description: f.description?.trim() || null,
                placeholder: f.placeholder?.trim() || null,
                required: Boolean(f.required),
                default_value: f.default_value ?? null,
                options: f.options && Array.isArray(f.options) ? f.options : null,
                validation_rules: f.validation_rules || null,
                conditional_rules: f.conditional_rules || null,
                sort_order: idx + 1,
                configuration: f.configuration || null,
              }))
            );
          }
        } catch {
          // ignore RLS restriction
        }
      }
    } catch (err) {
      console.warn('Sync local forms error:', err);
    }
  }

  /**
   * Fetch a single form by ID
   */
  static async getFormById(id: string): Promise<Form | null> {
    const { formIds: deletedIds } = await syncRemoteDeletedBlacklist();
    if (isDeletedForm({ id, slug: id }, deletedIds)) return null;
    const clean = id.trim().toLowerCase();
    const core = clean.replace(/^(event-form-|form-)/, '');
    const forms = await this.getForms();
    return (
      forms.find(
        (f) =>
          !isDeletedForm(f, deletedIds) &&
          (f.id.toLowerCase() === clean ||
            (f.slug && f.slug.toLowerCase() === clean) ||
            f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === core ||
            (f.slug && f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === core))
      ) || null
    );
  }

  /**
   * Save or update a form with its fields
   */
  static async saveForm(form: Form): Promise<Form> {
    invalidateStorageCache();
    invalidatePublicFormCache(form.id, form.slug);
    const parsedTheme = parseThemeConfig(form.theme_config);
    const resolvedPresentationMode =
      form.presentation_mode || parsedTheme.presentationMode || 'step_by_step';
    const normalizedThemeConfig: FormThemeConfig = {
      ...parsedTheme,
      presentationMode: resolvedPresentationMode,
    };

    const sanitizedDeadline = sanitizeTimestamp(form.registration_deadline) || undefined;
    const sanitizedEventDate = sanitizeTimestamp(form.event_date) || undefined;
    const sanitizedEventEndDate = sanitizeTimestamp(form.event_end_date) || undefined;

    const updatedForm: Form = {
      ...form,
      registration_deadline: sanitizedDeadline,
      event_date: sanitizedEventDate,
      event_end_date: sanitizedEventEndDate,
      presentation_mode: resolvedPresentationMode,
      theme_config: normalizedThemeConfig,
      updated_at: new Date().toISOString(),
    };

    // Primary: Save to Vercel Postgres API
    apiSaveForm(updatedForm).catch((err) => console.warn('Vercel API saveForm error:', err));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const formPayload: Record<string, any> = {
          id: updatedForm.id,
          owner_id: updatedForm.owner_id || 'admin',
          title: updatedForm.title || 'Untitled Event Form',
          slug: updatedForm.slug,
          description: updatedForm.description || '',
          cover_image_url: updatedForm.cover_image_url?.trim() || null,
          event_date: sanitizeTimestamp(updatedForm.event_date),
          event_end_date: sanitizeTimestamp(updatedForm.event_end_date),
          venue: updatedForm.venue?.trim() || null,
          status: updatedForm.status || 'published',
          registration_deadline: sanitizeTimestamp(updatedForm.registration_deadline),
          theme_config: normalizedThemeConfig,
          success_message: updatedForm.success_message || 'Thank you! Your registration has been submitted successfully.',
          redirect_url: updatedForm.redirect_url?.trim() || null,
          published_version: updatedForm.published_version || 1,
          updated_at: updatedForm.updated_at,
        };

        // Save form row
        let { error: formError } = await supabase
          .from('forms')
          .upsert(formPayload);

        if (formError) {
          console.warn('Supabase form upsert error, attempting retry:', formError.message || formError);
          // If error is about a missing column, remove that key and retry
          const missingCol = formError.message?.match(/Could not find the '([^']+)' column/)?.[1];
          if (missingCol && formPayload[missingCol] !== undefined) {
            delete formPayload[missingCol];
          }
          // Retry with stringified theme_config in case the database column is TEXT
          const retryRes = await supabase.from('forms').upsert({
            ...formPayload,
            theme_config: JSON.stringify(formPayload.theme_config),
          });
          if (retryRes.error) {
            console.warn('Supabase retry upsert error:', retryRes.error.message || retryRes.error);
          }
        }

        if (updatedForm.fields) {
          // Delete old fields and insert updated set
          await supabase.from('form_fields').delete().eq('form_id', updatedForm.id);
          if (updatedForm.fields.length > 0) {
            await supabase.from('form_fields').insert(
              updatedForm.fields.map((f, idx) => ({
                id: f.id,
                form_id: updatedForm.id,
                field_key: f.field_key,
                label: f.label,
                field_type: f.field_type,
                description: f.description?.trim() || null,
                placeholder: f.placeholder?.trim() || null,
                required: Boolean(f.required),
                default_value: f.default_value ?? null,
                options: f.options && Array.isArray(f.options) ? f.options : null,
                validation_rules: f.validation_rules || null,
                conditional_rules: f.conditional_rules || null,
                sort_order: idx + 1,
                configuration: f.configuration || null,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase save error, persisting locally:', err);
      }
    }

    // Always update local cache directly to guarantee instantaneous persistence
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      const currentForms: Form[] = raw ? JSON.parse(raw) : [];
      const existingIndex = currentForms.findIndex(
        (f) =>
          f.id === updatedForm.id ||
          f.slug.toLowerCase() === updatedForm.slug.toLowerCase() ||
          f.id.toLowerCase().replace(/^(event-form-|form-)/, '') ===
            updatedForm.id.toLowerCase().replace(/^(event-form-|form-)/, '')
      );
      let newFormsList: Form[];
      if (existingIndex >= 0) {
        newFormsList = [...currentForms];
        newFormsList[existingIndex] = updatedForm;
      } else {
        newFormsList = [updatedForm, ...currentForms];
      }

      localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(newFormsList));

      // Broadcast update event so any active preview or open public tab updates immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eventform_saved', { detail: updatedForm })
        );
      }
    } catch (e) {
      console.error('Failed to update local cache', e);
    }

    return updatedForm;
  }

  /**
   * Delete a form and its responses
   */
  static async deleteForm(formId: string): Promise<void> {
    invalidateStorageCache();
    invalidatePublicFormCache(formId);
    const cleanId = (formId || '').toLowerCase().trim();
    const coreId = cleanId.replace(/^(event-form-|form-)/, '');

    // 1. Immediately blacklist form ID locally
    addDeletedFormId(cleanId);
    if (coreId) {
      addDeletedFormId(coreId);
      addDeletedFormId(`form-${coreId}`);
      addDeletedFormId(`event-form-${coreId}`);
    }

    // If form has a slug, also blacklist its slug to prevent fallback resurrection
    let formSlug = '';
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed: Form[] = JSON.parse(raw);
        const f = parsed.find(
          (item) => item.id === formId || (item.id && item.id.toLowerCase() === cleanId)
        );
        if (f?.slug) {
          formSlug = f.slug.toLowerCase().trim();
          addDeletedFormId(formSlug);
          addDeletedFormId(`form-${formSlug}`);
          addDeletedFormId(`event-form-${formSlug}`);
        }
      }
    } catch {
      // ignore
    }

    // 2. Persist deletion to Supabase system blacklist so ALL devices (mobile, desktop) stay in sync!
    await recordDeletedId(formId);
    if (formSlug && formSlug !== cleanId) {
      await recordDeletedId(formSlug);
    }

    // 2b. Primary: Delete form from Vercel Postgres API
    apiDeleteForm(formId).catch((e) => console.warn('Vercel API deleteForm error:', e));

    // 3. Cascade delete associated files and records in Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const candidateFormIds = Array.from(
          new Set(
            [
              formId,
              cleanId,
              coreId,
              `form-${coreId}`,
              `event-form-${coreId}`,
              formSlug,
            ].filter(Boolean)
          )
        );

        // Clean up Supabase Storage files for this form
        for (const cid of candidateFormIds) {
          const cleanFolder = cid.replace(/[^a-zA-Z0-9_-]/g, '_');
          try {
            const { data: files, error: listErr } = await supabase.storage
              .from('event-uploads')
              .list(cleanFolder);
            if (!listErr && files && files.length > 0) {
              const filePaths = files.map((f) => `${cleanFolder}/${f.name}`);
              await supabase.storage.from('event-uploads').remove(filePaths);
            }
          } catch (storageErr) {
            console.warn('Storage cleanup warning for form files:', storageErr);
          }
        }

        // Must delete child submissions and child fields first to satisfy foreign key constraints!
        for (const cid of candidateFormIds) {
          await supabase.from('submissions').delete().eq('form_id', cid);
          await supabase.from('form_fields').delete().eq('form_id', cid);
          await supabase.from('forms').delete().eq('id', cid);
          await supabase.from('forms').delete().ilike('slug', cid);
        }
      } catch (e) {
        console.warn('Supabase cascade delete failed', e);
      }
    }

    // 4. Remove from LocalStorage forms
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed: Form[] = JSON.parse(raw);
        const filtered = parsed.filter((f) => !isDeletedForm(f));
        localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local storage forms delete failed', e);
    }

    // 5. Remove from LocalStorage submissions
    try {
      const rawSubs = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (rawSubs) {
        const parsedSubs: Submission[] = JSON.parse(rawSubs);
        const filteredSubs = parsedSubs.filter((s) => !isDeletedSubmission(s));
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filteredSubs));
      }
    } catch (e) {
      console.warn('Local storage submissions delete failed', e);
    }

    // 6. Broadcast deletion events to active windows and components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('form_deleted', { detail: formId }));
      window.dispatchEvent(new CustomEvent('eventform_deleted', { detail: formId }));
    }
  }

  /**
   * Batch delete multiple forms
   */
  static async deleteForms(formIds: string[]): Promise<void> {
    for (const id of formIds) {
      await this.deleteForm(id);
    }
  }

  /**
   * Duplicate an existing form
   */
  static async duplicateForm(formId: string): Promise<Form> {
    const original = await this.getFormById(formId);
    if (!original) throw new Error('Form not found');

    const newId = `form-${Date.now().toString(36)}`;
    const newSlug = `${original.slug}-copy-${Math.floor(Math.random() * 900 + 100)}`;

    const duplicated: Form = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      slug: newSlug,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: (original.fields || []).map((f) => ({
        ...f,
        id: `f-${Math.random().toString(36).substring(2, 9)}`,
        form_id: newId,
      })),
    };

    return await this.saveForm(duplicated);
  }

  /**
   * Submissions Management
   */
  static async getAllSubmissions(forceFresh = false): Promise<Submission[]> {
    if (!forceFresh && cachedSubsInMemory && Date.now() - cachedSubsInMemory.timestamp < CACHE_TTL_MS) {
      return cachedSubsInMemory.data;
    }

    // 0. Synchronize remote deleted blacklists from Supabase first
    const { formIds: deletedFormIds, subIds: deletedSubmissionIds } = await syncRemoteDeletedBlacklist();

    const isDummySubmission = (s: Submission) =>
      ['sub-1', 'sub-2', 'sub-3'].includes(s.id) &&
      ['Rohit Verma', 'Zaheer Khan', 'Dinesh Karthik'].includes(s.applicant_name || '');

    // 0b. Primary: Fetch submissions from Vercel Postgres API
    try {
      const apiSubs = await apiGetSubmissions();
      if (apiSubs && Array.isArray(apiSubs) && apiSubs.length > 0) {
        const cleanApiSubs = apiSubs.filter(
          (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
        );
        cachedSubsInMemory = { data: cleanApiSubs, timestamp: Date.now() };
        try {
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(cleanApiSubs));
        } catch {}
        return cleanApiSubs;
      }
    } catch (e) {
      console.warn('Vercel API getAllSubmissions error:', e);
    }

    // 1. Fetch remote submissions from Supabase
    let remoteList: Submission[] = [];
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id, form_id, form_version, applicant_name, applicant_email, submission_data, submitted_at, status, admin_notes')
          .order('submitted_at', { ascending: false })
          .limit(300);

        if (!error && Array.isArray(data)) {
          remoteList = data.filter(
            (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
          );
        } else if (error) {
          console.warn('Supabase submissions query error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase submissions fetch error, falling back', err);
      }
    }

    // 2. Fetch local submissions from LocalStorage
    let localList: Submission[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      localList = raw ? JSON.parse(raw) : [];
      if (Array.isArray(localList)) {
        localList = localList.filter(
          (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
        );
      }
    } catch {
      localList = [];
    }

    // 3. Fallback to initial sample submissions ONLY if system is completely fresh and not deleted
    if (remoteList.length === 0 && localList.length === 0) {
      const hasInit = typeof window !== 'undefined' && localStorage.getItem('eventform_initialized_subs');
      if (!hasInit) {
        const cleanedInit = INITIAL_SUBMISSIONS.filter(
          (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
        );
        localList = cleanedInit;
        try {
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(cleanedInit));
          localStorage.setItem('eventform_initialized_subs', 'true');
        } catch {}
      }
    }

    // 4. Merge remote and local submissions deduplicated by ID
    const mergedMap = new Map<string, Submission>();
    for (const s of remoteList) {
      if (!isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)) {
        const normS: Submission = {
          ...s,
          admin_notes: s.admin_notes || (s.submission_data?._admin_notes as string) || '',
        };
        mergedMap.set(s.id, normS);
      }
    }
    for (const s of localList) {
      if (!isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)) {
        if (!mergedMap.has(s.id)) {
          const normS: Submission = {
            ...s,
            admin_notes: s.admin_notes || (s.submission_data?._admin_notes as string) || '',
          };
          mergedMap.set(s.id, normS);
        }
      }
    }

    const mergedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    // Keep LocalStorage up to date with clean merged list
    try {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(mergedList));
    } catch {}

    // 5. Asynchronously sync any local-only entries to Supabase in the background
    if (supabase && localList.length > 0) {
      const remoteIds = new Set(remoteList.map((r) => r.id));
      const missingRemote = localList.filter(
        (l) => !remoteIds.has(l.id) && !isDeletedSubmission(l, deletedSubmissionIds, deletedFormIds)
      );
      if (missingRemote.length > 0) {
        (async () => {
          for (const item of missingRemote) {
            try {
              if (isDeletedSubmission(item, deletedSubmissionIds, deletedFormIds)) continue;

              // Ensure parent form row exists and is NOT deleted
              const { data: existingFormRow } = await supabase
                .from('forms')
                .select('id')
                .eq('id', item.form_id)
                .maybeSingle();

              if (!existingFormRow) {
                const rawForms = localStorage.getItem(STORAGE_KEYS.FORMS);
                const localListForms: Form[] = rawForms ? JSON.parse(rawForms) : [];
                const localFormMatch = localListForms.find(
                  (f) => f.id === item.form_id && !isDeletedForm(f, deletedFormIds)
                );
                if (localFormMatch) {
                  await StorageService.saveForm(localFormMatch);
                } else {
                  // Parent form is missing or deleted, do NOT sync orphaned submission
                  continue;
                }
              }
              await supabase.from('submissions').insert([
                {
                  id: item.id,
                  form_id: item.form_id,
                  form_version: item.form_version || 1,
                  submission_data: item.submission_data,
                  submitted_at: item.submitted_at,
                  status: item.status || 'confirmed',
                  applicant_name: item.applicant_name,
                  applicant_email: item.applicant_email,
                },
              ]);
            } catch (syncErr) {
              console.warn('Background sync submission to Supabase error:', syncErr);
            }
          }
        })();
      }
    }

    cachedSubsInMemory = { data: mergedList, timestamp: Date.now() };
    return mergedList;
  }

  /**
   * Subscribe to real-time submission events from Supabase WebSocket channel
   * Streams submissions submitted on mobile phones or external devices instantly to admin
   */
  static subscribeToSubmissions(
    onInsert: (sub: Submission) => void,
    onUpdate?: (sub: Submission) => void,
    onDelete?: (id: string) => void
  ): () => void {
    const supabase = getSupabaseClient();
    let isCleanedUp = false;

    if (!supabase) {
      return () => {
        isCleanedUp = true;
      };
    }

    try {
      const channelName = `realtime-submissions-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'submissions' },
          (payload: any) => {
            if (isCleanedUp) return;

            if (payload.eventType === 'INSERT' && payload.new) {
              const row = payload.new;
              const normS: Submission = {
                id: row.id,
                form_id: row.form_id,
                form_version: row.form_version || 1,
                applicant_name: row.applicant_name,
                applicant_email: row.applicant_email,
                submission_data: row.submission_data || {},
                submitted_at: row.submitted_at || new Date().toISOString(),
                status: row.status || 'confirmed',
                admin_notes: row.admin_notes || (row.submission_data?._admin_notes as string) || '',
              };

              // Persist into local storage
              try {
                const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
                const list: Submission[] = raw ? JSON.parse(raw) : [];
                if (!list.some((s) => s.id === normS.id)) {
                  list.unshift(normS);
                  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
                }
              } catch {}

              onInsert(normS);
              window.dispatchEvent(new CustomEvent('submission_created', { detail: normS }));
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const row = payload.new;
              const normS: Submission = {
                id: row.id,
                form_id: row.form_id,
                form_version: row.form_version || 1,
                applicant_name: row.applicant_name,
                applicant_email: row.applicant_email,
                submission_data: row.submission_data || {},
                submitted_at: row.submitted_at || new Date().toISOString(),
                status: row.status || 'confirmed',
                admin_notes: row.admin_notes || (row.submission_data?._admin_notes as string) || '',
              };

              try {
                const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
                const list: Submission[] = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((s) => s.id === normS.id);
                if (idx >= 0) {
                  list[idx] = normS;
                  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
                }
              } catch {}

              onUpdate?.(normS);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const id = payload.old.id;
              if (id) {
                try {
                  const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
                  const list: Submission[] = raw ? JSON.parse(raw) : [];
                  const filtered = list.filter((s) => s.id !== id);
                  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));
                } catch {}

                onDelete?.(id);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Supabase Realtime Submissions Channel Active');
          }
        });

      return () => {
        isCleanedUp = true;
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to subscribe to realtime submissions:', err);
      return () => {
        isCleanedUp = true;
      };
    }
  }

  static async getSubmissionsForForm(
    formId: string,
    options: { forceFresh?: boolean; limit?: number; offset?: number } = {}
  ): Promise<Submission[]> {
    const cleanId = (formId || '').toLowerCase().trim();
    const coreId = cleanId.replace(/^(event-form-|form-)/, '');

    const cacheKey = `subs_${cleanId}`;
    if (!options.forceFresh && cachedFormSubsInMemory.has(cacheKey)) {
      const entry = cachedFormSubsInMemory.get(cacheKey)!;
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
      }
    }

    const { subIds: deletedSubmissionIds, formIds: deletedFormIds } = await syncRemoteDeletedBlacklist();

    const isDummySubmission = (s: Submission) =>
      ['sub-1', 'sub-2', 'sub-3'].includes(s.id) &&
      ['Rohit Verma', 'Zaheer Khan', 'Dinesh Karthik'].includes(s.applicant_name || '');

    // Primary: Fetch from Vercel Postgres API
    try {
      const apiSubs = await apiGetSubmissions(cleanId);
      if (apiSubs && Array.isArray(apiSubs) && apiSubs.length > 0) {
        const clean = apiSubs.filter(
          (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
        );
        cachedFormSubsInMemory.set(cacheKey, { data: clean, timestamp: Date.now() });
        return clean;
      }
    } catch (e) {
      console.warn('Vercel API getSubmissionsForForm error:', e);
    }

    let remoteList: Submission[] = [];
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const filters = [
          `form_id.eq.${cleanId}`,
          `form_id.eq.${formId}`,
        ];
        if (coreId && coreId !== cleanId) {
          filters.push(`form_id.eq.form-${coreId}`);
          filters.push(`form_id.eq.event-form-${coreId}`);
          filters.push(`form_id.eq.${coreId}`);
        }

        let query = supabase
          .from('submissions')
          .select('id, form_id, form_version, applicant_name, applicant_email, submission_data, submitted_at, status, admin_notes')
          .or(filters.join(','))
          .order('submitted_at', { ascending: false });

        if (options.limit) {
          const from = options.offset || 0;
          const to = from + options.limit - 1;
          query = query.range(from, to);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          remoteList = data.filter(
            (s) => !isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) && !isDummySubmission(s)
          );
        }
      } catch (err) {
        console.warn('Supabase form submissions query error, using local fallback:', err);
      }
    }

    // Merge with local submissions for this form
    let localList: Submission[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (raw) {
        const parsed: Submission[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localList = parsed.filter(
            (s) => {
              if (isDeletedSubmission(s, deletedSubmissionIds, deletedFormIds) || isDummySubmission(s)) return false;
              const sf = (s.form_id || '').toLowerCase();
              const sCore = sf.replace(/^(event-form-|form-)/, '');
              return sf === cleanId || sf === formId.toLowerCase() || sCore === coreId;
            }
          );
        }
      }
    } catch {}

    const map = new Map<string, Submission>();
    for (const r of remoteList) map.set(r.id, r);
    for (const l of localList) {
      if (!map.has(l.id)) map.set(l.id, l);
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    cachedFormSubsInMemory.set(cacheKey, { data: merged, timestamp: Date.now() });
    return merged;
  }

  static async submitRegistration(
    formId: string,
    formVersion: number,
    data: Record<string, any>,
    formTitle?: string
  ): Promise<Submission> {
    invalidateStorageCache();
    const applicantName = data.full_name || data.applicant_name || data.name || data.team_name || 'Participant';
    const applicantEmail = data.email || data.contact_email || '';

    // Normalize form ID to canonical form if present without fetching all forms from Supabase
    let resolvedFormId = formId;
    let resolvedFormTitle = formTitle || 'Event Form';
    try {
      let matched = publicFormCache.get(formId)?.form;
      if (!matched) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.FORMS) : null;
        if (raw) {
          const allForms: Form[] = JSON.parse(raw);
          matched = allForms.find(
            (f) =>
              f.id === formId ||
              f.slug === formId ||
              f.id.replace(/^(event-form-|form-)/, '') === formId.replace(/^(event-form-|form-)/, '') ||
              f.slug.replace(/^(event-form-|form-)/, '') === formId.replace(/^(event-form-|form-)/, '')
          );
        }
      }
      if (matched) {
        resolvedFormId = matched.id;
        resolvedFormTitle = matched.title || resolvedFormTitle;

        // Block closed, offline, or draft forms from accepting submissions
        if (matched.status === 'closed') {
          throw new Error('Registration is closed for this event. No further registrations are being accepted.');
        }
        if (matched.status === 'draft' || (matched.status as string) !== 'published') {
          throw new Error('This form is currently offline. Submissions are not being accepted at this time.');
        }
        if (isFormExpired(matched)) {
          throw new Error('The registration deadline for this event has passed. No further registrations are being accepted.');
        }
      }
    } catch (validationErr: any) {
      if (validationErr?.message && (
        validationErr.message.includes('deadline') ||
        validationErr.message.includes('closed') ||
        validationErr.message.includes('offline')
      )) {
        throw validationErr;
      }
    }

    const newSub: Submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      form_id: resolvedFormId,
      form_version: formVersion,
      submission_data: data,
      submitted_at: new Date().toISOString(),
      status: 'confirmed',
      applicant_name: applicantName,
      applicant_email: applicantEmail,
    };

    // 1. Immediately persist locally so submission is never lost
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      const currentSubs: Submission[] = raw ? JSON.parse(raw) : [];
      const updated = [newSub, ...currentSubs.filter((s) => s.id !== newSub.id)];
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));

      // Broadcast event for real-time dashboard/responses count updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('submission_created', { detail: newSub }));
      }
    } catch (e) {
      console.warn('Failed to save submission to localStorage:', e);
    }

    // 1b. Primary: Persist to Vercel Postgres API
    apiSaveSubmission(newSub).catch((err) => console.warn('Vercel API saveSubmission error:', err));

    // 2. Persist to Supabase with Foreign Key pre-check & timeout guard
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Ensure form row exists in Supabase so foreign key constraint NEVER rejects the submission
        // BUT NEVER mutate or overwrite an existing form's title, slug, status, or fields!
        try {
          const { data: existingFormRow } = await supabase
            .from('forms')
            .select('id')
            .eq('id', newSub.form_id)
            .maybeSingle();

          if (!existingFormRow) {
            const rawForms = localStorage.getItem(STORAGE_KEYS.FORMS);
            const localListForms: Form[] = rawForms ? JSON.parse(rawForms) : [];
            const localFormMatch = localListForms.find((f) => f.id === newSub.form_id);
            if (localFormMatch) {
              await StorageService.saveForm(localFormMatch);
            } else {
              await supabase.from('forms').insert([
                {
                  id: newSub.form_id,
                  owner_id: 'admin',
                  title: resolvedFormTitle || 'Event Form',
                  slug: newSub.form_id,
                  status: 'published',
                  updated_at: new Date().toISOString(),
                },
              ]);
            }
          }
        } catch (fkCheckErr) {
          console.warn('Form existence check error for foreign key:', fkCheckErr);
        }

        const insertPromise = supabase.from('submissions').insert([
          {
            id: newSub.id,
            form_id: newSub.form_id,
            form_version: newSub.form_version,
            submission_data: newSub.submission_data,
            submitted_at: newSub.submitted_at,
            status: newSub.status,
            applicant_name: newSub.applicant_name,
            applicant_email: newSub.applicant_email,
          },
        ]);

        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
        await Promise.race([insertPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Supabase submission insert error, saved locally:', err);
      }
    }

    return newSub;
  }

  static async updateSubmissionStatus(
    submissionId: string,
    status: 'confirmed' | 'pending' | 'cancelled'
  ): Promise<void> {
    invalidateStorageCache();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('submissions').update({ status }).eq('id', submissionId);
      } catch (e) {
        console.warn('Supabase status update error:', e);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (raw) {
        const parsed: Submission[] = JSON.parse(raw);
        const next = parsed.map((s) => (s.id === submissionId ? { ...s, status } : s));
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(next));
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('submission_updated', { detail: { id: submissionId, status } })
      );
    }

    // Update in Vercel Postgres API
    apiUpdateSubmissionStatus(submissionId, status).catch((e) =>
      console.warn('Vercel API updateSubmissionStatus error:', e)
    );
  }

  static async updateSubmissionNotes(submissionId: string, notes: string): Promise<void> {
    invalidateStorageCache();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Update admin_notes column directly
        await supabase.from('submissions').update({ admin_notes: notes }).eq('id', submissionId);
      } catch (e) {
        console.warn('Supabase admin_notes direct update error:', e);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (raw) {
        const parsed: Submission[] = JSON.parse(raw);
        const next = parsed.map((s) => {
          if (s.id === submissionId) {
            return {
              ...s,
              admin_notes: notes,
              submission_data: { ...(s.submission_data || {}), _admin_notes: notes },
            };
          }
          return s;
        });
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(next));
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('submission_updated', { detail: { id: submissionId, admin_notes: notes } })
      );
    }

    // Update in Vercel Postgres API
    apiUpdateSubmissionStatus(submissionId, undefined, notes).catch((e) =>
      console.warn('Vercel API updateSubmissionNotes error:', e)
    );
  }

  /**
   * Upload an optimized photo to Supabase storage with 5MB validation
   */
  static async uploadPhoto(
    fileOrBlob: File | Blob,
    formId: string,
    originalFileName?: string
  ): Promise<{ url: string; path: string }> {
    // 1. Strict backend/service enforcement: original size <= 5 MB
    if (fileOrBlob.size > MAX_PHOTO_SIZE_BYTES) {
      const sizeMB = (fileOrBlob.size / (1024 * 1024)).toFixed(1);
      throw new Error(`Upload rejected: File size (${sizeMB} MB) exceeds maximum allowed limit of 5 MB.`);
    }

    // 2. Validate MIME type
    const mime = fileOrBlob.type || 'image/jpeg';
    if (!mime.startsWith('image/')) {
      throw new Error('Upload rejected: Invalid file type. Only image files are permitted.');
    }

    const cleanFormId = (formId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const baseName = (originalFileName || 'photo')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${cleanFormId}/${timestamp}_${rand}_${baseName}.${ext}`;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('event-uploads')
          .upload(storagePath, fileOrBlob, {
            contentType: mime,
            cacheControl: '31536000, public, immutable',
            upsert: true,
          });

        if (!error && data?.path) {
          const { data: publicData } = supabase.storage
            .from('event-uploads')
            .getPublicUrl(data.path);

          if (publicData?.publicUrl) {
            return { url: publicData.publicUrl, path: data.path };
          }
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload failed, using optimized data URL fallback:', uploadErr);
      }
    }

    // Fallback: Convert blob to data URL if Supabase storage is not configured or offline
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read photo blob'));
      reader.readAsDataURL(fileOrBlob);
    });

    return { url: dataUrl, path: storagePath };
  }

  static async deleteSubmission(submissionId: string): Promise<void> {
    invalidateStorageCache();
    // 1. Immediately blacklist submission ID locally
    addDeletedSubmissionId(submissionId);

    // 2. Persist deletion to Supabase system blacklist so ALL devices stay in sync!
    await recordDeletedId(undefined, submissionId);

    // 2b. Primary: Delete from Vercel Postgres API
    apiDeleteSubmission(submissionId).catch((e) =>
      console.warn('Vercel API deleteSubmission error:', e)
    );

    // 3. Clean up files and record from Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Find if this submission had files stored in event-uploads
        const { data: subData } = await supabase
          .from('submissions')
          .select('submission_data')
          .eq('id', submissionId)
          .maybeSingle();

        if (subData?.submission_data) {
          const urls = Object.values(subData.submission_data).filter(
            (v): v is string => typeof v === 'string' && v.includes('event-uploads/')
          );
          for (const u of urls) {
            const match = u.match(/event-uploads\/(.+)$/);
            if (match && match[1]) {
              try {
                await supabase.storage.from('event-uploads').remove([decodeURIComponent(match[1])]);
              } catch {}
            }
          }
        }

        await supabase.from('submissions').delete().eq('id', submissionId);
      } catch (err) {
        console.warn('Supabase delete submission error', err);
      }
    }

    // 4. Remove from LocalStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (raw) {
        const parsed: Submission[] = JSON.parse(raw);
        const filtered = parsed.filter((s) => s.id !== submissionId && !isDeletedSubmission(s));
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local storage submissions delete failed', e);
    }

    // 5. Broadcast deletion event to active components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('submission_deleted', { detail: submissionId }));
    }
  }

  /**
   * Compute statistics directly in-memory with zero network overhead
   */
  static computeDashboardStats(forms: Form[] = [], submissions: Submission[] = []): DashboardStats {
    const validForms = forms.filter((f) => !isSystemForm(f) && !isDeletedForm(f));
    const publishedForms = validForms.filter((f) => f.status === 'published').length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const validSubs = submissions.filter((s) => !isDeletedSubmission(s));
    const recentSubmissions = validSubs.filter(
      (s) => new Date(s.submitted_at).getTime() >= sevenDaysAgo
    ).length;

    return {
      totalForms: validForms.length,
      publishedForms,
      totalRegistrations: validSubs.length,
      recentSubmissions,
    };
  }

  /**
   * Aggregate statistics for dashboard overview (memory/cache first, no redundant Supabase round-trips)
   */
  static async getDashboardStats(forms?: Form[], submissions?: Submission[]): Promise<DashboardStats> {
    if (forms && submissions) {
      return this.computeDashboardStats(forms, submissions);
    }

    let resolvedForms = forms;
    if (!resolvedForms) {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.FORMS) : null;
      if (raw) {
        try {
          resolvedForms = JSON.parse(raw);
        } catch {}
      }
      if (!resolvedForms || resolvedForms.length === 0) {
        resolvedForms = await this.getForms();
      }
    }

    let resolvedSubs = submissions;
    if (!resolvedSubs) {
      const rawSubs = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) : null;
      if (rawSubs) {
        try {
          resolvedSubs = JSON.parse(rawSubs);
        } catch {}
      }
      if (!resolvedSubs) {
        resolvedSubs = await this.getAllSubmissions();
      }
    }

    return this.computeDashboardStats(resolvedForms || [], resolvedSubs || []);
  }

  /**
   * Generate complete Supabase SQL Migration script
   */
  static getSupabaseSQLMigration(): string {
    return `-- ==========================================
-- DYNAMIC EVENT FORM BUILDER & REGISTRATION SCHEMA
-- ==========================================

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Event Administrator',
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Forms Table
CREATE TABLE IF NOT EXISTS public.forms (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  cover_image_url TEXT,
  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  registration_deadline TIMESTAMPTZ,
  theme_config JSONB DEFAULT '{"accentColor": "#4f46e5", "headerStyle": "banner", "themeMode": "light", "borderRadius": "xl"}'::jsonb,
  success_message TEXT DEFAULT 'Thank you! Your registration has been submitted successfully.',
  redirect_url TEXT,
  published_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);

-- 3. Create Form Fields Table
CREATE TABLE IF NOT EXISTS public.form_fields (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  options JSONB,
  validation_rules JSONB,
  conditional_rules JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  configuration JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_form ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_fields_sort ON public.form_fields(form_id, sort_order);

-- 4. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_version INT NOT NULL DEFAULT 1,
  applicant_name TEXT,
  applicant_email TEXT,
  submission_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_form ON public.submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.submissions(submitted_at);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Forms RLS: Allow viewing and managing forms
CREATE POLICY "Allow public read forms" 
ON public.forms FOR SELECT 
USING (true);

CREATE POLICY "Allow manage forms" 
ON public.forms FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Form Fields RLS: Allow viewing and managing fields
CREATE POLICY "Allow public read fields" 
ON public.form_fields FOR SELECT 
USING (true);

CREATE POLICY "Allow manage fields" 
ON public.form_fields FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Submissions RLS: Anyone can submit and manage submissions
CREATE POLICY "Public can insert submissions" 
ON public.submissions FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow view submissions" 
ON public.submissions FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow delete submissions" 
ON public.submissions FOR DELETE 
TO anon, authenticated
USING (true);

-- 6. Storage Bucket setup for Event Posters and Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to event-assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-assets');

CREATE POLICY "Allow authenticated uploads to event-assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'event-assets');
`;
  }
}

export function isSubmissionForForm(sub: Submission, form: Form): boolean {
  if (!sub || !form) return false;
  if (isSystemForm(form) || isDeletedForm(form)) return false;
  if (isDeletedSubmission(sub)) return false;
  if (sub.form_id === form.id) return true;
  if (form.slug && sub.form_id.toLowerCase() === form.slug.toLowerCase()) return true;

  const cleanSub = (sub.form_id || '').toLowerCase().replace(/^(event-form-|form-)/, '');
  const cleanFormId = (form.id || '').toLowerCase().replace(/^(event-form-|form-)/, '');
  const cleanSlug = (form.slug || '').toLowerCase().replace(/^(event-form-|form-)/, '');

  if (cleanSub !== '') {
    if (cleanSub === cleanFormId || cleanSub === cleanSlug) return true;
  }
  return false;
}
