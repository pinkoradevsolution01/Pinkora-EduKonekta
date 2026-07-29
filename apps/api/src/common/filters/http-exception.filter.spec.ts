import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function invoke(exception: unknown) {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = { status, json };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ header: () => 'test-request-id', url: '/api/v1/test' }),
    }),
  } as any;
  new HttpExceptionFilter().catch(exception, host);
  return { status, json };
}

describe('HttpExceptionFilter', () => {
  it('preserves safe validation messages instead of reporting an internal server error', () => {
    const { status, json } = invoke(
      new BadRequestException('Cross-school student identifier rejected'),
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.message).toBe('Cross-school student identifier rejected');
  });

  it('preserves safe authorization messages', () => {
    const { json } = invoke(new ForbiddenException('Teachers can access assigned students only'));
    expect(json.mock.calls[0][0].error.message).toBe('Teachers can access assigned students only');
  });
});
