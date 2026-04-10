# Role Test Matrix

Use 3 different Firebase accounts mapped by UID in:

`tpm_system/users/{uid}`

- `admin`
- `auditor`
- `viewer`

## Admin tests

- Can open all screens and buttons.
- Can add/edit/delete departments.
- Can add/delete engineers.
- Can change user roles.
- Can add/edit/delete tags and change tag state.
- Can save audit and export CSV files.

Expected: all succeed.

## Auditor tests

- Can create audits, save final audit.
- Can add tasks and tags, and update tag state.
- Cannot change user roles.
- Cannot add/delete departments or engineers.

Expected: operational actions succeed, admin settings blocked with alert + Firebase deny if forced.

## Viewer tests

- Can view dashboards/history/tags/tasks.
- Cannot save audits.
- Cannot add tasks/tags/comments requiring writer role (comments are allowed by current rules if authenticated).
- Cannot modify departments, engineers, roles, or tags.

Expected: read-only behavior, write actions blocked.

## Forced request checks (DevTools)

Try calling restricted functions from console as `viewer`:

- `addOrUpdateDept()`
- `changeUserRole("x", "admin")`
- `deleteTag(123)`

Expected:

1. UI alert blocks action.
2. If bypass attempted, Firebase Rules reject write.
