import React from 'react';
import { Form, Submission, DashboardStats } from '../../types';
import {
  FileSpreadsheet,
  Globe,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  ExternalLink,
  Calendar,
  Sparkles,
  Inbox,
  Eye,
  Clock,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { isSubmissionForForm } from '../../services/storage';

interface DashboardViewProps {
  stats: DashboardStats;
  forms: Form[];
  recentSubmissions: Submission[];
  onCreateNewForm: () => void;
  onEditForm: (formId: string) => void;
  onViewResponses: (formId: string) => void;
  onOpenPublicLink: (slug: string, form?: Form) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  forms,
  recentSubmissions,
  onCreateNewForm,
  onEditForm,
  onViewResponses,
  onOpenPublicLink,
}) => {
  const statCards = [
    {
      title: 'Total Forms Created',
      value: stats.totalForms,
      subtitle: 'Drafts and active events',
      icon: <FileSpreadsheet className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50/80',
    },
    {
      title: 'Live Published Events',
      value: stats.publishedForms,
      subtitle: 'Accessible to public participants',
      icon: <Globe className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50/80',
    },
    {
      title: 'Total Registrations',
      value: stats.totalRegistrations,
      subtitle: 'Responses saved in database',
      icon: <Users className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50/80',
    },
    {
      title: 'Recent Submissions (7d)',
      value: stats.recentSubmissions,
      subtitle: 'Active registrant velocity',
      icon: <TrendingUp className="w-5 h-5 text-violet-600" />,
      bg: 'bg-violet-50/80',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Event Registration Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Build Stunning Forms for Sports, Tournaments & Gatherings
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Create dynamic forms with conditional branching logic, customize event posters, share instant registration links, and export participant submissions.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={onCreateNewForm}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Event Form
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500">{card.title}</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {card.value}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">{card.subtitle}</p>
            </div>
            <div className={`p-3 rounded-2xl ${card.bg}`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent Forms & Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Events List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Event Forms</h3>
              <p className="text-xs text-slate-400">Forms currently accepting or preparing registrations</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCreateNewForm}>
              + Create Form
            </Button>
          </div>

          <div className="space-y-3">
            {forms.slice(0, 3).map((form) => (
              <div
                key={form.id}
                className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {form.cover_image_url ? (
                    <img
                      src={form.cover_image_url}
                      alt={form.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                      EP
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {form.title}
                      </h4>
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

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span
                        className="flex items-center gap-1 text-slate-500 font-medium"
                        title={`Last updated ${new Date(form.updated_at).toLocaleString()}`}
                      >
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          Updated {new Date(form.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })} at {new Date(form.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      {form.event_date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(form.event_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{form.fields?.length || 0} questions</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPublicLink(form.slug, form)}
                    leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    title="Open live public URL"
                  >
                    Public
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onEditForm(form.id)}
                  >
                    Edit Form
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Submissions Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Registrations</h3>
              <p className="text-xs text-slate-400">Latest participant signups</p>
            </div>
            <button
              type="button"
              onClick={() => onViewResponses('all')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
              title="View all responses in Responses module"
            >
              <span>View All Responses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentSubmissions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">No registrations yet</p>
                <p className="text-[11px] text-slate-400">
                  Share your public event links to start receiving participant registrations.
                </p>
              </div>
            ) : (
              recentSubmissions.slice(0, 5).map((sub) => {
                const matchedForm = forms.find((f) => isSubmissionForForm(sub, f));
                return (
                  <div
                    key={sub.id}
                    onClick={() => onViewResponses(sub.form_id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {sub.applicant_name || 'Participant'}
                        </p>
                        {matchedForm && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[110px]">
                            {matchedForm.title}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {sub.applicant_email || (sub.submission_data && (sub.submission_data.phone_number || sub.submission_data.whatsapp_number)) || 'Registration entry'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All link (Task 30) */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => onViewResponses('all')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <Inbox className="w-3.5 h-3.5 text-indigo-500" />
              <span>Open Responses Hub ({stats.totalRegistrations} total)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
