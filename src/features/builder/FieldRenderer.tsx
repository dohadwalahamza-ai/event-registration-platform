import React, { useState } from 'react';
import { FormField } from '../../types';
import {
  UploadCloud,
  Camera,
  Star,
  Check,
  AlertCircle,
  FileText,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';

interface FieldRendererProps {
  field: FormField;
  value?: any;
  onChange?: (val: any) => void;
  error?: string;
  disabled?: boolean;
  accentColor?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  accentColor = '#4f46e5',
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    typeof value === 'string' && value.startsWith('http') ? value : null
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isPhoto = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPhoto) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        onChange?.(result);
      };
      reader.readAsDataURL(file);
    } else {
      // Mock / Local store file name & size
      onChange?.({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type,
      });
    }
  };

  // Section Heading Layout Element
  if (field.field_type === 'section_heading') {
    return (
      <div className="pt-6 pb-2 border-b border-slate-200/90 first:pt-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-1.5 h-6 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {field.label}
          </h3>
        </div>
        {field.description && (
          <p className="text-sm text-slate-500 mt-1.5 pl-4 leading-relaxed">
            {field.description}
          </p>
        )}
      </div>
    );
  }

  // Informational Callout Box
  if (field.field_type === 'info_text') {
    return (
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3 my-2">
        <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-950">
          <h4 className="font-semibold">{field.label}</h4>
          {field.description && (
            <p className="mt-1 text-xs text-indigo-800/90 leading-relaxed whitespace-pre-line">
              {field.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Consent Agreement Checkbox
  if (field.field_type === 'consent_checkbox') {
    return (
      <div className="space-y-1.5 pt-2">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700 leading-snug group-hover:text-slate-900 font-medium">
            {field.label} {field.required && <span className="text-rose-500">*</span>}
          </span>
        </label>
        {field.description && (
          <p className="text-xs text-slate-400 pl-7">{field.description}</p>
        )}
        {error && <p className="text-xs text-rose-600 pl-7 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Label and help description */}
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-semibold text-slate-900 leading-snug">
          {field.label}
          {field.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
        {field.validation_rules?.maxLength && (
          <span className="text-[11px] text-slate-400">
            {typeof value === 'string' ? value.length : 0}/{field.validation_rules.maxLength}
          </span>
        )}
      </div>

      {field.description && (
        <p className="text-xs text-slate-500 leading-relaxed">{field.description}</p>
      )}

      {/* Field Input Components */}
      <div className="mt-1">
        {/* Short Text */}
        {field.field_type === 'short_text' && (
          <input
            type="text"
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || 'Your answer'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Long Text */}
        {field.field_type === 'long_text' && (
          <textarea
            rows={4}
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || 'Type your message...'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Email */}
        {field.field_type === 'email' && (
          <input
            type="email"
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || 'name@example.com'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Phone */}
        {field.field_type === 'phone' && (
          <input
            type="tel"
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || '+91 98765 43210'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Number */}
        {field.field_type === 'number' && (
          <input
            type="number"
            value={value !== undefined ? value : ''}
            disabled={disabled}
            min={field.validation_rules?.minValue}
            max={field.validation_rules?.maxValue}
            placeholder={field.placeholder || '0'}
            onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Website URL */}
        {field.field_type === 'website_url' && (
          <input
            type="url"
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || 'https://example.com'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Address */}
        {field.field_type === 'address' && (
          <textarea
            rows={2}
            value={value || ''}
            disabled={disabled}
            placeholder={field.placeholder || 'Apartment/Flat, Street, City, State, PIN code'}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Date Picker */}
        {field.field_type === 'date' && (
          <input
            type="date"
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Time Picker */}
        {field.field_type === 'time' && (
          <input
            type="time"
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Datetime Picker */}
        {field.field_type === 'datetime' && (
          <input
            type="datetime-local"
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          />
        )}

        {/* Radio options */}
        {field.field_type === 'radio' && (
          <div className="space-y-2">
            {(field.options || []).map((opt) => {
              const isSelected = value === opt.value;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={field.field_key}
                    value={opt.value}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onChange?.(opt.value)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Checkbox (Multi-select) */}
        {field.field_type === 'checkbox' && (
          <div className="space-y-2">
            {(field.options || []).map((opt) => {
              const currentList = Array.isArray(value) ? value : [];
              const isChecked = currentList.includes(opt.value);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
                    isChecked
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange?.([...currentList, opt.value]);
                      } else {
                        onChange?.(currentList.filter((v: any) => v !== opt.value));
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Dropdown */}
        {field.field_type === 'dropdown' && (
          <select
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
            }`}
          >
            <option value="">-- Choose an option --</option>
            {(field.options || []).map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Yes / No Toggle buttons */}
        {field.field_type === 'yes_no' && (
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(true)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                value === true
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Check className="w-4 h-4" />
              Yes
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(false)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                value === false
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <X className="w-4 h-4" />
              No
            </button>
          </div>
        )}

        {/* Photo Upload with live preview */}
        {field.field_type === 'photo_upload' && (
          <div className="space-y-3">
            {photoPreview ? (
              <div className="relative inline-block border-2 border-indigo-200 rounded-2xl p-1 bg-white shadow-xs">
                <img
                  src={photoPreview}
                  alt="Uploaded preview"
                  className="w-32 h-32 object-cover rounded-xl"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      onChange?.(null);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all group">
                  <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                    Click or drag photo here
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG or WebP up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                </label>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      const sampleImg = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
                      setPhotoPreview(sampleImg);
                      onChange?.(sampleImg);
                    }}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
                  >
                    + Or use sample player photo
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        {field.field_type === 'file_upload' && (
          <div>
            {value && typeof value === 'object' ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-medium">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>{value.name}</span>
                  <span className="text-indigo-400 text-[11px]">({value.size})</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onChange?.(null)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50 rounded-xl cursor-pointer transition-all text-xs font-medium text-slate-700">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                <span>Upload document or certificate</span>
                <input
                  type="file"
                  disabled={disabled}
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Interactive Star Rating */}
        {field.field_type === 'rating' && (
          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((starNum) => {
              const isFilled = (value || 0) >= starNum;
              return (
                <button
                  key={starNum}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange?.(starNum)}
                  className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                  aria-label={`${starNum} stars`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      isFilled
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 hover:text-amber-300'
                    } transition-colors`}
                  />
                </button>
              );
            })}
            {value > 0 && (
              <span className="ml-2 text-xs font-semibold text-slate-600">
                {value} of 5 stars
              </span>
            )}
          </div>
        )}
      </div>

      {/* Validation error display */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-600 font-medium pt-1 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
