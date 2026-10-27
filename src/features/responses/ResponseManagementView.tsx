import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';
import { useToast } from '../../generic-ui/ToastContext';
import { isSubmissionForForm, StorageService } from '../../services/storage';

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
  // Event Filter: 'all' or specific form.id
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedFormId || form?.id || 'all'
  );

  // Tab View: Table vs Analytics
  const [viewMode, setViewMode] = useState<'table' | 'analytics'>('table');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const { success, error } = useToast();

  // Active form object if filtered to a specific event
  const currentFilteredForm = useMemo(() => {
    if (selectedEventId === 'all') return null;
    return forms.find((f) => f.id === selectedEventId) || form || null;
  }, [selectedEventId, forms, form]);

  // Pool of submissions based on selected event filter
  const poolSubmissions = useMemo(() => {
    const list = allSubmissions.length > 0 ? allSubmissions : initialSubmissions;
    if (selectedEventId === 'all') {
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
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        applicant.includes(query) ||
        email.includes(query) ||
        dataString.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [poolSubmissions, statusFilter, searchTerm]);

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
    if (onSelectForm && eventId !== 'all') {
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

  // Export to CSV function
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      error('No Submissions', 'There are no responses to export for the current filter.');
      return;
    }

    const dataFields = activeFields.filter(
      (f) => !['section_heading', 'info_text'].includes(f.field_type)
    );

    const headers = [
      'Submission ID',
      'Event Name',
      'Submitted At',
      'Status',
      'Player / Applicant Name',
      'Email Address',
      'Phone / WhatsApp',
      ...dataFields.map((f) => f.label.replace(/"/g, '""')),
    ];

    const rows = filteredSubmissions.map((sub) => {
      const matchedForm = forms.find((f) => isSubmissionForForm(sub, f));
      const eventTitle = matchedForm?.title || currentFilteredForm?.title || 'Event Registration';
      const phone =
        sub.submission_data?.whatsapp_number ||
        sub.submission_data?.phone_number ||
        sub.submission_data?.phone ||
        '';

      const row = [
        `"${sub.id}"`,
        `"${eventTitle.replace(/"/g, '""')}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`,
        `"${sub.status}"`,
        `"${(sub.applicant_name || '').replace(/"/g, '""')}"`,
        `"${(sub.applicant_email || '').replace(/"/g, '""')}"`,
        `"${String(phone).replace(/"/g, '""')}"`,
        ...dataFields.map((f) => {
          const val = sub.submission_data ? sub.submission_data[f.field_key] : undefined;
          if (val === undefined || val === null) return '""';
          if (typeof val === 'object') {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
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

  // Compute analytics statistics
  const analyticsData = useMemo(() => {
    const total = poolSubmissions.length;
    if (total === 0) {
      return {
        total: 0,
        confirmed: 0,
        confirmedPct: 0,
        pending: 0,
        pendingPct: 0,
        cancelled: 0,
        cancelledPct: 0,
        fieldStats: [],
      };
    }

    const confirmed = poolSubmissions.filter((s) => s.status === 'confirmed').length;
    const pending = poolSubmissions.filter((s) => s.status === 'pending').length;
    const cancelled = poolSubmissions.filter((s) => s.status === 'cancelled').length;

    // Analyze categorical fields
    const targetFields = activeFields.filter((f) =>
      ['radio', 'select', 'yes_no', 'checkbox'].includes(f.field_type) ||
      ['player_category', 'batting_style', 'bowling_style', 'jersey_size', 'is_participating', 'need_jersey'].includes(f.field_key)
    );

    const fieldStats = targetFields.map((field) => {
      const counts: Record<string, number> = {};
      let answeredCount = 0;

      for (const sub of poolSubmissions) {
        const val = sub.submission_data ? sub.submission_data[field.field_key] : undefined;
        if (val !== undefined && val !== null && val !== '') {
          answeredCount++;
          if (Array.isArray(val)) {
            for (const item of val) {
              const str = String(item).trim();
              counts[str] = (counts[str] || 0) + 1;
            }
          } else if (typeof val === 'boolean') {
            const str = val ? 'Yes' : 'No';
            counts[str] = (counts[str] || 0) + 1;
          } else {
            const str = String(val).trim();
            counts[str] = (counts[str] || 0) + 1;
          }
        }
      }

      const breakdown = Object.entries(counts)
        .map(([option, count]) => ({
          option,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        fieldKey: field.field_key,
        label: field.label,
        type: field.field_type,
        answeredCount,
        breakdown,
      };
    }).filter((stat) => stat.breakdown.length > 0);

    return {
      total,
      confirmed,
      confirmedPct: Math.round((confirmed / total) * 100),
      pending,
      pendingPct: Math.round((pending / total) * 100),
      cancelled,
      cancelledPct: Math.round((cancelled / total) * 100),
      fieldStats,
    };
  }, [poolSubmissions, activeFields]);

  const colorPalette = [
    'from-indigo-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-500',
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
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
              <option value="all">
                All Events ({allSubmissions.length || initialSubmissions.length})
              </option>
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

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh DB
            </Button>
          )}

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
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
              >
                <option value="all">All ({poolSubmissions.length})</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
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
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Player / Participant</th>
                    <th className="py-3.5 px-4">Contact</th>
                    {selectedEventId === 'all' && (
                      <th className="py-3.5 px-4">Event</th>
                    )}
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submission Date</th>
                    <th className="py-3.5 px-4">Key Details</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => {
                    const data = sub.submission_data || {};
                    const photo = getPlayerPhoto(sub);
                    const phone = getPlayerPhone(sub);
                    const matchedForm = forms.find((f) => isSubmissionForForm(sub, f));

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
                              className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="View Full Player Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              disabled={deletingId === sub.id}
                              onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
      {/* VIEW MODE 2: ANALYTICS & BREAKDOWN VIEW (%) */}
      {/* ========================================================================= */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Registrants</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {analyticsData.total}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">100% of event entries</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-3xl font-black text-emerald-700 mt-2 tracking-tight">
                {analyticsData.confirmedPct}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {analyticsData.confirmed} confirmed players
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-3xl font-black text-amber-700 mt-2 tracking-tight">
                {analyticsData.pendingPct}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {analyticsData.pending} awaiting verification
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-3xl font-black text-rose-700 mt-2 tracking-tight">
                {analyticsData.cancelledPct}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {analyticsData.cancelled} withdrawn / cancelled
              </p>
            </div>
          </div>

          {/* Question-by-Question Breakdown Grid */}
          {analyticsData.fieldStats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-2">
              <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">No question breakdown available</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once participants submit responses with options (player roles, jersey sizes, questions), detailed percentages will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyticsData.fieldStats.map((stat, i) => (
                <div
                  key={stat.fieldKey}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                        {stat.fieldKey.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                        {stat.label}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold shrink-0">
                      {stat.answeredCount} answered
                    </span>
                  </div>

                  {/* Percentage Progress Bars */}
                  <div className="space-y-3">
                    {stat.breakdown.map((item, idx) => {
                      const color = colorPalette[idx % colorPalette.length];
                      return (
                        <div key={item.option} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700 truncate max-w-[200px]">
                              {item.option}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-normal">
                                {item.count} resp
                              </span>
                              <span className="text-slate-900 font-bold w-10 text-right">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>
                          {/* Progress bar track */}
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
                              style={{ width: `${Math.max(item.percentage, 3)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROPER PLAYER PROFILE VIEW MODAL */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <Modal
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
          title="Player & Registrant Profile"
          description={`Registered on ${new Date(
            selectedSubmission.submitted_at
          ).toLocaleString()} • Ref ID: ${selectedSubmission.id}`}
          maxWidth="2xl"
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
          <div className="space-y-6">
            {/* 1. HERO PLAYER HEADER */}
            {(() => {
              const photo = getPlayerPhoto(selectedSubmission);
              const phone = getPlayerPhone(selectedSubmission);
              const cleanPhone = phone.replace(/[^0-9]/g, '');

              return (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Photo / Avatar */}
                  <div className="relative shrink-0">
                    {photo ? (
                      <div className="relative group">
                        <img
                          src={photo}
                          alt={selectedSubmission.applicant_name || 'Player'}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
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
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-white/20 shadow-lg">
                        {(selectedSubmission.applicant_name || 'P').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Player Info Headline */}
                  <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                        {selectedSubmission.submission_data?.player_category || 'Player'}
                      </span>
                      {selectedSubmission.submission_data?.jersey_number !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30">
                          Jersey #{selectedSubmission.submission_data.jersey_number}
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
                      {phone && (
                        <span>• {phone}</span>
                      )}
                    </div>

                    {/* Quick Action Chips: WhatsApp & Call */}
                    <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat on WhatsApp</span>
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Player</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Status Switcher */}
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center space-y-1.5 shrink-0 w-full sm:w-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                      Player Status
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      {(['confirmed', 'pending', 'cancelled'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={statusUpdatingId === selectedSubmission.id}
                          onClick={() => handleUpdateStatus(selectedSubmission.id, st)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
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
              );
            })()}

            {/* 2. PLAYER ATTRIBUTES SUMMARY CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Role</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {selectedSubmission.submission_data?.player_category || 'Participant'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Jersey Size</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {selectedSubmission.submission_data?.jersey_size || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Jersey No</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {selectedSubmission.submission_data?.jersey_number !== undefined
                    ? `#${selectedSubmission.submission_data.jersey_number}`
                    : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Jersey Name</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {selectedSubmission.submission_data?.jersey_print_name || 'Standard'}
                </span>
              </div>
            </div>

            {/* 3. STRUCTURED SUBMISSION ANSWERS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Submitted Registration Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(selectedSubmission.submission_data || {}).map(([key, val]) => {
                  const matchedField = fieldsMap.get(key);
                  const label = matchedField?.label || key.replace(/_/g, ' ');

                  // Photos / Images
                  if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
                    return (
                      <div
                        key={key}
                        className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-xl space-y-2"
                      >
                        <span className="text-xs font-bold text-slate-700 block">{label}</span>
                        <div className="flex items-center gap-3">
                          <img
                            src={val}
                            alt="Applicant attachment"
                            className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-2xs"
                          />
                          <a
                            href={val}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open High Resolution
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // File upload object
                  if (typeof val === 'object' && val !== null && (val as any).name) {
                    return (
                      <div
                        key={key}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-700 block">{label}</span>
                          <span className="text-slate-500 mt-0.5 block">
                            {(val as any).name} ({(val as any).size})
                          </span>
                        </div>
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                    );
                  }

                  // Array (e.g. checkbox options)
                  if (Array.isArray(val)) {
                    return (
                      <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl">
                        <span className="text-xs font-semibold text-slate-500 block mb-1">
                          {label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {val.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold"
                            >
                              {String(item)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Boolean
                  if (typeof val === 'boolean') {
                    return (
                      <div
                        key={key}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-600">{label}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                            val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </span>
                      </div>
                    );
                  }

                  // Text / Number / Date
                  return (
                    <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
                        {label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block whitespace-pre-wrap">
                        {String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
