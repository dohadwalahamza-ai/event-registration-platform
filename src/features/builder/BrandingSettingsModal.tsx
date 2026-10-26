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
      backgroundStyle: 'banner_glass',
      borderRadius: 'xl',
    }
  );
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string>(
    form.theme_config?.customBackgroundColor || '#0f172a'
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

  const solidColorPresets = [
    { name: 'Dark Slate', value: '#0f172a' },
    { name: 'Midnight Navy', value: '#020617' },
    { name: 'Deep Indigo', value: '#1e1b4b' },
    { name: 'Forest Emerald', value: '#022c22' },
    { name: 'Velvet Plum', value: '#3b0764' },
    { name: 'Deep Burgundy', value: '#4c0519' },
    { name: 'Charcoal Zinc', value: '#18181b' },
    { name: 'Cool Slate', value: '#334155' },
    { name: 'Warm Stone', value: '#292524' },
  ];

  const bannerPresets = [
    {
      name: 'Cricket Stadium Turf',
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Football Pitch',
      url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Championship Trophy',
      url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Tech Hackathon & AI',
      url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Conference & Stage',
      url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Music & Festival Lights',
      url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80',
    },
  ];

  const backgroundPresets = [
    {
      id: 'banner_glass',
      name: 'Glass Effect of Banner',
      desc: 'Ambient frosted glass reflection of your banner photo across page background',
      stylePreview: 'bg-indigo-950/80 backdrop-blur-md border-indigo-400/50 text-white',
    },
    {
      id: 'solid_color',
      name: 'Custom Solid Color',
      desc: 'Pick any solid color background (eliminates bright white glare)',
      stylePreview: 'bg-slate-800 border-slate-600 text-white',
    },
    {
      id: 'midnight_dark',
      name: 'Midnight Dark',
      desc: 'Sleek luxury dark theme with glowing neon highlights',
      stylePreview: 'bg-slate-900 border-slate-700 text-white',
    },
    {
      id: 'vibrant_gradient',
      name: 'Vibrant Mesh Gradient',
      desc: 'Rich glowing gradient tailored to your brand accent color',
      stylePreview: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 border-purple-400 text-white',
    },
    {
      id: 'sunset_warm',
      name: 'Sunset Warm',
      desc: 'Warm ambient peach and amber glow',
      stylePreview: 'bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 border-amber-200',
    },
    {
      id: 'emerald_turf',
      name: 'Emerald Turf',
      desc: 'Sports turf athletic green and mint',
      stylePreview: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border-emerald-200',
    },
    {
      id: 'ocean_blue',
      name: 'Ocean Blue',
      desc: 'Deep marine cyan and royal blue',
      stylePreview: 'bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 border-sky-200',
    },
    {
      id: 'soft_minimal',
      name: 'Soft Minimal Slate',
      desc: 'Clean, distraction-free neutral slate (eliminates white glare)',
      stylePreview: 'bg-slate-200 border-slate-300',
    },
    {
      id: 'accent_glow',
      name: 'Accent Glow (Default)',
      desc: 'Light background with subtle brand glow',
      stylePreview: 'bg-gradient-to-br from-indigo-50/80 via-slate-50 to-white border-indigo-200',
    },
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
      theme_config: {
        ...themeConfig,
        customBackgroundColor,
      },
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Event Cover Image / Banner
            </label>
            <span className="text-[11px] text-slate-500">Visible on public registration page</span>
          </div>

          {coverImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-44 mb-3 group shadow-sm">
              <img
                src={coverImageUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 text-white text-xs font-medium">
                Active Cover Preview
              </div>
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="absolute top-3 right-3 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1 text-xs font-semibold px-2.5"
                title="Remove cover"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center mb-3">
              <p className="text-xs text-slate-500 mb-2">No custom banner chosen. A default high-resolution banner will be displayed.</p>
            </div>
          )}

          {/* Banner Upload & Custom URL Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-xl cursor-pointer transition-colors text-xs font-medium text-slate-700">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>Upload Custom Banner File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />
            </label>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
              <span className="text-[11px] text-slate-400 shrink-0 mr-1.5">Image URL:</span>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full py-2 bg-transparent text-slate-800 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Banner Presets Grid */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Or pick from one-click event banner templates:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bannerPresets.map((preset) => {
                const isSelected = coverImageUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCoverImageUrl(preset.url)}
                    className={`relative rounded-xl overflow-hidden border text-left p-1 transition-all group ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-16 w-full rounded-lg overflow-hidden relative bg-slate-900">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors" />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-indigo-600 text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 truncate mt-1 px-1">
                      {preset.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
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

        {/* Background Theme Atmosphere Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Background Theme & Page Atmosphere
            </label>
            <span className="text-[11px] text-slate-500">Live styling for public registration form</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {backgroundPresets.map((bg) => {
              const currentBg = themeConfig.backgroundStyle || 'banner_glass';
              const isSelected = currentBg === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() =>
                    setThemeConfig({
                      ...themeConfig,
                      backgroundStyle: bg.id as any,
                      themeMode: bg.id === 'midnight_dark' ? 'dark' : 'light',
                    })
                  }
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border shrink-0 flex items-center justify-center shadow-xs ${bg.stylePreview}`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-4 h-4 ${
                          bg.id === 'midnight_dark' || bg.id === 'banner_glass' || bg.id === 'vibrant_gradient' || bg.id === 'solid_color'
                            ? 'text-white'
                            : 'text-indigo-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{bg.name}</span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{bg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Solid Color Customizer (Visible when 'solid_color' is selected) */}
          {themeConfig.backgroundStyle === 'solid_color' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Choose Custom Solid Background Color:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Pick color:</span>
                  <input
                    type="color"
                    value={customBackgroundColor}
                    onChange={(e) => setCustomBackgroundColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={customBackgroundColor}
                    onChange={(e) => setCustomBackgroundColor(e.target.value)}
                    placeholder="#0f172a"
                    className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {solidColorPresets.map((sc) => {
                  const isScSelected = customBackgroundColor.toLowerCase() === sc.value.toLowerCase();
                  return (
                    <button
                      key={sc.value}
                      type="button"
                      onClick={() => setCustomBackgroundColor(sc.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isScSelected ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs border border-black/10"
                        style={{ backgroundColor: sc.value }}
                      />
                      <span className="text-slate-700 text-[11px]">{sc.name}</span>
                      {isScSelected && <Check className="w-3 h-3 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
