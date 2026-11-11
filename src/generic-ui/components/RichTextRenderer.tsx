import React, { useMemo } from 'react';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
  fallbackText?: string;
}

/**
 * Converts simple markdown patterns to HTML if content doesn't already contain HTML tags
 */
function markdownToHtml(text: string): string {
  if (!text) return '';
  // Check if content already contains HTML tags
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  let html = text
    // Headings
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Blockquote
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Convert list items
  const lines = html.split('\n');
  let inUl = false;
  let inOl = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = /^\s*[-*•]\s+(.*)/.test(line);
    const isNum = /^\s*\d+\.\s+(.*)/.test(line);

    if (isBullet) {
      if (!inUl) {
        if (inOl) {
          processedLines.push('</ol>');
          inOl = false;
        }
        processedLines.push('<ul>');
        inUl = true;
      }
      processedLines.push(line.replace(/^\s*[-*•]\s+(.*)/, '<li>$1</li>'));
    } else if (isNum) {
      if (!inOl) {
        if (inUl) {
          processedLines.push('</ul>');
          inUl = false;
        }
        processedLines.push('<ol>');
        inOl = true;
      }
      processedLines.push(line.replace(/^\s*\d+\.\s+(.*)/, '<li>$1</li>'));
    } else {
      if (inUl) {
        processedLines.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        processedLines.push('</ol>');
        inOl = false;
      }
      processedLines.push(line);
    }
  }
  if (inUl) processedLines.push('</ul>');
  if (inOl) processedLines.push('</ol>');

  html = processedLines.join('\n');

  // Convert newlines to paragraphs/breaks
  const paragraphs = html
    .split(/\n{2,}/)
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|blockquote)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('');

  return paragraphs || html;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
  fallbackText = '',
}) => {
  const sanitized = useMemo(() => {
    if (!content || !content.trim()) return '';
    const htmlWithMarkdown = markdownToHtml(content.trim());
    return sanitizeHtml(htmlWithMarkdown);
  }, [content]);

  if (!sanitized) {
    if (!fallbackText) return null;
    return <span className={className}>{fallbackText}</span>;
  }

  return (
    <div
      className={`prose-sm max-w-none text-inherit leading-relaxed rich-text-content [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_u]:underline-offset-2 [&_s]:line-through [&_s]:opacity-80 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1 [&_li]:leading-relaxed [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/60 [&_blockquote]:bg-indigo-500/10 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:rounded-r-lg [&_blockquote]:italic [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-indigo-600 [&_a]:hover:underline [&_a]:font-semibold ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

