import { NotificationEventType, createEvent } from './notification-events';

describe('notification events', () => {
  it('creates versioned announcement and calendar notification events', () => {
    const event = createEvent(
      NotificationEventType.ANNOUNCEMENT_PUBLISHED,
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      { audienceCount: 1 },
    );
    expect(event).toMatchObject({
      type: 'announcement.published',
      version: 1,
      aggregateId: expect.any(String),
    });
  });
});
