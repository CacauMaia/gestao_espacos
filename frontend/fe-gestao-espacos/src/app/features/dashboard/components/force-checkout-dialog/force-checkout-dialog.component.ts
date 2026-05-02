import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Attendance } from '../../dashboard.interfaces';

@Component({
  selector: 'app-force-checkout-dialog',
  imports: [DatePipe, TranslocoPipe, LucideAngularModule],
  templateUrl: './force-checkout-dialog.component.html',
  styleUrl: './force-checkout-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceCheckoutDialogComponent {
  public readonly attendance = input.required<Attendance>();
  public readonly isMutating = input.required<boolean>();
  public readonly canceled = output<void>();
  public readonly confirmed = output<string>();

  protected cancel(): void {
    if (!this.isMutating()) {
      this.canceled.emit();
    }
  }

  protected confirm(note: string): void {
    this.confirmed.emit(note.trim());
  }
}
