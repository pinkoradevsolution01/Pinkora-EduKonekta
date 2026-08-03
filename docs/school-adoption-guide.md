# EduKonekta school adoption guide

This guide explains how Pinkora EduKonekta should be introduced to Philippine schools. It is an operational guide, not legal advice. Obtain appropriate legal and data-protection review before processing real learner, parent, or safeguarding information.

## Release status

Do not invite a school to enter real data until the production-readiness checklist is complete. The technical pilot package is available; school-specific approval, support contacts, training, monitoring configuration, and a witnessed restore exercise remain mandatory before real data is entered. See [pilot-readiness.md](pilot-readiness.md).

Demonstrations must use only the provided demonstration accounts and fictional records.

## Recommended first market: private-school pilot

Private schools are normally the most practical first pilot because decisions can often be made directly by the owner, principal, school administrator, ICT lead, and guidance office.

1. Request a 30-minute discovery meeting.
2. Demonstrate the platform with fictional data only.
3. Identify one concrete problem to solve first, such as parent communication, attendance, or assignment tracking.
4. Propose a limited pilot: one grade level, a small set of classes, and a defined 6–12 week period.
5. Agree on success measures before launch: active users, parent acknowledgement rate, attendance completion, and support response time.
6. Train the pilot administrators, teachers, guidance users, and parents.
7. Review feedback, security incidents, and adoption data before expanding.

## Public-school engagement

For public schools, begin with the school head, ICT coordinator, and guidance office. Follow the applicable approval path for the school and its division or regional office. Do not assume a school-level verbal approval authorizes production use or data sharing.

Present the same limited pilot model, with a written description of the purpose, users, information processed, security controls, support contacts, and exit plan.

## Privacy and data-processing requirements

Before importing real data, put the following in place:

- A written agreement defining the school as the personal-information controller and Pinkora EduKonekta's service responsibilities.
- A data-processing or data-sharing agreement appropriate to the deployment.
- A school privacy notice explaining what information is collected, why it is used, retention periods, and data-subject rights.
- Named school contacts for the school head, ICT/security lead, guidance lead, and data-protection contact.
- Role and tenant setup verified using test accounts before production data is imported.
- A documented procedure for account deactivation, access review, incident reporting, deletion/return of data, and contract termination.

The Philippine Data Privacy Act requires lawful processing based on transparency, legitimate purpose, and proportionality. Educational and safeguarding information requires heightened care. Refer to the [National Privacy Commission](https://privacy.gov.ph/data-privacy-act/) and [DepEd privacy notice](https://www.deped.gov.ph/about-deped/data-privacy-notice/) during review.

## Pilot agreement checklist

- Pilot scope, dates, school contacts, and participating classes.
- No sensitive guidance or safety workflows until their staff training and authorization review are complete.
- Data categories and data-import method.
- Access roles and approval process for administrators, teachers, parents, students, and guidance personnel.
- Support hours, escalation contact, and incident-notification process.
- Backup, restore, retention, and end-of-pilot data return/deletion process.
- Fees, if any, and a statement that expansion requires written approval.

## Production readiness checklist

- HTTPS, production secrets, verified sending domain, SPF, DKIM, and DMARC configured.
- Notification delivery and preference controls validated.
- Admin reporting and export permissions validated.
- Authorization, cross-tenant, and file-access test matrix passed.
- Backup and restore test completed.
- Monitoring, request IDs, error reporting, and uptime checks operational.
- Privacy, retention, support, incident response, and acceptable-use policies approved.
- Pilot users trained and a rollback plan agreed.

## Suggested pitch

> EduKonekta gives the school one secure, tenant-scoped place for announcements, attendance, assignments, parent communication, and student support. We start with a small, supervised pilot using only the functions your school approves, then expand after measurable results and privacy review.
