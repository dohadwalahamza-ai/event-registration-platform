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

  const accentColor = theme.accentColor || '#4f46e5';
  const backgroundStyle = theme.backgroundStyle || 'accent_glow';

  // Guaranteed banner image URL with reliable high-resolution sports/event fallback
  const bannerImageUrl =
    form.cover_image_url && form.cover_image_url.trim() !== ''
      ? form.cover_image_url
      : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';

  // Dynamic background atmosphere styling based on themeConfig.backgroundStyle
  const getThemeAtmosphere = (bg: string, accent: string) => {
    switch (bg) {
      case 'midnight_dark':
        return {
          wrapperClass: 'bg-[#090d16] text-slate-100',
          wrapperStyle: {
            backgroundColor: '#090d16',
            backgroundImage: `radial-gradient(ellipse 90% 50% at 50% -10%, ${accent}35 0%, transparent 70%), radial-gradient(circle at 100% 100%, ${accent}20 0%, transparent 45%)`,
          },
          cardClass: 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl',
          headingClass: 'text-white',
          descClass: 'text-slate-300',
          metaBadgeClass: 'bg-slate-800 border-slate-700 text-slate-200',
          borderClass: 'border-slate-800',
          footerText: 'text-slate-500',
        };
      case 'sunset_warm':
        return {
          wrapperClass: 'bg-[#fffaf5] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#fffaf5',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #f59e0b22 0%, transparent 70%), linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%)`,
          },
          cardClass: 'bg-white/95 border-amber-200/80 text-slate-900 shadow-md backdrop-blur-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-amber-50/80 border-amber-200 text-amber-900',
          borderClass: 'border-amber-100',
          footerText: 'text-slate-500',
        };
      case 'emerald_turf':
        return {
          wrapperClass: 'bg-[#f5fdf8] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f5fdf8',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #05966922 0%, transparent 70%), linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)`,
          },
          cardClass: 'bg-white/95 border-emerald-200/80 text-slate-900 shadow-md backdrop-blur-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
          borderClass: 'border-emerald-100',
          footerText: 'text-slate-500',
        };
      case 'ocean_blue':
        return {
          wrapperClass: 'bg-[#f5faff] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f5faff',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #0284c722 0%, transparent 70%), linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)`,
          },
          cardClass: 'bg-white/95 border-sky-200/80 text-slate-900 shadow-md backdrop-blur-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-sky-50/80 border-sky-200 text-sky-900',
          borderClass: 'border-sky-100',
          footerText: 'text-slate-500',
        };
      case 'soft_minimal':
        return {
          wrapperClass: 'bg-slate-100 text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f1f5f9',
          },
          cardClass: 'bg-white border-slate-200 text-slate-900 shadow-xs',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-100 border-slate-200 text-slate-700',
          borderClass: 'border-slate-200',
          footerText: 'text-slate-400',
        };
      case 'accent_glow':
      default:
        return {
          wrapperClass: 'bg-slate-50 text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f8fafc',
            backgroundImage: `radial-gradient(ellipse 90% 50% at 50% -15%, ${accent}28 0%, transparent 75%), radial-gradient(circle at 100% 100%, ${accent}12 0%, transparent 40%)`,
          },
          cardClass: 'bg-white border-slate-200/90 text-slate-900 shadow-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-50 border-slate-200 text-slate-700',
          borderClass: 'border-slate-100',
          footerText: 'text-slate-400',
        };
    }
  };

  const atmosphere = getThemeAtmosphere(backgroundStyle, accentColor);

  // ACTIVE REGISTRATION FORM
  return (
    <div
      className={`min-h-screen py-6 sm:py-12 px-4 sm:px-6 font-sans relative overflow-x-hidden transition-colors duration-500 ${atmosphere.wrapperClass}`}
      style={atmosphere.wrapperStyle}
    >
      {/* Ambient background glow orbs matching theme */}
      <div
        className="fixed -top-32 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-80 rounded-full blur-3xl opacity-35 pointer-events-none -z-10"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none -z-10"
        style={{ backgroundColor: accentColor }}
      />

      <div className="max-w-2xl sm:max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Event Header Banner Card */}
        <div className={`rounded-3xl border shadow-md overflow-hidden ${atmosphere.cardClass}`}>
          {/* Always Visible High-Resolution Event Banner */}
          <div className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center h-52 sm:h-64 md:h-72">
            {/* Blurred background mirror to prevent letterbox voids */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none"
              style={{ backgroundImage: `url(${bannerImageUrl})` }}
            />
            <img
              src={bannerImageUrl}
              alt={form.title}
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';
              }}
              className="w-full h-full object-cover relative z-10 transition-transform duration-300"
            />
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-5 left-6 right-6 text-white z-30">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 inline-block mb-2 shadow-xs">
                Official Registration
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow-md">
                {form.title}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {form.description && (
              <p className={`text-sm leading-relaxed whitespace-pre-line ${atmosphere.descClass}`}>
                {form.description}
              </p>
            )}

            {/* Event Metadata Badges */}
            <div className={`flex flex-wrap items-center gap-2.5 pt-2 border-t ${atmosphere.borderClass} text-xs`}>
              {form.event_date && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium ${atmosphere.metaBadgeClass}`}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
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
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium ${atmosphere.metaBadgeClass}`}>
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{form.venue}</span>
                </div>
              )}

              {form.registration_deadline && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
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
                className={`rounded-2xl p-6 border transition-all duration-300 animate-fade-in ${
                  errors[field.field_key]
                    ? 'border-rose-400 ring-2 ring-rose-200/50 shadow-sm'
                    : atmosphere.cardClass
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
          <div className={`rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${atmosphere.cardClass}`}>
            <div className={`text-xs ${atmosphere.descClass}`}>
              <span className={`font-semibold ${atmosphere.headingClass}`}>Protected Submission:</span> Your
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
        <div className={`text-center text-xs py-4 ${atmosphere.footerText}`}>
          Powered by <span className="font-semibold text-slate-600">EventForm</span> • Secure &
          Fast Event Registration
        </div>
      </div>
    </div>
  );
};
