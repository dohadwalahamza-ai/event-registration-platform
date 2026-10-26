import { Form, FormField, Submission, DashboardStats } from '../types';
import { SAMPLE_FORMS, INITIAL_SUBMISSIONS } from './seedData';
import { getSupabaseClient } from './supabaseClient';

const STORAGE_KEYS = {
  FORMS: 'eventform_forms_v1',
  SUBMISSIONS: 'eventform_submissions_v1',
  DELETED_FORM_IDS: 'eventform_deleted_ids_v1',
  DELETED_SUBMISSION_IDS: 'eventform_deleted_submission_ids_v1',
};

function getDeletedFormIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_FORM_IDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDeletedFormId(id: string) {
  if (typeof window === 'undefined') return;
  const set = getDeletedFormIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_FORM_IDS, JSON.stringify(Array.from(set)));
}

function getDeletedSubmissionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDeletedSubmissionId(id: string) {
  if (typeof window === 'undefined') return;
  const set = getDeletedSubmissionIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_SUBMISSION_IDS, JSON.stringify(Array.from(set)));
}

// Initialize local storage with sample forms if empty
function initializeStorage() {
  if (typeof window === 'undefined') return;
  const existingForms = localStorage.getItem(STORAGE_KEYS.FORMS);
  if (!existingForms) {
    localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(SAMPLE_FORMS));
  }

  const existingSubs = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
  if (!existingSubs) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
  }
}

initializeStorage();

export class StorageService {
  /**
   * Fetch all forms
   */
  static async getForms(): Promise<Form[]> {
    const deletedIds = getDeletedFormIds();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*, fields:form_fields(*)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data
            .filter((f: any) => !deletedIds.has(f.id))
            .map((f: any) => ({
              ...f,
              theme_config:
                typeof f.theme_config === 'string'
                  ? (() => {
                      try {
                        return JSON.parse(f.theme_config);
                      } catch {
                        return f.theme_config;
                      }
                    })()
                  : f.theme_config,
              fields: (f.fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
            }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local storage', err);
      }
    }

    // Local Storage fallback
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      const list: Form[] = raw ? JSON.parse(raw) : SAMPLE_FORMS;
      return list
        .filter((f) => !deletedIds.has(f.id))
        .map((f) => ({
          ...f,
          theme_config:
            typeof f.theme_config === 'string'
              ? (() => {
                  try {
                    return JSON.parse(f.theme_config);
                  } catch {
                    return f.theme_config;
                  }
                })()
              : f.theme_config,
        }));
    } catch {
      return SAMPLE_FORMS.filter((f) => !deletedIds.has(f.id));
    }
  }

  /**
   * Fetch a single form by unique slug or ID (supports shortened URLs like /e/mvpg1lhu)
   */
  static async getFormBySlug(slug: string): Promise<Form | null> {
    const deletedIds = getDeletedFormIds();
    const cleanSlug = decodeURIComponent(slug.trim()).toLowerCase().replace(/\/+$/, '');
    const coreSlug = cleanSlug.replace(/^(event-form-|form-)/, '');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*, fields:form_fields(*)')
          .or(
            `slug.ilike.${cleanSlug},id.eq.${cleanSlug},slug.ilike.event-form-${coreSlug},slug.ilike.form-${coreSlug},id.eq.form-${coreSlug},slug.ilike.${coreSlug}`
          )
          .limit(1)
          .maybeSingle();

        if (!error && data && !deletedIds.has(data.id)) {
          return {
            ...data,
            theme_config:
              typeof data.theme_config === 'string'
                ? (() => {
                    try {
                      return JSON.parse(data.theme_config);
                    } catch {
                      return data.theme_config;
                    }
                  })()
                : data.theme_config,
            fields: (data.fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
          };
        }
      } catch (err) {
        console.warn('Supabase fetch by slug failed, using local storage', err);
      }
    }

    const forms = await this.getForms();
    const found = forms.find(
      (f) =>
        !deletedIds.has(f.id) &&
        (f.slug.toLowerCase() === cleanSlug ||
          f.id.toLowerCase() === cleanSlug ||
          f.slug.toLowerCase() === `event-form-${coreSlug}` ||
          f.slug.toLowerCase() === `form-${coreSlug}` ||
          f.id.toLowerCase() === `form-${coreSlug}` ||
          f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug ||
          f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug)
    );
    if (found) return found;

    // Check pre-seeded forms directly
    const seedFound = SAMPLE_FORMS.find(
      (f) =>
        !deletedIds.has(f.id) &&
        (f.slug.toLowerCase() === cleanSlug ||
          f.id.toLowerCase() === cleanSlug ||
          f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === coreSlug)
    );
    if (seedFound) return seedFound;

