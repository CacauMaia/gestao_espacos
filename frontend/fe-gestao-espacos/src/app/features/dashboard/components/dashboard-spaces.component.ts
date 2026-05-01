import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';
import { Space } from '../dashboard.interfaces';
import { createSpaceForm } from '../helpers/dashboard-forms.helper';

@Component({
  selector: 'app-dashboard-spaces',
  imports: [ReactiveFormsModule, TranslocoPipe, LucideAngularModule, StatusPillComponent],
  templateUrl: './dashboard-spaces.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSpacesComponent {
  public readonly spaceForm = input.required<ReturnType<typeof createSpaceForm>>();
  public readonly spaces = input.required<readonly Space[]>();
  public readonly canManageResources = input.required<boolean>();
  public readonly canSubmitSpace = input.required<boolean>();

  public readonly createSpaceSubmitted = output<void>();
  public readonly spaceDeleted = output<Space>();

  protected createSpace(): void {
    this.createSpaceSubmitted.emit();
  }

  protected deleteSpace(space: Space): void {
    this.spaceDeleted.emit(space);
  }
}
