import React from 'react';
import { Form, FormField } from '../../types';
import { FieldRenderer } from './FieldRenderer';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Settings,
  GitFork,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Plus,
} from 'lucide-react';
import { Badge } from '../../generic-ui/components/Badge';

interface FormCanvasProps {
  form: Form;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onMoveField: (index: number, direction: 'up' | 'down') => void;
  onDuplicateField: (field: FormField) => void;
  onDeleteField: (id: string) => void;
  onOpenBranding: () => void;
  onOpenFieldLibrary: () => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  form,
  selectedFieldId,
  onSelectField,
  onMoveField,
  onDuplicateField,
  onDeleteField,
  onOpenBranding,
  onOpenFieldLibrary,
}) => {
  const fields = form.fields || [];
  const rawTheme = form.theme_config;
  const theme =
    typeof rawTheme === 'string'
      ? (() => {
          try {
            return JSON.parse(rawTheme);
          } catch {
            return {};
          }
        })()
      : rawTheme || {};
  const backgroundStyle = theme.backgroundStyle || 'banner_glass';
  const accentColor = theme.accentColor || '#4f46e5';

  const bannerImageUrl =
    form.cover_image_url && form.cover_image_url.trim() !== ''
      ? form.cover_image_url
      : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';

  const eventDate =
    form.event_date && form.event_date.trim() !== ''
      ? form.event_date
      : '2026-11-20T10:00';

  const venue =
    form.venue && form.venue.trim() !== ''
      ? form.venue
      : 'Grand Convention Center, Main Exhibition Hall';

  const deadline =
    form.registration_deadline && form.registration_deadline.trim() !== ''
      ? form.registration_deadline
      : '2026-11-18T23:59';

  const getCanvasBackground = () => {
    switch (backgroundStyle) {
      case 'banner_glass':
        return {
          backgroundColor: '#0b0f19',
          backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.8), rgba(11, 15, 25, 0.8)), url(${bannerImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        };
      case 'solid_color':
        return {
          backgroundColor: form.theme_config?.customBackgroundColor || '#0f172a',
          backgroundImage: 'none',
        };
      case 'vibrant_gradient':
        return {
          backgroundColor: '#0f172a',
          backgroundImage: `linear-gradient(135deg, ${accentColor} 0%, #1e1b4b 50%, #0f172a 100%)`,
        };
      case 'midnight_dark':
        return {
          backgroundColor: '#090d16',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, ${accentColor}30 0%, transparent 60%)`,
        };
      case 'sunset_warm':
        return {
          backgroundColor: '#fff7ed',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, #f59e0b20 0%, transparent 60%), linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fed7aa 100%)`,
        };
      case 'emerald_turf':
        return {
          backgroundColor: '#f0fdf4',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, #05966920 0%, transparent 60%), linear-gradient(135deg, #f0fdf4 0%, #d1fae5 50%, #a7f3d0 100%)`,
        };
      case 'ocean_blue':
        return {
          backgroundColor: '#f0f9ff',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, #0284c720 0%, transparent 60%), linear-gradient(135deg, #f0f9ff 0%, #bae6fd 50%, #e0e7ff 100%)`,
        };
      case 'soft_minimal':
        return {
          backgroundColor: '#e2e8f0',
          backgroundImage: 'none',
        };
      case 'accent_glow':
      default:
        return {
          backgroundColor: '#f1f5f9',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, ${accentColor}18 0%, transparent 60%)`,
        };
    }
  };

  return (
    <div
      className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto transition-colors duration-500"
      style={getCanvasBackground()}
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Event Header Banner Card */}
        <div
          onClick={onOpenBranding}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-400 transition-all group relative"
        >
          <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-slate-900">
            <img
              src={bannerImageUrl}
              alt={form.title}
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';
              }}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 text-white">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 inline-block mb-1.5 shadow-xs">
                Click to Customize Banner & Theme
              </span>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {form.title || 'Untitled Event Form'}
              </h1>
            </div>
          </div>

          {/* Description & Event Metadata */}
          <div className="p-6 space-y-4">
            {form.description && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {form.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {new Date(eventDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>

              <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>{venue}</span>
              </span>

              <span className="flex items-center gap-1.5 font-medium text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Deadline:{' '}
                  {new Date(deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Empty Canvas Placeholder */}
        {fields.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Your Form Canvas is Empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select questions from the Field Library on the left to start building your registration flow.
              </p>
            </div>
            <button
              onClick={onOpenFieldLibrary}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add First Question
            </button>
          </div>
        )}

        {/* Fields List */}
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isSelected = selectedFieldId === field.id;
            const hasConditional =
              Boolean(field.conditional_rules?.rules?.length);

            return (
              <div
                key={field.id}
                onClick={() => onSelectField(field.id)}
                className={`group relative bg-white rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 shadow-md border-transparent'
                    : 'border border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Field Top Meta Bar */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">
                      #{index + 1}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {field.field_type.replace('_', ' ')}
                    </Badge>
                    {field.required && (
                      <Badge variant="danger" size="sm">
                        Required
                      </Badge>
                    )}
                    {hasConditional && (
                      <Badge variant="info" size="sm" dot>
                        <GitFork className="w-3 h-3 mr-1 inline" />
                        Conditional
                      </Badge>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div
                    className={`flex items-center gap-1 transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      disabled={index === 0}
                      onClick={() => onMoveField(index, 'up')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={index === fields.length - 1}
                      onClick={() => onMoveField(index, 'down')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDuplicateField(field)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteField(field.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectField(field.id)}
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Configure Field"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Render Question Field */}
                <div className="pointer-events-none select-none opacity-90">
                  <FieldRenderer field={field} disabled />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
