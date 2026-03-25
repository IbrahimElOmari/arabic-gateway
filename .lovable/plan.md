

## Root Cause Analysis

The problem is an architectural gap in the enrollment flow:

1. **Registration creates a student role** — the `handle_new_user()` trigger inserts into `profiles` and `user_roles` with role `student`
2. **Enrollment is a separate, voluntary step** — a student must visit `/pricing`, pick a class, and click "Inschrijven" to create a `class_enrollments` record
3. **Admin badge only counts `class_enrollments` with `status = 'pending'`** — students who registered but never enrolled have **zero records** in `class_enrollments`, so they're completely invisible to admins

```text
Register → profile + role created → student lands on dashboard
                                      ↓
                              NO enrollment record exists
                                      ↓
                              Admin sees nothing — no pending, no badge
```

The admin has no way to know a new student exists without a class assignment.

---

## Solution

Two complementary fixes:

### A. Admin: "Unassigned Students" indicator

Add a query + UI section to the admin dashboard and sidebar that counts/lists students who have **no record** in `class_enrollments` at all. This lets admins proactively assign them.

**Admin sidebar badge**: Change the existing enrollment badge to show the sum of pending enrollments + unassigned students (or add a second badge on a new "Users" or "Unassigned" link).

**Admin Dashboard / Users page**: Add a prominent alert or tab showing unassigned students with a "Assign to class" action button.

### B. Student: Post-registration nudge

On `StudentDashboard`, detect when the student has zero enrollments and show a prominent banner: "Je bent nog niet ingeschreven voor een klas" with a CTA button to `/pricing`.

---

## Implementation

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/StudentDashboard.tsx` | Add query for `class_enrollments` where `student_id = user.id`. If empty, show alert banner with link to `/pricing` |
| 2 | `src/components/layout/AppSidebar.tsx` | Add a second query counting students with no enrollments (for admin only). Combine with pending count for the badge, or add a separate badge on the Users link |
| 3 | `src/pages/admin/AdminDashboard.tsx` | Add an "Unassigned Students" card showing count + link to users page |
| 4 | `src/pages/admin/UsersPage.tsx` | Add a filter option "Without class" that shows students who have no `class_enrollments` record. Add an inline "Assign to class" action |
| 5 | `src/i18n/locales/{nl,en,ar}.json` | Add keys: `dashboard.noClassAssigned`, `dashboard.noClassAssignedDesc`, `dashboard.goToPricing`, `admin.unassignedStudents`, `admin.unassignedStudentsDesc` |

### Technical Detail

**Unassigned students query** (for admin):
```sql
SELECT p.* FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
WHERE NOT EXISTS (
  SELECT 1 FROM class_enrollments ce WHERE ce.student_id = p.user_id
)
```

This will be implemented as a Supabase RPC function (since the join logic is complex for the JS client), or as two queries: fetch all student user_ids from `user_roles`, then filter out those present in `class_enrollments`.

**Student dashboard banner**: Simple query — if `class_enrollments` returns empty array for the current user, render an `Alert` with a `Link` to `/pricing`.

