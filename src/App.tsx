import React, { useState, useEffect } from 'react';
import { Form, Submission, DashboardStats } from './types';
import { StorageService, isSubmissionForForm, packFormToUrlPayload } from './services/storage';
import { getSupabaseClient } from './services/supabaseClient';
import { Layout } from './generic-ui/Layout';
import { NavigationTab } from './generic-ui/Sidebar';
import { ToastProvider, useToast } from './generic-ui/ToastContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardView } from './features/dashboard/DashboardView';
import { FormsListView } from './features/forms/FormsListView';
import { FormBuilderView } from './features/builder/FormBuilderView';
import { ResponseManagementView } from './features/responses/ResponseManagementView';
import { PublicRegistrationPage } from './features/public-registration/PublicRegistrationPage';
import { Loader2, Sparkles } from 'lucide-react';

function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const path = window.location.pathname || '';
  const href = window.location.href || '';

  // 1. Check hash variations: #/e/:slug, #e/:slug, #/form/:slug
  const hashMatch = hash.match(/^#\/?(?:e|form)\/([^?&#]+)/i);
  if (hashMatch && hashMatch[1]) {
    return decodeURIComponent(hashMatch[1]).trim().replace(/\/+$/, '');
  }

  // 2. Check path variations: /e/:slug, /form/:slug, /%23/e/:slug
  const pathMatch = path.match(/^(?:\/%23)?\/?(?:e|form)\/([^?&#/]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).trim().replace(/\/+$/, '');
  }

  // 3. Fallback check full decoded href
  try {
    const decodedHref = decodeURIComponent(href);
    const hrefMatch = decodedHref.match(/[#/]e\/([A-Za-z0-9_-]+)/i);
    if (hrefMatch && hrefMatch[1]) {
      return hrefMatch[1].trim();
    }
  } catch {}

  return null;
}

function AppContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [isRefreshingSubs, setIsRefreshingSubs] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    publishedForms: 0,
    totalRegistrations: 0,
    recentSubmissions: 0,
  });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [newDraftForm, setNewDraftForm] = useState<Form | null>(null);

  // Synchronously initialize public slug to prevent flashing admin loading or login page on mobile
  const initialSlug = extractSlugFromUrl();
  const [publicSlug, setPublicSlug] = useState<string | null>(initialSlug);
  const [publicForm, setPublicForm] = useState<Form | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState<boolean>(Boolean(initialSlug));
  const [isLoginRoute, setIsLoginRoute] = useState(false);
  const { success, error, info } = useToast();

  const parseRoute = () => {
    const slug = extractSlugFromUrl();
    const hash = window.location.hash || '';

    // Auto-clear cache on load seamlessly in the background
    StorageService.clearStaleFormCache(slug || undefined);

    if (slug !== publicSlug) {
      setPublicForm(null); // Clear previous form immediately so it never shows
      if (slug) {
        setIsPublicLoading(true);
      }
    }
    setPublicSlug(slug);

    if (hash === '#/login') {
      setIsLoginRoute(true);
      return;
    } else {
      setIsLoginRoute(false);
    }

    if (!slug) {
      if (hash.startsWith('#/forms')) {
        setNewDraftForm(null);
        setCurrentTab('forms');
      } else if (hash.startsWith('#/builder')) {
        const parts = hash.split('/');
        if (parts[2]) {
          setActiveFormId(parts[2]);
          setNewDraftForm((prev) => (prev && prev.id === parts[2] ? prev : null));
        }
        setCurrentTab('new-form');
      } else if (hash.startsWith('#/responses')) {
        setNewDraftForm(null);
        const parts = hash.split('/');
        if (parts[2]) setActiveFormId(parts[2]);
        setCurrentTab('responses');
      } else if (hash === '' || hash === '#' || hash.startsWith('#/dashboard')) {
        setNewDraftForm(null);
        setCurrentTab('dashboard');
      }
    }
  };

  const navigateToTab = (tab: NavigationTab, formId?: string) => {
    setCurrentTab(tab);
    setPublicSlug(null);
    setIsLoginRoute(false);
    if (formId) setActiveFormId(formId);

    if (tab === 'dashboard') window.location.hash = '#/dashboard';
    else if (tab === 'forms') window.location.hash = '#/forms';
    else if (tab === 'new-form') window.location.hash = formId ? `#/builder/${formId}` : '#/builder';
    else if (tab === 'responses') window.location.hash = formId ? `#/responses/${formId}` : '#/responses';
  };

  useEffect(() => {
    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    window.addEventListener('popstate', parseRoute);
    return () => {
      window.removeEventListener('hashchange', parseRoute);
      window.removeEventListener('popstate', parseRoute);
    };
  }, []);

  const loadData = async () => {
    // If opening a public form route, don't run heavy admin dashboard loading
    if (extractSlugFromUrl()) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    try {
      const allForms = await StorageService.getForms();
      const allSubmissions = await StorageService.getAllSubmissions();
      const dashboardStats = await StorageService.getDashboardStats();

      setForms(allForms);
      setSubmissions(allSubmissions);
      setStats(dashboardStats);

      // Check Supabase connection and trigger background sync of local forms
      const client = getSupabaseClient();
      setIsSupabaseConnected(Boolean(client));
      StorageService.syncLocalFormsToRemote().catch(() => {});

      // Set active form default if none selected
      if (!activeFormId && allForms.length > 0) {
        setActiveFormId(allForms[0].id);
      }
    } catch (e) {
      console.error('Failed to load storage data', e);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleRefreshSubmissions = async () => {
    setIsRefreshingSubs(true);
    try {
      const allSubmissions = await StorageService.getAllSubmissions();
      setSubmissions(allSubmissions);
      const dashboardStats = await StorageService.getDashboardStats();
      setStats(dashboardStats);
    } catch (e) {
      console.warn('Failed to refresh submissions:', e);
    } finally {
      setIsRefreshingSubs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for real-time submission creations across windows and tabs
  useEffect(() => {
    const handleSubmissionCreated = (e: any) => {
      const newSub: Submission = e.detail;
      if (newSub) {
        setSubmissions((prev) => {
          if (prev.some((s) => s.id === newSub.id)) return prev;
          return [newSub, ...prev];
        });
        StorageService.getDashboardStats().then(setStats).catch(() => {});
      }
    };

    window.addEventListener('submission_created', handleSubmissionCreated);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eventform_submissions_v1') {
        StorageService.getAllSubmissions().then(setSubmissions).catch(() => {});
        StorageService.getDashboardStats().then(setStats).catch(() => {});
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('submission_created', handleSubmissionCreated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Automatically refresh submissions when switching to Responses or Dashboard
  useEffect(() => {
    if (currentTab === 'responses' || currentTab === 'dashboard') {
      StorageService.getAllSubmissions().then(setSubmissions).catch(() => {});
      StorageService.getDashboardStats().then(setStats).catch(() => {});
    }
  }, [currentTab]);

  // Dedicated loader for public event registration pages
  useEffect(() => {
    if (!publicSlug) {
      setPublicForm(null);
      setIsPublicLoading(false);
      return;
    }

    let isCancelled = false;
    setIsPublicLoading(true);
    // Purge stale form cache so no previous forms linger on mobile
    StorageService.clearStaleFormCache(publicSlug);

    StorageService.getFormBySlug(publicSlug)
      .then((form) => {
        if (!isCancelled) {
          setPublicForm(form);
          setIsPublicLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching public form:', err);
        if (!isCancelled) {
          setPublicForm(null);
          setIsPublicLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [publicSlug]);

  // Reactive listener for form saves across the builder and public preview
  useEffect(() => {
    const handleSaved = (e: any) => {
      const updated: Form = e.detail;
      if (updated) {
        setForms((prev) => {
          const idx = prev.findIndex((f) => f.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [updated, ...prev];
        });

        setNewDraftForm((prev) => (prev && prev.id === updated.id ? null : prev));

        if (publicSlug) {
          const clean = publicSlug.toLowerCase().replace(/^(event-form-|form-)/, '');
          const updatedCore = (updated.slug || updated.id).toLowerCase().replace(/^(event-form-|form-)/, '');
          if (
            updated.slug.toLowerCase() === publicSlug.toLowerCase() ||
            updated.id.toLowerCase() === publicSlug.toLowerCase() ||
            clean === updatedCore
          ) {
            setPublicForm(updated);
          }
        }
      }
    };

    window.addEventListener('eventform_saved', handleSaved);
    return () => {
      window.removeEventListener('eventform_saved', handleSaved);
    };
  }, [publicSlug]);

  // Compute response counts per form with normalized ID and slug matching
  const responseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of forms) {
      counts[f.id] = submissions.filter((s) => isSubmissionForForm(s, f)).length;
    }
    return counts;
  }, [forms, submissions]);

  // Handle creating a new form - kept in-memory until user clicks "Save as Draft" or "Publish Event"
  const handleCreateNewForm = () => {
    const newId = `form-${Date.now().toString(36)}`;
    const count = forms.length + 1;
    const newForm: Form = {
      id: newId,
      owner_id: user?.id || 'admin-1',
      title: `New Event Registration Form ${count}`,
      slug: `event-form-${Date.now().toString(36)}`,
      description: 'Fill out this form to register for the upcoming event.',
      cover_image_url:
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
      event_date: '2026-11-20T10:00',
      venue: 'Grand Convention Center, Main Exhibition Hall',
      registration_deadline: '2026-11-18T23:59',
      status: 'draft',
      theme_config: {
        accentColor: '#4f46e5',
        headerStyle: 'banner',
        themeMode: 'light',
        backgroundStyle: 'banner_glass',
        borderRadius: 'xl',
      },
      success_message: 'Thank you for registering! We have recorded your submission.',
      published_version: 1,
      response_limit: 'multiple',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: [
        {
          id: `f-${Math.random().toString(36).substring(2, 8)}`,
          form_id: newId,
          field_key: 'full_name',
          label: 'Full Name',
          field_type: 'short_text',
          placeholder: 'Enter your full name',
          required: true,
          sort_order: 1,
        },
        {
          id: `f-${Math.random().toString(36).substring(2, 8)}`,
          form_id: newId,
          field_key: 'email',
          label: 'Email Address',
          field_type: 'email',
          placeholder: 'name@example.com',
          required: true,
          sort_order: 2,
        },
        {
          id: `f-${Math.random().toString(36).substring(2, 8)}`,
          form_id: newId,
          field_key: 'phone_number',
          label: 'Phone / WhatsApp Number',
          field_type: 'phone',
          placeholder: '+91 98765 43210',
          required: true,
          sort_order: 3,
        },
      ],
    };

    // Keep only in memory until explicitly saved via "Save as Draft" or "Publish Event"
    setNewDraftForm(newForm);
    setActiveFormId(newId);
    navigateToTab('new-form', newId);
    info('Draft Form Opened', 'Customize your questions and click "Save as Draft" to store in All Forms.');
  };

  // Handle saving form from builder
  const handleSaveForm = async (updated: Form) => {
    const saved = await StorageService.saveForm(updated);
    setForms((prev) => {
      const idx = prev.findIndex((f) => f.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (newDraftForm && (newDraftForm.id === saved.id || newDraftForm.slug === saved.slug)) {
      setNewDraftForm(null);
    }
  };

  // Duplicate form
  const handleDuplicateForm = async (formId: string) => {
    const duplicated = await StorageService.duplicateForm(formId);
    setForms((prev) => (prev.some((f) => f.id === duplicated.id) ? prev : [duplicated, ...prev]));
    setActiveFormId(duplicated.id);
  };

  // Delete form
  const handleDeleteForm = async (formId: string) => {
    await StorageService.deleteForm(formId);
    setForms((prev) => {
      const remaining = prev.filter((f) => f.id !== formId);
      if (activeFormId === formId) {
        setActiveFormId(remaining[0]?.id || null);
      }
      return remaining;
    });
    const cleanId = formId.toLowerCase().replace(/^(event-form-|form-)/, '');
    setSubmissions((prev) =>
      prev.filter((s) => {
        const subClean = (s.form_id || '').toLowerCase().replace(/^(event-form-|form-)/, '');
        return s.form_id !== formId && subClean !== cleanId;
      })
    );
    StorageService.getDashboardStats().then(setStats).catch(() => {});
  };

  // Bulk delete forms
  const handleDeleteForms = async (formIds: string[]) => {
    await StorageService.deleteForms(formIds);
    const idSet = new Set(formIds);
    const cleanIdSet = new Set(formIds.map((id) => id.toLowerCase().replace(/^(event-form-|form-)/, '')));
    setForms((prev) => {
      const remaining = prev.filter((f) => !idSet.has(f.id));
      if (activeFormId && idSet.has(activeFormId)) {
        setActiveFormId(remaining[0]?.id || null);
      }
      return remaining;
    });
    setSubmissions((prev) =>
      prev.filter((s) => {
        const subClean = (s.form_id || '').toLowerCase().replace(/^(event-form-|form-)/, '');
        return !idSet.has(s.form_id) && !cleanIdSet.has(subClean);
      })
    );
    StorageService.getDashboardStats().then(setStats).catch(() => {});
  };

  // Toggle publish status
  const handleTogglePublish = async (form: Form) => {
    const nextStatus = form.status === 'published' ? 'draft' : 'published';
    const updated: Form = { ...form, status: nextStatus };
    await StorageService.saveForm(updated);
    setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    success('Status Updated', `Form is now ${nextStatus.toUpperCase()}`);
  };

  // Delete submission
  const handleDeleteSubmission = async (submissionId: string) => {
    await StorageService.deleteSubmission(submissionId);
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
  };

  // Open public page with clean URL
  const handleOpenPublicUrl = (slug: string) => {
    window.location.hash = `/e/${slug}`;
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    success('Logged Out', 'You have been safely signed out.');
    window.location.hash = '#/login';
  };

  // 1. PUBLIC REGISTRATION ROUTE (Accessible without login)
  if (publicSlug) {
    if (isPublicLoading || !publicForm) {
      if (isPublicLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Loading Event Registration Form...</span>
            </div>
          </div>
        );
      }

      // If finished loading and no publicForm is found
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
              <Sparkles className="w-7 h-7 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Form Not Synced to Mobile Yet</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              The event form <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-semibold">/e/{publicSlug}</code> was created on your organizer computer and is saved in that browser's local memory.
            </p>
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-left text-xs text-indigo-950 space-y-2">
              <p className="font-semibold text-indigo-900 flex items-center gap-1.5">
                <span>📱</span> To open your custom form on mobile:
              </p>
              <p className="text-[11px] text-slate-600 leading-normal">
                On your computer, open this form in the Form Builder and click <strong>Share</strong>. Scan the <strong>QR code</strong> or copy the <strong>Share Link</strong> — it embeds all your custom questions so it loads instantly on any mobile device.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
              >
                Retry Loading
              </button>
              <button
                onClick={() => {
                  window.location.hash = '';
                  setPublicSlug(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <PublicRegistrationPage form={publicForm} />;
  }

  // 2. LOADING STATE
  if (isAuthLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs font-medium text-slate-400">Loading EventForm Platform...</span>
        </div>
      </div>
    );
  }

  // 3. ADMIN AUTHENTICATION GUARD
  if (!isAuthenticated || isLoginRoute) {
    return (
      <LoginPage
        onSuccess={() => navigateToTab('dashboard')}
      />
    );
  }

  // Active form for builder or responses (matching ID, slug, or core normalized ID)
  const activeForm =
    (newDraftForm && (activeFormId === newDraftForm.id || !activeFormId))
      ? newDraftForm
      : forms.find(
          (f) =>
            f.id === activeFormId ||
            f.slug === activeFormId ||
            (activeFormId && f.id.replace(/^(event-form-|form-)/, '') === activeFormId.replace(/^(event-form-|form-)/, '')) ||
            (activeFormId && f.slug.replace(/^(event-form-|form-)/, '') === activeFormId.replace(/^(event-form-|form-)/, ''))
        ) || (currentTab === 'new-form' && newDraftForm ? newDraftForm : forms[0]);

  // 4. AUTHENTICATED ADMIN DASHBOARD
  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={(tab) => {
        if (tab === 'new-form') {
          handleCreateNewForm();
        } else {
          if (newDraftForm) {
            setNewDraftForm(null);
          }
          navigateToTab(tab);
        }
      }}
      onCreateNewForm={handleCreateNewForm}
      totalFormsCount={forms.length}
      totalResponsesCount={submissions.length}
      isSupabaseConnected={isSupabaseConnected}
      onPreviewSampleEvent={() => handleOpenPublicUrl(forms[0]?.slug || 'kpcl-season-5')}
      onLogout={handleLogout}
      adminName={user?.name}
      adminEmail={user?.email}
      submissions={submissions}
      forms={forms}
      onSelectFormResponses={(id) => navigateToTab('responses', id)}
    >
      {/* TAB 1: DASHBOARD */}
      {currentTab === 'dashboard' && (
        <DashboardView
          stats={stats}
          forms={forms}
          recentSubmissions={submissions}
          onCreateNewForm={handleCreateNewForm}
          onEditForm={(id) => {
            setNewDraftForm(null);
            navigateToTab('new-form', id);
          }}
          onViewResponses={(id) => navigateToTab('responses', id)}
          onOpenPublicLink={handleOpenPublicUrl}
        />
      )}

      {/* TAB 2: ALL FORMS */}
      {currentTab === 'forms' && (
        <FormsListView
          forms={forms}
          responseCounts={responseCounts}
          onCreateNewForm={handleCreateNewForm}
          onEditForm={(id) => {
            setNewDraftForm(null);
            navigateToTab('new-form', id);
          }}
          onPreviewForm={(id) => {
            const f = forms.find((form) => form.id === id);
            if (f) handleOpenPublicUrl(f.slug);
          }}
          onViewResponses={(id) => navigateToTab('responses', id)}
          onDuplicateForm={handleDuplicateForm}
          onDeleteForm={handleDeleteForm}
          onDeleteForms={handleDeleteForms}
          onTogglePublish={handleTogglePublish}
          onOpenPublicUrl={handleOpenPublicUrl}
        />
      )}

      {/* TAB 3: FORM BUILDER VIEW */}
      {currentTab === 'new-form' && activeForm && (
        <FormBuilderView
          key={activeForm.id}
          initialForm={activeForm}
          isNewDraft={Boolean(newDraftForm && newDraftForm.id === activeForm.id)}
          onBack={() => {
            if (newDraftForm && newDraftForm.id === activeForm.id) {
              setNewDraftForm(null);
            }
            navigateToTab('forms');
          }}
          onSaveForm={handleSaveForm}
          onViewResponses={(id) => navigateToTab('responses', id)}
          onOpenLivePublicPage={handleOpenPublicUrl}
        />
      )}

      {/* TAB 4: RESPONSES VIEW */}
      {currentTab === 'responses' && (
        <ResponseManagementView
          form={activeForm || forms[0]}
          forms={forms}
          allSubmissions={submissions}
          submissions={submissions}
          initialSelectedFormId={activeFormId}
          onSelectForm={(id) => setActiveFormId(id)}
          onRefresh={handleRefreshSubmissions}
          isRefreshing={isRefreshingSubs}
          onDeleteSubmission={handleDeleteSubmission}
          onUpdateStatus={async (id, status) => {
            await StorageService.updateSubmissionStatus(id, status);
            setSubmissions((prev) =>
              prev.map((s) => (s.id === id ? { ...s, status } : s))
            );
          }}
          onBackToForms={() => navigateToTab('forms')}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
