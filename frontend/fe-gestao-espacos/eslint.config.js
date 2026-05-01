const eslint = require('@eslint/js');
const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.angular/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...angular.configs.tsRecommended,
  {
    files: ['src/**/*.ts'],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            constructors: 'no-public',
          },
          ignoredMethodNames: [
            'ngOnChanges',
            'ngOnInit',
            'ngDoCheck',
            'ngAfterContentInit',
            'ngAfterContentChecked',
            'ngAfterViewInit',
            'ngAfterViewChecked',
            'ngOnDestroy',
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.component.ts', 'src/**/*.directive.ts', 'src/**/*.pipe.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MethodDefinition[kind='method']:not([accessibility='private']):not([accessibility='protected']):not([key.name=/^ng[A-Z]/])",
          message:
            'Component methods must be protected for template access or private for class-only behavior. Public methods are reserved for lifecycle hooks.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
