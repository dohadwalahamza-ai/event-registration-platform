import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link,
  RemoveFormatting,
  Undo,
  Redo,
  Eye,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { RichTextRenderer } from './RichTextRenderer';
import { stripHtml } from '../../utils/sanitizeHtml';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
  label?: string;
  description?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write event guidelines, eligibility, schedule, prizes, or rules...',
  minHeight = '140px',
  maxHeight = '320px',
  className = '',
  label,
  description,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value changes into the contentEditable div when not actively typing
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHtml = editorRef.current.innerHTML;
    if (value !== currentHtml) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    let html = editorRef.current.innerHTML;
    // Treat empty container or whitespace-only tags as empty string
    const text = stripHtml(html);
    if (!text && !html.includes('<img')) {
      html = '';
    }
    onChange(html);
  }, [onChange]);

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand(command, false, arg);
    } catch (e) {
      console.warn('execCommand failed:', e);
    }
    handleInput();
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link destination URL (e.g. https://example.com):');
    if (!url) return;
    const cleanUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    executeCommand('createLink', cleanUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
      }
    }
  };

  const isEmpty = !value || stripHtml(value).trim() === '';
  const wordCount = stripHtml(value).trim() ? stripHtml(value).trim().split(/\s+/).length : 0;
  const charCount = stripHtml(value).length;

  return (
    <div className={`flex flex-col rounded-2xl border transition-all duration-200 ${isFocused ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'} ${className}`}>
      {/* Header with Title & Edit / Preview Tabs */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-slate-200/80 gap-2 bg-slate-100/60 rounded-t-2xl">
        <div className="flex items-center gap-1.5 min-w-0">
          {label && (
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
              — {description}
            </span>
          )}
        </div>

        {/* Tab Switcher: Visual Editor vs Realtime Preview */}
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Formatting Toolbar (Active in 'edit' tab) */}
      {activeTab === 'edit' && (
        <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 border-b border-slate-200/60 bg-white text-slate-700">
          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('formatBlock', '<h2>');
            }}
            title="Heading 2 (Large)"
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('formatBlock', '<h3>');
            }}
            title="Heading 3 (Medium)"
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5 self-center" />

          {/* Text Style: Bold, Italic, Underline, Strike */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('bold');
            }}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('italic');
            }}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('underline');
            }}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('strikeThrough');
            }}
            title="Strikethrough"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5 self-center" />

          {/* Lists: Bullets & Numbers */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertUnorderedList');
            }}
            title="Bullet List"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertOrderedList');
            }}
            title="Numbered List"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('formatBlock', '<blockquote>');
            }}
            title="Quote / Callout block"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5 self-center" />

          {/* Hyperlink */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertLink();
            }}
            title="Insert Link"
            className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Link className="w-4 h-4" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('removeFormat');
            }}
            title="Clear Formatting"
            className="p-1.5 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5 self-center" />

          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('undo');
            }}
            title="Undo"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('redo');
            }}
            title="Redo"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      {activeTab === 'edit' ? (
        <div className="relative flex-1 p-3 bg-white rounded-b-2xl cursor-text" onClick={() => editorRef.current?.focus()}>
          {isEmpty && !isFocused && (
            <div className="absolute top-3 left-3 text-xs text-slate-400 pointer-events-none select-none italic leading-relaxed">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            style={{ minHeight, maxHeight }}
            className="overflow-y-auto text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_s]:line-through [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-indigo-50/60 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:my-1.5 [&_blockquote]:italic [&_a]:text-indigo-600 [&_a]:underline"
          />
        </div>
      ) : (
        /* Realtime Preview Tab */
        <div className="p-4 bg-white rounded-b-2xl overflow-y-auto" style={{ minHeight, maxHeight }}>
          {isEmpty ? (
            <div className="text-xs text-slate-400 italic text-center py-6">
              No description added yet. Switch to Editor tab to add rich text formatting.
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Live Public Page Preview:
              </span>
              <RichTextRenderer content={value} className="text-xs sm:text-sm text-slate-800" />
            </div>
          )}
        </div>
      )}

      {/* Footer Info: Word count & Keyboard hint */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-100 rounded-b-2xl text-[10px] text-slate-400">
        <span className="hidden sm:inline">
          Shortcuts: <kbd className="font-mono bg-white px-1 border border-slate-200 rounded">Ctrl+B</kbd> Bold,{' '}
          <kbd className="font-mono bg-white px-1 border border-slate-200 rounded">Ctrl+I</kbd> Italic,{' '}
          <kbd className="font-mono bg-white px-1 border border-slate-200 rounded">Ctrl+U</kbd> Underline
        </span>
        <span className="ml-auto font-medium">
          {wordCount} words • {charCount} chars
        </span>
      </div>
    </div>
  );
};
