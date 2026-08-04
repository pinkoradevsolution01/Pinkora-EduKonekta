import { NotificationWorkerService } from './notification-worker.service';
import {
  InMemoryNotificationMetrics,
  NoopEmailAdapter,
  ResendEmailAdapter,
} from './notification.types';
import { safeTemplate } from './notification.templates';

describe('notification worker', () => {
  const event = {
    id: 'event-1',
    type: 'attendance.absence.recorded',
    version: 1,
    occurredAt: new Date().toISOString(),
    aggregateId: 'attendance-1',
    schoolId: 'school-1',
    payload: { recipientUserIds: ['parent-1', 'parent-1'] },
  };

  it('uses a stable recipient idempotency key for duplicate events', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const worker = new NotificationWorkerService(
      { notificationJob: { upsert } } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    await worker.enqueueEvent(event);
    await worker.enqueueEvent(event);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].where.idempotencyKey).toBe('event-1:parent-1');
  });

  it('requeues a failed delivery with a safe retry status', async () => {
    const update = jest.fn().mockResolvedValue({});
    const worker = new NotificationWorkerService(
      {
        notificationJob: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'job-1',
              schoolId: 'school-1',
              recipientUserId: 'parent-1',
              eventType: 'assignment.created',
              attempts: 0,
              idempotencyKey: 'key',
            },
          ]),
          update,
          count: jest.fn().mockResolvedValue(0),
        },
        schoolMembership: {
          findFirst: jest.fn().mockRejectedValue(new Error('database unavailable')),
        },
      } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    const result = await worker.process();
    expect(result.retried).toBe(1);
    expect(update.mock.calls[0][0].data).toMatchObject({ attempts: 1, status: 'PENDING' });
  });

  it('does not put sensitive values in confidential external templates', () => {
    const template = safeTemplate('safety.report.status.updated', {
      description: 'private case details',
    });
    expect(`${template.title} ${template.body}`).not.toContain('private case details');
    expect(template.confidential).toBe(true);
  });
  it('uses a generic calendar reminder template without event details', () => {
    const template = safeTemplate('calendar.event.reminder.due', {
      description: 'private location and attendee details',
    });
    expect(`${template.title} ${template.body}`).not.toContain('private location');
  });

  it('respects disabled delivery preferences', async () => {
    const notificationUpsert = jest.fn();
    const email = { send: jest.fn() };
    const worker = new NotificationWorkerService(
      {
        notificationJob: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'job-2',
              schoolId: 'school-1',
              recipientUserId: 'parent-1',
              eventType: 'assignment.created',
              attempts: 0,
              idempotencyKey: 'key',
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(0),
        },
        schoolMembership: { findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }) },
        notificationPreference: {
          findUnique: jest.fn().mockResolvedValue({ inAppEnabled: false, emailEnabled: false }),
        },
        notification: { upsert: notificationUpsert },
      } as any,
      email,
      new InMemoryNotificationMetrics(),
    );
    await worker.process();
    expect(notificationUpsert).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('does not deliver to a recipient without an active school membership', async () => {
    const notificationUpsert = jest.fn();
    const worker = new NotificationWorkerService(
      {
        notificationJob: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'job-3',
              schoolId: 'school-1',
              recipientUserId: 'former-user',
              eventType: 'assignment.created',
              attempts: 0,
              idempotencyKey: 'key',
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(0),
        },
        schoolMembership: { findFirst: jest.fn().mockResolvedValue(null) },
        notification: { upsert: notificationUpsert },
      } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    await worker.process();
    expect(notificationUpsert).not.toHaveBeenCalled();
  });

  it('reports privacy-safe queue counts for operational monitoring', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(1);
    const worker = new NotificationWorkerService(
      { notificationJob: { count } } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    await expect(worker.monitoring()).resolves.toEqual({
      pending: 4,
      delivered: 18,
      failed: 1,
      maxAttempts: 3,
    });
    expect(count).toHaveBeenCalledTimes(3);
  });

  it('enqueues each due-soon assignment reminder once per recipient and day', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const worker = new NotificationWorkerService(
      {
        assignment: {
          findMany: jest.fn().mockResolvedValue([{ id: 'assignment-1', schoolId: 'school-1' }]),
          findFirst: jest.fn().mockResolvedValue({
            class: {
              enrollments: [
                {
                  student: {
                    userId: 'student-1',
                    parentLinks: [{ parent: { userId: 'parent-1' } }],
                  },
                },
              ],
            },
          }),
        },
        notificationJob: { upsert },
      } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    const result = await worker.enqueueAssignmentDueReminders(new Date('2030-01-01T12:00:00Z'));
    expect(result).toEqual({ queued: 2 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ eventType: 'assignment.due_soon' }),
      }),
    );
  });

  it('publishes a due scheduled announcement once and queues its normal notification', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const enqueue = jest
      .spyOn(NotificationWorkerService.prototype, 'enqueueEvent')
      .mockResolvedValue();
    const worker = new NotificationWorkerService(
      {
        announcement: {
          findMany: jest.fn().mockResolvedValue([{ id: 'announcement-1', schoolId: 'school-1' }]),
          updateMany,
        },
        auditLog: { create: jest.fn() },
      } as any,
      new NoopEmailAdapter(),
      new InMemoryNotificationMetrics(),
    );
    await expect(worker.publishScheduledAnnouncements(new Date())).resolves.toEqual({
      published: 1,
    });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'announcement.published', aggregateId: 'announcement-1' }),
    );
    enqueue.mockRestore();
  });

  it('sends provider email with an idempotency key and never exposes a recipient list', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    const adapter = new ResendEmailAdapter('test-key', 'Pinkora <updates@example.test>', fetcher);
    await adapter.send({
      to: 'parent@example.test',
      subject: 'New assignment',
      text: 'A new assignment is available.',
      idempotencyKey: 'notification-1',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({ 'idempotency-key': 'notification-1' }),
        body: JSON.stringify({
          from: 'Pinkora <updates@example.test>',
          to: ['parent@example.test'],
          subject: 'New assignment',
          text: 'A new assignment is available.',
        }),
      }),
    );
  });
});
