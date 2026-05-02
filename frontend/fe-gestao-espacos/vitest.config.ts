import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/app/**/*.html',
        'src/app/**/*.interfaces.ts',
        'src/app/**/*.routes.ts',
        'src/app/app.config.ts',
        'src/app/core/http/**',
        'src/app/core/i18n/**',
        'src/app/features/dashboard/dashboard.component.ts',
        'src/app/features/dashboard/dashboard.service.ts',
        'src/app/features/dashboard/facades/**',
        'src/app/features/dashboard/helpers/dashboard-forms.helper.ts',
        'src/app/features/dashboard/helpers/dashboard-http-error.helper.ts',
        'src/app/features/dashboard/helpers/dashboard-pagination.helper.ts',
        'src/app/features/dashboard/helpers/dashboard-section-state.helper.ts',
        'src/app/features/dashboard/helpers/dashboard-student-filter.helper.ts',
        'src/app/features/dashboard/helpers/dashboard-users.helper.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
