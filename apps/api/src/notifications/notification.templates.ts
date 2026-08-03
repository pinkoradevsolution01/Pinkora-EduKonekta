import { SafeNotification } from './notification.types';

const generic = (title: string, body: string): Omit<SafeNotification, 'eventType'> => ({
  title,
  body,
});

/**
 * Templates intentionally use event metadata only. Do not add report text, case
 * notes, message previews, student names, or evaluation content to this file.
 */
export function safeTemplate(
  eventType: string,
  payload: Record<string, unknown> = {},
): SafeNotification {
  const link = typeof payload.link === 'string' ? payload.link : undefined;
  const confidential = eventType.startsWith('safety.') || eventType.startsWith('guidance.');
  const template = (() => {
    switch (eventType) {
      case 'announcement.published':
        return generic(
          'New school announcement',
          'A new announcement is available in Pinkora EduKonekta.',
        );
      case 'assignment.created':
      case 'assignment.published':
        return generic('New assignment', 'A new assignment is available in Pinkora EduKonekta.');
      case 'assignment.due_soon':
        return generic(
          'Assignment due soon',
          'An assignment is due soon. Please sign in to review it.',
        );
      case 'calendar.event.created':
        return generic(
          'New calendar event',
          'A school calendar event is available in Pinkora EduKonekta.',
        );
      case 'calendar.event.reminder.due':
        return generic(
          'Calendar reminder',
          'An upcoming school calendar event needs your attention. Sign in to review it.',
        );
      case 'attendance.absence.recorded':
        return generic(
          'Attendance update',
          'An attendance update is available in Pinkora EduKonekta.',
        );
      case 'evaluation.updated':
        return generic(
          'Evaluation update',
          'An evaluation update is available in Pinkora EduKonekta.',
        );
      case 'messaging.message.sent':
        return generic('New secure message', 'You have a new secure message. Sign in to read it.');
      case 'safety.report.status.updated':
        return generic(
          'Confidential report update',
          'A confidential report has a status update. Sign in securely to view it.',
        );
      case 'guidance.follow_up.due':
        return generic(
          'Guidance follow-up due',
          'A confidential guidance follow-up is due. Sign in securely to view it.',
        );
      default:
        return generic('School update', 'You have a new update in Pinkora EduKonekta.');
    }
  })();
  return { eventType, ...template, link, confidential };
}
