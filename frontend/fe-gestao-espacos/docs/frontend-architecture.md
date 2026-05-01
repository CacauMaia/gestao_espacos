# Frontend Architecture

## Overview

This Angular app manages teaching space occupancy using the NestJS API in `backend/be-gestao-espacos`.

The UI is organized by responsibility:

- `src/app/core`: authentication, route guards, API interceptors, and i18n loader.
- `src/app/shared`: reusable UI components.
- `src/app/features/login`: token-based login.
- `src/app/features/dashboard`: occupancy dashboard, user registry, space registry, check-in, and check-out.
- `src/assets/i18n`: Transloco dictionaries for Portuguese, English, and Spanish.
- `src/styles/abstracts`: design tokens, typography, and reusable style primitives.

## Libraries

- `@jsverse/transloco`: i18n without hardcoded UI text.
- `lucide-angular`: lightweight icon set with tree-shaken icons.

No heavy component framework was added; the interface is built with Angular, SCSS, CSS variables, and small shared components.

## API Contract

The frontend assumes the backend runs on `http://localhost:3000`. During development, Angular proxies `/api` to that backend through `proxy.conf.json`.

Consumed endpoints:

- `POST /auth/login`
- `GET /users?search=<name-or-email>`
- `POST /users`
- `DELETE /users/:id`
- `GET /spaces`
- `POST /spaces`
- `DELETE /spaces/:id`
- `GET /attendances/active`
- `GET /attendances/occupancy`
- `POST /attendances/check-in`
- `POST /attendances/check-out`

Attendance payloads use `userId` and `spaceId`, matching the current database schema where `attendances.user_id` references `users.id`.

Authenticated requests include `Authorization: Bearer <token>` through `authTokenInterceptor`.

## Authorization Rules

- `ADMIN`: can access the overview, user registry, and space registry. Admins can create monitors, students, and spaces, but cannot register attendance for themselves or for other users.
- `MONITOR`: can access only the attendance flow. Monitors register only their own attendance and can view active attendances only for the environment where they currently have an active attendance.
- `STUDENT`: can access only the attendance flow. Students register only their own check-in/check-out.
- Multiple monitors may be active in the same space.
- Every active attendance, including monitor attendance, consumes one capacity slot.
- A user cannot have more than one active attendance at the same time; this rule is enforced by the backend and surfaced by frontend feedback.

The dashboard hides unauthorized sections and blocks direct section selection when the current role is not allowed. Data loading also avoids calling endpoints that the current role cannot access.

## Data Refresh Strategy

- User creation/removal calls only the user endpoint and then reloads the user list.
- Space creation/removal reloads spaces, occupancy, and active attendances because these screens depend on space availability.
- Check-in/check-out reloads only active attendances and occupancy.
- User search is sent to the API through the `search` query parameter instead of filtering in the browser.

## Running

```bash
npm install
npm start
```

Open the Angular dev server URL and log in with a student already registered in the backend database.

## Quality

```bash
npm run build
npm run lint
npm test -- --watch=false
```

The dashboard and login components use `ChangeDetectionStrategy.OnPush`, lazy routing, typed interfaces, DOM-oriented tests, and service-based API access.

Class members used by Angular templates must be `protected`. Internal implementation details must be `private`. Components should not expose public methods except Angular lifecycle hooks; services keep public methods as their API surface. `input()` members remain public because Angular treats them as the component API consumed by parent templates.

Class files are limited to 500 lines by `npm run lint`. Larger classes must be refactored into focused helpers under a feature-local `helpers/` folder, with tests added when the helper contains branching, role, filtering, or transformation logic.
