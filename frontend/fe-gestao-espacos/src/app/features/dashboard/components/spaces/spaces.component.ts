import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Space } from '../../dashboard.interfaces';
import { createSpaceForm } from '../../helpers/dashboard-forms.helper';

@Component({
  selector: 'app-spaces',
  imports: [ReactiveFormsModule, TranslocoPipe, LucideAngularModule],
  templateUrl: './spaces.component.html',
  styleUrl: './spaces.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacesComponent {
  public readonly spaceForm = input.required<ReturnType<typeof createSpaceForm>>();
  public readonly editSpaceForm = input.required<ReturnType<typeof createSpaceForm>>();
  public readonly spaces = input.required<readonly Space[]>();
  public readonly isEditingSpace = input.required<boolean>();
  public readonly canManageResources = input.required<boolean>();
  public readonly canSubmitSpace = input.required<boolean>();
  public readonly canSubmitSpaceUpdate = input.required<boolean>();
  public readonly hasMoreSpaces = input.required<boolean>();

  public readonly createSpaceSubmitted = output<void>();
  public readonly updateSpaceSubmitted = output<void>();
  public readonly spaceEditStarted = output<Space>();
  public readonly spaceEditCanceled = output<void>();
  public readonly spaceDeleted = output<Space>();
  public readonly spacesRequested = output<void>();

  protected createSpace(): void {
    this.createSpaceSubmitted.emit();
  }

  protected updateSpace(): void {
    this.updateSpaceSubmitted.emit();
  }

  protected startSpaceEdit(space: Space): void {
    this.spaceEditStarted.emit(space);
  }

  protected cancelSpaceEdit(): void {
    this.spaceEditCanceled.emit();
  }

  protected deleteSpace(space: Space): void {
    this.spaceDeleted.emit(space);
  }

  protected loadMoreSpaces(): void {
    this.spacesRequested.emit();
  }
}
