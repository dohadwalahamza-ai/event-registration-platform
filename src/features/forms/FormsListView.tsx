import React, { useState, useMemo } from 'react';
import { Form } from '../../types';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Inbox,
  Copy,
  Trash2,
  Globe,
  Calendar,
  Clock,
  MoreVertical,
  ExternalLink,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
  Share2,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';
import { useToast } from '../../generic-ui/ToastContext';
import { PublishShareModal } from '../builder/PublishShareModal';
import { StorageService } from '../../services/storage';

interface FormsListViewProps {
  forms: Form[];
  responseCounts: Record<string, number>;
  onCreateNewForm: () => void;
  onEditForm: (formId: string) => void;
  onPreviewForm: (formId: string) => void;
  onViewResponses: (formId: string) => void;
  onDuplicateForm: (formId: string) => Promise<void>;
  onDeleteForm: (formId: string) => Promise<void>;
  onDeleteForms?: (formIds: string[]) => Promise<void>;
  onTogglePublish: (form: Form) => Promise<void>;
  onOpenPublicUrl: (slug: string, form?: Form) => void;
}

export const FormsListView: React.FC<FormsListViewProps> = ({
  forms,
  responseCounts,
  onCreateNewForm,
  onEditForm,
  onPreviewForm,
  onViewResponses,
  onDuplicateForm,
  onDeleteForm,
  onDeleteForms,
  onTogglePublish,
  onOpenPublicUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'responses'>('updated');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [sharingForm, setSharingForm] = useState<Form | null>(null);
  const { success, error } = useToast();

  // Delete confirmation modals state
  const [formToDelete, setFormToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const filteredForms = useMemo(() => {
    return forms
      .filter((form) => {
        const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
        const matchesSearch =
          form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'responses') {
          return (responseCounts[b.id] || 0) - (responseCounts[a.id] || 0);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [forms, searchTerm, statusFilter, sortBy, responseCounts]);

  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Automatically prune selected IDs whenever forms are deleted or changed
  React.useEffect(() => {
    const validIds = new Set(forms.map((f) => f.id));
    setSelectedFormIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [forms]);

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFormIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected =
    filteredForms.length > 0 && filteredForms.every((f) => selectedFormIds.includes(f.id));

  const handleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredForms.map((f) => f.id));
      setSelectedFormIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newSet = new Set([...selectedFormIds, ...filteredForms.map((f) => f.id)]);
      setSelectedFormIds(Array.from(newSet));
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedFormIds.length === 0) return;
    setIsBulkDeleting(true);
    const toDelete = [...selectedFormIds];
    setShowBulkDeleteConfirm(false);
    try {
      if (onDeleteForms) {
        await onDeleteForms(toDelete);
      } else {
        for (const id of toDelete) {
          await onDeleteForm(id);
        }
      }
      setSelectedFormIds([]);
      success('Forms Deleted', `${toDelete.length} event forms were permanently deleted.`);
    } catch {
      error('Delete Failed', 'Failed to delete some of the selected forms.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      await onDuplicateForm(id);
      success('Form Duplicated', 'A duplicate draft copy was created.');
    } catch {
      error('Failed', 'Could not duplicate form.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDeleteSingle = async () => {
    if (!formToDelete) return;
    const { id, title } = formToDelete;
    setIsDeletingSingle(true);
    try {
      await onDeleteForm(id);
      setSelectedFormIds((prev) => prev.filter((item) => item !== id));
      setFormToDelete(null);
      success('Form Deleted', `"${title}" has been permanently deleted.`);
    } catch {
      error('Failed', 'Could not delete form.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">All Event Forms</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your tournaments, hackathons, and activities with custom registration links.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onCreateNewForm}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Form
        </Button>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search forms by title, slug, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:bg-white focus:outline-none"
            >
              <option value="all">All Forms</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:bg-white focus:outline-none"
            >
              <option value="updated">Last Updated</option>
              <option value="title">Form Title</option>
              <option value="responses">Response Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {filteredForms.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2.5 font-medium text-slate-700 cursor-pointer select-none py-1.5 px-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div
              className={`flex items-center justify-center w-4 h-4 rounded border transition-all ${
                isAllFilteredSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : selectedFormIds.length > 0
                  ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                  : 'bg-white border-slate-300 text-transparent'
              }`}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>
              {isAllFilteredSelected
                ? `Deselect All (${filteredForms.length})`
                : `Select All (${filteredForms.length} forms)`}
            </span>
          </button>

          {selectedFormIds.length > 0 && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <span className="text-slate-700 font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100 text-xs">
                {selectedFormIds.length} form{selectedFormIds.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFormIds([])}
              >
                Clear
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                isLoading={isBulkDeleting}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Selected ({selectedFormIds.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No matching forms found</p>
          <p className="text-xs text-slate-400">Try changing your search terms or create a new event form.</p>
          <Button variant="primary" size="sm" onClick={onCreateNewForm}>
            Create New Form
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredForms.map((form) => {
            const count = responseCounts[form.id] || 0;
            const isSelected = selectedFormIds.includes(form.id);
            return (
              <div
                key={form.id}
                className={`bg-white rounded-2xl border ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200/90'
                } shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group`}
              >
                {/* Poster / Thumbnail */}
                <div
                  className="h-36 w-full relative bg-slate-900 cursor-pointer overflow-hidden"
                  onClick={() => onEditForm(form.id)}
                >
                  {/* Form Selection Checkbox Toggle */}
                  <div
                    className="absolute top-3 left-3 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelect(form.id, e)}
                      className={`flex items-center justify-center w-7 h-7 rounded-lg shadow-md transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 border-white text-white scale-105 ring-2 ring-indigo-500 shadow'
                          : 'bg-white/95 hover:bg-white border-slate-300 text-slate-300 hover:text-slate-500'
                      }`}
                      title={isSelected ? 'Deselect Form' : 'Select Form'}
                      aria-label={isSelected ? `Deselect ${form.title}` : `Select ${form.title}`}
                    >
                      <Check className={`w-4 h-4 stroke-[3] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-60'}`} />
                    </button>
                  </div>
                  {form.cover_image_url ? (
                    <img
                      src={form.cover_image_url}
                      alt={form.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-900 to-slate-900 text-white font-bold text-lg">
                      {form.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white border border-white/20">
                      {form.response_limit === 'single' ? 'Single Resp' : 'Multiple Resp'}
                    </span>
                    <Badge
                      variant={
                        form.status === 'published'
                          ? 'success'
                          : form.status === 'closed'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                      dot
                    >
                      {form.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h3 className="text-sm font-bold truncate leading-tight drop-shadow-sm">
                      {form.title}
                    </h3>
                  </div>
                </div>

                {/* Content body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {form.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-mono text-slate-400">/e/{form.slug}</span>
                      <span className="font-semibold text-slate-700">{form.fields?.length || 0} fields</span>
                    </div>
                  </div>

                  {/* Metrics and Responses count */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => onViewResponses(form.id)}
                      className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>{count} Submissions</span>
                    </button>

                    <span className="text-[10px] text-slate-400">
                      Updated {new Date(form.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditForm(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Form Canvas"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onPreviewForm(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Participant Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSharingForm(form)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Share & Short Link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPublicUrl(form.slug, form)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Open Public Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Duplicate Form"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === form.id || (isDeletingSingle && formToDelete?.id === form.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormToDelete({ id: form.id, title: form.title });
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Form"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant={form.status === 'published' ? 'outline' : 'primary'}
                      onClick={() => onTogglePublish(form)}
                    >
                      {form.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {formToDelete && (
        <Modal
          isOpen={Boolean(formToDelete)}
          onClose={() => !isDeletingSingle && setFormToDelete(null)}
          title="Delete Event Form"
          description="Permanently delete this event form and all associated data."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeletingSingle}
                onClick={() => setFormToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeletingSingle}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={confirmDeleteSingle}
              >
                Yes, Delete Form
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-900 text-sm">
                  Are you sure you want to delete <span className="underline font-bold">"{formToDelete.title}"</span>?
                </p>
                <p className="text-rose-700 leading-relaxed">
                  This action will permanently delete the form, all configured questions, public access links, and all participant submissions. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <Modal
          isOpen={showBulkDeleteConfirm}
          onClose={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
          title={`Delete ${selectedFormIds.length} Event Forms`}
          description="Permanently delete all selected event forms."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isBulkDeleting}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={confirmBulkDelete}
              >
                Yes, Delete {selectedFormIds.length} Forms
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-900 text-sm">
                  You are about to delete {selectedFormIds.length} selected event forms.
                </p>
                <p className="text-rose-700 leading-relaxed">
                  All associated questions, styling configurations, and all participant registration records will be permanently removed from the system.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Share & Short Link Modal */}
      {sharingForm && (
        <PublishShareModal
          key={sharingForm.id}
          isOpen={Boolean(sharingForm)}
          onClose={() => setSharingForm(null)}
          form={sharingForm}
          onUpdateStatus={async (newStatus) => {
            await onTogglePublish(sharingForm);
            setSharingForm({ ...sharingForm, status: newStatus });
          }}
          onOpenLivePreview={() => onOpenPublicUrl(sharingForm.slug, sharingForm)}
        />
      )}
    </div>
  );
};
