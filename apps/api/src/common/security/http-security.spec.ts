import { securityMiddleware } from './http-security';

function response() { const value: any = { locals: {}, headers: {}, status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader(key: string, header: string) { this.headers[key] = header; } }; return value; }
describe('security middleware', () => {
  it('adds protective headers and an opaque request identifier', () => { const middleware = securityMiddleware('https://app.example.test'); const res = response(); const next = jest.fn(); middleware({ method: 'GET', header: jest.fn() } as any, res, next); expect(next).toHaveBeenCalled(); expect(res.headers['x-content-type-options']).toBe('nosniff'); expect(res.headers['x-frame-options']).toBe('DENY'); expect(res.headers['x-request-id']).toBeTruthy(); });
  it('rejects cross-site state-changing requests', () => { const middleware = securityMiddleware('https://app.example.test'); const res = response(); middleware({ method: 'POST', header: jest.fn((name) => name === 'origin' ? 'https://evil.example' : undefined) } as any, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(403); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'CSRF_REJECTED' }) })); });
});
