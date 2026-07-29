import { BadRequestException } from '@nestjs/common';
import { sanitizeRichText, validateAttachment } from './content-security';

describe('communication content security', () => {
  it('keeps allowed rich text and strips attributes', () => {
    expect(sanitizeRichText('<p><strong>Hello</strong></p>')).toBe('<p><strong>Hello</strong></p>');
  });

  it('rejects unsafe HTML and disallowed attachments', () => {
    expect(() => sanitizeRichText('<script>alert(1)</script>')).toThrow(BadRequestException);
    expect(() =>
      validateAttachment({ name: 'payload.exe', mime: 'application/x-msdownload', size: 10 }),
    ).toThrow(BadRequestException);
  });
});
