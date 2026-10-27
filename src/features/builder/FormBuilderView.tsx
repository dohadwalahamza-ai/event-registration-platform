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
  FileText,
  AlertTriangle,
  Users,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { Modal } from '../../generic-ui/components/Modal';
import { useToast } from '../../generic-ui/ToastContext';

interface FormBuilderViewProps {
  initialForm: Form;
  isNewDraft?: boolean;
  onBack: () => void;
  onSaveForm: (form: Form) => Promise<void>;
  onViewResponses: (formId: string) => void;
  onOpenLivePublicPage: (slug: string) => void;
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  initialForm,
  isNewDraft = false,
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
  const [isDraftSaved, setIsDraftSaved] = useState(!isNewDraft);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
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
      setIsDraftSaved(true);
      success('Form Saved', `"${form.title}" saved successfully to All Forms.`);
    } catch (err) {
      error('Save Failed', 'Could not save form configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Explicit Save as Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const draftForm: Form = { ...form, status: 'draft', updated_at: new Date().toISOString() };
      setForm(draftForm);
      await onSaveForm(draftForm);
      setHasUnsavedChanges(false);
      setIsDraftSaved(true);
      success('Stored in Draft', `"${draftForm.title}" is stored in Draft and added to All Forms.`);
    } catch {
      error('Save Failed', 'Could not save form draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Explicit Publish Event
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const publishedForm: Form = { ...form, status: 'published', updated_at: new Date().toISOString() };
      setForm(publishedForm);
      await onSaveForm(publishedForm);
      setHasUnsavedChanges(false);
      setIsDraftSaved(true);
      success('Event Published', `"${publishedForm.title}" is published and live in All Forms!`);
    } catch {
      error('Publish Failed', 'Could not publish form.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'draft' | 'published' | 'closed') => {
    const updated = { ...form, status: newStatus };
    setForm(updated);
    await onSaveForm(updated);
    setIsDraftSaved(true);
    setHasUnsavedChanges(false);
    success(
      `Status: ${newStatus.toUpperCase()}`,
      newStatus === 'published'
        ? 'Form is live and accepting submissions.'
        : 'Form status updated.'
    );
  };

  const handleBackClick = () => {
    if (!isDraftSaved) {
      setShowDiscardConfirm(true);
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8 bg-slate-100 overflow-hidden">
      {/* Top Builder Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back & Title info */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
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
          {/* View Responses shortcut (only if already saved in All Forms) */}
          {isDraftSaved && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewResponses(form.id)}
              leftIcon={<Inbox className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Responses
            </Button>
          )}

          {/* Quick Response Policy Toggle (Multiple vs Single) */}
          <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, response_limit: 'multiple' }));
                setHasUnsavedChanges(true);
                success('Response Policy', 'Multiple responses allowed per participant.');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                (form.response_limit || 'multiple') === 'multiple'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Participants can register more than once"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multiple Responses</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, response_limit: 'single' }));
                setHasUnsavedChanges(true);
                success('Response Policy', 'Limited to a single response per participant.');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                form.response_limit === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Limit to 1 response per participant"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Single Response</span>
            </button>
          </div>

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

          {/* Publish / Share Button (if already saved) */}
          {isDraftSaved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsShareModalOpen(true)}
              leftIcon={<Share2 className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Share
            </Button>
          )}

          {/* Explicit Save as Draft Button */}
          <Button
            size="sm"
            variant={!isDraftSaved || form.status === 'draft' ? 'primary' : 'outline'}
            isLoading={isSaving}
            onClick={handleSaveDraft}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
            title="Save as Draft and add to All Forms"
          >
            {form.status === 'draft' && isDraftSaved && !hasUnsavedChanges
              ? 'Stored in Draft'
              : hasUnsavedChanges && isDraftSaved
              ? 'Update Draft*'
              : 'Save as Draft'}
          </Button>

          {/* Publish Event Button */}
          <Button
            size="sm"
            variant={form.status === 'published' ? 'primary' : 'outline'}
            isLoading={isSaving}
            onClick={handlePublish}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            title="Publish Event live"
          >
            {form.status === 'published' ? (hasUnsavedChanges ? 'Save Changes*' : 'Published') : 'Publish Event'}
          </Button>
        </div>
      </div>

      {/* Unsaved Draft Banner Indicator */}
      {!isDraftSaved && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>New Form Draft:</strong> This form is currently not stored in <strong>All Forms</strong>. Click <strong>"Save as Draft"</strong> to store it in All Forms, or <strong>"Publish Event"</strong> to make it live.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              isLoading={isSaving}
              leftIcon={<FileText className="w-3.5 h-3.5 text-slate-600" />}
            >
              Save as Draft
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handlePublish}
              isLoading={isSaving}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Publish Event
            </Button>
          </div>
        </div>
      )}

      {/* Main Builder Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {isPreviewMode ? (
          /* Live Interactive Participant Preview */
          <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto mb-4 bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-2xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Participant Preview Mode — test your questions and theme in real time!
              </span>
              <button
                onClick={() => setIsPreviewMode(false)}
                className="font-bold underline hover:text-indigo-950 cursor-pointer"
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

      {/* Discard Confirmation Modal if unsaved draft */}
      {showDiscardConfirm && (
        <Modal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          title="Exit Without Saving?"
          description="This new form draft has not been saved as a draft yet."
          maxWidth="md"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onBack();
                }}
              >
                Discard & Don't Add to All Forms
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await handleSaveDraft();
                    setShowDiscardConfirm(false);
                    onBack();
                  }}
                >
                  Save as Draft & Leave
                </Button>
              </div>
            </div>
          }
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You have not saved this form.</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                If you discard now, this form will <strong>NOT</strong> appear in your <strong>All Forms</strong> list. To save it for later, choose <strong>Save as Draft & Leave</strong>.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Branding & Settings Modal */}
      <BrandingSettingsModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        form={form}
        onSave={async (updated) => {
          setForm(updated);
          await onSaveForm(updated);
          setIsDraftSaved(true);
          setHasUnsavedChanges(false);
          success('Settings Saved', 'Event details, branding, and theme background have been saved.');
        }}
      />

      {/* Publish & Share Modal */}
      <PublishShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        form={form}
        onUpdateStatus={handleUpdateStatus}
        onOpenLivePreview={async () => {
          if (hasUnsavedChanges || !isDraftSaved) {
            await onSaveForm(form);
            setIsDraftSaved(true);
            setHasUnsavedChanges(false);
          }
          onOpenLivePublicPage(form.slug);
        }}
      />
    </div>
  );
};
