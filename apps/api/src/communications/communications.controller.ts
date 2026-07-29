import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { announcementSchema, calendarEventSchema } from './communications.schemas';
import { CommunicationsService } from './communications.service';

@Controller({ path: 'communications', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}
  @Post('announcements')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  createAnnouncement(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.communications.createAnnouncement(req.auth!, announcementSchema.parse(body));
  }
  @Post('announcements/:id/publish')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.communications.publish(req.auth!, id);
  }
  @Get('announcements') listAnnouncements(@Req() req: AuthenticatedRequest) {
    return this.communications.listAnnouncements(req.auth!);
  }
  @Post('announcements/:id/read') markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.communications.markRead(req.auth!, id);
  }
  @Post('announcements/:id/acknowledge') acknowledge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.communications.acknowledge(req.auth!, id);
  }
  @Post('calendar/events')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  createEvent(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.communications.createCalendarEvent(req.auth!, calendarEventSchema.parse(body));
  }
  @Get('calendar/events') listEvents(@Req() req: AuthenticatedRequest) {
    return this.communications.listCalendar(req.auth!);
  }
}
