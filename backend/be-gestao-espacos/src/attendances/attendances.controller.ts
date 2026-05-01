import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { TokenPayload } from '../auth/services/token.service';
import { UserRole } from '../entities/user.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AttendancesService } from './attendances.service';

type AuthenticatedRequest = Request & {
  user: TokenPayload;
};

@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Roles(UserRole.Monitor, UserRole.Student)
  @Post('check-in')
  checkIn(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendancesService.checkIn(
      request.user.sub,
      createAttendanceDto,
    );
  }

  @Roles(UserRole.Monitor, UserRole.Student)
  @Post('check-out')
  checkOut(@Req() request: AuthenticatedRequest) {
    return this.attendancesService.checkOut(request.user.sub);
  }

  @Roles(UserRole.Admin, UserRole.Monitor)
  @Get('active')
  listActive() {
    return this.attendancesService.listActive();
  }

  @Roles(UserRole.Monitor, UserRole.Student)
  @Get('notifications')
  listNotifications(@Req() request: AuthenticatedRequest) {
    return this.attendancesService.listNotifications(request.user.sub);
  }

  @Roles(UserRole.Admin, UserRole.Monitor, UserRole.Student)
  @Get('occupancy')
  listOccupancy() {
    return this.attendancesService.listOccupancy();
  }
}
