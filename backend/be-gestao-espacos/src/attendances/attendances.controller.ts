import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { TokenPayload } from '../auth/services/token.service';
import { UserRole } from '../entities/user.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AttendancesService } from './attendances.service';
import { ListActiveAttendancesQueryDto } from './dto/list-active-attendances-query.dto';
import { ListAttendanceHistoryQueryDto } from './dto/list-attendance-history-query.dto';
import { ForceCheckOutDto } from './dto/force-check-out.dto';

type AuthenticatedRequest = Request & {
  user: TokenPayload;
};

@Controller('attendances')
@ApiTags('attendances')
@ApiBearerAuth()
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
  listActive(
    @Query() query: ListActiveAttendancesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendancesService.listActive(query, request.user);
  }

  @Roles(UserRole.Admin, UserRole.Monitor, UserRole.Student)
  @Get('history')
  listHistory(
    @Query() query: ListAttendanceHistoryQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendancesService.listHistory(query, request.user);
  }

  @Roles(UserRole.Monitor, UserRole.Student)
  @Get('current')
  listCurrent(@Req() request: AuthenticatedRequest) {
    return this.attendancesService.listCurrent(request.user.sub);
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

  @Roles(UserRole.Admin, UserRole.Monitor)
  @Post(':id/force-check-out')
  forceCheckOut(
    @Param('id') id: string,
    @Body() forceCheckOutDto: ForceCheckOutDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendancesService.forceCheckOut(
      id,
      request.user,
      forceCheckOutDto.note,
    );
  }
}
