import { FormBuilder, Validators } from '@angular/forms';
import type { UserRole } from '../../../core/auth/auth.interfaces';
import type { SpaceType } from '../dashboard.interfaces';

export function createStudentForm(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['STUDENT' as UserRole, [Validators.required]],
  });
}

export function createEditUserForm(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['STUDENT' as UserRole, [Validators.required]],
  });
}

export function createSpaceForm(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['classroom' as SpaceType, [Validators.required]],
    capacity: [24, [Validators.required, Validators.min(1)]],
  });
}

export function createCheckInForm(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group({
    spaceId: ['', [Validators.required]],
  });
}
