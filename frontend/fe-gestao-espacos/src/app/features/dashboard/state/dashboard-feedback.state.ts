import { computed, Injectable, OnDestroy, Signal, signal } from '@angular/core';
import { DashboardSection } from '../helpers/dashboard-sections.helper';
import { extractBackendErrorMessage } from '../helpers/dashboard-http-error.helper';

export interface SectionNotice {
  message: string;
  section: DashboardSection;
  translate: boolean;
}

export interface ToastNotice extends SectionNotice {
  tone: 'success' | 'error';
}

@Injectable()
export class DashboardFeedbackState implements OnDestroy {
  private readonly feedback = signal<SectionNotice | null>(null);
  private readonly error = signal<SectionNotice | null>(null);
  private toastDismissTimer: ReturnType<typeof setTimeout> | null = null;

  public visibleToast(activeSection: Signal<DashboardSection>): Signal<ToastNotice | null> {
    return computed(() => {
      const error = this.noticeForSection(this.error(), activeSection());

      if (error) {
        return { ...error, tone: 'error' };
      }

      const feedback = this.noticeForSection(this.feedback(), activeSection());
      return feedback ? { ...feedback, tone: 'success' } : null;
    });
  }

  public setFeedback(key: string, section: DashboardSection): void {
    this.feedback.set({ message: key, section, translate: true });
    this.scheduleToastDismiss('feedback', section, 4200);
  }

  public setError(key: string, section: DashboardSection): void {
    this.error.set({ message: key, section, translate: true });
    this.scheduleToastDismiss('error', section, 6200);
  }

  public setActionError(error: unknown, section: DashboardSection): void {
    const message = extractBackendErrorMessage(error);
    this.error.set({
      message: message ?? 'dashboard.actionError',
      section,
      translate: !message,
    });
    this.scheduleToastDismiss('error', section, 6200);
  }

  public clearSection(section: DashboardSection): void {
    this.clearFeedback(section);
    this.clearError(section);
  }

  public dismiss(activeSection: DashboardSection): void {
    this.clearToastDismissTimer();
    this.clearSection(activeSection);
  }

  public ngOnDestroy(): void {
    this.clearToastDismissTimer();
  }

  private clearFeedback(section: DashboardSection): void {
    if (this.feedback()?.section === section) {
      this.feedback.set(null);
    }
  }

  private clearError(section: DashboardSection): void {
    if (this.error()?.section === section) {
      this.error.set(null);
    }
  }

  private noticeForSection(
    notice: SectionNotice | null,
    section: DashboardSection,
  ): SectionNotice | null {
    return notice?.section === section ? notice : null;
  }

  private scheduleToastDismiss(
    type: 'feedback' | 'error',
    section: DashboardSection,
    durationMs: number,
  ): void {
    this.clearToastDismissTimer();
    this.toastDismissTimer = setTimeout(() => {
      if (type === 'feedback') {
        this.clearFeedback(section);
        return;
      }

      this.clearError(section);
    }, durationMs);
  }

  private clearToastDismissTimer(): void {
    if (!this.toastDismissTimer) {
      return;
    }

    clearTimeout(this.toastDismissTimer);
    this.toastDismissTimer = null;
  }
}
