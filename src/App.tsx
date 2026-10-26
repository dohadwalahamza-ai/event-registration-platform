import React, { useState, useEffect } from 'react';
import { Form, Submission, DashboardStats } from './types';
import { StorageService } from './services/storage';
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
import { SettingsView } from './features/settings/SettingsView';
import { PublicRegistrationPage } from './features/public-registration/PublicRegistrationPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    publishedForms: 0,
    totalRegistrations: 0,
    recentSubmissions: 0,
  });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Check URL hash for public page routes and admin deep linking
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [isLoginRoute, setIsLoginRoute] = useState(false);
  const { success, error } = useToast();

  const parseRoute = () => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    let slug: string | null = null;
    if (hash.startsWith('#/e/')) {
      slug = hash.replace('#/e/', '').split('?')[0];
    } else if (path.startsWith('/e/')) {
      slug = path.replace('/e/', '').split('?')[0];
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
        setCurrentTab('forms');
      } else if (hash.startsWith('#/builder')) {
        const parts = hash.split('/');
        if (parts[2]) setActiveFormId(parts[2]);
        setCurrentTab('new-form');
      } else if (hash.startsWith('#/responses')) {
        const parts = hash.split('/');
        if (parts[2]) setActiveFormId(parts[2]);
        setCurrentTab('responses');
      } else if (hash.startsWith('#/settings')) {
        setCurrentTab('settings');
      } else if (hash === '' || hash === '#' || hash.startsWith('#/dashboard')) {
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
    else if (tab === 'settings') window.location.hash = '#/settings';
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
    setIsDataLoading(true);
    try {
      const allForms = await StorageService.getForms();
      const allSubmissions = await StorageService.getAllSubmissions();
      const dashboardStats = await StorageService.getDashboardStats();

      setForms(allForms);
      setSubmissions(allSubmissions);
      setStats(dashboardStats);

      // Check Supabase connection
      const client = getSupabaseClient();
      setIsSupabaseConnected(Boolean(client));

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

  useEffect(() => {
    loadData();
  }, []);

  // Compute response counts per form
  const responseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of submissions) {
      counts[sub.form_id] = (counts[sub.form_id] || 0) + 1;
    }
    return counts;
  }, [submissions]);

  // Handle creating a new form
  const handleCreateNewForm = async () => {
    const newId = `form-${Date.now().toString(36)}`;
    const count = forms.length + 1;
    const newForm: Form = {
      id: newId,
      owner_id: user?.id || 'admin-1',
      title: `New Event Registration Form ${count}`,
      slug: `event-form-${Date.now().toString(36)}`,
      description: 'Fill out this form to register for the upcoming event.',
      status: 'draft',
      theme_config: {
        accentColor: '#4f46e5',
        headerStyle: 'banner',
        themeMode: 'light',
        borderRadius: 'xl',
      },
      success_message: 'Thank you for registering! We have recorded your submission.',
      published_version: 1,
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

    const saved = await StorageService.saveForm(newForm);
    setForms((prev) => [saved, ...prev]);
    setActiveFormId(saved.id);
    navigateToTab('new-form', saved.id);
    success('Form Initialized', 'Start customizing fields and settings.');
  };

  // Handle saving form from builder
  const handleSaveForm = async (updated: Form) => {
    const saved = await StorageService.saveForm(updated);
    setForms((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
  };

  // Duplicate form
  const handleDuplicateForm = async (formId: string) => {
    const duplicated = await StorageService.duplicateForm(formId);
    setForms((prev) => [duplicated, ...prev]);
    setActiveFormId(duplicated.id);
  };

  // Delete form
  const handleDeleteForm = async (formId: string) => {
    await StorageService.deleteForm(formId);
    setForms((prev) => prev.filter((f) => f.id !== formId));
    setSubmissions((prev) => prev.filter((s) => s.form_id !== formId));
    if (activeFormId === formId) {
      setActiveFormId(forms[0]?.id || null);
    }
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

  // Open public page
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
    const publicForm = forms.find((f) => f.slug.toLowerCase() === publicSlug.toLowerCase());

    if (!publicForm) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Event Form Not Found</h2>
            <p className="text-xs text-slate-500">
              The event URL <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/e/{publicSlug}</code> does not exist or may have been unpublished.
            </p>
            <button
              onClick={() => {
                window.location.hash = '';
                setPublicSlug(null);
              }}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Return to Platform Home
            </button>
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
        onViewSamplePublicEvent={() => handleOpenPublicUrl(forms[0]?.slug || 'kpcl-season-5')}
      />
    );
  }

  // Active form for builder or responses
  const activeForm = forms.find((f) => f.id === activeFormId) || forms[0];

  // 4. AUTHENTICATED ADMIN DASHBOARD
  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={(tab) => {
        if (tab === 'new-form') {
          handleCreateNewForm();
        } else {
          navigateToTab(tab);
        }
      }}
      onCreateNewForm={handleCreateNewForm}
      totalFormsCount={forms.length}
      totalResponsesCount={submissions.length}
      isSupabaseConnected={isSupabaseConnected}
      onOpenSettings={() => navigateToTab('settings')}
      onPreviewSampleEvent={() => handleOpenPublicUrl(forms[0]?.slug || 'kpcl-season-5')}
      onLogout={handleLogout}
      adminName={user?.name}
      adminEmail={user?.email}
    >
      {/* TAB 1: DASHBOARD */}
      {currentTab === 'dashboard' && (
        <DashboardView
          stats={stats}
          forms={forms}
          recentSubmissions={submissions}
          onCreateNewForm={handleCreateNewForm}
          onEditForm={(id) => navigateToTab('new-form', id)}
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
          onEditForm={(id) => navigateToTab('new-form', id)}
          onPreviewForm={(id) => {
            const f = forms.find((form) => form.id === id);
            if (f) handleOpenPublicUrl(f.slug);
          }}
          onViewResponses={(id) => navigateToTab('responses', id)}
          onDuplicateForm={handleDuplicateForm}
          onDeleteForm={handleDeleteForm}
          onTogglePublish={handleTogglePublish}
          onOpenPublicUrl={handleOpenPublicUrl}
        />
      )}

      {/* TAB 3: FORM BUILDER VIEW */}
      {currentTab === 'new-form' && activeForm && (
        <FormBuilderView
          initialForm={activeForm}
          onBack={() => navigateToTab('forms')}
          onSaveForm={handleSaveForm}
          onViewResponses={(id) => navigateToTab('responses', id)}
          onOpenLivePublicPage={handleOpenPublicUrl}
        />
      )}

      {/* TAB 4: RESPONSES VIEW */}
      {currentTab === 'responses' && activeForm && (
        <ResponseManagementView
          form={activeForm}
          submissions={submissions.filter((s) => s.form_id === activeForm.id)}
          onDeleteSubmission={handleDeleteSubmission}
          onBackToForms={() => navigateToTab('forms')}
        />
      )}

      {/* TAB 5: SETTINGS */}
      {currentTab === 'settings' && (
        <SettingsView
          isSupabaseConnected={isSupabaseConnected}
          onRefreshConnection={() => {
            const client = getSupabaseClient();
            setIsSupabaseConnected(Boolean(client));
          }}
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
