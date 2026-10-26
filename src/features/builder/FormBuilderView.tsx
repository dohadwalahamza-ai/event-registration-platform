import React, { useState } from 'react';
import { Form, FormField, FormFieldType } from '../../types';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldConfigPanel } from './FieldConfigPanel';
import { BrandingSettingsModal } from './BrandingSettingsModal';
import { PublishShareModal } from './PublishShareModal';
import { FIELD_DEFINITIONS } from './fieldRegistry';
import { PublicRegistrationPage } from '../public-registration/PublicRegistrationPage';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Share2,
  Palette,
  Sparkles,
  CheckCircle2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';

interface FormBuilderViewProps {
  initialForm: Form;
  onBack: () => void;
  onSaveForm: (form: Form) => Promise<void>;
  onViewResponses: (formId: string) => void;
  onOpenLivePublicPage: (slug: string) => void;
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  initialForm,
  onBack,
  onSaveForm,
  onViewResponses,
  onOpenLivePublicPage,
}) => {
  const [form, setForm] = useState<Form>(initialForm);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    initialForm.fields?.[0]?.id || null
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { success, error } = useToast();

  const fields = form.fields || [];
  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  // Add field from palette
  const handleAddField = (type: FormFieldType) => {
    const def = FIELD_DEFINITIONS.find((d) => d.type === type);
    const count = fields.length + 1;
    const key = `${type}_${Math.random().toString(36).substring(2, 6)}`;

    const newField: FormField = {
      id: `f-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      form_id: form.id,
      field_key: key,
      label: def?.defaultLabel || `Question ${count}`,
      description: def?.defaultDescription || '',
      placeholder: def?.defaultPlaceholder || '',
      field_type: type,
      required: !['section_heading', 'info_text', 'website_url'].includes(type),
      sort_order: count,
      options: def?.hasOptions
        ? [
            { id: 'opt-1', label: 'Option 1', value: 'Option 1' },
            { id: 'opt-2', label: 'Option 2', value: 'Option 2' },
          ]
        : undefined,
    };

    setForm((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
    setSelectedFieldId(newField.id);
    setHasUnsavedChanges(true);
    success('Question Added', `${newField.label} added to form.`);
  };

  // Update a field from inspector
  const handleUpdateField = (updatedField: FormField) => {
    setForm((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((f) => (f.id === updatedField.id ? updatedField : f)),
    }));
    setHasUnsavedChanges(true);
  };

  // Move field up/down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Update sort orders
    const updated = reordered.map((f, idx) => ({ ...f, sort_order: idx + 1 }));
    setForm((prev) => ({ ...prev, fields: updated }));
    setHasUnsavedChanges(true);
  };

  // Duplicate a field
  const handleDuplicateField = (fieldToDuplicate: FormField) => {
    const newField: FormField = {
      ...fieldToDuplicate,
      id: `f-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      field_key: `${fieldToDuplicate.field_key}_copy_${Math.floor(Math.random() * 900 + 100)}`,
      label: `${fieldToDuplicate.label} (Copy)`,
      sort_order: fields.length + 1,
    };

    setForm((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
    setSelectedFieldId(newField.id);
    setHasUnsavedChanges(true);
    success('Question Duplicated', `${newField.label} created.`);
  };

  // Delete a field
  const handleDeleteField = (fieldId: string) => {
    const filtered = fields.filter((f) => f.id !== fieldId);
    setForm((prev) => ({ ...prev, fields: filtered }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(filtered[0]?.id || null);
    }
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveForm(form);
      setHasUnsavedChanges(false);
      success('Form Saved', 'All questions and configurations saved successfully.');
    } catch (err) {
      error('Save Failed', 'Could not save form configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'draft' | 'published' | 'closed') => {
    const updated = { ...form, status: newStatus };
    setForm(updated);
    await onSaveForm(updated);
    success(
      `Status: ${newStatus.toUpperCase()}`,
      newStatus === 'published'
        ? 'Form is live and accepting submissions.'
        : 'Form status updated.'
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8 bg-slate-100 overflow-hidden">
      {/* Top Builder Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back & Title info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to All Forms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {form.title || 'Untitled Form'}
            </h2>
            <Badge
              variant={
                form.status === 'published'
                  ? 'success'
                  : form.status === 'closed'
                  ? 'danger'
                  : 'warning'
              }
              size="sm"
              dot
            >
              {form.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* View Responses shortcut */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewResponses(form.id)}
            leftIcon={<Inbox className="w-3.5 h-3.5" />}
            className="hidden sm:inline-flex"
          >
            Responses
          </Button>

          {/* Event Branding & Theme */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBrandingOpen(true)}
            leftIcon={<Palette className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Theme & Banner
          </Button>

          {/* Live Preview Toggle */}
          <Button
            size="sm"
            variant={isPreviewMode ? 'secondary' : 'outline'}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            leftIcon={
              isPreviewMode ? (
                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-600" />
              )
            }
          >
            {isPreviewMode ? 'Edit Mode' : 'Preview'}
          </Button>

          {/* Publish / Share Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsShareModalOpen(true)}
            leftIcon={<Share2 className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Share
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            variant="primary"
            isLoading={isSaving}
            onClick={handleSave}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {hasUnsavedChanges ? 'Save Changes*' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Main Builder Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {isPreviewMode ? (
          /* Live Interactive Participant Preview */
          <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto mb-4 bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-2xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Participant Preview Mode — test your conditional logic in real time!
              </span>
              <button
                onClick={() => setIsPreviewMode(false)}
                className="font-bold underline hover:text-indigo-950"
              >
                Back to Canvas
              </button>
            </div>
            <PublicRegistrationPage
              form={form}
              isPreview
              onClosePreview={() => setIsPreviewMode(false)}
            />
          </div>
        ) : (
          /* Canvas Editor View */
          <>
            {/* Left Palette */}
            <FieldPalette onAddField={handleAddField} />

            {/* Center Canvas */}
            <FormCanvas
              form={form}
              selectedFieldId={selectedFieldId}
              onSelectField={(id) => setSelectedFieldId(id)}
              onMoveField={handleMoveField}
              onDuplicateField={handleDuplicateField}
              onDeleteField={handleDeleteField}
              onOpenBranding={() => setIsBrandingOpen(true)}
              onOpenFieldLibrary={() => {}}
            />

            {/* Right Inspector Panel */}
            {selectedField && (
              <FieldConfigPanel
                field={selectedField}
                allFields={fields}
                onUpdate={handleUpdateField}
                onClose={() => setSelectedFieldId(null)}
              />
            )}
          </>
        )}
      </div>

      {/* Branding & Settings Modal */}
      <BrandingSettingsModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        form={form}
        onSave={(updated) => {
          setForm(updated);
          setHasUnsavedChanges(true);
        }}
      />

      {/* Publish & Share Modal */}
      <PublishShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        form={form}
        onUpdateStatus={handleUpdateStatus}
        onOpenLivePreview={() => onOpenLivePublicPage(form.slug)}
      />
    </div>
  );
};
