import { FormBuilder } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { LucideAngularModule, Pencil, Plus, Save, Trash2, X } from 'lucide-angular';
import { of } from 'rxjs';
import { createSpaceForm } from '../../helpers/dashboard-forms.helper';
import { SpacesComponent } from './spaces.component';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      common: { add: 'Add', cancel: 'Cancel', edit: 'Edit', loadMore: 'Load more', save: 'Save' },
      spaces: {
        capacity: 'Capacity',
        create: 'Create space',
        delete: 'Delete space',
        empty: 'No spaces registered.',
        name: 'Space',
        new: 'New space',
        overview: 'Spaces',
        title: 'Spaces',
        type: 'Type',
      },
      spaceTypes: { classroom: 'Classroom', laboratory: 'Laboratory', study: 'Study room' },
      validation: { capacity: 'Invalid capacity.', spaceName: 'Invalid name.' },
    } satisfies Translation);
  }
}

describe('SpacesComponent', () => {
  let fixture: ComponentFixture<SpacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacesComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ Pencil, Plus, Save, Trash2, X })),
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' }, loader: InlineLoader }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpacesComponent);
    fixture.componentRef.setInput('spaceForm', createSpaceForm(new FormBuilder()));
    fixture.componentRef.setInput('editSpaceForm', createSpaceForm(new FormBuilder()));
    fixture.componentRef.setInput('spaces', [{ id: 'space-1', name: 'Lab 01', type: 'laboratory', capacity: 20 }]);
    fixture.componentRef.setInput('isEditingSpace', false);
    fixture.componentRef.setInput('canManageResources', true);
    fixture.componentRef.setInput('canSubmitSpace', false);
    fixture.componentRef.setInput('canSubmitSpaceUpdate', false);
    fixture.componentRef.setInput('hasMoreSpaces', false);
    fixture.detectChanges();
  });

  it('renders spaces and emits edit and delete actions', () => {
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();
    fixture.componentInstance.spaceEditStarted.subscribe(editSpy);
    fixture.componentInstance.spaceDeleted.subscribe(deleteSpy);

    expect(fixture.nativeElement.querySelector('[data-test="spaces-list"]').textContent).toContain('Lab 01');

    fixture.nativeElement.querySelector('.icon-button').click();
    fixture.nativeElement.querySelector('.icon-button.danger').click();

    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'space-1' }));
    expect(deleteSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'space-1' }));
  });

  it('renders edit form and emits update/cancel actions', () => {
    const updateSpy = vi.fn();
    const cancelSpy = vi.fn();
    fixture.componentRef.setInput('isEditingSpace', true);
    fixture.componentRef.setInput('canSubmitSpaceUpdate', true);
    fixture.componentInstance.updateSpaceSubmitted.subscribe(updateSpy);
    fixture.componentInstance.spaceEditCanceled.subscribe(cancelSpy);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-test="space-edit-form"]')).toBeTruthy();

    fixture.nativeElement.querySelector('[data-test="space-edit-form"]').dispatchEvent(new Event('submit'));
    fixture.nativeElement.querySelector('[type="button"]').click();

    expect(updateSpy).toHaveBeenCalled();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
