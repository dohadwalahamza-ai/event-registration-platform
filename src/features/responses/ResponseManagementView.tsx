import React, { useState, useMemo, useEffect } from 'react';
import { Form, Submission, FormField } from '../../types';
import {
  Download,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  X,
  ExternalLink,
  Camera,
  RefreshCw,
  BarChart3,
  Users,
  Phone,
  MessageSquare,
  Printer,
  Check,
  ChevronDown,
  User,
  ShieldCheck,
  Trophy,
  Shirt,
  AlertCircle,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  FolderOpen,
  Layers,
  Globe,
  Bell,
  BellRing,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';
import { useToast } from '../../generic-ui/ToastContext';
import { isSubmissionForForm, StorageService } from '../../services/storage';
import { AnalyticsCharts } from './AnalyticsCharts';
import {
  isDesktopNotificationEnabled,
  toggleDesktopNotifications,
} from '../../utils/desktopNotification';

interface ResponseManagementViewProps {
  form: Form;
  forms?: Form[];
  allSubmissions?: Submission[];
  submissions: Submission[];
  initialSelectedFormId?: string | null;
  onSelectForm?: (formId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onDeleteSubmission: (id: string) => Promise<void>;
  onUpdateStatus?: (id: string, status: 'confirmed' | 'pending' | 'cancelled') => Promise<void>;
  onBackToForms: () => void;
}

export const ResponseManagementView: React.FC<ResponseManagementViewProps> = ({
  form,
  forms = [],
  allSubmissions = [],
  submissions: initialSubmissions,
  initialSelectedFormId,
  onSelectForm,
  onRefresh,
  isRefreshing = false,
  onDeleteSubmission,
  onUpdateStatus,
  onBackToForms,
}) => {
  // Event Filter: 'overview' (directory), 'all' (combined table), or specific form.id
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedFormId || (forms.length > 0 ? 'overview' : 'all')
  );

  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [desktopNotifEnabled, setDesktopNotifEnabled] = useState(isDesktopNotificationEnabled());
  const [newlyArrivedSubmission, setNewlyArrivedSubmission] = useState<{
    formTitle: string;
    formId: string;
    applicantName: string;
    time: string;
  } | null>(null);

  // Listen for real-time submissions to display active alert banners
  useEffect(() => {
    const handleSubCreated = (e: any) => {
      const sub = e.detail;
      if (sub) {
        const matched = forms.find((f) => isSubmissionForForm(sub, f));
        setNewlyArrivedSubmission({
          formTitle: matched?.title || 'Event Form',
          formId: sub.form_id,
          applicantName: sub.applicant_name || 'Participant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    };
    window.addEventListener('submission_created', handleSubCreated);
    return () => window.removeEventListener('submission_created', handleSubCreated);
  }, [forms]);

  // Tab View: Table vs Analytics
  const [viewMode, setViewMode] = useState<'table' | 'analytics'>('table');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Sorting state (A-Z, Z-A, Date, Status, Event, Notes)
  type SortColumn = 'name' | 'email' | 'date' | 'status' | 'event' | 'notes';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Admin notes state
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [inlineNoteEditingId, setInlineNoteEditingId] = useState<string | null>(null);
  const [inlineNoteValue, setInlineNoteValue] = useState<string>('');

  const { success, error } = useToast();

  // Compute stats per form for the event directory (Task 26)
  const formsStats = useMemo(() => {
    const list = allSubmissions.length > 0 ? allSubmissions : initialSubmissions;
    return forms.map((f) => {
      const formSubs = list.filter((s) => isSubmissionForForm(s, f));
      const sorted = [...formSubs].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
      return {
        form: f,
        count: formSubs.length,
        latestSubmission: sorted[0] || null,
        latestTimestamp: sorted[0]?.submitted_at || null,
      };
    });
  }, [forms, allSubmissions, initialSubmissions]);

  const filteredEventStats = useMemo(() => {
    if (!eventSearchTerm.trim()) return formsStats;
    const query = eventSearchTerm.toLowerCase();
    return formsStats.filter(
      (s) =>
        s.form.title.toLowerCase().includes(query) ||
        s.form.slug.toLowerCase().includes(query) ||
        (s.form.status || '').toLowerCase().includes(query)
    );
  }, [formsStats, eventSearchTerm]);

  // Active form object if filtered to a specific event
  const currentFilteredForm = useMemo(() => {
    if (selectedEventId === 'all' || selectedEventId === 'overview') return null;
    return forms.find((f) => f.id === selectedEventId) || form || null;
  }, [selectedEventId, forms, form]);

  // Pool of submissions based on selected event filter
  const poolSubmissions = useMemo(() => {
    const list = allSubmissions.length > 0 ? allSubmissions : initialSubmissions;
    if (selectedEventId === 'all' || selectedEventId === 'overview') {
      return list;
    }
    const targetForm = forms.find((f) => f.id === selectedEventId) || form;
    if (!targetForm) return list;
    return list.filter((s) => isSubmissionForForm(s, targetForm));
  }, [selectedEventId, allSubmissions, initialSubmissions, forms, form]);

  // Filtered submissions based on search and status
  const filteredSubmissions = useMemo(() => {
    return poolSubmissions.filter((sub) => {
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const dataString = JSON.stringify(sub.submission_data || {}).toLowerCase();
      const applicant = (sub.applicant_name || '').toLowerCase();
      const email = (sub.applicant_email || '').toLowerCase();
      const notes = (sub.admin_notes || sub.submission_data?._admin_notes || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        applicant.includes(query) ||
        email.includes(query) ||
        notes.includes(query) ||
        dataString.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [poolSubmissions, statusFilter, searchTerm]);

  // Sorted submissions based on sortColumn and sortDirection (A-Z / Z-A)
  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'date') {
        const timeA = new Date(a.submitted_at).getTime() || 0;
        const timeB = new Date(b.submitted_at).getTime() || 0;
        comparison = timeA - timeB;
      } else if (sortColumn === 'name') {
        const nameA = (a.applicant_name || '').trim().toLowerCase();
        const nameB = (b.applicant_name || '').trim().toLowerCase();
        if (!nameA && !nameB) comparison = 0;
        else if (!nameA) comparison = 1;
        else if (!nameB) comparison = -1;
        else comparison = nameA.localeCompare(nameB);
      } else if (sortColumn === 'email') {
        const emailA = (a.applicant_email || '').trim().toLowerCase();
        const emailB = (b.applicant_email || '').trim().toLowerCase();
        if (!emailA && !emailB) comparison = 0;
        else if (!emailA) comparison = 1;
        else if (!emailB) comparison = -1;
        else comparison = emailA.localeCompare(emailB);
      } else if (sortColumn === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortColumn === 'event') {
        const formA = forms.find((f) => isSubmissionForForm(a, f))?.title || '';
        const formB = forms.find((f) => isSubmissionForForm(b, f))?.title || '';
        comparison = formA.localeCompare(formB);
      } else if (sortColumn === 'notes') {
        const noteA = (a.admin_notes || a.submission_data?._admin_notes || '').trim().toLowerCase();
        const noteB = (b.admin_notes || b.submission_data?._admin_notes || '').trim().toLowerCase();
        if (!noteA && !noteB) comparison = 0;
        else if (!noteA) comparison = 1;
        else if (!noteB) comparison = -1;
        else comparison = noteA.localeCompare(noteB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredSubmissions, sortColumn, sortDirection, forms]);

  const handleToggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'date' ? 'desc' : 'asc');
    }
  };

  const handleSaveNote = async (submissionId: string, customText?: string) => {
    const textToSave = customText !== undefined ? customText : (editingNotes[submissionId] ?? '');
    setSavingNoteId(submissionId);
    try {
      await StorageService.updateSubmissionNotes(submissionId, textToSave);
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({
          ...selectedSubmission,
          admin_notes: textToSave,
          submission_data: { ...(selectedSubmission.submission_data || {}), _admin_notes: textToSave },
        });
      }
      // Also update local list in place so changes are immediately visible
      const updateSub = (sub: Submission) =>
        sub.id === submissionId
          ? {
              ...sub,
              admin_notes: textToSave,
              submission_data: { ...(sub.submission_data || {}), _admin_notes: textToSave },
            }
          : sub;
      if (allSubmissions) {
        const idx = allSubmissions.findIndex((s) => s.id === submissionId);
        if (idx >= 0) allSubmissions[idx] = updateSub(allSubmissions[idx]);
      }
      if (initialSubmissions) {
        const idx = initialSubmissions.findIndex((s) => s.id === submissionId);
        if (idx >= 0) initialSubmissions[idx] = updateSub(initialSubmissions[idx]);
      }
      success('Note Saved', 'Administrative remark updated.');
    } catch {
      error('Failed', 'Could not save administrative remark.');
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleSaveInlineNote = async (submissionId: string) => {
    await handleSaveNote(submissionId, inlineNoteValue);
    setInlineNoteEditingId(null);
  };

  // Fields to use for column headers / questions
  const activeFields = useMemo(() => {
    if (currentFilteredForm && currentFilteredForm.fields) {
      return currentFilteredForm.fields;
    }
    // If 'all', combine unique fields across all forms
    const map = new Map<string, FormField>();
    for (const f of forms) {
      for (const field of f.fields || []) {
        if (!map.has(field.field_key)) {
          map.set(field.field_key, field);
        }
      }
    }
    return Array.from(map.values());
  }, [currentFilteredForm, forms]);

  const fieldsMap = useMemo(() => new Map(activeFields.map((f) => [f.field_key, f])), [activeFields]);

  // Handle event dropdown switch
  const handleEventFilterChange = (eventId: string) => {
    setSelectedEventId(eventId);
    if (onSelectForm && eventId !== 'all' && eventId !== 'overview') {
      onSelectForm(eventId);
    }
  };

  // Status Updater
  const handleUpdateStatus = async (
    submissionId: string,
    newStatus: 'confirmed' | 'pending' | 'cancelled'
  ) => {
    setStatusUpdatingId(submissionId);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(submissionId, newStatus);
      } else {
        await StorageService.updateSubmissionStatus(submissionId, newStatus);
      }
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
      success('Status Updated', `Player status changed to ${newStatus.toUpperCase()}`);
    } catch {
      error('Update Failed', 'Could not update player status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Export to CSV function (Without internal Submission ID, with photo URLs and admin remarks)
  const handleExportCSV = () => {
    if (sortedSubmissions.length === 0) {
      error('No Submissions', 'There are no responses to export for the current filter.');
      return;
    }

    const dataFields = activeFields.filter(
      (f) => !['section_heading', 'info_text'].includes(f.field_type)
    );

    const headers = [
      'Event Name',
      'Submitted At',
      'Status',
      'Player / Applicant Name',
      'Email Address',
      'Phone / WhatsApp',
      ...dataFields.map((f) => f.label.replace(/"/g, '""')),
      'Admin Notes / Remarks',
    ];

    const rows = sortedSubmissions.map((sub) => {
      const matchedForm = forms.find((f) => isSubmissionForForm(sub, f));
      const eventTitle = matchedForm?.title || currentFilteredForm?.title || 'Event Registration';
      const phone =
        sub.submission_data?.whatsapp_number ||
        sub.submission_data?.phone_number ||
        sub.submission_data?.phone ||
        '';
      const adminNote = sub.admin_notes || (sub.submission_data?._admin_notes as string) || '';

      const row = [
        `"${eventTitle.replace(/"/g, '""')}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`,
        `"${sub.status}"`,
        `"${(sub.applicant_name || '').replace(/"/g, '""')}"`,
        `"${(sub.applicant_email || '').replace(/"/g, '""')}"`,
        `"${String(phone).replace(/"/g, '""')}"`,
        ...dataFields.map((f) => {
          let val = sub.submission_data ? sub.submission_data[f.field_key] : undefined;

          // If photo or file upload field, extract actual URL rather than generic "Photo"
          if (f.field_type === 'photo_upload' || f.field_type === 'file_upload') {
            if (!val || val === 'Photo' || val === '[object Object]') {
              const photoUrl = getPlayerPhoto(sub);
              if (photoUrl) val = photoUrl;
            }
          }

          if (val === undefined || val === null) return '""';

          // Support multiple photos or files in an array
          if (Array.isArray(val)) {
            const urls = val
              .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') return item.url || item.path || JSON.stringify(item);
                return String(item);
              })
              // Protect against leaking internal filesystem paths
              .filter((u) => !u.startsWith('file://') && !u.startsWith('/Users/'));
            return `"${urls.join(' ; ').replace(/"/g, '""')}"`;
          }

          // Support object with url property
          if (typeof val === 'object') {
            if (val.url && typeof val.url === 'string') {
              return `"${val.url.replace(/"/g, '""')}"`;
            }
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }

          const strVal = String(val);
          // Protect against leaking local paths
          if (strVal.startsWith('file://') || strVal.startsWith('/Users/')) {
            return '""';
          }

          return `"${strVal.replace(/"/g, '""')}"`;
        }),
        `"${adminNote.replace(/"/g, '""')}"`,
      ];
      return row.join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filenamePrefix = currentFilteredForm ? currentFilteredForm.slug : 'all-events';
    link.setAttribute(
      'download',
      `${filenamePrefix}-responses-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('CSV Exported', `Downloaded ${filteredSubmissions.length} player responses.`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this response? This cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteSubmission(id);
      success('Deleted', 'Response removed.');
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch {
      error('Error', 'Could not delete response.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to extract clean photo URL from submission data
  const getPlayerPhoto = (sub: Submission): string | null => {
    const data = sub.submission_data || {};
    if (data.passport_photo && typeof data.passport_photo === 'string') return data.passport_photo;
    if (data.photo && typeof data.photo === 'string') return data.photo;
    if (data.profile_photo && typeof data.profile_photo === 'string') return data.profile_photo;
    if (data.avatar && typeof data.avatar === 'string') return data.avatar;
    for (const val of Object.values(data)) {
      if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
        return val;
      }
    }
    return null;
  };

  // Helper to extract phone / whatsapp
  const getPlayerPhone = (sub: Submission): string => {
    const data = sub.submission_data || {};
    return (
      data.whatsapp_number ||
      data.phone_number ||
      data.phone ||
      data.mobile ||
      ''
    );
  };

  if (selectedEventId === 'overview') {
    const totalSubmissions = allSubmissions.length || initialSubmissions.length;
    const eventsWithSubs = formsStats.filter((s) => s.count > 0).length;
    const eventsZeroSubs = formsStats.filter((s) => s.count === 0).length;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Header Card for Event Directory */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToForms}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                ← Back to All Forms
              </button>
              <span className="text-slate-300">•</span>
              <Badge variant="info" size="sm">
                RESPONSES HUB
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              Event Registrations & Responses
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select an event below to manage participants, review submissions, and export player lists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Desktop Notification Toggle (Task 27) */}
            <button
              type="button"
              onClick={async () => {
                const res = await toggleDesktopNotifications();
                setDesktopNotifEnabled(res.enabled);
                if (res.enabled) {
                  success('Desktop Alerts Active', res.message);
                } else {
                  error('Desktop Alerts Off', res.message);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                desktopNotifEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Desktop notification alerts for incoming submissions"
            >
              <BellRing className={`w-3.5 h-3.5 ${desktopNotifEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Desktop Alerts: {desktopNotifEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* View All Combined Responses */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEventId('all')}
              leftIcon={<Globe className="w-4 h-4 text-indigo-600" />}
              className="shadow-2xs font-bold"
            >
              View All Responses Combined ({totalSubmissions})
            </Button>
          </div>
        </div>

        {/* Live Submission Alert Banner (Task 26) */}
        {newlyArrivedSubmission && (
          <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold">New Registration: </span>
                <span>
                  <strong>{newlyArrivedSubmission.applicantName}</strong> registered for "
                  {newlyArrivedSubmission.formTitle}" at {newlyArrivedSubmission.time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId(newlyArrivedSubmission.formId);
                  onSelectForm?.(newlyArrivedSubmission.formId);
                  setNewlyArrivedSubmission(null);
                }}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer inline-flex items-center gap-1"
              >
                <span>Open Responses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setNewlyArrivedSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Events
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{forms.length}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Configured forms</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
              Total Submissions
            </span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{totalSubmissions}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">All verified submissions</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              Active Events
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{eventsWithSubs}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">With ≥ 1 registration</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
              Ready for Entries
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{eventsZeroSubs}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">0 submissions recorded</span>
          </div>
        </div>

        {/* Search Bar for Events */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event by name or slug..."
              value={eventSearchTerm}
              onChange={(e) => setEventSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-400 outline-none transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing {filteredEventStats.length} of {forms.length} events
          </span>
        </div>

        {/* Grid of Event Cards (Task 26) */}
        {filteredEventStats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No events matched your search</h3>
            <p className="text-xs text-slate-400">Try clearing the search filter above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEventStats.map(({ form: f, count, latestTimestamp }) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <Badge
                      variant={f.status === 'published' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {(f.status || 'DRAFT').toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      v{f.published_version || 1}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {f.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono mt-1 truncate">
                    /e/{f.slug}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Users className={`w-4 h-4 ${count > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="font-extrabold text-slate-900">{count}</span>
                      <span className="text-slate-500 font-medium">
                        {count === 1 ? 'submission' : 'submissions'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {latestTimestamp
                          ? new Date(latestTimestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'No submissions'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100/80 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 font-bold shadow-xs justify-center"
                    onClick={() => {
                      setSelectedEventId(f.id);
                      onSelectForm?.(f.id);
                    }}
                  >
                    Open Responses ({count}) →
                  </Button>

                  <a
                    href={`#/e/${f.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                    title="Open live public registration page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Informational Callout regarding Desktop and Push Notifications (Task 27) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 flex items-start gap-3">
          <Bell className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800">
              Desktop Notifications Architecture & Session Behavior
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standard browser desktop notifications fire automatically whenever a new registration is submitted while your browser window or tab is active.
              When the browser is completely closed, background operating system notifications require a Web Push service worker integrated with a push notification server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedEventId('overview')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer inline-flex items-center gap-1"
            >
              <span>← Back to Events Directory</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={onBackToForms}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Forms List
            </button>
            <span className="text-slate-300">•</span>
            <Badge
              variant={
                currentFilteredForm?.status === 'published' ? 'success' : 'neutral'
              }
              size="sm"
            >
              {selectedEventId === 'all'
                ? 'ALL EVENTS'
                : (currentFilteredForm?.status || 'ACTIVE').toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {selectedEventId === 'all'
              ? 'All Event Registrations & Players'
              : currentFilteredForm?.title || form?.title || 'Event Responses'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Total {poolSubmissions.length} participant{poolSubmissions.length === 1 ? '' : 's'} registered • Live sync with real database submissions
          </p>
        </div>

        {/* Action Controls in Top Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Event Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Event:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => handleEventFilterChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="overview">📁 Events Directory (Overview)</option>
              <option value="all">
                🌐 All Events Combined ({allSubmissions.length || initialSubmissions.length})
              </option>
              <option disabled>──────────</option>
              {forms.map((f) => {
                const count = (allSubmissions || initialSubmissions).filter((s) =>
                  isSubmissionForForm(s, f)
                ).length;
                return (
                  <option key={f.id} value={f.id}>
                    {f.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Prominent Export CSV Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4 text-white" />}
            className="shadow-sm"
          >
            Export CSV ({filteredSubmissions.length})
          </Button>
        </div>
      </div>

      {/* Live Submission Alert Banner (Task 26) */}
      {newlyArrivedSubmission && (
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-indigo-950">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold">New Registration: </span>
              <span>
                <strong>{newlyArrivedSubmission.applicantName}</strong> registered for "
                {newlyArrivedSubmission.formTitle}" at {newlyArrivedSubmission.time}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedEventId !== newlyArrivedSubmission.formId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId(newlyArrivedSubmission.formId);
                  onSelectForm?.(newlyArrivedSubmission.formId);
                  setNewlyArrivedSubmission(null);
                }}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer inline-flex items-center gap-1"
              >
                <span>Switch to {newlyArrivedSubmission.formTitle}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setNewlyArrivedSubmission(null)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Switcher: Table View vs Analytics View */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Player List & Table</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-200/70 text-slate-700 rounded-md text-[10px]">
              {filteredSubmissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'analytics'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Event Analytics & Percentages</span>
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold">
              % Breakdown
            </span>
          </button>
        </div>

        {viewMode === 'table' && (
          <div className="flex flex-wrap items-center gap-2.5 px-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search players, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">All ({poolSubmissions.length})</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Sort Controls (A-Z, Z-A, Date, Status, Notes) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={`${sortColumn}_${sortDirection}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('_');
                  setSortColumn(col as any);
                  setSortDirection(dir as any);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Participant Name (A → Z)</option>
                <option value="name_desc">Participant Name (Z → A)</option>
                <option value="email_asc">Email (A → Z)</option>
                <option value="email_desc">Email (Z → A)</option>
                <option value="status_asc">Status (A → Z)</option>
                <option value="notes_asc">Admin Notes (A → Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: REGISTRANTS TABLE */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="p-14 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No matching submissions</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try clearing your search query or status filter.'
                  : 'No registrations submitted yet. Share your event link to start collecting participants.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider select-none">
                  <tr>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleToggleSort('name')}
                      title="Sort by Participant Name"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Player / Participant</span>
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleToggleSort('email')}
                      title="Sort by Contact"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Contact</span>
                        {sortColumn === 'email' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {selectedEventId === 'all' && (
                      <th
                        className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleToggleSort('event')}
                        title="Sort by Event"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Event</span>
                          {sortColumn === 'event' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                    )}

                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleToggleSort('status')}
                      title="Sort by Status"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortColumn === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleToggleSort('date')}
                      title="Sort by Submission Date"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Submission Date</span>
                        {sortColumn === 'date' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleToggleSort('notes')}
                      title="Sort by Admin Notes"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Admin Notes / Remarks</span>
                        {sortColumn === 'notes' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th className="py-3.5 px-4">Key Details</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSubmissions.map((sub) => {
                    const data = sub.submission_data || {};
                    const photo = getPlayerPhoto(sub);
                    const phone = getPlayerPhone(sub);
                    const matchedForm = forms.find((f) => isSubmissionForForm(sub, f));
                    const currentNote = sub.admin_notes || (sub.submission_data?._admin_notes as string) || '';

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        {/* Player Column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {photo ? (
                              <img
                                src={photo}
                                alt={sub.applicant_name || 'Player'}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {(sub.applicant_name || 'P').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {sub.applicant_name || 'Participant'}
                              </p>
                              {data.player_category && (
                                <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded mt-0.5">
                                  {data.player_category}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Column */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {sub.applicant_email && (
                              <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                                {sub.applicant_email}
                              </div>
                            )}
                            {phone && (
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Event Column (if All Events) */}
                        {selectedEventId === 'all' && (
                          <td className="py-3.5 px-4 max-w-[160px]">
                            <span className="text-[11px] font-medium text-slate-700 truncate block">
                              {matchedForm?.title || 'Event Form'}
                            </span>
                          </td>
                        )}

                        {/* Status Column with quick toggle */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <Badge
                              variant={
                                sub.status === 'confirmed'
                                  ? 'success'
                                  : sub.status === 'pending'
                                  ? 'warning'
                                  : 'danger'
                              }
                              size="sm"
                              dot
                            >
                              {sub.status.toUpperCase()}
                            </Badge>
                          </div>
                        </td>

                        {/* Date Column */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Admin Notes Column with inline edit */}
                        <td className="py-3.5 px-4 max-w-[180px]" onClick={(e) => e.stopPropagation()}>
                          {inlineNoteEditingId === sub.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={inlineNoteValue}
                                onChange={(e) => setInlineNoteValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineNote(sub.id);
                                  if (e.key === 'Escape') setInlineNoteEditingId(null);
                                }}
                                className="w-full text-xs px-2 py-1 border border-indigo-400 rounded-lg bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineNote(sub.id)}
                                className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                title="Save note"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineNoteEditingId(null)}
                                className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setInlineNoteEditingId(sub.id);
                                setInlineNoteValue(currentNote);
                              }}
                              className="cursor-pointer group/note flex items-center justify-between gap-1 p-1 -m-1 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Click to edit admin remarks"
                            >
                              <span
                                className={`text-[11px] truncate block ${
                                  currentNote
                                    ? 'text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70'
                                    : 'text-slate-400 italic'
                                }`}
                              >
                                {currentNote || '+ Add remarks'}
                              </span>
                              <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* Key Details Snippet */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="truncate text-slate-600 font-mono text-[11px]">
                            {data.jersey_number !== undefined && (
                              <span className="mr-2 text-indigo-600 font-bold">
                                #{data.jersey_number} (Size: {data.jersey_size || 'Std'})
                              </span>
                            )}
                            {Object.entries(data)
                              .filter(
                                ([k, v]) =>
                                  !['full_name', 'name', 'email', 'passport_photo', 'photo', 'whatsapp_number', 'phone_number'].includes(k) &&
                                  typeof v !== 'object'
                              )
                              .slice(0, 2)
                              .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                              .join(' • ') || 'Registration verified'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Full Player Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              disabled={deletingId === sub.id}
                              onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Response"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: ADVANCED MULTI-CHART ANALYTICS & DATA VISUALIZATIONS */}
      {/* ========================================================================= */}
      {viewMode === 'analytics' && (
        <AnalyticsCharts
          submissions={poolSubmissions}
          activeFields={activeFields}
          form={currentFilteredForm || form}
        />
      )}

      {/* ========================================================================= */}
      {/* PROPER PLAYER PROFILE VIEW MODAL */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <Modal
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
          title="Participant Registration Details"
          description={(() => {
            const submissionForm =
              forms.find((f) => isSubmissionForForm(selectedSubmission, f)) ||
              currentFilteredForm ||
              form;
            return `Form: ${submissionForm?.title || 'Event Registration'} • Registered on ${new Date(
              selectedSubmission.submitted_at
            ).toLocaleString()} • Ref ID: ${selectedSubmission.id}`;
          })()}
          maxWidth="2xl"
          height="tall"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedSubmission.id)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Response
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print Profile
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          {(() => {
            const submissionForm =
              forms.find((f) => isSubmissionForForm(selectedSubmission, f)) ||
              currentFilteredForm ||
              form;

            const formFields = (submissionForm?.fields || []).filter(
              (f) => !['section_heading', 'info_text'].includes(f.field_type)
            );

            const photo = getPlayerPhoto(selectedSubmission);
            const phone = getPlayerPhone(selectedSubmission);
            const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';

            return (
              <div className="space-y-6">
                {/* 1. HERO PARTICIPANT HEADER */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Photo / Avatar */}
                  <div className="relative shrink-0">
                    {photo ? (
                      <div className="relative group">
                        <img
                          src={photo}
                          alt={selectedSubmission.applicant_name || 'Participant'}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
                        />
                        <a
                          href={photo}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity"
                        >
                          View Full
                        </a>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-white/20 shadow-lg">
                        {(selectedSubmission.applicant_name || 'P').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Participant Info Headline */}
                  <div className="flex-1 text-center sm:text-left min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {submissionForm && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          {submissionForm.title}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {selectedSubmission.applicant_name || 'Participant Name'}
                    </h2>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300">
                      {selectedSubmission.applicant_email && (
                        <a
                          href={`mailto:${selectedSubmission.applicant_email}`}
                          className="hover:text-white underline underline-offset-2"
                        >
                          {selectedSubmission.applicant_email}
                        </a>
                      )}
                      {phone && <span>• {phone}</span>}
                    </div>

                    {/* Quick Action Chips: WhatsApp & Call - ONLY IF phone was provided in form */}
                    {cleanPhone && (
                      <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat on WhatsApp</span>
                        </a>
                        <a
                          href={`tel:${cleanPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 1-Click Status Switcher */}
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center space-y-1.5 shrink-0 w-full sm:w-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                      Status
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      {(['confirmed', 'pending', 'cancelled'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={statusUpdatingId === selectedSubmission.id}
                          onClick={() => handleUpdateStatus(selectedSubmission.id, st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                            selectedSubmission.status === st
                              ? st === 'confirmed'
                                ? 'bg-emerald-500 text-white shadow'
                                : st === 'pending'
                                ? 'bg-amber-500 text-white shadow'
                                : 'bg-rose-500 text-white shadow'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. ADMIN NOTES & REMARKS (Admin-only, internal record) */}
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Admin Notes & Internal Remarks</span>
                    </div>
                    <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-medium border border-amber-200/50">
                      Internal Only • Never visible to respondents
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Add internal verification notes, registration remarks, payment status, team assignment..."
                    value={
                      editingNotes[selectedSubmission.id] !== undefined
                        ? editingNotes[selectedSubmission.id]
                        : selectedSubmission.admin_notes || (selectedSubmission.submission_data?._admin_notes as string) || ''
                    }
                    onChange={(e) =>
                      setEditingNotes((prev) => ({
                        ...prev,
                        [selectedSubmission.id]: e.target.value,
                      }))
                    }
                    className="w-full text-xs p-3 rounded-xl border border-amber-300/80 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-700/80">
                      {selectedSubmission.admin_notes || selectedSubmission.submission_data?._admin_notes
                        ? 'Remark recorded'
                        : 'No remarks recorded yet'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSaveNote(selectedSubmission.id)}
                      isLoading={savingNoteId === selectedSubmission.id}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    >
                      Save Remarks
                    </Button>
                  </div>
                </div>

                {/* 3. FORM QUESTIONS & ANSWERS (Strictly based on what is in this Form) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>Form Responses & Answers</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      {formFields.length} {formFields.length === 1 ? 'question' : 'questions'}
                    </span>
                  </div>

                  {formFields.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-slate-400 text-xs">
                      No configured questions found for this form.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formFields.map((field) => {
                        const val = selectedSubmission.submission_data
                          ? selectedSubmission.submission_data[field.field_key]
                          : undefined;

                        const isAnswered =
                          val !== undefined &&
                          val !== null &&
                          val !== '' &&
                          !(Array.isArray(val) && val.length === 0);

                        // Photo / Image upload
                        if (
                          isAnswered &&
                          typeof val === 'string' &&
                          (val.startsWith('http') || val.startsWith('data:image'))
                        ) {
                          return (
                            <div
                              key={field.id || field.field_key}
                              className="sm:col-span-2 p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2"
                            >
                              <span className="text-xs font-bold text-slate-700 block">{field.label}</span>
                              <div className="flex items-center gap-3">
                                <img
                                  src={val}
                                  alt={field.label}
                                  className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-2xs"
                                />
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open Attachment</span>
                                </a>
                              </div>
                            </div>
                          );
                        }

                        // File object upload
                        if (isAnswered && typeof val === 'object' && val !== null && (val as any).name) {
                          return (
                            <div
                              key={field.id || field.field_key}
                              className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">{field.label}</span>
                                <span className="text-slate-500 mt-0.5 block">
                                  {(val as any).name} ({(val as any).size})
                                </span>
                              </div>
                              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                            </div>
                          );
                        }

                        // Array / Multi-select
                        if (isAnswered && Array.isArray(val)) {
                          return (
                            <div
                              key={field.id || field.field_key}
                              className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5"
                            >
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                                {field.label}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {val.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-lg font-bold"
                                  >
                                    {String(item)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // Boolean / Yes-No
                        if (isAnswered && typeof val === 'boolean') {
                          return (
                            <div
                              key={field.id || field.field_key}
                              className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-700">{field.label}</span>
                              <span
                                className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                                  val ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {val ? 'Yes' : 'No'}
                              </span>
                            </div>
                          );
                        }

                        // Standard text / number / dropdown / date / rating
                        return (
                          <div
                            key={field.id || field.field_key}
                            className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1"
                          >
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                              {field.label}
                            </span>
                            {isAnswered ? (
                              <span className="text-xs font-bold text-slate-900 block whitespace-pre-wrap">
                                {String(val)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic block">
                                Not provided
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Any extra submitted data not in form fields */}
                  {(() => {
                    const knownKeys = new Set(formFields.map((f) => f.field_key));
                    const extraEntries = Object.entries(selectedSubmission.submission_data || {}).filter(
                      ([k, v]) =>
                        !knownKeys.has(k) &&
                        !['applicant_name', 'applicant_email', 'applicant_phone'].includes(k) &&
                        v !== undefined &&
                        v !== null &&
                        v !== ''
                    );

                    if (extraEntries.length === 0) return null;

                    return (
                      <div className="pt-3 space-y-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Additional Submitted Values
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {extraEntries.map(([k, v]) => (
                            <div key={k} className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
