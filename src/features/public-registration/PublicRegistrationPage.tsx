import React, { useState, useEffect } from 'react';
import { Form, FormField } from '../../types';
import { FieldRenderer } from '../builder/FieldRenderer';
import {
  evaluateFieldVisibility,
  validateFormSubmission,
  sanitizeSubmissionData,
} from '../conditional-logic/evaluator';
import { StorageService } from '../../services/storage';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import confetti from 'canvas-confetti';

interface PublicRegistrationPageProps {
  form: Form;
  isPreview?: boolean;
  onClosePreview?: () => void;
}

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({
  form,
  isPreview = false,
  onClosePreview,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const fields = form.fields || [];
  const theme = form.theme_config || {
    accentColor: '#4f46e5',
    headerStyle: 'banner',
    borderRadius: 'xl',
  };

  // Check if deadline passed
  const isDeadlinePassed =
    form.registration_deadline &&
    new Date(form.registration_deadline).getTime() < Date.now();

  const isClosed = !isPreview && (form.status === 'closed' || isDeadlinePassed);

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
    // Clear error for field on change
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) return;

    // Validate visible fields
    const validation = validateFormSubmission(fields, formValues);
    if (!validation.isValid) {
      setErrors(validation.errors);

      // Scroll to first error
      const firstErrorKey = Object.keys(validation.errors)[0];
      const element = document.getElementById(`field-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitized = sanitizeSubmissionData(fields, formValues);

      if (!isPreview) {
        const sub = await StorageService.submitRegistration(
          form.id,
          form.published_version || 1,
          sanitized
        );
        setSubmissionId(sub.id);
      } else {
        setSubmissionId('preview-submission-id');
      }

      setIsSuccess(true);

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // confetti fallback
      }

      // Check for redirect URL
      if (form.redirect_url && !isPreview) {
        setTimeout(() => {
          window.location.href = form.redirect_url!;
        }, 3000);
      }
    } catch (err) {
      alert('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormValues({});
    setErrors({});
    setIsSuccess(false);
    setSubmissionId(null);
  };

  // SUCCESS CONFIRMATION STATE
  if (isSuccess) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 flex items-center justify-center bg-slate-50">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 text-center animate-fade-in space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Registration Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 leading-tight">
              {form.title}
            </h2>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed text-left whitespace-pre-line">
            {form.success_message ||
              'Thank you! Your registration has been received and confirmed by the event organizers.'}
          </div>

          {submissionId && (
            <div className="text-xs text-slate-400 font-mono">
              Confirmation Reference: <span className="text-slate-700 font-bold">{submissionId}</span>
            </div>
          )}

          {form.redirect_url && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Redirecting you to the next step shortly...</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Submit Another Response
            </Button>

            {isPreview && onClosePreview && (
              <Button variant="primary" size="md" onClick={onClosePreview}>
                Return to Builder
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CLOSED / DEADLINE EXPIRED STATE
  if (isClosed) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{form.title}</h2>
            <p className="text-sm text-slate-500 mt-1">Registration is currently closed</p>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            {isDeadlinePassed
              ? 'The deadline for this event has passed. No further registrations are being accepted.'
              : 'The organizers have temporarily or permanently closed registrations for this event.'}
          </p>
        </div>
      </div>
    );
  }

  // ACTIVE REGISTRATION FORM
  return (
    <div className="min-h-screen py-6 sm:py-12 px-4 sm:px-6 bg-slate-50 font-sans">
      <div className="max-w-2xl sm:max-w-3xl mx-auto space-y-6">
        {/* Event Header Banner Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {form.cover_image_url && (
            <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-slate-900">
              <img
                src={form.cover_image_url}
                alt={form.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 inline-block mb-2">
                  Official Registration
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  {form.title}
                </h1>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-5">
            {!form.cover_image_url && (
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {form.title}
              </h1>
            )}

            {form.description && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {form.description}
              </p>
            )}

            {/* Event Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {form.event_date && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {new Date(form.event_date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {form.venue && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{form.venue}</span>
                </div>
              )}

              {form.registration_deadline && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Closes:{' '}
                    {new Date(form.registration_deadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Form Questions Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            // Evaluate conditional visibility reactive to formValues
            const isVisible = evaluateFieldVisibility(field, fields, formValues);
            if (!isVisible) return null;

            return (
              <div
                key={field.id}
                id={`field-${field.field_key}`}
                className={`bg-white rounded-2xl p-6 border transition-all duration-300 animate-fade-in ${
                  errors[field.field_key]
                    ? 'border-rose-300 ring-2 ring-rose-100 shadow-sm'
                    : 'border-slate-200/90 shadow-xs'
                }`}
              >
                <FieldRenderer
                  field={field}
                  value={formValues[field.field_key]}
                  onChange={(val) => handleFieldChange(field.field_key, val)}
                  error={errors[field.field_key]}
                  accentColor={theme.accentColor}
                />
              </div>
            );
          })}

          {/* Bottom Submit Bar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Protected Submission:</span> Your
              responses are saved directly to the database.
            </div>

            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto"
              style={{ backgroundColor: theme.accentColor }}
            >
              Submit Registration
            </Button>
          </div>
        </form>

        {/* Footer branding */}
        <div className="text-center text-xs text-slate-400 py-4">
          Powered by <span className="font-semibold text-slate-600">EventForm</span> • Secure &
          Fast Event Registration
        </div>
      </div>
    </div>
  );
};
