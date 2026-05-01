import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';
import { User } from '../dashboard.interfaces';
import { createEditUserForm, createStudentForm } from '../helpers/dashboard-forms.helper';
import { StudentRoleFilter } from '../helpers/dashboard-student-filter.helper';

@Component({
  selector: 'app-dashboard-users',
  imports: [ReactiveFormsModule, TranslocoPipe, LucideAngularModule, StatusPillComponent],
  templateUrl: './dashboard-users.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardUsersComponent {
  public readonly studentForm = input.required<ReturnType<typeof createStudentForm>>();
  public readonly editUserForm = input.required<ReturnType<typeof createEditUserForm>>();
  public readonly users = input.required<readonly User[]>();
  public readonly searchQuery = input.required<string>();
  public readonly studentRoleFilter = input.required<StudentRoleFilter>();
  public readonly isEditingUser = input.required<boolean>();
  public readonly canManageResources = input.required<boolean>();
  public readonly canSubmitStudent = input.required<boolean>();
  public readonly canSubmitUserUpdate = input.required<boolean>();
  public readonly studentNamePlaceholderKey = input.required<string>();
  public readonly studentEmailPlaceholderKey = input.required<string>();
  public readonly studentPasswordPlaceholderKey = input.required<string>();

  public readonly createUserSubmitted = output<void>();
  public readonly updateUserSubmitted = output<void>();
  public readonly userEditStarted = output<User>();
  public readonly userEditCanceled = output<void>();
  public readonly userDeleted = output<User>();
  public readonly searchChanged = output<string>();
  public readonly roleFilterChanged = output<string>();

  protected createUser(): void {
    this.createUserSubmitted.emit();
  }

  protected updateUser(): void {
    this.updateUserSubmitted.emit();
  }

  protected startUserEdit(user: User): void {
    this.userEditStarted.emit(user);
  }

  protected cancelUserEdit(): void {
    this.userEditCanceled.emit();
  }

  protected deleteUser(user: User): void {
    this.userDeleted.emit(user);
  }

  protected updateSearchQuery(query: string): void {
    this.searchChanged.emit(query);
  }

  protected updateStudentRoleFilter(role: string): void {
    this.roleFilterChanged.emit(role);
  }
}
