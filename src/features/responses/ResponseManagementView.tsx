import React, { useState, useMemo } from 'react';
import { Form, Submission, FormField } from '../../types';
import {
  Download,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  X,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';
import { useToast } from '../../generic-ui/ToastContext';

interface ResponseManagementViewProps {
  form: Form;
  submissions: Submission[];
  onDeleteSubmission: (id: string) => Promise<void>;
  onBackToForms: () => void;
}

export const ResponseManagementView: React.FC<ResponseManagementViewProps> = ({
  form,
  submissions,
  onDeleteSubmission,
  onBackToForms,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { success, error } = useToast();

  const fields = form.fields || [];
  const fieldsMap = useMemo(() => new Map(fields.map((f) => [f.field_key, f])), [fields]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
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
  }, [submissions, statusFilter, searchTerm]);

  // Export to CSV function
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      error('No Submissions', 'There are no responses to export yet.');
      return;
    }

    // Determine relevant columns from fields
    const dataFields = fields.filter(
      (f) => !['section_heading', 'info_text'].includes(f.field_type)
    );

    const headers = [
      'Submission ID',
      'Submitted At',
      'Status',
      'Applicant Name',
      'Applicant Email',
      ...dataFields.map((f) => f.label.replace(/"/g, '""')),
    ];

    const rows = submissions.map((sub) => {
      const row = [
        `"${sub.id}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`,
        `"${sub.status}"`,
        `"${(sub.applicant_name || '').replace(/"/g, '""')}"`,
        `"${(sub.applicant_email || '').replace(/"/g, '""')}"`,
        ...dataFields.map((f) => {
          const val = sub.submission_data[f.field_key];
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
    link.setAttribute(
      'download',
      `${form.slug}-responses-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('CSV Exported', `Downloaded ${submissions.length} responses.`);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToForms}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              ← Back to All Forms
            </button>
            <span className="text-slate-300">•</span>
            <Badge variant={form.status === 'published' ? 'success' : 'neutral'} size="sm">
              {form.status.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Responses for {form.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Total {submissions.length} participants registered • Answers matched against database schema
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4 text-slate-600" />}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search responses by name, email, or answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:bg-white focus:outline-none"
          >
            <option value="all">All ({submissions.length})</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Submissions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No submissions found</h4>
            <p className="text-xs text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Share your public registration URL with participants to collect responses.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Applicant</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submission Date</th>
                  <th className="py-3.5 px-4">Key Answers</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const data = sub.submission_data || {};
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {sub.applicant_name || 'Participant'}
                        </div>
                        {sub.applicant_email && (
                          <div className="text-[11px] text-slate-400">{sub.applicant_email}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
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
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate text-slate-700 font-mono text-[11px]">
                          {Object.entries(data)
                            .filter(
                              ([k, v]) =>
                                !['full_name', 'name', 'email'].includes(k) &&
                                typeof v !== 'object'
                            )
                            .slice(0, 3)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ') || 'Registration details'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="View Full Submission"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            disabled={deletingId === sub.id}
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Response"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Individual Response Detail Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
          title={`Response Details: ${selectedSubmission.applicant_name || 'Participant'}`}
          description={`Submitted on ${new Date(
            selectedSubmission.submitted_at
          ).toLocaleString()} • Ref: ${selectedSubmission.id}`}
          maxWidth="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedSubmission.id)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Response
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Applicant metadata bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wide">
                  Participant Status
                </span>
                <div className="mt-1">
                  <Badge variant="success" dot size="sm">
                    {selectedSubmission.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="text-right text-xs text-slate-500">
                <span>Form Version</span>
                <div className="font-mono font-bold text-slate-800">
                  v{selectedSubmission.form_version}
                </div>
              </div>
            </div>

            {/* List of answers matched with form questions */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Submitted Answers
              </h4>

              {Object.entries(selectedSubmission.submission_data || {}).map(([key, val]) => {
                const matchedField = fieldsMap.get(key);
                const label = matchedField?.label || key;

                // Photo preview
                if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
                  return (
                    <div
                      key={key}
                      className="p-3 bg-white border border-slate-200 rounded-xl space-y-2"
                    >
                      <span className="text-xs font-semibold text-slate-700 block">{label}</span>
                      <div className="flex items-center gap-3">
                        <img
                          src={val}
                          alt="Applicant attachment"
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                        />
                        <a
                          href={val}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Full Image
                        </a>
                      </div>
                    </div>
                  );
                }

                // File upload
                if (typeof val === 'object' && val !== null && val.name) {
                  return (
                    <div
                      key={key}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-700 block">{label}</span>
                        <span className="text-slate-500 mt-0.5 block">
                          {val.name} ({val.size})
                        </span>
                      </div>
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                  );
                }

                // Array (e.g. checkbox selections)
                if (Array.isArray(val)) {
                  return (
                    <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-xs font-semibold text-slate-700 block mb-1">
                        {label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {val.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Boolean (yes/no or consent)
                if (typeof val === 'boolean') {
                  return (
                    <div
                      key={key}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </span>
                    </div>
                  );
                }

                // Text / number / date
                return (
                  <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-semibold text-slate-500 block">{label}</span>
                    <span className="text-sm font-medium text-slate-900 mt-0.5 block whitespace-pre-wrap">
                      {String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
