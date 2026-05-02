import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Attendance,
  AttendanceNotification,
  CheckoutReason,
  CreateSpacePayload,
  CreateUserPayload,
  Occupancy,
  PaginatedResponse,
  Space,
  SpaceType,
  UpdateSpacePayload,
  UpdateUserPayload,
  User,
} from './dashboard.interfaces';
import { UserRole } from '../../core/auth/auth.interfaces';

interface PaginationQuery {
  page?: number;
  limit?: number;
}

interface UserListQuery extends PaginationQuery {
  search?: string;
  role?: UserRole;
  active?: boolean;
}

interface SpaceListQuery extends PaginationQuery {
  search?: string;
  type?: SpaceType;
}

interface ActiveAttendanceListQuery extends PaginationQuery {
  userId?: string;
  spaceId?: string;
  role?: UserRole;
  spaceType?: SpaceType;
  search?: string;
}

interface AttendanceHistoryListQuery extends ActiveAttendanceListQuery {
  checkoutReason?: CheckoutReason;
  from?: string;
  to?: string;
}

type QueryValue = string | number | boolean | undefined;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  public listUsers(search?: string) {
    return this.http.get<User[]>('/users', {
      params: this.buildParams({ search }),
    });
  }

  public listUsersPage(query: UserListQuery) {
    return this.http.get<PaginatedResponse<User>>('/users', {
      params: this.buildParams(query),
    });
  }

  public createUser(payload: CreateUserPayload) {
    return this.http.post<User>('/users', payload);
  }

  public updateUser(id: string, payload: UpdateUserPayload) {
    return this.http.patch<User>(`/users/${id}`, payload);
  }

  public toggleUserActive(id: string, active: boolean) {
    return this.http.patch<User>(`/users/${id}`, { active });
  }

  public deleteUser(id: string) {
    return this.http.delete<void>(`/users/${id}`);
  }

  public listSpaces() {
    return this.http.get<Space[]>('/spaces');
  }

  public listSpacesPage(query: SpaceListQuery) {
    return this.http.get<PaginatedResponse<Space>>('/spaces', {
      params: this.buildParams(query),
    });
  }

  public createSpace(payload: CreateSpacePayload) {
    return this.http.post<Space>('/spaces', payload);
  }

  public updateSpace(id: string, payload: UpdateSpacePayload) {
    return this.http.patch<Space>(`/spaces/${id}`, payload);
  }

  public deleteSpace(id: string) {
    return this.http.delete<void>(`/spaces/${id}`);
  }

  public listActiveAttendances() {
    return this.http.get<Attendance[]>('/attendances/active');
  }

  public listActiveAttendancesPage(query: ActiveAttendanceListQuery) {
    return this.http.get<PaginatedResponse<Attendance>>('/attendances/active', {
      params: this.buildParams(query),
    });
  }

  public listAttendanceHistoryPage(query: AttendanceHistoryListQuery) {
    return this.http.get<PaginatedResponse<Attendance>>('/attendances/history', {
      params: this.buildParams(query),
    });
  }

  public listCurrentAttendance() {
    return this.http.get<Attendance | null>('/attendances/current');
  }

  public listOccupancy() {
    return this.http.get<Occupancy[]>('/attendances/occupancy');
  }

  public listAttendanceNotifications() {
    return this.http.get<AttendanceNotification[]>('/attendances/notifications');
  }

  public checkIn(spaceId: string) {
    return this.http.post<Attendance>('/attendances/check-in', { spaceId });
  }

  public checkOut() {
    return this.http.post<Attendance>('/attendances/check-out', {});
  }

  public forceCheckOut(attendanceId: string, note?: string) {
    return this.http.post<Attendance>(`/attendances/${attendanceId}/force-check-out`, { note });
  }

  private buildParams(query: object) {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      const queryValue = value as QueryValue;
      if (queryValue === undefined || queryValue === '') {
        return;
      }

      const normalizedValue = typeof queryValue === 'string' ? queryValue.trim() : queryValue;

      if (normalizedValue === '') {
        return;
      }

      params = params.set(key, String(normalizedValue));
    });

    return params;
  }
}