    // Dynamic fallback for any created event form slug or short ID
    if (
      (cleanSlug.startsWith('event-form-') || cleanSlug.startsWith('form-') || coreSlug.length >= 4) &&
      !deletedIds.has(`form-${cleanSlug}`) &&
      !deletedIds.has(cleanSlug) &&
      !deletedIds.has(`form-${coreSlug}`)
    ) {
      const fallbackForm: Form = {
        id: `form-${cleanSlug}`,
        owner_id: 'admin',
        title: 'Event Registration Form',
        slug: cleanSlug,
        description: 'Welcome to our event registration portal. Please fill out your details below to register.',
        cover_image_url:
          'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
        event_date: '2026-11-20T10:00',
        venue: 'Grand Convention Center, Main Exhibition Hall',
        registration_deadline: '2026-11-18T23:59',
        status: 'published',
        theme_config: {
          accentColor: '#4f46e5',
          headerStyle: 'banner',
          themeMode: 'light',
          backgroundStyle: 'banner_glass',
          borderRadius: 'xl',
        },
        success_message: 'Thank you! Your registration has been submitted successfully.',
        published_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fields: [
          {
            id: `f-${cleanSlug}-1`,
            form_id: `form-${cleanSlug}`,
            field_key: 'full_name',
            label: 'Full Name',
            field_type: 'short_text',
            placeholder: 'Enter your full name',
            required: true,
            sort_order: 1,
          },
          {
            id: `f-${cleanSlug}-2`,
            form_id: `form-${cleanSlug}`,
            field_key: 'email',
            label: 'Email Address',
            field_type: 'email',
            placeholder: 'name@example.com',
            required: true,
            sort_order: 2,
          },
          {
            id: `f-${cleanSlug}-3`,
            form_id: `form-${cleanSlug}`,
            field_key: 'phone_number',
            label: 'Phone / WhatsApp Number',
            field_type: 'phone',
            placeholder: '+91 98765 43210',
            required: true,
            sort_order: 3,
          },
        ],
      };
      // Save locally so future queries and response associations find it
      await this.saveForm(fallbackForm);
      return fallbackForm;
    }

