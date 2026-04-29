# TODO App Test Cases

## Purpose
Map test cases to MVP and Phase 2 acceptance criteria so implementation can be validated consistently.

## Backend Test Cases (API)

| ID | Requirement | Scenario | Expected Result |
| --- | --- | --- | --- |
| BE-001 | Create task with required title | `POST /api/items` with valid `name` | `201` response with created item payload |
| BE-002 | Prevent empty title | `POST /api/items` with empty `name` | `400` with validation error |
| BE-003 | View tasks | `GET /api/items` | `200` and array of tasks |
| BE-004 | Sorted by created date | create multiple tasks then `GET /api/items` | tasks returned in consistent `created_at` order |
| BE-005 | Edit task title | `PUT /api/items/:id` with new `name` | `200` and updated item title |
| BE-006 | Edit optional description | `PUT /api/items/:id` with `description` | `200` and updated description |
| BE-007 | Edit optional due date | `PUT /api/items/:id` with `due_date` | `200` and updated due date |
| BE-008 | Toggle completion true | `PUT /api/items/:id` with `completed: true` | `200` and completed state true |
| BE-009 | Toggle completion false | `PUT /api/items/:id` with `completed: false` | `200` and completed state false |
| BE-010 | Delete existing task | `DELETE /api/items/:id` for valid id | `204` and item removed |
| BE-011 | Delete missing task | `DELETE /api/items/:id` for unknown id | `404` with error message |
| BE-012 | Update missing task | `PUT /api/items/:id` for unknown id | `404` with error message |
| BE-013 | Invalid id handling | `PUT` or `DELETE` with non-numeric id | `400` with validation error |

## Frontend Test Cases (UI)

| ID | Requirement | Scenario | Expected Result |
| --- | --- | --- | --- |
| FE-001 | Initial list displays | app loads successfully | list renders tasks from API |
| FE-002 | Loading state | app is waiting for API | loading message shown |
| FE-003 | Create task from form | submit valid title | task appears in UI |
| FE-004 | Block empty title | submit blank title | validation message shown, no API create |
| FE-005 | Edit task title | update title in UI edit flow | updated title shown |
| FE-006 | Delete task | click delete on a row | row removed from UI |
| FE-007 | Toggle completion | mark complete then incomplete | visual state toggles and persists |
| FE-008 | Add description | create/edit with description | description shown in task view |
| FE-009 | Add due date | create/edit with due date | due date shown in task view |
| FE-010 | Filter all/active/completed | switch filter tabs/options | list updates to selected status |
| FE-011 | Search by title | enter title text in search | matching tasks shown |
| FE-012 | API error feedback | force API failure on create/update/delete | user-visible error message shown |
| FE-013 | Success feedback | successful create/update/delete | user-visible success/confirmation shown |
| FE-014 | Empty list state | API returns empty list | empty-state message shown |
| FE-015 | Persistence after refresh | refresh page after data changes | latest data reloads and displays |

## Phase 2 Test Cases

| ID | Requirement | Scenario | Expected Result |
| --- | --- | --- | --- |
| P2-001 | Priority assignment | set low/medium/high priority | priority stored and displayed |
| P2-002 | Tag assignment | add one or more tags | tags stored and displayed |
| P2-003 | Sort by due date | apply due date sort | list order follows due date |
| P2-004 | Sort by priority | apply priority sort | list order follows priority rules |
| P2-005 | Filter by tag | select tag filter | list shows only matching-tag tasks |
| P2-006 | Search title + description | query text across both fields | matching tasks shown from either field |
| P2-007 | Bulk complete | select multiple tasks and complete | all selected tasks set complete |
| P2-008 | Bulk delete | select multiple tasks and delete | all selected tasks removed |
| P2-009 | Clear completed | run clear-completed action | completed tasks removed, active remain |
| P2-010 | Confirm destructive actions | trigger bulk delete/clear | confirmation required before execution |

## Suggested Automation Mapping

- Backend: `packages/backend/__tests__/app.test.js`
- Frontend: `packages/frontend/src/__tests__/App.test.js`
- Manual exploratory checks: run app with `npm run start` at workspace root
