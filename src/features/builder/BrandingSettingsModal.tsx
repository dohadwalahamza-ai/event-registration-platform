import React, { useState } from 'react';
import { Form, FormThemeConfig } from '../../types';
import { Modal } from '../../generic-ui/components/Modal';
import { Button } from '../../generic-ui/components/Button';
import {
  Palette,
  Image,
  UploadCloud,
  X,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form;
  onSave: (updatedForm: Form) => void;
}

export const BrandingSettingsModal: React.FC<BrandingSettingsModalProps> = ({
  isOpen,
  onClose,
  form,
  onSave,
}) => {
  const [title, setTitle] = useState(form.title);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description);
  const [coverImageUrl, setCoverImageUrl] = useState(form.cover_image_url || '');
  const [eventDate, setEventDate] = useState(form.event_date || '');
  const [eventEndDate, setEventEndDate] = useState(form.event_end_date || '');
  const [venue, setVenue] = useState(form.venue || '');
  const [deadline, setDeadline] = useState(form.registration_deadline || '');
  const [successMessage, setSuccessMessage] = useState(form.success_message);
  const [redirectUrl, setRedirectUrl] = useState(form.redirect_url || '');
  const [themeConfig, setThemeConfig] = useState<FormThemeConfig>(
    form.theme_config || {
      accentColor: '#4f46e5',
      headerStyle: 'banner',
      themeMode: 'light',
      borderRadius: 'xl',
    }
  );

  const colorPresets = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Sky Blue', value: '#0284c7' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Slate Dark', value: '#0f172a' },
  ];

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCoverImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onSave({
      ...form,
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description,
      cover_image_url: coverImageUrl,
      event_date: eventDate,
      event_end_date: eventEndDate,
      venue,
      registration_deadline: deadline,
      success_message: successMessage,
      redirect_url: redirectUrl,
      theme_config: themeConfig,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Details & Branding"
      description="Configure banner cover, event schedule, accent colors, and custom completion messages."
      maxWidth="2xl"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        {/* Banner Cover Image */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
            Event Cover Image / Poster
          </label>
          {coverImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-40">
              <img
                src={coverImageUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="absolute top-3 right-3 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all"
                title="Remove cover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100/60 rounded-2xl cursor-pointer transition-colors">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  Upload Event Banner or Poster
                </span>
                <span className="text-[10px] text-slate-400">Recommended: 1600 x 600 px (PNG/JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  setCoverImageUrl(
                    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80'
                  )
                }
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 py-3 px-4 rounded-xl shrink-0"
              >
                Use Sports Banner
              </button>
            </div>
          )}
        </div>

        {/* Basic Event Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kharghar Premier Cricket League"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Public URL Slug
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
              <span className="text-xs text-slate-400 pl-3">/e/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="event-slug"
                className="w-full px-1 py-2 bg-transparent text-slate-800 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Venue / Location
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Sports Complex, Mumbai"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registration Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Participant Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain rules, schedule, prizes, or eligibility..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Theme Accent Color */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
            Brand Accent Color
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {colorPresets.map((c) => {
              const isSelected = themeConfig.accentColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setThemeConfig({ ...themeConfig, accentColor: c.value })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all"
                  style={{
                    borderColor: isSelected ? c.value : '#e2e8f0',
                    backgroundColor: isSelected ? `${c.value}15` : '#ffffff',
                    color: isSelected ? c.value : '#475569',
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-xs"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>{c.name}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Success Message & Redirect */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Post-Submission Success Message
            </label>
            <textarea
              rows={2}
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Confirmation Redirect URL
            </label>
            <input
              type="url"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://example.com/whatsapp-group-join"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
