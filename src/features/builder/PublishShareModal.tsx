import React, { useState, useEffect } from 'react';
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
  Scissors,
  MessageCircle,
  Download,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';

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
  const [showQr, setShowQr] = useState(false);
  const [tinyUrl, setTinyUrl] = useState<string>('');
  const [isLoadingTiny, setIsLoadingTiny] = useState(false);
  const { success } = useToast();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://event.khargharjamaat.org';

  // Clean short code: strips 'event-form-' or 'form-' prefix
  const shortCode = (form.slug || form.id).replace(/^(event-form-|form-)/, '');
  const domainShortUrl = `${baseUrl}/#/e/${shortCode}`;

  // Automatically fetch an ultra-short TinyURL link when opened
  useEffect(() => {
    if (isOpen) {
      setIsLoadingTiny(true);
      fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(domainShortUrl)}`)
        .then((res) => res.text())
        .then((text) => {
          if (text && text.trim().startsWith('http')) {
            setTinyUrl(text.trim());
          }
        })
        .catch(() => {
          // fallback to clean domain short url
        })
        .finally(() => {
          setIsLoadingTiny(false);
        });
    }
  }, [isOpen, domainShortUrl]);

  // Primary short URL for 1-click sharing
  const activeShortUrl = tinyUrl || domainShortUrl;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    success('Short Link Copied!', 'Short URL is copied to clipboard.');
  };

  const handleWhatsAppShare = () => {
    const venueText = form.venue ? `\n📍 Venue: ${form.venue}` : '';
    const dateText = form.event_date ? `\n📅 Date: ${new Date(form.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : '';
    const text = `🏸 *Event Registration is Open!*\n\n*${form.title}*${dateText}${venueText}\n\n👉 *Register online here:*\n${activeShortUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.title,
          text: `Register for ${form.title}:`,
          url: activeShortUrl,
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopyLink(activeShortUrl);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    activeShortUrl
  )}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Shortened Event Link"
      description="Easily share your registration link on WhatsApp, SMS, posters, or social media."
      maxWidth="xl"
    >
      <div className="space-y-5 text-sm">
        {/* Status card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs text-slate-500 font-medium">Form Status</span>
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
                  ? 'Accepting live submissions'
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

        {/* Shortened URL Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Shortened Registration Link
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ready to copy and share anywhere
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-full border border-indigo-200 shadow-2xs">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              {tinyUrl ? 'Ultra-Short URL' : 'Domain Short URL'}
            </span>
          </div>

          {/* Active URL box */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-indigo-950 truncate select-all shadow-2xs">
              <Globe className="w-4 h-4 text-indigo-500 mr-2 shrink-0" />
              <span className="truncate font-semibold">{activeShortUrl}</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCopyLink(activeShortUrl)}
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

          {/* If tinyUrl is ready, also provide the domain direct short link as an option */}
          {tinyUrl && (
            <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="truncate text-[11px] text-slate-500">Direct Domain Link: <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{domainShortUrl}</code></span>
              <button
                type="button"
                onClick={() => handleCopyLink(domainShortUrl)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0 ml-2"
              >
                Copy Direct
              </button>
            </div>
          )}
        </div>

        {/* 1-Click Sharing Suite */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* WhatsApp 1-Click Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Share on WhatsApp</span>
          </button>

          {/* Native Device Share / Social */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Device Share Sheet</span>
          </button>

          {/* QR Code Toggle */}
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>{showQr ? 'Hide QR Code' : 'Show QR Code'}</span>
          </button>
        </div>

        {/* QR Code Display Modal Layer */}
        {showQr && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="Registration Link QR Code"
                className="w-48 h-48 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">Scan to Open Registration Form</p>
              <p className="text-[11px] text-slate-500">
                Print or download this QR code to include on event banners, match posters, and flyers.
              </p>
            </div>
            <a
              href={qrCodeUrl}
              download={`${shortCode}-qr-code.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Open / Download QR Image</span>
            </a>
          </div>
        )}

        {/* Live Public Page Link */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenLivePreview}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open live registration form in a new tab</span>
          </button>
        </div>

        {/* Informational tip */}
        <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            Participants can open this link on mobile or desktop without needing to sign in. Submissions are saved immediately and appear in real time on your dashboard.
          </p>
        </div>
      </div>
    </Modal>
  );
};