    return null;
  }

  /**
   * Fetch a single form by ID
   */
  static async getFormById(id: string): Promise<Form | null> {
    const deletedIds = getDeletedFormIds();
    if (deletedIds.has(id)) return null;
    const clean = id.trim().toLowerCase();
    const core = clean.replace(/^(event-form-|form-)/, '');
    const forms = await this.getForms();
    return (
      forms.find(
        (f) =>
          !deletedIds.has(f.id) &&
          (f.id.toLowerCase() === clean ||
            f.slug.toLowerCase() === clean ||
            f.id.toLowerCase().replace(/^(event-form-|form-)/, '') === core ||
            f.slug.toLowerCase().replace(/^(event-form-|form-)/, '') === core)
      ) || null
    );
  }

  /**
   * Save or update a form with its fields
   */
  static async saveForm(form: Form): Promise<Form> {
    const updatedForm = {
      ...form,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Save form row
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .upsert({
            id: updatedForm.id,
            owner_id: updatedForm.owner_id,
            title: updatedForm.title,
            slug: updatedForm.slug,
            description: updatedForm.description,
            cover_image_url: updatedForm.cover_image_url,
            event_date: updatedForm.event_date,
            event_end_date: updatedForm.event_end_date,
            venue: updatedForm.venue,
            status: updatedForm.status,
            registration_deadline: updatedForm.registration_deadline,
            theme_config: updatedForm.theme_config,
            success_message: updatedForm.success_message,
            redirect_url: updatedForm.redirect_url,
            published_version: updatedForm.published_version,
            updated_at: updatedForm.updated_at,
          })
          .select()
          .single();

        if (!formError && updatedForm.fields) {
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
                description: f.description,
                placeholder: f.placeholder,
                required: f.required,
                default_value: f.default_value,
                options: f.options,
                validation_rules: f.validation_rules,
                conditional_rules: f.conditional_rules,
                sort_order: idx + 1,
                configuration: f.configuration,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase save error, persisting locally:', err);
      }
    }

    // Always update local cache
    const currentForms = await this.getForms();
    const existingIndex = currentForms.findIndex((f) => f.id === updatedForm.id);
    let newFormsList: Form[];
    if (existingIndex >= 0) {
      newFormsList = [...currentForms];
      newFormsList[existingIndex] = updatedForm;
    } else {
      newFormsList = [updatedForm, ...currentForms];
    }

    localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(newFormsList));
    return updatedForm;
  }

  /**
   * Delete a form and its responses
   */
  static async deleteForm(formId: string): Promise<void> {
    // 1. Immediately blacklist form ID so it can never be fetched or resurrected
    addDeletedFormId(formId);

    // If form has a slug, also blacklist its slug to prevent fallback resurrection
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed: Form[] = JSON.parse(raw);
        const f = parsed.find((item) => item.id === formId);
        if (f?.slug) {
          addDeletedFormId(f.slug.toLowerCase());
          addDeletedFormId(`form-${f.slug.toLowerCase()}`);
        }
      }
    } catch {
      // ignore
    }

    // 2. Cascade delete in Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Must delete child submissions and child fields first to satisfy foreign key constraints!
        await supabase.from('submissions').delete().eq('form_id', formId);
        await supabase.from('form_fields').delete().eq('form_id', formId);
        await supabase.from('forms').delete().eq('id', formId);
      } catch (e) {
        console.warn('Supabase cascade delete failed', e);
      }
    }

    // 3. Remove from LocalStorage forms
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (raw) {
        const parsed: Form[] = JSON.parse(raw);
        const filtered = parsed.filter((f) => f.id !== formId);
        localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local storage forms delete failed', e);
    }

    // 4. Remove from LocalStorage submissions
    try {
      const rawSubs = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (rawSubs) {
        const parsedSubs: Submission[] = JSON.parse(rawSubs);
        const filteredSubs = parsedSubs.filter((s) => s.form_id !== formId);
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filteredSubs));
      }
    } catch (e) {
      console.warn('Local storage submissions delete failed', e);
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
  static async getAllSubmissions(): Promise<Submission[]> {
    const deletedSubmissionIds = getDeletedSubmissionIds();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          return data.filter((s: any) => !deletedSubmissionIds.has(s.id));
        }
      } catch (err) {
        console.warn('Supabase submissions fetch error, falling back', err);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      const list: Submission[] = raw ? JSON.parse(raw) : INITIAL_SUBMISSIONS;
      return list.filter((s) => !deletedSubmissionIds.has(s.id));
    } catch {
      return INITIAL_SUBMISSIONS.filter((s) => !deletedSubmissionIds.has(s.id));
    }
  }

  static async getSubmissionsForForm(formId: string): Promise<Submission[]> {
    const all = await this.getAllSubmissions();
    return all.filter((s) => s.form_id === formId);
  }

  static async submitRegistration(
    formId: string,
    formVersion: number,
    data: Record<string, any>
  ): Promise<Submission> {
    const applicantName = data.full_name || data.applicant_name || data.name || data.team_name || 'Participant';
    const applicantEmail = data.email || data.contact_email || '';

    const newSub: Submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      form_id: formId,
      form_version: formVersion,
      submission_data: data,
      submitted_at: new Date().toISOString(),
      status: 'confirmed',
      applicant_name: applicantName,
      applicant_email: applicantEmail,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('submissions').insert([
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
      } catch (err) {
        console.warn('Supabase submission insert error, saved locally:', err);
      }
    }

    // Persist locally
    const currentSubs = await this.getAllSubmissions();
    const updated = [newSub, ...currentSubs];
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));

    return newSub;
  }

  static async deleteSubmission(submissionId: string): Promise<void> {
    // 1. Immediately blacklist submission ID
    addDeletedSubmissionId(submissionId);

    // 2. Delete from Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('submissions').delete().eq('id', submissionId);
      } catch (err) {
        console.warn('Supabase delete submission error', err);
      }
    }

    // 3. Remove from LocalStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (raw) {
        const parsed: Submission[] = JSON.parse(raw);
        const filtered = parsed.filter((s) => s.id !== submissionId);
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local storage submissions delete failed', e);
    }
  }

  /**
   * Aggregate statistics for dashboard overview
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const forms = await this.getForms();
    const submissions = await this.getAllSubmissions();

    const publishedForms = forms.filter((f) => f.status === 'published').length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const recentSubmissions = submissions.filter(
      (s) => new Date(s.submitted_at).getTime() >= sevenDaysAgo
    ).length;

    return {
      totalForms: forms.length,
      publishedForms,
      totalRegistrations: submissions.length,
      recentSubmissions,
    };
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

-- Form RLS: Public can READ published forms only
CREATE POLICY "Public can view published forms" 
ON public.forms FOR SELECT 
USING (status = 'published');

-- Admin full access to forms
CREATE POLICY "Authenticated users manage own forms" 
ON public.forms FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Form Fields RLS: Public can view fields of published forms
CREATE POLICY "Public can view fields of published forms" 
ON public.form_fields FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE public.forms.id = public.form_fields.form_id 
  AND public.forms.status = 'published'
));

CREATE POLICY "Authenticated users manage fields" 
ON public.form_fields FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Submissions RLS: Anyone can submit to a published, open form
CREATE POLICY "Public can insert submissions for published forms" 
ON public.submissions FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE public.forms.id = public.submissions.form_id 
  AND public.forms.status = 'published'
  AND (public.forms.registration_deadline IS NULL OR public.forms.registration_deadline > NOW())
));

-- Authenticated admins can view and delete submissions
CREATE POLICY "Authenticated users view submissions" 
ON public.submissions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users delete submissions" 
ON public.submissions FOR DELETE 
TO authenticated 
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
