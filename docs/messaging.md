# Parent-teacher messaging

Conversations are bound to an approved parent-student link and a teacher assignment for that student’s active class. Parents cannot contact arbitrary staff, and teachers cannot contact families outside assigned classes. Administrators have no ordinary conversation access; an escalated conversation is required and administrative access is audited.

Message content is sanitized. Attachments use the platform safe type/size validation. Messages are marked read when the authorized recipient opens or explicitly marks a conversation read. Notifications never include message content: the `MESSAGE_NOTIFICATION_PREVIEW=metadata` setting permits only the generic metadata preview `New message from your school contact`; the default is `New secure message`. Message sending is rate limited per user (20/minute). Reporting creates a documented escalation to school administration; authorized administrative access to an escalated conversation is audited.
