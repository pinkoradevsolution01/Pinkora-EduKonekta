# Announcements and calendar

Announcements are tenant-scoped and target one or more audiences: the whole school, selected classes, teachers, parents, students, or guidance staff. Teachers may create and publish only class-targeted announcements for classes assigned to their teacher profile. School administrators may publish school-wide and other school-scoped announcements.

Drafts and future scheduled announcements are excluded from recipient queries. Published records past `expires_at` are excluded and exposed as expired only to administrative workflows. Read status and acknowledgement are unique per announcement/user, so repeated actions are idempotent. Users can only mark or acknowledge announcements returned by their own tenant and role/class/linked-child scope.

Rich text is limited to a small safe tag set and rejects scripts, event attributes, dangerous schemes, embeds, and data URLs. Attachments are metadata-only in this module; allowed types are PDF, JPEG, PNG, plain text, and DOCX, limited to 10 MB and HTTPS URLs. Upload storage and malware scanning should be connected before accepting files in production.

Calendar events may be school-wide or class-specific. Teachers can create events only for assigned classes. Both published announcements and calendar creation emit typed notification events (`announcement.published` and `calendar.event.created`) through the event publisher boundary for a future outbox/worker implementation.
