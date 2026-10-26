import React, { useState } from 'react';
import { Form } from '../../types';
import { Modal } from '../../generic-ui/components/Modal';
import { Button } from '../../generic-ui/components/Button';
import {
  Globe,
  Copy,
  Check,
  Share2,
  ExternalLink,
  PowerOff,
  Clock,
  Sparkles,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';

interface PublishShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form;
  onUpdateStatus: (newStatus: 'draft' | 'published' | 'closed') => void;
  onOpenLivePreview: () => void;
}

export const PublishShareModal: React.FC<PublishShareModalProps> = ({
  isOpen,
  onClose,
  form,
  onUpdateStatus,
  onOpenLivePreview,
}) => {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://eventform.vercel.app';
  const publicUrl = `${baseUrl}/#/e/${form.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    success('Link Copied!', 'Public registration URL copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.title,
          text: `Register for ${form.title}:`,
          url: publicUrl,
        });
      } catch (e) {
        // user cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish & Share Registration Link"
      description="Control public registration availability and share your event page with players and attendees."
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm">
        {/* Status card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs text-slate-500 font-medium">Current Status</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  form.status === 'published'
                    ? 'success'
                    : form.status === 'closed'
                    ? 'danger'
                    : 'warning'
                }
                dot
              >
                {form.status.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-600 font-medium">
                {form.status === 'published'
                  ? 'Accepting submissions'
                  : form.status === 'closed'
                  ? 'Registration is closed'
                  : 'Unpublished draft'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {form.status === 'published' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus('closed')}
                className="text-amber-700 hover:bg-amber-50"
              >
                Close Registration
              </Button>
            ) : form.status === 'closed' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onUpdateStatus('published')}
              >
                Reopen Form
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onUpdateStatus('published')}
              >
                Publish Now
              </Button>
            )}
          </div>
        </div>

        {/* Public Link Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            Public Registration URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 truncate select-all">
              <Globe className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <span className="truncate">{publicUrl}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onOpenLivePreview}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-indigo-600" />
            <span>Open Public Page</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 transition-colors shadow-xs"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Share on WhatsApp / Social</span>
          </button>
        </div>

        {/* Informational tip */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <p>
            When published, participants can access and register on mobile or desktop without signing in. Form answers are validated dynamically according to your conditional rules.
          </p>
        </div>
      </div>
    </Modal>
  );
};
