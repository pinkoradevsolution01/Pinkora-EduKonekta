import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode, SafetyReportStatus } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { createEvent, EVENT_PUBLISHER, EventPublisher } from '../communications/notification-events';
import { PrismaService } from '../prisma/prisma.service';
import { signAttachment, verifyAttachment } from '../assignments/assignments.events';
import { CreateSafetyReportInput, UpdateSafetyReportInput } from './safety.schemas';
import { decryptProtected, encryptProtected, safetyFingerprint } from './safety.crypto';

@Injectable()
export class SafetyService {
  private readonly submissions = new Map<string, number[]>();
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}
  private school(a: AuthContext) { if (!a.schoolId) throw new ForbiddenException('A school tenant is required'); return a.schoolId; }
  private async audit(action: string, a: AuthContext, id: string, metadata?: object) {
    await this.prisma.auditLog.create({ data: { schoolId: this.school(a), actorUserId: a.userId, action, entityType: 'safety_report', entityId: id, metadata } });
  }
  private async safeguardingAccess(a: AuthContext) {
    const schoolId = this.school(a);
    if (!a.roles.includes(RoleCode.GUIDANCE)) throw new ForbiddenException('Confidential safeguarding access is required');
    const access = await this.prisma.safeguardingAccess.findFirst({ where: { schoolId, userId: a.userId, isActive: true } });
    if (!access) throw new ForbiddenException('Your safeguarding authorization is not active');
  }
  private rateLimit(a: AuthContext) {
    const now = Date.now(); const windowStart = now - 60 * 60_000;
    const entries = (this.submissions.get(a.userId) ?? []).filter((time) => time > windowStart);
    if (entries.length >= 5)
      throw new HttpException('Please wait before submitting another safety report', HttpStatus.TOO_MANY_REQUESTS);
    entries.push(now); this.submissions.set(a.userId, entries);
  }
  async submit(a: AuthContext, input: CreateSafetyReportInput) {
    const schoolId = this.school(a); this.rateLimit(a);
    const reporter = await this.prisma.user.findFirst({ where: { id: a.userId, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { email: true, displayName: true } });
    if (!reporter) throw new ForbiddenException('A verified school account is required to submit a report');
    const fingerprint = safetyFingerprint(schoolId, input.description, input.incidentDate);
    const duplicateCandidateCount = await this.prisma.safetyReport.count({ where: { schoolId, duplicateFingerprint: fingerprint, createdAt: { gt: new Date(Date.now() - 30 * 86400_000) } } });
    const report = await this.prisma.safetyReport.create({ data: {
      schoolId, reporterUserId: a.userId, category: input.category, incidentDate: input.incidentDate, location: input.location,
      descriptionEncrypted: encryptProtected(input.description),
      protectedIdentityEncrypted: encryptProtected({ userId: a.userId, displayName: reporter.displayName, email: reporter.email }),
      evidenceEncrypted: input.evidence ? encryptProtected(input.evidence) : null,
      duplicateFingerprint: fingerprint, duplicateCandidateCount, abuseIndicator: duplicateCandidateCount >= 3,
    }});
    await this.prisma.safetyReportUpdate.create({ data: { schoolId, reportId: report.id, status: SafetyReportStatus.SUBMITTED, reporterNote: 'Your report was submitted confidentially.' } });
    await this.audit('SAFETY_REPORT_SUBMITTED', a, report.id, { category: report.category });
    await this.publisher.publish(createEvent('safety.report.submitted', report.id, schoolId, { category: report.category, status: report.status }));
    return { id: report.id, status: report.status, confirmation: 'Your confidential report has been submitted. If someone may be in immediate danger, contact local emergency services or a trusted adult now.' };
  }
  async mine(a: AuthContext) {
    const items = await this.prisma.safetyReport.findMany({ where: { schoolId: this.school(a), reporterUserId: a.userId }, include: { updates: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
    return items.map((item) => ({ id: item.id, category: item.category, incidentDate: item.incidentDate, status: item.status, createdAt: item.createdAt, updates: item.updates.map((update) => ({ status: update.status, reporterNote: update.reporterNote, createdAt: update.createdAt })) }));
  }
  async intake(a: AuthContext, id?: string) {
    await this.safeguardingAccess(a); const schoolId = this.school(a);
    const reports = await this.prisma.safetyReport.findMany({ where: { schoolId, ...(id ? { id } : {}) }, include: { updates: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
    if (id && !reports.length) throw new NotFoundException('Safety report not found');
    const output = reports.map((report) => ({ id: report.id, category: report.category, incidentDate: report.incidentDate, location: report.location, description: decryptProtected<string>(report.descriptionEncrypted), reporter: decryptProtected<{ displayName: string; email: string }>(report.protectedIdentityEncrypted), evidence: report.evidenceEncrypted ? decryptProtected(report.evidenceEncrypted) : null, status: report.status, duplicateCandidateCount: report.duplicateCandidateCount, abuseIndicator: report.abuseIndicator, updates: report.updates }));
    for (const report of reports) await this.audit('SAFETY_REPORT_CONFIDENTIAL_ACCESSED', a, report.id);
    return id ? output[0] : output;
  }
  async update(a: AuthContext, id: string, input: UpdateSafetyReportInput) {
    await this.safeguardingAccess(a); const schoolId = this.school(a);
    const report = await this.prisma.safetyReport.findFirst({ where: { id, schoolId } }); if (!report) throw new NotFoundException('Safety report not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.safetyReportUpdate.create({ data: { schoolId, reportId: id, status: input.status, reporterNote: input.reporterNote, createdByUserId: a.userId } });
      return tx.safetyReport.update({ where: { id }, data: { status: input.status } });
    });
    await this.audit('SAFETY_REPORT_UPDATED', a, id, { status: input.status });
    await this.publisher.publish(createEvent('safety.report.status.updated', id, schoolId, { status: input.status }));
    return { id: updated.id, status: updated.status };
  }
  async signedEvidence(a: AuthContext, id: string) {
    await this.safeguardingAccess(a); const report = await this.prisma.safetyReport.findFirst({ where: { id, schoolId: this.school(a) } }); if (!report?.evidenceEncrypted) throw new NotFoundException('Evidence not found');
    await this.audit('SAFETY_REPORT_EVIDENCE_LINK_ISSUED', a, id);
    return { url: `/api/v1/safety/reports/${id}/evidence?token=${signAttachment('safety-evidence', id, this.school(a), new Date(Date.now() + 60_000))}`, expiresInSeconds: 60 };
  }
  async evidence(a: AuthContext, id: string, token: string) {
    await this.safeguardingAccess(a); const schoolId = this.school(a); if (!verifyAttachment(token, 'safety-evidence', id, schoolId)) throw new ForbiddenException('Evidence link is invalid or expired');
    const report = await this.prisma.safetyReport.findFirst({ where: { id, schoolId } }); if (!report?.evidenceEncrypted) throw new NotFoundException('Evidence not found');
    await this.audit('SAFETY_REPORT_EVIDENCE_ACCESSED', a, id);
    return decryptProtected(report.evidenceEncrypted);
  }
}
