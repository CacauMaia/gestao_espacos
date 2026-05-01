import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Attendance, AttendanceNotification, Space, User } from '../dashboard.interfaces';
import { createCheckInForm } from '../helpers/dashboard-forms.helper';

@Component({
  selector: 'app-dashboard-attendance',
  imports: [DatePipe, ReactiveFormsModule, TranslocoPipe, LucideAngularModule],
  templateUrl: './dashboard-attendance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAttendanceComponent {
  public readonly checkInForm = input.required<ReturnType<typeof createCheckInForm>>();
  public readonly currentUser = input.required<User | null>();
  public readonly spaces = input.required<readonly Space[]>();
  public readonly notifications = input.required<readonly AttendanceNotification[]>();
  public readonly visibleActiveAttendances = input.required<readonly Attendance[]>();
  public readonly isMutating = input.required<boolean>();
  public readonly canManageAttendance = input.required<boolean>();
  public readonly canSubmitCheckIn = input.required<boolean>();
  public readonly canViewActiveAttendances = input.required<boolean>();

  public readonly checkInSubmitted = output<void>();
  public readonly currentUserCheckOut = output<void>();
  public readonly attendanceCheckOut = output<Attendance>();

  protected submitCheckIn(): void {
    this.checkInSubmitted.emit();
  }

  protected checkOutCurrentUser(): void {
    this.currentUserCheckOut.emit();
  }

  protected checkOut(attendance: Attendance): void {
    this.attendanceCheckOut.emit(attendance);
  }

  protected canCheckOutAttendance(attendance: Attendance): boolean {
    return this.canManageAttendance() && attendance.userId === this.currentUser()?.id;
  }
}
