import { FormBuilder } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { ChevronRight, FileText, LucideAngularModule, Pencil, Plus, Power, RotateCcw, Save, Search, X } from 'lucide-angular';
import { of } from 'rxjs';
import { createEditUserForm, createStudentForm } from '../../helpers/dashboard-forms.helper';
import { UsersComponent } from './users.component';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      common: { actions: 'Actions', add: 'Add', cancel: 'Cancel', edit: 'Edit', loadMore: 'Load more', save: 'Save' },
      roles: { ADMIN: 'Administrator', MONITOR: 'Monitor', STUDENT: 'Student' },
      students: {
        allRoles: 'All roles',
        create: 'Create user',
        email: 'Email',
        empty: 'No users found.',
        name: 'User',
        new: 'New user',
        password: 'Password',
        passwordOptional: 'Password',
        passwordOptionalPlaceholder: 'Keep password',
        registry: 'Registry',
        role: 'Role',
        roleFilter: 'Filter by role',
        search: 'Search user',
        title: 'Users',
      },
      validation: { email: 'Invalid email.', name: 'Invalid name.', password: 'Invalid password.' },
    } satisfies Translation);
  }
}

describe('UsersComponent', () => {
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ ChevronRight, FileText, Pencil, Plus, Power, RotateCcw, Save, Search, X })),
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' }, loader: InlineLoader }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    fixture.componentRef.setInput('studentForm', createStudentForm(new FormBuilder()));
    fixture.componentRef.setInput('editUserForm', createEditUserForm(new FormBuilder()));
    fixture.componentRef.setInput('users', [{ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT', active: true }]);
    fixture.componentRef.setInput('searchQuery', '');
    fixture.componentRef.setInput('studentRoleFilter', 'ALL');
    fixture.componentRef.setInput('isEditingUser', false);
    fixture.componentRef.setInput('canManageResources', true);
    fixture.componentRef.setInput('canSubmitStudent', false);
    fixture.componentRef.setInput('canSubmitUserUpdate', false);
    fixture.componentRef.setInput('studentNamePlaceholderKey', 'students.name');
    fixture.componentRef.setInput('studentEmailPlaceholderKey', 'students.email');
    fixture.componentRef.setInput('studentPasswordPlaceholderKey', 'students.password');
    fixture.componentRef.setInput('hasMoreUsers', false);
    fixture.detectChanges();
  });

  it('renders users and emits edit/status/search actions', () => {
    const editSpy = vi.fn();
    const statusSpy = vi.fn();
    const searchSpy = vi.fn();
    fixture.componentInstance.userEditStarted.subscribe(editSpy);
    fixture.componentInstance.userStatusChanged.subscribe(statusSpy);
    fixture.componentInstance.searchChanged.subscribe(searchSpy);

    expect(fixture.nativeElement.querySelector('[data-test="users-table"]').textContent).toContain('Ana');

    fixture.nativeElement.querySelectorAll('.icon-button')[0].click();
    fixture.nativeElement.querySelectorAll('.icon-button')[1].click();
    const input = fixture.nativeElement.querySelector('[data-test="user-search-input"]') as HTMLInputElement;
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));

    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
    expect(statusSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
    expect(searchSpy).toHaveBeenLastCalledWith('ana');
  });

  it('emits create, update, cancel, filter and load more actions', () => {
    const createSpy = vi.fn();
    const updateSpy = vi.fn();
    const cancelSpy = vi.fn();
    const roleSpy = vi.fn();
    const loadMoreSpy = vi.fn();
    fixture.componentInstance.createUserSubmitted.subscribe(createSpy);
    fixture.componentInstance.updateUserSubmitted.subscribe(updateSpy);
    fixture.componentInstance.userEditCanceled.subscribe(cancelSpy);
    fixture.componentInstance.roleFilterChanged.subscribe(roleSpy);
    fixture.componentInstance.usersRequested.subscribe(loadMoreSpy);

    fixture.nativeElement.querySelector('[data-test="user-create-form"]').dispatchEvent(new Event('submit'));
    const roleFilter = fixture.nativeElement.querySelector('[data-test="user-role-filter"]') as HTMLSelectElement;
    roleFilter.value = 'MONITOR';
    roleFilter.dispatchEvent(new Event('change'));

    fixture.componentRef.setInput('hasMoreUsers', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.table-footer button').click();

    fixture.componentRef.setInput('isEditingUser', true);
    fixture.componentRef.setInput('canSubmitUserUpdate', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-test="user-edit-form"]').dispatchEvent(new Event('submit'));
    fixture.nativeElement.querySelector('[data-test="user-edit-form"] [type="button"]').click();

    expect(createSpy).toHaveBeenCalledOnce();
    expect(roleSpy).toHaveBeenCalledWith('MONITOR');
    expect(loadMoreSpy).toHaveBeenCalledOnce();
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(cancelSpy).toHaveBeenCalledOnce();
  });
});
