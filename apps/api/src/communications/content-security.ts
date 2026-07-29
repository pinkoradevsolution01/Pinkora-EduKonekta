import { BadRequestException } from '@nestjs/common';

export const SAFE_ATTACHMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_TAGS = /<(\/?)((p|br|strong|em|ul|ol|li|a))(\s[^>]*)?>/gi;
const ALLOWED_TAG_TEST = /^<\/?(p|br|strong|em|ul|ol|li|a)>$/i;

export function sanitizeRichText(value: string): string {
  if (/<\s*script|javascript:|on[a-z]+\s*=|<\s*(iframe|object|embed|style)|data:/i.test(value)) {
    throw new BadRequestException('Unsafe HTML is not allowed');
  }
  return value
    .replace(ALLOWED_TAGS, (_match, close: string, tag: string, attrs: string) => {
      if (tag.toLowerCase() === 'a' && !close) {
        const href = attrs?.match(/href\s*=\s*["'](https?:\/\/[^"']+)["']/i)?.[1];
        return href ? `<a href="${href}" rel="noopener noreferrer">` : '<a>';
      }
      return `<${close ? '/' : ''}${tag.toLowerCase()}>`;
    })
    .replace(/<[^>]+>/g, (tag) => (ALLOWED_TAG_TEST.test(tag) ? tag : ''));
}

export function validateAttachment(attachment?: {
  name: string;
  mime: string;
  size: number;
  url?: string;
  storageKey?: string;
}) {
  if (!attachment) return undefined;
  if (
    !SAFE_ATTACHMENT_MIMES.has(attachment.mime) ||
    attachment.size <= 0 ||
    attachment.size > 10 * 1024 * 1024
  ) {
    throw new BadRequestException('Attachment type or size is not allowed');
  }
  if (attachment.url && !/^https:\/\//i.test(attachment.url))
    throw new BadRequestException('Attachment URL must use HTTPS');
  return attachment;
}
