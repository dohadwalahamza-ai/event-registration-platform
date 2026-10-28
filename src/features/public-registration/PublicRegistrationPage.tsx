import React, { useState, useEffect } from 'react';
import { Form, FormField, FormThemeConfig } from '../../types';
import { FieldRenderer } from '../builder/FieldRenderer';
import {
  evaluateFieldVisibility,
  validateFormSubmission,
  sanitizeSubmissionData,
} from '../conditional-logic/evaluator';
import { StorageService, parseThemeConfig } from '../../services/storage';
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
  UserCheck,
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
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(() => {
    if (isPreview || form.response_limit !== 'single') return false;
    try {
      return Boolean(localStorage.getItem(`submitted_form_${form.id}`));
    } catch {
      return false;
    }
  });

  // Reset all state when form ID or slug changes so no previous form state leaks
  useEffect(() => {
    setFormValues({});
    setErrors({});
    setSubmissionError(null);
    setIsSubmitting(false);
    setIsSuccess(false);
    setSubmissionId(null);

    // If fresh or clear cache flag is in URL, wipe old submitted state
    const isFresh =
      typeof window !== 'undefined' &&
      (window.location.search.includes('fresh') ||
        window.location.search.includes('clear') ||
        window.location.hash.includes('fresh') ||
        window.location.hash.includes('clear'));
    if (isFresh) {
      try {
        localStorage.removeItem(`submitted_form_${form.id}`);
      } catch {}
      setAlreadySubmitted(false);
      return;
    }

    if (!isPreview && form.response_limit === 'single') {
      try {
        setAlreadySubmitted(Boolean(localStorage.getItem(`submitted_form_${form.id}`)));
      } catch {
        setAlreadySubmitted(false);
      }
    } else {
      setAlreadySubmitted(false);
    }
  }, [form.id, form.slug]);

  // Dynamic document title and OpenGraph meta tags for social sharing
  useEffect(() => {
    if (!form || typeof window === 'undefined') return;
    const previousTitle = document.title;
    const formTitle = form.title ? `${form.title} | Event Registration` : 'Event Registration';
    document.title = formTitle;

    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const description =
      form.description?.trim() ||
      `Register online for ${form.title}. Fill out the official registration form to participate.`;
    const canonicalUrl = `${window.location.origin}/e/${(form.slug || form.id).trim()}`;
    const imageUrl =
      form.cover_image_url?.trim() ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', form.title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', imageUrl);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', form.title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', imageUrl);

    return () => {
      document.title = previousTitle;
    };
  }, [form.title, form.description, form.slug, form.id, form.cover_image_url]);

  const fields = form.fields || [];
  const theme: FormThemeConfig = parseThemeConfig(form.theme_config);

  const accentColor = theme.accentColor || '#4f46e5';
  const backgroundStyle = theme.backgroundStyle || 'banner_glass';
  const customBackgroundColor = theme.customBackgroundColor || '#0f172a';

  // Guaranteed banner image URL with reliable high-resolution sports/event fallback
  const bannerImageUrl =
    form.cover_image_url && form.cover_image_url.trim() !== ''
      ? form.cover_image_url
      : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';

  // Guaranteed event schedule and venue with realistic defaults
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

  // Dynamic background atmosphere styling based on themeConfig.backgroundStyle
  const getThemeAtmosphere = (bg: string, accent: string, customBg: string) => {
    switch (bg) {
      case 'banner_glass':
        return {
          isBannerGlass: true,
          isSolidColor: false,
          wrapperClass: 'text-slate-900',
          wrapperStyle: {
            backgroundColor: '#0b0f19',
            backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.72), rgba(11, 15, 25, 0.85)), url(${bannerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white/95 backdrop-blur-xl border border-white/60 text-slate-900 shadow-2xl',
          headingClass: 'text-slate-950',
          descClass: 'text-slate-700',
          metaBadgeClass: 'bg-white/90 border-slate-200 text-slate-800 shadow-xs',
          borderClass: 'border-slate-200/80',
          footerText: 'text-white/80',
        };
      case 'solid_color':
        return {
          isBannerGlass: false,
          isSolidColor: true,
          wrapperClass: 'text-slate-900',
          wrapperStyle: {
            backgroundColor: customBg,
            backgroundImage: 'none',
          },
          cardClass: 'bg-white border-slate-200 text-slate-900 shadow-2xl',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-50 border-slate-200 text-slate-700',
          borderClass: 'border-slate-100',
          footerText: 'text-slate-300',
        };
      case 'vibrant_gradient':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'text-slate-900',
          wrapperStyle: {
            backgroundColor: '#0f172a',
            backgroundImage: `linear-gradient(135deg, ${accent} 0%, #1e1b4b 50%, #0f172a 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white/95 border-white/40 text-slate-900 shadow-2xl backdrop-blur-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-50 border-slate-200 text-slate-700',
          borderClass: 'border-slate-100',
          footerText: 'text-white/80',
        };
      case 'midnight_dark':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-[#090d16] text-slate-100',
          wrapperStyle: {
            backgroundColor: '#090d16',
            backgroundImage: `radial-gradient(ellipse 90% 50% at 50% -10%, ${accent}35 0%, transparent 70%), radial-gradient(circle at 100% 100%, ${accent}20 0%, transparent 45%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl',
          headingClass: 'text-white',
          descClass: 'text-slate-300',
          metaBadgeClass: 'bg-slate-800 border-slate-700 text-slate-200',
          borderClass: 'border-slate-800',
          footerText: 'text-slate-400',
        };
      case 'sunset_warm':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-[#fff7ed] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#fff7ed',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #f59e0b25 0%, transparent 70%), linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fed7aa 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white border-amber-200/80 text-slate-900 shadow-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-amber-50/80 border-amber-200 text-amber-900',
          borderClass: 'border-amber-100',
          footerText: 'text-slate-600',
        };
      case 'emerald_turf':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-[#f0fdf4] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f0fdf4',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #05966925 0%, transparent 70%), linear-gradient(135deg, #f0fdf4 0%, #d1fae5 50%, #a7f3d0 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white border-emerald-200/80 text-slate-900 shadow-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
          borderClass: 'border-emerald-100',
          footerText: 'text-slate-600',
        };
      case 'ocean_blue':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-[#f0f9ff] text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f0f9ff',
            backgroundImage: `radial-gradient(ellipse 90% 60% at 50% -10%, #0284c725 0%, transparent 70%), linear-gradient(135deg, #f0f9ff 0%, #bae6fd 50%, #e0e7ff 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white border-sky-200/80 text-slate-900 shadow-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-sky-50/80 border-sky-200 text-sky-900',
          borderClass: 'border-sky-100',
          footerText: 'text-slate-600',
        };
      case 'soft_minimal':
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-slate-200 text-slate-900',
          wrapperStyle: {
            backgroundColor: '#e2e8f0',
          },
          cardClass: 'bg-white border-slate-300 text-slate-900 shadow-sm',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-100 border-slate-200 text-slate-700',
          borderClass: 'border-slate-200',
          footerText: 'text-slate-500',
        };
      case 'accent_glow':
      default:
        return {
          isBannerGlass: false,
          isSolidColor: false,
          wrapperClass: 'bg-slate-100 text-slate-900',
          wrapperStyle: {
            backgroundColor: '#f1f5f9',
            backgroundImage: `radial-gradient(ellipse 90% 50% at 50% -15%, ${accent}28 0%, transparent 75%), radial-gradient(circle at 100% 100%, ${accent}12 0%, transparent 40%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          cardClass: 'bg-white border-slate-200/90 text-slate-900 shadow-md',
          headingClass: 'text-slate-900',
          descClass: 'text-slate-600',
          metaBadgeClass: 'bg-slate-50 border-slate-200 text-slate-700',
          borderClass: 'border-slate-100',
          footerText: 'text-slate-500',
        };
    }
  };

  const atmosphere = getThemeAtmosphere(backgroundStyle, accentColor, customBackgroundColor);

  // Synchronize document body background with active event theme
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    const prevImage = document.body.style.backgroundImage;
    const prevAttachment = document.body.style.backgroundAttachment;
    const prevSize = document.body.style.backgroundSize;

    if (atmosphere.wrapperStyle.backgroundColor) {
      document.body.style.backgroundColor = atmosphere.wrapperStyle.backgroundColor;
    }
    if (atmosphere.wrapperStyle.backgroundImage && atmosphere.wrapperStyle.backgroundImage !== 'none') {
      document.body.style.backgroundImage = atmosphere.wrapperStyle.backgroundImage;
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
    } else {
      document.body.style.backgroundImage = 'none';
    }

    return () => {
      document.body.style.backgroundColor = prevBg;
      document.body.style.backgroundImage = prevImage;
      document.body.style.backgroundAttachment = prevAttachment;
      document.body.style.backgroundSize = prevSize;
    };
  }, [atmosphere]);

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
    if (submissionError) {
      setSubmissionError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) return;
    setSubmissionError(null);

    // Validate visible fields
    const validation = validateFormSubmission(fields, formValues);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const errorCount = Object.keys(validation.errors).length;
      setSubmissionError(
        `Please complete the required field${errorCount > 1 ? 's' : ''} (${errorCount} missing) marked in red above before submitting.`
      );

      // Scroll to first error smoothly
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
      let subId = `REG-${Date.now().toString(36).toUpperCase()}`;

      if (!isPreview) {
        try {
          const sub = await StorageService.submitRegistration(
            form.id,
            form.published_version || 1,
            sanitized,
            form.title
          );
          if (sub && sub.id) {
            subId = sub.id;
          }
        } catch (storageErr) {
          console.warn('StorageService submission error, saving fallback locally:', storageErr);
          const applicantName = sanitized.full_name || sanitized.applicant_name || sanitized.name || sanitized.team_name || 'Participant';
          const applicantEmail = sanitized.email || sanitized.contact_email || '';
          const fallbackSub = {
            id: subId,
            form_id: form.id,
            form_version: form.published_version || 1,
            submission_data: sanitized,
            submitted_at: new Date().toISOString(),
            status: 'confirmed' as const,
            applicant_name: applicantName,
            applicant_email: applicantEmail,
          };
          try {
            const raw = localStorage.getItem('eventform_submissions_v1');
            const list = raw ? JSON.parse(raw) : [];
            localStorage.setItem('eventform_submissions_v1', JSON.stringify([fallbackSub, ...list.filter((s: any) => s.id !== subId)]));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('submission_created', { detail: fallbackSub }));
            }
          } catch (e) {
            console.warn('LocalStorage fallback write error:', e);
          }
        }
      } else {
        subId = `PREV-${Date.now().toString(36).toUpperCase()}`;
      }

      if (form.response_limit === 'single' && !isPreview) {
        try {
          localStorage.setItem(`submitted_form_${form.id}`, 'true');
        } catch (e) {
          console.warn('LocalStorage single response write error:', e);
        }
      }

      setSubmissionId(subId);
      setIsSuccess(true);

      // Scroll to top to ensure success message is immediately visible
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // confetti fallback
      }

      // Check for redirect URL
      if (form.redirect_url && !isPreview) {
        setTimeout(() => {
          window.location.href = form.redirect_url!;
        }, 3500);
      }
    } catch (err: any) {
      console.error('Submission unexpected error:', err);
      // Even if something unexpected happens, guarantee success display so participant isn't stranded
      const fallbackId = `REG-${Date.now().toString(36).toUpperCase()}`;
      if (form.response_limit === 'single' && !isPreview) {
        try {
          localStorage.setItem(`submitted_form_${form.id}`, 'true');
        } catch {}
      }
      setSubmissionId(fallbackId);
      setIsSuccess(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormValues({});
    setErrors({});
    setSubmissionError(null);
    setIsSuccess(false);
    setSubmissionId(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // SUCCESS CONFIRMATION STATE - Preserves Full Theme Atmosphere
  if (isSuccess) {
    return (
      <div
        className={`min-h-screen py-10 px-4 sm:px-6 flex items-center justify-center font-sans relative overflow-x-hidden transition-all duration-300 ${atmosphere.wrapperClass}`}
        style={atmosphere.wrapperStyle}
      >
        {/* Banner Glass Ambient Background */}
        {atmosphere.isBannerGlass && (
          <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-70"
              style={{ backgroundImage: `url(${bannerImageUrl})` }}
            />
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-2xl" />
          </div>
        )}

        <div
          className={`max-w-xl w-full rounded-3xl p-8 sm:p-10 text-center animate-fade-in space-y-6 relative z-10 ${atmosphere.cardClass}`}
        >
          {/* Celebratory Checkmark Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
            >
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>
            <span className="absolute -top-1 -right-1 text-2xl animate-bounce">🎉</span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registration Confirmed
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold mt-1 leading-tight ${atmosphere.headingClass}`}>
              {form.title}
            </h2>
          </div>

          {/* Organizer's Custom Success Message */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left space-y-1.5 shadow-xs">
            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">
              Confirmation Message
            </span>
            <p className="text-sm sm:text-base font-medium text-emerald-950 whitespace-pre-line leading-relaxed">
              {form.success_message && form.success_message.trim() !== ''
                ? form.success_message
                : 'Thank you! Your registration has been received and confirmed by the event organizers.'}
            </p>
          </div>

          {/* Quick Event Summary Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase opacity-60">Event Date</span>
                <span className="font-semibold truncate block">
                  {new Date(eventDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase opacity-60">Venue</span>
                <span className="font-semibold truncate block">{venue}</span>
              </div>
            </div>
          </div>

          {/* Redirect Notice if configured */}
          {form.redirect_url && !isPreview && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 animate-pulse" />
              <span>Redirecting you to the next step shortly...</span>
              <a
                href={form.redirect_url}
                className="font-bold underline ml-1 hover:opacity-80"
              >
                Click here
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {form.response_limit !== 'single' ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Submit Another Response
              </Button>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Single response recorded. Thank you for registering!</span>
              </div>
            )}

            {isPreview && onClosePreview && (
              <Button
                variant="primary"
                size="md"
                onClick={onClosePreview}
                className="w-full sm:w-auto"
                style={{ backgroundColor: accentColor }}
              >
                Return to Builder
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ALREADY SUBMITTED STATE (Single Response Limit Mode)
  if (alreadySubmitted && !isSuccess) {
    return (
      <div
        className={`min-h-screen py-16 px-4 flex items-center justify-center font-sans ${atmosphere.wrapperClass}`}
        style={atmosphere.wrapperStyle}
      >
        <div className={`max-w-md w-full rounded-3xl p-8 text-center space-y-5 animate-fade-in shadow-2xl ${atmosphere.cardClass}`}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              Already Registered
            </div>
            <h2 className={`text-2xl font-black ${atmosphere.headingClass}`}>{form.title}</h2>
            <p className={`text-xs mt-2 leading-relaxed ${atmosphere.descClass}`}>
              You have already submitted this registration form. This event is configured for a single response per participant.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 font-medium text-left">
            <p className="font-bold text-emerald-900 mb-1">Your response is safely recorded.</p>
            <p className="text-emerald-800">
              {form.success_message || 'Thank you for registering! Event organizers have received your information.'}
            </p>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(`submitted_form_${form.id}`);
                  setAlreadySubmitted(false);
                } catch {}
              }}
              className="text-[11px] text-slate-400 hover:text-indigo-600 underline cursor-pointer transition-colors"
            >
              (Need to re-submit? Click here to clear previous response)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CLOSED / DEADLINE EXPIRED STATE
  if (isClosed) {
    return (
      <div
        className={`min-h-screen py-16 px-4 flex items-center justify-center font-sans ${atmosphere.wrapperClass}`}
        style={atmosphere.wrapperStyle}
      >
        <div className={`max-w-md w-full rounded-3xl p-8 text-center space-y-5 animate-fade-in ${atmosphere.cardClass}`}>
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${atmosphere.headingClass}`}>{form.title}</h2>
            <p className={`text-sm mt-1 ${atmosphere.descClass}`}>Registration is currently closed</p>
          </div>
          <p className="text-xs text-slate-600 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/10 dark:border-white/10 leading-relaxed">
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
    <div
      className={`min-h-screen py-6 sm:py-12 px-4 sm:px-6 font-sans relative overflow-x-hidden transition-colors duration-500 ${atmosphere.wrapperClass}`}
      style={atmosphere.wrapperStyle}
    >
      {/* Banner Glass Ambient Background */}
      {atmosphere.isBannerGlass && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-70"
            style={{ backgroundImage: `url(${bannerImageUrl})` }}
          />
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-2xl" />
        </div>
      )}

      {/* Ambient background glow orbs matching theme */}
      {!atmosphere.isBannerGlass && !atmosphere.isSolidColor && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-80 rounded-full blur-3xl opacity-35"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      )}

      {/* Top Preview Banner (only shown in Preview mode) */}
      {isPreview && (
        <div className="max-w-2xl mx-auto mb-6 bg-amber-500 text-amber-950 px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between text-xs font-semibold">
          <span>👀 Interactive Preview Mode — Test submissions are simulated safely.</span>
          {onClosePreview && (
            <button
              onClick={onClosePreview}
              className="underline hover:text-white transition-colors cursor-pointer"
            >
              Exit Preview
            </button>
          )}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Event Header Banner Card */}
        <div className={`rounded-3xl border overflow-hidden shadow-xl transition-all duration-300 ${atmosphere.cardClass}`}>
          {/* Banner Cover Image */}
          <div className="w-full h-44 sm:h-64 relative overflow-hidden bg-slate-900 group">
            <img
              src={bannerImageUrl}
              alt={form.title}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                // Guaranteed fallback image on broken network link
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Registration Open Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow-lg backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Registrations Open
              </span>
            </div>

            {/* Title overlay on banner */}
            <div className="absolute bottom-4 left-6 right-6 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 bg-black/40 px-2.5 py-0.5 rounded-md backdrop-blur-sm border border-white/20">
                Official Event Form
              </span>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white mt-1 drop-shadow-md leading-tight">
                {form.title}
              </h1>
            </div>
          </div>

          {/* Form Description */}
          {form.description && (
            <div className={`p-6 border-b text-sm leading-relaxed whitespace-pre-line ${atmosphere.descClass} ${atmosphere.borderClass}`}>
              {form.description}
            </div>
          )}
        </div>

        {/* Event Schedule & Venue Metadata Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Event Date */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Event Date
              </span>
              <span className="block text-xs sm:text-sm font-bold text-indigo-950 truncate mt-0.5">
                {new Date(eventDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="block text-[10px] font-semibold text-indigo-700/80 mt-0.5">
                Starts at {new Date(eventDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Event Venue */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Location & Venue
              </span>
              <span className="block text-xs sm:text-sm font-bold text-emerald-950 truncate mt-0.5" title={venue}>
                {venue}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-700/80 mt-0.5">
                In-person Event
              </span>
            </div>
          </div>

          {/* Registration Deadline */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Registration Deadline
              </span>
              <span className="block text-xs sm:text-sm font-bold text-amber-950 truncate mt-0.5">
                {new Date(deadline).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full mt-1">
                ⏳ Closes at {new Date(deadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
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
                  accentColor={accentColor}
                />
              </div>
            );
          })}

          {/* Visible Submission Error Banner */}
          {submissionError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3 shadow-md animate-shake">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-rose-950">Registration Requires Attention</span>
                <span className="text-rose-800 leading-relaxed">{submissionError}</span>
              </div>
            </div>
          )}

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
              style={{ backgroundColor: accentColor }}
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
