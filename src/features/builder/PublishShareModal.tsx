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
  QrCode,
  ShieldCheck,
  Link,
  MessageCircle,
  Download,
  Smartphone,
} from 'lucide-react';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';
import { packFormToUrlPayload } from '../../services/storage';

interface PublishShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form;
  onUpdateStatus: (newStatus: 'draft' | 'published' | 'closed') => void;
  onOpenLivePreview: () => void;
  onUpdateSlug?: (newSlug: string) => Promise<void>;
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

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://event.khargharjamaat.org';

  // Normalized clean slug
  const shortCode = (form.slug || form.id).replace(/^(event-form-|form-)/, '');
  const activeSlug = form.slug || shortCode;
  const domainUrl = `${baseUrl}/#/e/${activeSlug}`;

  // Pack compact form definition into query param so ANY scanning phone or link recipient loads it immediately
  const packedPayload = packFormToUrlPayload(form);
  const selfContainedUrl = packedPayload ? `${domainUrl}?d=${packedPayload}` : domainUrl;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    success('Link Copied!', 'Registration link copied to clipboard. Share it anywhere!');
  };

  const handleWhatsAppShare = () => {
    const venueText = form.venue ? `\n📍 Venue: ${form.venue}` : '';
    const dateText = form.event_date
      ? `\n📅 Date: ${new Date(form.event_date).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      : '';
    const text = `🏸 *Event Registration is Open!*\n\n*${form.title}*${dateText}${venueText}\n\n👉 *Register online here:*\n${selfContainedUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.title,
          text: `Register for ${form.title}:`,
          url: selfContainedUrl,
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopyLink(selfContainedUrl);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    selfContainedUrl
  )}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Event Registration & QR Code"
      description="Scan with any mobile phone or copy the direct link to accept participant registrations."
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs sm:text-sm">
        {/* Left Column: Share Options & Quick Links */}
        <div className="md:col-span-7 space-y-4">
          {/* Status & Live Preview Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
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
              <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                {form.status === 'published'
                  ? 'Accepting submissions'
                  : form.status === 'closed'
                  ? 'Registration closed'
                  : 'Unpublished draft'}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {form.status === 'published' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus('closed')}
                  className="text-amber-700 hover:bg-amber-50 h-7 text-xs px-2.5"
                >
                  Close Registration
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onUpdateStatus('published')}
                  className="h-7 text-xs px-2.5"
                >
                  {form.status === 'closed' ? 'Reopen Form' : 'Publish Now'}
                </Button>
              )}

              <button
                type="button"
                onClick={onOpenLivePreview}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-1"
                title="Open live registration form in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Form</span>
              </button>
            </div>
          </div>

          {/* Registration Link Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
                  <Link className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Direct Public Link
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Works on mobile and desktop browsers
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs shrink-0">
                <Globe className="w-3 h-3 text-indigo-600" />
                Live URL
              </span>
            </div>

            {/* Active URL box */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-indigo-950 truncate select-all shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-indigo-500 mr-2 shrink-0" />
                <span className="truncate font-semibold">{selfContainedUrl}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCopyLink(selfContainedUrl)}
                className="shrink-0"
                leftIcon={
                  copied ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>

          {/* 1-Click Sharing Suite */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp 1-Click Share */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white shrink-0" />
              <span>Share on WhatsApp</span>
            </button>

            {/* Native Device Share / Social */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Share Sheet</span>
            </button>
          </div>

          {/* Informational tip */}
          <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[11px] text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Mobile Ready:</strong> Scanning the QR code or clicking the link on any smartphone instantly loads your event form and questions. No login required for participants.
            </p>
          </div>
        </div>

        {/* Right Column: Prominent QR Code (Always Visible) */}
        <div className="md:col-span-5 p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-slate-50 border border-indigo-100/80 flex flex-col items-center justify-between text-center space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Event Registration QR Code</span>
          </div>

          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
            <img
              src={qrCodeUrl}
              alt="Event Registration QR Code"
              className="w-44 h-44 rounded-lg object-contain block mx-auto"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('quickchart.io')) {
                  img.src = `https://quickchart.io/qr?size=300&text=${encodeURIComponent(selfContainedUrl)}`;
                }
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Point phone camera to scan & open</span>
          </div>

          <a
            href={qrCodeUrl}
            download={`${shortCode}-qr-code.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download QR Code Image</span>
          </a>
        </div>
      </div>
    </Modal>
  );
};
