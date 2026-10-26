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
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';

interface FormsListViewProps {
  forms: Form[];
  responseCounts: Record<string, number>;
  onCreateNewForm: () => void;
  onEditForm: (formId: string) => void;
  onPreviewForm: (formId: string) => void;
  onViewResponses: (formId: string) => void;
  onDuplicateForm: (formId: string) => Promise<void>;
  onDeleteForm: (formId: string) => Promise<void>;
  onTogglePublish: (form: Form) => Promise<void>;
  onOpenPublicUrl: (slug: string) => void;
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
  onTogglePublish,
  onOpenPublicUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'responses'>('updated');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { success, error } = useToast();

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

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All submissions will be removed.`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      await onDeleteForm(id);
      success('Form Deleted', `"${title}" has been deleted.`);
    } catch {
      error('Failed', 'Could not delete form.');
    } finally {
      setActionLoadingId(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => {
            const count = responseCounts[form.id] || 0;
            return (
              <div
                key={form.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Poster / Thumbnail */}
                <div
                  className="h-36 w-full relative bg-slate-900 cursor-pointer overflow-hidden"
                  onClick={() => onEditForm(form.id)}
                >
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

                  <div className="absolute top-3 right-3">
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
                      onClick={() => onViewResponses(form.id)}
                      className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800"
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
                        onClick={() => onEditForm(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Form Canvas"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onPreviewForm(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Participant Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenPublicUrl(form.slug)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Open Public Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(form.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Duplicate Form"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(form.id, form.title)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
    </div>
  );
};
