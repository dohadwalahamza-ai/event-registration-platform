import React, { useState, useEffect, useMemo } from 'react';
import { Form, Submission, FormField } from '../../types';
import { StorageService, isSubmissionForForm } from '../../services/storage';
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Share2,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Link,
  Copy,
  Check,
  Eye,
  X,
  Phone,
  Mail,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';

interface PublicLiveSpreadsheetViewProps {
  form: Form;
  initialSubmissions?: Submission[];
}

export const PublicLiveSpreadsheetView: React.FC<PublicLiveSpreadsheetViewProps> = ({
  form,
  initialSubmissions = [],
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [isLoading, setIsLoading] = useState(initialSubmissions.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<'sheet' | 'csv' | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [sortColumn, setSortColumn] = useState<'date' | 'name' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'table' | 'cards'>('table');

  const fields = form.fields || [];
  const dataFields = useMemo(
    () => fields.filter((f) => !['section_heading', 'info_text'].includes(f.field_type)),
    [fields]
  );

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://event.khargharjamaat.org';
  const cleanSlug = (form.slug || form.id).trim();
  const publicRegistrationUrl = `${baseUrl}/e/${cleanSlug}`;
  const publicSheetUrl = `${baseUrl}/sheet/${cleanSlug}`;
  const cloudCsvUrl = `${baseUrl}/api/csv?slug=${cleanSlug}`;

  // Fetch submissions for this form
  const loadSubmissions = async () => {
    try {
      const all = await StorageService.getAllSubmissions();
      const formSubs = all.filter((s) => isSubmissionForForm(s, form));
      setSubmissions(formSubs);
    } catch (err) {
      console.warn('Failed to load submissions for live sheet:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();

    // Subscribe to Supabase Realtime channel for live submissions
    const unsubscribe = StorageService.subscribeToSubmissions(
      (newSub) => {
        if (isSubmissionForForm(newSub, form)) {
          setSubmissions((prev) => {
            if (prev.some((s) => s.id === newSub.id)) return prev;
            return [newSub, ...prev];
          });
          // Highlight newly arrived row
          setNewlyArrivedIds((prev) => new Set([...prev, newSub.id]));
          setTimeout(() => {
            setNewlyArrivedIds((prev) => {
              const next = new Set(prev);
              next.delete(newSub.id);
              return next;
            });
          }, 5000);
        }
      },
      (updatedSub) => {
        if (isSubmissionForForm(updatedSub, form)) {
          setSubmissions((prev) =>
            prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
          );
        }
      },
      (deletedId) => {
        setSubmissions((prev) => prev.filter((s) => s.id !== deletedId));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [form]);

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();

      const nameMatch = (sub.applicant_name || '').toLowerCase().includes(q);
      const emailMatch = (sub.applicant_email || '').toLowerCase().includes(q);
      const dataString = JSON.stringify(sub.submission_data || {}).toLowerCase();
      const dataMatch = dataString.includes(q);

      return nameMatch || emailMatch || dataMatch;
    });
  }, [submissions, statusFilter, searchTerm]);

  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      if (sortColumn === 'date') {
        const diff = new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        return sortDirection === 'desc' ? diff : -diff;
      }
      if (sortColumn === 'name') {
        const valA = (a.applicant_name || '').toLowerCase();
        const valB = (b.applicant_name || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortColumn === 'status') {
        const valA = a.status || '';
        const valB = b.status || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [filteredSubmissions, sortColumn, sortDirection]);

  const handleSort = (col: 'date' | 'name' | 'status') => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'date' ? 'desc' : 'asc');
    }
  };

  const handleCopy = (type: 'sheet' | 'csv') => {
    const textToCopy = type === 'sheet' ? publicSheetUrl : cloudCsvUrl;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleExportCsv = () => {
    if (sortedSubmissions.length === 0) return;

    const headers = [
      'Row #',
      'Event Name',
      'Submitted At',
      'Status',
      'Player / Applicant Name',
      'Email Address',
      'Phone / WhatsApp',
      ...dataFields.map((f) => f.label.replace(/"/g, '""')),
      'Admin Notes',
    ];

    const rows = sortedSubmissions.map((sub, idx) => {
      const data = sub.submission_data || {};
      const phone =
        data.whatsapp_number ||
        data.phone_number ||
        data.phone ||
        data.mobile ||
        '';

      const row = [
        String(idx + 1),
        `"${form.title.replace(/"/g, '""')}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`,
        `"${sub.status}"`,
        `"${(sub.applicant_name || '').replace(/"/g, '""')}"`,
        `"${(sub.applicant_email || '').replace(/"/g, '""')}"`,
        `"${String(phone).replace(/"/g, '""')}"`,
        ...dataFields.map((f) => {
          let val = data[f.field_key];
          if (val === undefined || val === null) return '""';
          if (Array.isArray(val)) {
            const cleanArr = val.filter((u) => !String(u).startsWith('file://'));
            return `"${cleanArr.join(' ; ').replace(/"/g, '""')}"`;
          }
          if (typeof val === 'object') {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          const str = String(val);
          if (str.startsWith('file://')) return '""';
          return `"${str.replace(/"/g, '""')}"`;
        }),
        `"${(sub.admin_notes || '').replace(/"/g, '""')}"`,
      ];
      return row.join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${cleanSlug}-responses-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusCounts = useMemo(() => {
    return {
      all: submissions.length,
      confirmed: submissions.filter((s) => s.status === 'confirmed').length,
      pending: submissions.filter((s) => s.status === 'pending').length,
      cancelled: submissions.filter((s) => s.status === 'cancelled').length,
    };
  }, [submissions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navigation & Branding Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Brand & Event Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Live Spreadsheet
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live Realtime Sync
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate mt-0.5">
                {form.title}
              </h1>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy('sheet')}
              leftIcon={copiedLink === 'sheet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {copiedLink === 'sheet' ? 'Link Copied!' : 'Copy Sheet Link'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy('csv')}
              leftIcon={copiedLink === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link className="w-3.5 h-3.5" />}
              className="text-xs"
              title="Copy direct CSV URL for Google Sheets =IMPORTDATA() or Excel"
            >
              {copiedLink === 'csv' ? 'CSV Feed Copied!' : 'Copy CSV Feed'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4 text-white" />}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 shadow-xs"
            >
              Export CSV ({sortedSubmissions.length})
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                loadSubmissions();
              }}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
              title="Reload latest registrations"
            >
              Refresh
            </Button>

            <a
              href={publicRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <span>Open Form</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Info & Google Sheets Integration Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {form.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {new Date(form.event_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {form.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {form.venue}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This online spreadsheet updates in <strong>real time</strong> via WebSockets as participants submit the registration form.
            </p>
          </div>

          {/* Quick Integration Pill for Google Sheets */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 max-w-md text-xs">
            <span className="font-semibold text-slate-800 block text-[11px] mb-1">
              Connect to Google Sheets:
            </span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1 rounded-md font-mono text-[11px] text-slate-600 overflow-x-auto">
              <span className="truncate select-all">=IMPORTDATA("{cloudCsvUrl}")</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`=IMPORTDATA("${cloudCsvUrl}")`);
                  setCopiedLink('csv');
                  setTimeout(() => setCopiedLink(null), 2000);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-auto"
              >
                {copiedLink === 'csv' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by participant name, phone, email, or response..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Confirmed ({statusCounts.confirmed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cancelled ({statusCounts.cancelled})
            </button>

            {/* Mobile View Toggle */}
            <div className="sm:hidden flex items-center gap-1 ml-auto bg-slate-100 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setMobileDisplayMode('table')}
                className={`px-2 py-1 rounded-lg font-semibold ${
                  mobileDisplayMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setMobileDisplayMode('cards')}
                className={`px-2 py-1 rounded-lg font-semibold ${
                  mobileDisplayMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Connecting to live spreadsheet...</p>
            </div>
          ) : sortedSubmissions.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Registrations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'No responses match the current search or status filter.'
                  : 'Registrations will appear here in real time as participants complete the event form.'}
              </p>
            </div>
          ) : mobileDisplayMode === 'cards' ? (
            /* Mobile Card View */
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {sortedSubmissions.map((sub, idx) => {
                const data = sub.submission_data || {};
                const phone =
                  data.whatsapp_number ||
                  data.phone_number ||
                  data.phone ||
                  data.mobile ||
                  '';
                const isNew = newlyArrivedIds.has(sub.id);

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isNew
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {sub.applicant_name || 'Participant'}
                        </h4>
                      </div>
                      <Badge
                        variant={
                          sub.status === 'confirmed'
                            ? 'success'
                            : sub.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {sub.status}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{String(phone)}</span>
                        </div>
                      )}
                      {sub.applicant_email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{sub.applicant_email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        View details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Full Table View (Desktop & Tablet Spreadsheet Grid) */
            <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-bold text-slate-700 uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-200">#</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Player / Participant</span>
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortColumn === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200">Phone / WhatsApp</th>
                    <th className="py-3 px-4 border-r border-slate-200">Email Address</th>
                    {dataFields.map((field) => (
                      <th key={field.id} className="py-3 px-3 min-w-[140px] max-w-[220px] truncate border-r border-slate-200" title={field.label}>
                        {field.label}
                      </th>
                    ))}
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors min-w-[120px]"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Submitted At</span>
                        {sortColumn === 'date' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {sortedSubmissions.map((sub, idx) => {
                    const data = sub.submission_data || {};
                    const phone =
                      data.whatsapp_number ||
                      data.phone_number ||
                      data.phone ||
                      data.mobile ||
                      '';
                    const isNew = newlyArrivedIds.has(sub.id);

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubmission(sub)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                          isNew ? 'bg-emerald-50/70 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{sub.applicant_name || 'Participant'}</span>
                            {isNew && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-600 text-white text-[9px] font-bold uppercase animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <Badge
                            variant={
                              sub.status === 'confirmed'
                                ? 'success'
                                : sub.status === 'pending'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] border-r border-slate-100">
                          {phone ? (
                            <a
                              href={`https://wa.me/${String(phone).replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <span>{String(phone)}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 border-r border-slate-100 truncate max-w-[180px]">
                          {sub.applicant_email || <span className="text-slate-300">—</span>}
                        </td>

                        {/* Dynamic Field Columns */}
                        {dataFields.map((field) => {
                          const val = data[field.field_key];

                          // Photo / File upload rendering with instant thumbnail
                          if (field.field_type === 'photo_upload' || field.field_type === 'file_upload') {
                            let photoSrc = typeof val === 'string' ? val : val?.url;
                            if (photoSrc && !photoSrc.startsWith('file://')) {
                              return (
                                <td key={field.id} className="py-2 px-3 border-r border-slate-100">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewPhotoUrl(photoSrc);
                                    }}
                                    className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                                  >
                                    <img src={photoSrc} alt="Upload" className="w-full h-full object-cover" />
                                  </button>
                                </td>
                              );
                            }
                          }

                          return (
                            <td key={field.id} className="py-2.5 px-3 text-slate-700 border-r border-slate-100 truncate max-w-[220px]" title={String(val || '')}>
                              {val !== undefined && val !== null && val !== '' ? (
                                Array.isArray(val) ? (
                                  val.join(', ')
                                ) : (
                                  String(val)
                                )
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-slate-400">
                            {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer Status Count */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600 flex items-center justify-between">
            <span>
              Showing <strong>{sortedSubmissions.length}</strong> of <strong>{submissions.length}</strong> registrations
            </span>
            <span className="text-[11px] text-slate-400">
              Powered by EventForm • Cloud Realtime Active
            </span>
          </div>
        </div>
      </main>

      {/* Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden p-2 text-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhotoUrl} alt="Preview" className="max-h-[80vh] w-auto mx-auto rounded-2xl object-contain" />
            <div className="p-3 flex items-center justify-between text-white text-xs">
              <a
                href={previewPhotoUrl}
                download="photo-upload.jpg"
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors"
              >
                Download Photo
              </a>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
          title={`Registration: ${selectedSubmission.applicant_name || 'Participant'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <div className="mt-0.5">
                  <Badge
                    variant={
                      selectedSubmission.status === 'confirmed'
                        ? 'success'
                        : selectedSubmission.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {selectedSubmission.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Submitted At</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedSubmission.submission_data?.whatsapp_number ||
                    selectedSubmission.submission_data?.phone_number ||
                    selectedSubmission.submission_data?.phone ||
                    '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">
                  {selectedSubmission.applicant_email || '—'}
                </p>
              </div>
            </div>

            {/* Field Responses */}
            <div className="space-y-2 border-t pt-3">
              <h4 className="font-bold text-slate-900 text-sm">Participant Responses:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dataFields.map((field) => {
                  const val = selectedSubmission.submission_data?.[field.field_key];
                  return (
                    <div key={field.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block truncate">
                        {field.label}
                      </span>
                      <div className="font-medium text-slate-900 mt-0.5">
                        {val !== undefined && val !== null && val !== '' ? (
                          Array.isArray(val) ? (
                            val.join(', ')
                          ) : (
                            String(val)
                          )
                        ) : (
                          <span className="text-slate-300 italic">Not answered</span>
                        )}
                      </div>
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
