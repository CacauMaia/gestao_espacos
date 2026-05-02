import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { UserRole } from '../../../core/auth/auth.interfaces';
import { User, PaginationMeta } from '../dashboard.interfaces';
import { UsersFacade } from '../facades/users.facade';
import {
  EMPTY_PAGINATION_META,
  loadUsersPage,
} from '../helpers/dashboard-pagination.helper';
import { StudentRoleFilter } from '../helpers/dashboard-student-filter.helper';

@Injectable()
export class UsersState {
  private readonly destroyRef = inject(DestroyRef);
  private readonly usersFacade = inject(UsersFacade);

  public readonly students = signal<User[]>([]);
  public readonly usersPaginationMeta =
    signal<PaginationMeta>(EMPTY_PAGINATION_META);

  public loadUsers(
    context: {
      currentRole: UserRole | null;
      currentUser: User | null;
      roleFilter: StudentRoleFilter;
      search: string;
      append: boolean;
    },
    setError: () => void,
  ): void {
    loadUsersPage({
      usersFacade: this.usersFacade,
      destroyRef: this.destroyRef,
      users: this.students,
      meta: this.usersPaginationMeta,
      setError,
      ...context,
    });
  }
}
