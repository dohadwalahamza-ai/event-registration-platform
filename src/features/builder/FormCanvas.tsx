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

  return (
    <div
      className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto transition-colors duration-500"
      style={{
        backgroundColor: '#f1f5f9',
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${form.theme_config?.accentColor || '#4f46e5'}18 0%, transparent 60%)`,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Event Header Banner Card */}
        <div
          onClick={onOpenBranding}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-300 transition-all group relative"
        >
          {form.cover_image_url ? (
            <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-slate-900">
              <img
                src={form.cover_image_url}
                alt={form.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 inline-block mb-1.5">
                  Click to Customize Banner & Theme
                </span>
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                  {form.title || 'Untitled Event Form'}
                </h1>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/20 inline-block mb-2">
                Click to Add Banner & Branding
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                {form.title || 'Untitled Event Form'}
              </h1>
            </div>
          )}

          {/* Description & Event Metadata */}
          <div className="p-6 space-y-4">
            {form.description && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {form.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
              {form.event_date && (
                <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {new Date(form.event_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}

              {form.venue && (
                <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  {form.venue}
                </span>
              )}

              {form.registration_deadline && (
                <span className="flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Deadline:{' '}
                  {new Date(form.registration_deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
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
