import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { App } from './app';

describe('App', () => {
  let spectator: Spectator<App>;

  const createComponent = createComponentFactory({
    component: App,
    providers: [provideRouter([])],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should render the app router outlet', () => {
    expect(spectator.query('[data-test="app-router-outlet"]')).toBeTruthy();
  });
});
