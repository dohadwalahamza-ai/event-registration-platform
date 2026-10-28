import React, { useState, useMemo } from 'react';
import { Form, FormField, Submission } from '../../types';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Sparkles,
  Star,
  FileCheck2,
  ArrowUpRight,
  Layers,
  Building2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { isSubmissionForForm } from '../../services/storage';

export interface AnalyticsChartsProps {
  submissions: Submission[];
  activeFields: FormField[];
  form?: Form | null;
  forms?: Form[];
}

export type ChartViewType = 'horizontal' | 'vertical' | 'donut';

interface QuestionBreakdownItem {
  option: string;
  count: number;
  percentage: number;
}

interface QuestionAnalytics {
  fieldKey: string;
  label: string;
  type: string;
  answeredCount: number;
  responseRate: number;
  breakdown: QuestionBreakdownItem[];
  summary?: {
    avg?: string;
    min?: number;
    max?: number;
    ratingAvg?: string;
  };
}

const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const GRADIENT_PALETTE = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-violet-600',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-sky-600',
];

// Helper to format date strings
function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  submissions,
  activeFields,
  form,
  forms = [],
}) => {
  // Global preferred chart display style for question cards ('auto' smartly varies the visual style)
  const [globalChartType, setGlobalChartType] = useState<ChartViewType | 'auto'>('auto');
  // Per-question chart overrides
  const [questionChartOverrides, setQuestionChartOverrides] = useState<Record<string, ChartViewType>>({});

  const total = submissions.length;

  // 1. STATUS METRICS
  const statusCounts = useMemo(() => {
    const confirmed = submissions.filter((s) => s.status === 'confirmed').length;
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const cancelled = submissions.filter((s) => s.status === 'cancelled').length;

    return {
      confirmed,
      confirmedPct: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      pending,
      pendingPct: total > 0 ? Math.round((pending / total) * 100) : 0,
      cancelled,
      cancelledPct: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  }, [submissions, total]);

  // 2. TIMELINE / TREND DATA (Submissions over time)
  const timelineData = useMemo(() => {
    if (submissions.length === 0) return [];

    const map: Record<string, { count: number; dateStr: string; timestamp: number }> = {};

    for (const sub of submissions) {
      if (!sub.submitted_at) continue;
      const d = new Date(sub.submitted_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      if (!map[key]) {
        map[key] = {
          count: 0,
          dateStr: key,
          timestamp: new Date(key).getTime(),
        };
      }
      map[key].count += 1;
    }

    const sorted = Object.values(map).sort((a, b) => a.timestamp - b.timestamp);

    // If only 1 or 2 points, pad with previous days for a nice curve
    if (sorted.length === 1) {
      const single = sorted[0];
      const prevDate = new Date(single.timestamp - 86400000 * 2);
      const keyPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(
        prevDate.getDate()
      ).padStart(2, '0')}`;
      sorted.unshift({
        count: 0,
        dateStr: keyPrev,
        timestamp: prevDate.getTime(),
      });
    }

    // Compute cumulative sum
    let cum = 0;
    return sorted.map((item) => {
      cum += item.count;
      return {
        ...item,
        label: formatDateShort(item.dateStr),
        cumulative: cum,
      };
    });
  }, [submissions]);

  // 2.5. SUBMISSIONS BY EVENT / FORM BREAKDOWN (Task 28)
  const eventsBreakdown = useMemo(() => {
    if (!forms || forms.length <= 1) return [];
    return forms
      .map((f) => {
        const count = submissions.filter((s) => isSubmissionForForm(s, f)).length;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return {
          id: f.id,
          title: f.title,
          slug: f.slug,
          status: f.status,
          count,
          percentage,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [forms, submissions, total]);

  // 3. QUESTION-BY-QUESTION ANALYTICS
  const questionAnalyticsList = useMemo<QuestionAnalytics[]>(() => {
    if (submissions.length === 0) return [];

    const targetFields = activeFields.filter(
      (f) => !['section_heading', 'info_text'].includes(f.field_type)
    );

    return targetFields.map((field) => {
      const counts: Record<string, number> = {};
      let answeredCount = 0;
      let numericSum = 0;
      let numericCount = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;

      // Pre-seed defined options
      if (field.options && Array.isArray(field.options)) {
        for (const opt of field.options) {
          const optLabel = opt.label || opt.value;
          if (optLabel) counts[optLabel] = 0;
        }
      } else if (field.field_type === 'yes_no' || field.field_type === 'consent_checkbox') {
        counts['Yes'] = 0;
        counts['No'] = 0;
      }

      for (const sub of submissions) {
        const val = sub.submission_data ? sub.submission_data[field.field_key] : undefined;
        if (val !== undefined && val !== null && val !== '') {
          answeredCount++;

          if (Array.isArray(val)) {
            for (const item of val) {
              const str = String(item).trim();
              if (str) counts[str] = (counts[str] || 0) + 1;
            }
          } else if (typeof val === 'boolean') {
            const str = val ? 'Yes' : 'No';
            counts[str] = (counts[str] || 0) + 1;
          } else if (field.field_type === 'rating') {
            const num = Number(val);
            if (!isNaN(num)) {
              numericSum += num;
              numericCount++;
              const starStr = `${num} ${num === 1 ? 'Star' : 'Stars'}`;
              counts[starStr] = (counts[starStr] || 0) + 1;
            }
          } else if (field.field_type === 'number') {
            const num = Number(val);
            if (!isNaN(num)) {
              numericSum += num;
              numericCount++;
              if (num < minVal) minVal = num;
              if (num > maxVal) maxVal = num;
              const numStr = String(num);
              counts[numStr] = (counts[numStr] || 0) + 1;
            }
          } else if (['file_upload', 'photo_upload'].includes(field.field_type)) {
            counts['File Attached'] = (counts['File Attached'] || 0) + 1;
          } else {
            const str = String(val).trim();
            if (str) counts[str] = (counts[str] || 0) + 1;
          }
        }
      }

      if (['file_upload', 'photo_upload'].includes(field.field_type)) {
        const unattached = total - answeredCount;
        if (unattached > 0) {
          counts['No File Attached'] = unattached;
        }
      }

      const divisor = answeredCount > 0 ? answeredCount : total;
      let rawBreakdown: QuestionBreakdownItem[] = Object.entries(counts).map(([option, count]) => ({
        option,
        count,
        percentage: divisor > 0 ? Math.round((count / divisor) * 100) : 0,
      }));

      // Group long open text answers
      if (rawBreakdown.length > 8 && ['short_text', 'long_text', 'email', 'phone'].includes(field.field_type)) {
        rawBreakdown.sort((a, b) => b.count - a.count);
        const top = rawBreakdown.slice(0, 6);
        const remaining = rawBreakdown.slice(6).reduce((acc, curr) => acc + curr.count, 0);
        if (remaining > 0) {
          top.push({
            option: `Other (${rawBreakdown.length - 6} responses)`,
            count: remaining,
            percentage: divisor > 0 ? Math.round((remaining / divisor) * 100) : 0,
          });
        }
        rawBreakdown = top;
      } else {
        rawBreakdown.sort((a, b) => b.count - a.count);
      }

      const responseRate = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

      const summary: {
        avg?: string;
        min?: number;
        max?: number;
        ratingAvg?: string;
      } = {};

      if (field.field_type === 'rating' && numericCount > 0) {
        summary.ratingAvg = (numericSum / numericCount).toFixed(1);
      } else if (field.field_type === 'number' && numericCount > 0) {
        summary.avg = (numericSum / numericCount).toFixed(1);
        summary.min = minVal !== Infinity ? minVal : 0;
        summary.max = maxVal !== -Infinity ? maxVal : 0;
      }

      return {
        fieldKey: field.field_key,
        label: field.label,
        type: field.field_type,
        answeredCount,
        responseRate,
        breakdown: rawBreakdown,
        summary,
      };
    });
  }, [submissions, activeFields, total]);

  // Set chart type for a specific question
  const setQuestionType = (fieldKey: string, type: ChartViewType) => {
    setQuestionChartOverrides((prev) => ({
      ...prev,
      [fieldKey]: type,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Submissions</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{total}</h3>
          <p className="text-[11px] text-slate-400 mt-1">100% of event registrants</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-black text-emerald-700 mt-2 tracking-tight">
            {statusCounts.confirmedPct}%
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{statusCounts.confirmed} confirmed participants</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-black text-amber-700 mt-2 tracking-tight">
            {statusCounts.pendingPct}%
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{statusCounts.pending} awaiting verification</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider">Cancelled / Withdrawn</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-black text-rose-700 mt-2 tracking-tight">
            {statusCounts.cancelledPct}%
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{statusCounts.cancelled} cancelled entries</p>
        </div>
      </div>

      {/* 2. OVERVIEW ROW: MOMENTUM TIMELINE + STATUS DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2A. REGISTRATION TIMELINE AREA CHART */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">Registration Velocity</h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">Daily registration activity and submission growth</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Area Trend
            </span>
          </div>

          {timelineData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No registration submissions recorded yet.
            </div>
          ) : (
            <div className="pt-4 space-y-3">
              {/* SVG Area Chart */}
              <div className="w-full h-44 relative">
                {(() => {
                  const maxCount = Math.max(...timelineData.map((d) => d.count), 1);
                  const width = 500;
                  const height = 140;
                  const paddingX = 25;
                  const paddingY = 20;
                  const usableWidth = width - paddingX * 2;
                  const usableHeight = height - paddingY * 2;

                  const points = timelineData.map((d, idx) => {
                    const x =
                      timelineData.length === 1
                        ? width / 2
                        : paddingX + (idx / (timelineData.length - 1)) * usableWidth;
                    const y = height - paddingY - (d.count / maxCount) * usableHeight;
                    return { x, y, ...d };
                  });

                  const linePath = points.reduce((acc, curr, idx) => {
                    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                  }, '');

                  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${
                    points[0].x
                  } ${height - paddingY} Z`;

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.5, 1].map((ratio) => {
                        const y = height - paddingY - ratio * usableHeight;
                        return (
                          <line
                            key={ratio}
                            x1={paddingX}
                            y1={y}
                            x2={width - paddingX}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                        );
                      })}

                      <path d={areaPath} fill="url(#areaGradient)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {points.map((pt, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            className="fill-white stroke-indigo-600 stroke-2 hover:r-6 transition-all"
                          />
                          <title>{`${pt.label}: ${pt.count} submissions (Cumulative: ${pt.cumulative})`}</title>
                        </g>
                      ))}

                      {points.map((pt, i) => (
                        <text
                          key={i}
                          x={pt.x}
                          y={height - 4}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-400 font-medium"
                        >
                          {pt.label}
                        </text>
                      ))}
                    </svg>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Earliest entry to today</span>
                </span>
                <span className="font-bold text-slate-700">
                  Peak: {Math.max(...timelineData.map((d) => d.count), 0)} / day
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2B. STATUS COMPOSITION DONUT CHART */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <PieChart className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">Registration Status Mix</h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">Confirmed vs pending verification breakdown</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              Donut Composition
            </span>
          </div>

          {total === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No registration statuses recorded yet.
            </div>
          ) : (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* SVG Donut */}
              <div className="relative w-36 h-36 shrink-0">
                {(() => {
                  const radius = 42;
                  const circumference = 2 * Math.PI * radius;
                  const confirmedLen = (statusCounts.confirmed / total) * circumference;
                  const pendingLen = (statusCounts.pending / total) * circumference;
                  const cancelledLen = (statusCounts.cancelled / total) * circumference;

                  return (
                    <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="14"
                      />
                      {statusCounts.confirmed > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r={radius}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="14"
                          strokeDasharray={`${confirmedLen} ${circumference}`}
                          strokeDashoffset={0}
                        />
                      )}
                      {statusCounts.pending > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r={radius}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="14"
                          strokeDasharray={`${pendingLen} ${circumference}`}
                          strokeDashoffset={-confirmedLen}
                        />
                      )}
                      {statusCounts.cancelled > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r={radius}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="14"
                          strokeDasharray={`${cancelledLen} ${circumference}`}
                          strokeDashoffset={-(confirmedLen + pendingLen)}
                        />
                      )}
                    </svg>
                  );
                })()}

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900">{total}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Submissions</span>
                </div>
              </div>

              {/* Status Legend & Breakdown */}
              <div className="space-y-2.5 flex-1 min-w-[180px]">
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-emerald-950">Confirmed</span>
                  </div>
                  <span className="font-bold text-emerald-800">
                    {statusCounts.confirmedPct}% ({statusCounts.confirmed})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-950">Pending</span>
                  </div>
                  <span className="font-bold text-amber-800">
                    {statusCounts.pendingPct}% ({statusCounts.pending})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-semibold text-rose-950">Cancelled</span>
                  </div>
                  <span className="font-bold text-rose-800">
                    {statusCounts.cancelledPct}% ({statusCounts.cancelled})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2.5. SUBMISSIONS BY EVENT / FORM BAR CHART (Task 28) */}
      {eventsBreakdown.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Layers className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">Registrations by Event / Form</h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">Comparative submission volume across all active events</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Event Comparison
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {eventsBreakdown.map((evt, idx) => {
              const grad = GRADIENT_PALETTE[idx % GRADIENT_PALETTE.length];
              return (
                <div key={evt.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <span className="font-bold text-slate-800 truncate" title={evt.title}>
                        {evt.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                        /e/{evt.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400 font-normal">
                        {evt.count} {evt.count === 1 ? 'signup' : 'signups'}
                      </span>
                      <span className="text-slate-900 font-bold w-12 text-right">
                        {evt.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(evt.percentage, evt.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. QUESTION-BY-QUESTION ANALYTICS WITH GRAPH STYLE TOGGLES */}
      <div className="space-y-4">
        {/* Section Header with Graph Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Questions & Answers Analytics</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown and percentage distribution across form questions
            </p>
          </div>

          {/* Global Graph Type Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
            <span className="px-2 py-1 text-[11px] font-bold text-slate-500 uppercase">View Style:</span>
            <button
              type="button"
              onClick={() => setGlobalChartType('auto')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                globalChartType === 'auto'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Intelligently adapts chart type based on question data"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart / Auto</span>
            </button>

            <button
              type="button"
              onClick={() => setGlobalChartType('horizontal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                globalChartType === 'horizontal'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Horizontal Progress Bars"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>

            <button
              type="button"
              onClick={() => setGlobalChartType('vertical')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                globalChartType === 'vertical'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vertical Column Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>

            <button
              type="button"
              onClick={() => setGlobalChartType('donut')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                globalChartType === 'donut'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Circular Donut Chart"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Donut</span>
            </button>
          </div>
        </div>

        {/* Question Cards Grid */}
        {questionAnalyticsList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-2">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No question breakdown available</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once participants submit responses to questions in this form, detailed graphs and percentages will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionAnalyticsList.map((stat, i) => {
              const activeChart: ChartViewType =
                questionChartOverrides[stat.fieldKey] ||
                (globalChartType === 'auto'
                  ? stat.type === 'yes_no' ||
                    stat.type === 'consent_checkbox' ||
                    (stat.breakdown.length >= 2 && stat.breakdown.length <= 4)
                    ? 'donut'
                    : stat.breakdown.length >= 5 && stat.breakdown.length <= 7
                    ? 'vertical'
                    : 'horizontal'
                  : globalChartType);

              return (
                <div
                  key={stat.fieldKey}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4"
                >
                  {/* Card Header with Question Details & Mini-Switcher */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {stat.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {stat.answeredCount} of {total} answered ({stat.responseRate}%)
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{stat.label}</h4>
                    </div>

                    {/* Per-card toggle */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQuestionType(stat.fieldKey, 'horizontal')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          activeChart === 'horizontal'
                            ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Horizontal Bars"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionType(stat.fieldKey, 'vertical')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          activeChart === 'vertical'
                            ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Vertical Columns"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionType(stat.fieldKey, 'donut')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          activeChart === 'donut'
                            ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Donut Chart"
                      >
                        <PieChart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Callouts (Rating / Numbers) */}
                  {stat.summary?.ratingAvg && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span>Average Rating Score</span>
                      </span>
                      <span className="font-black text-amber-700 text-sm">
                        ★ {stat.summary.ratingAvg} / 5.0
                      </span>
                    </div>
                  )}

                  {stat.summary?.avg && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-900">Average Numeric Response</span>
                      <span className="font-black text-indigo-700 text-sm">
                        {stat.summary.avg} (Min: {stat.summary.min} • Max: {stat.summary.max})
                      </span>
                    </div>
                  )}

                  {/* Graph Render based on selected style */}
                  {stat.breakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No responses recorded for this question yet.
                    </p>
                  ) : activeChart === 'vertical' ? (
                    /* GRAPH TYPE 1: VERTICAL COLUMN CHART */
                    <div className="pt-2">
                      <div className="flex items-end justify-around gap-2 h-36 border-b border-slate-200 pb-2 px-2">
                        {stat.breakdown.map((item, idx) => {
                          const colHeight = Math.max(item.percentage, item.count > 0 ? 8 : 2);
                          const grad = GRADIENT_PALETTE[idx % GRADIENT_PALETTE.length];

                          return (
                            <div
                              key={item.option}
                              className="flex-1 flex flex-col items-center justify-end h-full group relative"
                            >
                              {/* Percentage Label on Top */}
                              <span className="text-[10px] font-bold text-slate-700 mb-1">
                                {item.percentage}%
                              </span>

                              {/* Vertical Column Bar */}
                              <div className="w-full max-w-[42px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                                <div
                                  className={`w-full bg-gradient-to-t ${grad} rounded-t-lg transition-all duration-700 group-hover:opacity-90`}
                                  style={{ height: `${colHeight}%` }}
                                />
                              </div>

                              {/* Tooltip on Hover */}
                              <div className="absolute -top-7 hidden group-hover:flex bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                {item.count} responses
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis Labels */}
                      <div className="flex items-start justify-around gap-2 pt-2 px-2 text-center">
                        {stat.breakdown.map((item) => (
                          <div key={item.option} className="flex-1 min-w-0">
                            <span
                              className="text-[11px] font-medium text-slate-600 block truncate"
                              title={item.option}
                            >
                              {item.option}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{item.count} resp</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeChart === 'donut' ? (
                    /* GRAPH TYPE 2: DONUT CHART */
                    <div className="flex items-center justify-around gap-4 py-2">
                      {/* SVG Donut */}
                      <div className="relative w-32 h-32 shrink-0">
                        {(() => {
                          const radius = 45;
                          const circumference = 2 * Math.PI * radius; // ~282.74
                          const totalAnswered = stat.answeredCount || 1;

                          let cumulativeOffset = 0;

                          return (
                            <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                              <circle
                                cx="55"
                                cy="55"
                                r={radius}
                                fill="none"
                                stroke="#f1f5f9"
                                strokeWidth="12"
                              />
                              {stat.breakdown.map((item, idx) => {
                                const strokeLen = (item.count / totalAnswered) * circumference;
                                const offset = -cumulativeOffset;
                                cumulativeOffset += strokeLen;
                                const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

                                if (item.count === 0) return null;

                                return (
                                  <circle
                                    key={item.option}
                                    cx="55"
                                    cy="55"
                                    r={radius}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="12"
                                    strokeDasharray={`${strokeLen} ${circumference}`}
                                    strokeDashoffset={offset}
                                    className="transition-all duration-700"
                                  >
                                    <title>{`${item.option}: ${item.percentage}% (${item.count} responses)`}</title>
                                  </circle>
                                );
                              })}
                            </svg>
                          );
                        })()}

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-sm font-black text-slate-800">{stat.answeredCount}</span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Answered</span>
                        </div>
                      </div>

                      {/* Legend List */}
                      <div className="space-y-1.5 flex-1 min-w-0 max-h-36 overflow-y-auto pr-1">
                        {stat.breakdown.map((item, idx) => {
                          const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                          return (
                            <div key={item.option} className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-slate-600 truncate text-[11px]" title={item.option}>
                                  {item.option}
                                </span>
                              </div>
                              <span className="font-bold text-slate-900 text-[11px] shrink-0">
                                {item.percentage}% ({item.count})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* GRAPH TYPE 3: HORIZONTAL PROGRESS BARS */
                    <div className="space-y-3 pt-1">
                      {stat.breakdown.map((item, idx) => {
                        const grad = GRADIENT_PALETTE[idx % GRADIENT_PALETTE.length];
                        return (
                          <div key={item.option} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-700 truncate max-w-[220px]" title={item.option}>
                                {item.option}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-normal">
                                  {item.count} {item.count === 1 ? 'resp' : 'resps'}
                                </span>
                                <span className="text-slate-900 font-bold w-12 text-right">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                            {/* Track */}
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-700`}
                                style={{ width: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
