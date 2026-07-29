import { createHmac, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import {
  DomainEvent,
  EVENT_PUBLISHER,
  EventPublisher,
} from '../communications/notification-events';

export const AssignmentEventType = {
  CREATED: 'assignment.created',
  PUBLISHED: 'assignment.published',
  SUBMITTED: 'assignment.submitted',
  FEEDBACK_ADDED: 'assignment.feedback_added',
} as const;

export function assignmentEvent<T>(
  type: string,
  aggregateId: string,
  schoolId: string,
  payload: T,
): DomainEvent<T> {
  return {
    id: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    aggregateId,
    schoolId,
    payload,
  };
}

function signingSecret() {
  return process.env.SESSION_SECRET ?? 'development-only-session-secret';
}

export function signAttachment(kind: string, id: string, schoolId: string, expiresAt: Date) {
  const payload = `${kind}:${id}:${schoolId}:${expiresAt.getTime()}`;
  const signature = createHmac('sha256', signingSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyAttachment(token: string, kind: string, id: string, schoolId: string) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [tokenKind, tokenId, tokenSchool, expiresText, signature] = decoded.split(':');
    if (
      tokenKind !== kind ||
      tokenId !== id ||
      tokenSchool !== schoolId ||
      !expiresText ||
      !signature
    )
      return false;
    const payload = `${tokenKind}:${tokenId}:${tokenSchool}:${expiresText}`;
    const expected = createHmac('sha256', signingSecret()).update(payload).digest('hex');
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return false;
    return Number(expiresText) > Date.now();
  } catch {
    return false;
  }
}

export function publishAssignmentEvent(
  publisher: EventPublisher,
  type: string,
  id: string,
  schoolId: string,
  payload: unknown,
) {
  return publisher.publish(assignmentEvent(type, id, schoolId, payload));
}

export { EVENT_PUBLISHER };
