# MVP Implementation Plan

## Goal
Deliver the MVP requirements in small, testable increments while keeping backend and frontend behavior aligned.

## Scope
This plan covers only MVP requirements from docs/functional-requirements.md.

## Milestone 1: Data Model and API Foundation

### Backend tasks
1. Extend the `items` schema to support MVP fields:
   - `name` (required)
   - `description` (optional)
   - `due_date` (optional)
   - `completed` (boolean, default false)
   - `created_at` (existing)
2. Add migration/init logic for new fields in `packages/backend/src/app.js`.
3. Ensure `GET /api/items` returns tasks sorted by `created_at` consistently.
4. Keep/create validation for required non-empty `name` in `POST /api/items`.

### API contract
- `GET /api/items` -> list of items
- `POST /api/items` -> create item
- `PUT /api/items/:id` -> edit title/description/due date/completed
- `DELETE /api/items/:id` -> delete item

### Exit criteria
- API supports read/create/update/delete for MVP fields.
- Invalid create/update payloads return `400` with useful error messages.

## Milestone 2: Frontend CRUD + Completion

### Frontend tasks
1. Load tasks from `GET /api/items` on app start.
2. Add create form with:
   - required title
   - optional description
   - optional due date
3. Add task row controls:
   - edit title
   - toggle complete/incomplete
   - delete
4. Reflect API updates in UI immediately after successful responses.
5. Show an explicit validation message for empty title submissions.

### Exit criteria
- User can create, view, edit, delete, and toggle completion from UI.
- Empty title cannot be submitted.

## Milestone 3: MVP Filtering, Search, and UX Feedback

### Frontend tasks
1. Add completion filter: `All`, `Active`, `Completed`.
2. Add title search input.
3. Keep list order consistent with backend sort by `created_at`.
4. Add success/error feedback for create/update/delete actions.

### Exit criteria
- Filtering and search work together without breaking list state.
- User receives feedback on success and error outcomes.

## Milestone 4: Persistence Verification and Hardening

### Validation tasks
1. Refresh browser and verify tasks persist.
2. Validate edge cases:
   - empty title rejected
   - update missing/invalid task id
   - delete missing task id
3. Confirm no regressions in existing tests.

### Exit criteria
- Persistence behavior verified.
- MVP acceptance criteria pass.

## Recommended Build Order
1. Backend schema + update endpoint.
2. Backend tests for create/update/delete/validation.
3. Frontend form and task row interactions.
4. Frontend filter/search/feedback.
5. End-to-end manual verification against MVP checklist.

## Definition of Done (MVP)
- All MVP acceptance criteria in docs/functional-requirements.md are checked.
- Backend and frontend test suites pass.
- Changes are committed to feature branch with clear commit history.
