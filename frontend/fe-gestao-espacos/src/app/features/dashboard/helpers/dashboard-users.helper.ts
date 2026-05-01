import type { UpdateUserPayload, User } from '../dashboard.interfaces';
import type { createEditUserForm } from './dashboard-forms.helper';
import type { StudentRoleFilter } from './dashboard-student-filter.helper';

export function getUserInitials(name = ''): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function filterUsersByRole(users: readonly User[], role: StudentRoleFilter): User[] {
  return role === 'ALL' ? [...users] : users.filter((user) => user.role === role);
}

export function buildUpdateUserPayload(form: ReturnType<typeof createEditUserForm>): UpdateUserPayload {
  const { password, ...payload } = form.getRawValue();
  return password ? { ...payload, password } : payload;
}
