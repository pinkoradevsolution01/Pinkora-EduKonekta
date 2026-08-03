import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function securityMiddleware(corsOrigin: string) {
  const allowedOrigin = new URL(corsOrigin).origin;
  return (request: Request, response: Response, next: NextFunction) => {
    const supplied = request.header('x-request-id');
    response.locals.requestId =
      supplied && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied) ? supplied : randomUUID();
    response.setHeader('x-request-id', response.locals.requestId);
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('x-frame-options', 'DENY');
    response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'permissions-policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    response.setHeader('cross-origin-opener-policy', 'same-origin');
    if (process.env.NODE_ENV === 'production')
      response.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
    const origin = request.header('origin');
    if (unsafeMethods.has(request.method) && origin && origin !== allowedOrigin)
      return response.status(403).json({
        error: {
          code: 'CSRF_REJECTED',
          message: 'Cross-site request rejected',
          requestId: response.locals.requestId,
        },
      });
    next();
  };
}
