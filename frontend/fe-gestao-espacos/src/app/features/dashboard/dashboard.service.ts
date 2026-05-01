import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Attendance,
  AttendanceNotification,
  CreateSpacePayload,
  CreateUserPayload,
  Occupancy,
  Space,
  UpdateUserPayload,
  User,
} from './dashboard.interfaces';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  public listUsers(search?: string) {
    const query = search?.trim();
    const params = query ? new HttpParams().set('search', query) : undefined;

    return this.http.get<User[]>('/users', { params });
  }

  public createUser(payload: CreateUserPayload) {
    return this.http.post<User>('/users', payload);
  }

  public updateUser(id: string, payload: UpdateUserPayload) {
    return this.http.patch<User>(`/users/${id}`, payload);
  }

  public deleteUser(id: string) {
    return this.http.delete<void>(`/users/${id}`);
  }

  public listSpaces() {
    return this.http.get<Space[]>('/spaces');
  }

  public createSpace(payload: CreateSpacePayload) {
    return this.http.post<Space>('/spaces', payload);
  }

  public deleteSpace(id: string) {
    return this.http.delete<void>(`/spaces/${id}`);
  }

  public listActiveAttendances() {
    return this.http.get<Attendance[]>('/attendances/active');
  }

  public listOccupancy() {
    return this.http.get<Occupancy[]>('/attendances/occupancy');
  }

  public listAttendanceNotifications() {
    return this.http.get<AttendanceNotification[]>('/attendances/notifications');
  }

  public checkIn(userId: string, spaceId: string, entryAt = new Date().toISOString()) {
    return this.http.post<Attendance>('/attendances/check-in', { userId, spaceId, entryAt });
  }

  public checkOut(userId: string, exitAt = new Date().toISOString()) {
    return this.http.post<Attendance>('/attendances/check-out', { userId, exitAt });
  }
}
