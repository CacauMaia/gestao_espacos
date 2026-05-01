import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type StatusPillTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

@Component({
  selector: 'app-status-pill',
  template: `
    <span class="status-pill" [class]="tone()">
      <ng-content />
    </span>
  `,
  styles: `
    .status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      padding: 0 0.65rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .success {
      color: var(--color-success);
      background: var(--color-success-soft);
    }

    .warning {
      color: var(--color-warning);
      background: var(--color-warning-soft);
    }

    .danger {
      color: var(--color-danger);
      background: var(--color-danger-soft);
    }

    .accent {
      color: var(--color-accent);
      background: var(--color-accent-soft);
    }

    .neutral {
      color: var(--color-muted);
      background: var(--color-surface-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPillComponent {
  public readonly tone = input<StatusPillTone>('neutral');
}
