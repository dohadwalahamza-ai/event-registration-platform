import React, { useState } from 'react';
import { FormField, FormFieldType, FieldOption, ConditionalRuleGroup } from '../../types';
import { ConditionalRuleEditor } from '../conditional-logic/ConditionalRuleEditor';
import {
  Settings,
  ListPlus,
  ShieldAlert,
  GitFork,
  Trash2,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface FieldConfigPanelProps {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updatedField: FormField) => void;
  onClose: () => void;
}

export const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({
  field,
  allFields,
  onUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'options' | 'validation' | 'logic'>('general');
  const [showTypeWarning, setShowTypeWarning] = useState(false);

  const handleTypeChange = (newType: FormFieldType) => {
    if (newType === field.field_type) return;

    const isNowChoice = ['radio', 'checkbox', 'dropdown'].includes(newType);
    let updatedOptions = field.options;
    if (isNowChoice && (!updatedOptions || updatedOptions.length === 0)) {
      updatedOptions = [
        { id: `opt-1`, label: 'Option 1', value: 'Option 1' },
        { id: `opt-2`, label: 'Option 2', value: 'Option 2' },
      ];
    }

    setShowTypeWarning(true);

    onUpdate({
      ...field,
      field_type: newType,
      options: updatedOptions,
      required: ['section_heading', 'info_text'].includes(newType) ? false : field.required,
    });
  };

  const handleUpdate = (patch: Partial<FormField>) => {
    onUpdate({
      ...field,
      ...patch,
    });
  };

  const handleValidationUpdate = (patch: Partial<FormField['validation_rules']>) => {
    onUpdate({
      ...field,
      validation_rules: {
        ...(field.validation_rules || {}),
        ...patch,
      },
    });
  };

  // Option management for choice/radio/checkbox/dropdown
  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const count = currentOptions.length + 1;
    const newOption: FieldOption = {
      id: `opt-${Math.random().toString(36).substring(2, 7)}`,
      label: `Option ${count}`,
      value: `option_${count}`,
    };
    handleUpdate({ options: [...currentOptions, newOption] });
  };

  const handleUpdateOption = (id: string, label: string) => {
    const currentOptions = field.options || [];
    handleUpdate({
      options: currentOptions.map((opt) =>
        opt.id === id ? { ...opt, label, value: label } : opt
      ),
    });
  };

  const handleRemoveOption = (id: string) => {
    const currentOptions = field.options || [];
    handleUpdate({
      options: currentOptions.filter((opt) => opt.id !== id),
    });
  };

  const isChoiceField = ['radio', 'checkbox', 'dropdown'].includes(field.field_type);
  const isTextField = ['short_text', 'long_text', 'address'].includes(field.field_type);
  const isNumberField = field.field_type === 'number';
  const isMediaField = ['file_upload', 'photo_upload'].includes(field.field_type);

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 w-80 lg:w-96 shadow-xl animate-fade-in z-20">
      {/* Header */}
      <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            {field.field_type.replace('_', ' ')}
          </span>
          <h3 className="text-sm font-bold text-slate-800 mt-1 truncate max-w-[220px]">
            {field.label || 'Configure Question'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/30 text-xs font-semibold px-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          General
        </button>

        {isChoiceField && (
          <button
            onClick={() => setActiveTab('options')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'options'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            Options
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {field.options?.length || 0}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('validation')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all ${
            activeTab === 'validation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Validation
        </button>

        <button
          onClick={() => setActiveTab('logic')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all ${
            activeTab === 'logic'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          Logic
          {field.conditional_rules && (
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold text-xs">
                  Question Type
                </label>
                <span className="text-[10px] text-indigo-600 font-medium">Change anytime</span>
              </div>
              <select
                value={field.field_type}
                onChange={(e) => handleTypeChange(e.target.value as FormFieldType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                <optgroup label="Text Inputs">
                  <option value="short_text">Short Text (Single line)</option>
                  <option value="long_text">Paragraph / Long Text (Multi-line)</option>
                  <option value="email">Email Address</option>
                  <option value="phone">Phone Number</option>
                  <option value="number">Number</option>
                  <option value="address">Address</option>
                  <option value="website_url">Website URL</option>
                </optgroup>
                <optgroup label="Choices & Options">
                  <option value="dropdown">Dropdown Selection</option>
                  <option value="radio">Radio Buttons (Single choice)</option>
                  <option value="checkbox">Checkboxes (Multiple choice)</option>
                  <option value="yes_no">Yes / No Switch</option>
                  <option value="consent_checkbox">Consent / Agreement Checkbox</option>
                </optgroup>
                <optgroup label="Date & Time">
                  <option value="date">Date Picker</option>
                  <option value="time">Time</option>
                  <option value="datetime">Date & Time</option>
                </optgroup>
                <optgroup label="Uploads & Media">
                  <option value="photo_upload">Photo / Profile Upload</option>
                  <option value="file_upload">Document / File Upload</option>
                </optgroup>
                <optgroup label="Structure & Layout">
                  <option value="section_heading">Section Divider / Heading</option>
                  <option value="info_text">Informational Callout</option>
                  <option value="rating">Rating (1 to 5 Stars)</option>
                </optgroup>
              </select>

              {showTypeWarning && (
                <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Question type updated. Question title and settings are preserved.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Question Title / Label
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleUpdate({ label: e.target.value })}
                placeholder="e.g. Full Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Help Text / Description
              </label>
              <textarea
                rows={2}
                value={field.description || ''}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                placeholder="Give instructions to respondents..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {!['section_heading', 'info_text', 'consent_checkbox'].includes(field.field_type) && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => handleUpdate({ placeholder: e.target.value })}
                  placeholder="e.g. Enter your response..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Field Identifier Key
              </label>
              <input
                type="text"
                value={field.field_key}
                onChange={(e) =>
                  handleUpdate({
                    field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                  })
                }
                className="w-full font-mono text-[11px] px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Unique database column key used to preserve submissions.
              </p>
            </div>

            {!['section_heading', 'info_text'].includes(field.field_type) && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div>
                    <span className="font-semibold text-slate-800">Required Field</span>
                    <p className="text-[11px] text-slate-400">
                      Participants cannot submit without answering
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => handleUpdate({ required: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OPTIONS */}
        {activeTab === 'options' && isChoiceField && (
          <div className="space-y-4">
            {/* Single vs Multiple choice answer mode */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Answer Selection Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleUpdate({ field_type: 'radio' })}
                  className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                    field.field_type === 'radio' || field.field_type === 'dropdown'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Choice
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ field_type: 'checkbox' })}
                  className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                    field.field_type === 'checkbox'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Multiple Choices
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {field.field_type === 'checkbox'
                  ? 'Respondents can select multiple answers (Checkboxes).'
                  : 'Respondents can select only one answer (Radio buttons).'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-700">Choice Options</span>
              <button
                onClick={handleAddOption}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Option
              </button>
            </div>

            <div className="space-y-2">
              {(field.options || []).map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleUpdateOption(opt.id, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  {(field.options || []).length > 1 && (
                    <button
                      onClick={() => handleRemoveOption(opt.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VALIDATION */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            {isTextField && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Min Characters
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={field.validation_rules?.minLength || ''}
                    onChange={(e) =>
                      handleValidationUpdate({
                        minLength: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Max Characters
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={field.validation_rules?.maxLength || ''}
                    onChange={(e) =>
                      handleValidationUpdate({
                        maxLength: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {isNumberField && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Min Value
                  </label>
                  <input
                    type="number"
                    value={
                      field.validation_rules?.minValue !== undefined
                        ? field.validation_rules.minValue
                        : ''
                    }
                    onChange={(e) =>
                      handleValidationUpdate({
                        minValue: e.target.value !== '' ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Max Value
                  </label>
                  <input
                    type="number"
                    value={
                      field.validation_rules?.maxValue !== undefined
                        ? field.validation_rules.maxValue
                        : ''
                    }
                    onChange={(e) =>
                      handleValidationUpdate({
                        maxValue: e.target.value !== '' ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {isMediaField && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={field.validation_rules?.maxFileSizeMB || 5}
                  onChange={(e) =>
                    handleValidationUpdate({
                      maxFileSizeMB: Number(e.target.value) || 5,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Custom Error Message
              </label>
              <input
                type="text"
                value={field.validation_rules?.customErrorMessage || ''}
                placeholder="e.g. Please enter a valid 10-digit number"
                onChange={(e) =>
                  handleValidationUpdate({
                    customErrorMessage: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* TAB 4: LOGIC */}
        {activeTab === 'logic' && (
          <ConditionalRuleEditor
            currentField={field}
            allFields={allFields}
            onChange={(rulesGroup) => handleUpdate({ conditional_rules: rulesGroup })}
          />
        )}
      </div>
    </div>
  );
};
