

## Analysis & Fix Plan

### Problem: Missing Media Upload in Exercise Builder

The ExerciseBuilder dialog (used by teachers/admins) has no way to attach reference media to questions. When a teacher selects "Audio Recording", "Video Upload", or "File Upload" as question type, the dialog shows the same fields as a text question (question text, time limit, correction type, explanation). There is no upload area for the teacher to attach:

- A reference audio clip (e.g., "listen and repeat")
- A reference image or PDF (e.g., "look at this document and answer")
- A video example

The database already has a `media_url` column on the `questions` table, and the `ExercisePage` (student side) has a `media_url` field in the Question interface — but it's never populated because the builder never sets it.

### Fix: Add media attachment to ExerciseBuilder

**File: `src/components/teacher/ExerciseBuilder.tsx`**

Add a "Reference Media" upload section in the question dialog that appears for ALL question types (not just upload types — any question could benefit from an attached image/audio). This section will:

1. Show a file drop zone / browse button after the question text tabs
2. Accept images, audio, video, and PDF files
3. Upload to the `exercise-media` storage bucket (already exists)
4. Store the URL in a new `media_url` field on the question form
5. Display a preview (image thumbnail, audio player, or file icon) when media is attached
6. Include a remove button to clear the attachment

Additionally, the student-facing `ExercisePage.tsx` needs to render `media_url` when present (show image, play audio/video, or link to file).

### Implementation Steps

| # | File | Change |
|---|------|--------|
| 1 | `src/components/teacher/ExerciseBuilder.tsx` | Add `media_url` to `questionForm` state. Add a media upload section in the dialog (after question text tabs, before time limit). Upload files to `exercise-media` bucket. Save `media_url` in create/update mutations. |
| 2 | `src/pages/ExercisePage.tsx` | Render `currentQuestion.media_url` above the answer input — show `<img>`, `<audio>`, `<video>`, or download link based on file type |
| 3 | `src/i18n/locales/{nl,en,ar}.json` | Add keys: `teacher.referenceMedia`, `teacher.referenceMediaHint`, `teacher.removeMedia` |

### Technical Details

**ExerciseBuilder media section** (inserted after the i18n Tabs, before the timer grid):

```text
┌─────────────────────────────────────────┐
│ Reference Media (optional)              │
│ ┌─────────────────────────────────────┐ │
│ │  [Drop file or click to browse]     │ │
│ │  Images, audio, video, PDF (max 50MB│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Preview: [image/audio player/file icon] │
│                            [🗑 Remove]  │
└─────────────────────────────────────────┘
```

**Upload target**: `exercise-media` bucket, path: `{exerciseId}/{questionId or timestamp}/filename`

**Student-side rendering** in ExercisePage `CardHeader` (below question text):
- If `media_url` contains image extension → `<img>`
- If audio extension → `<audio controls>`
- If video extension → `<video controls>`
- Otherwise → download link

---

### Optimization & Improvement List

| # | Category | Issue | Fix |
|---|----------|-------|-----|
| 1 | **UX** | No loading state when navigating between lazy-loaded pages (only generic spinner) | Add skeleton loaders per page type |
| 2 | **UX** | No confirmation dialog when deleting questions, exercises, or forum posts | Add `AlertDialog` before destructive actions |
| 3 | **UX** | Drag-and-drop reorder on questions shows `GripVertical` icon but has no actual DnD implementation | Implement with `@dnd-kit/core` or remove the grip icon |
| 4 | **UX** | No search/filter on exercises list for teachers with many exercises | Add search input + status filter |
| 5 | **UX** | Student `ExercisePage` doesn't show which questions are answered in the progress bar | Add question dots/indicators showing answered vs unanswered |
| 6 | **Performance** | `QueryClient` created with no `staleTime` — every focus refetch hits the DB | Set default `staleTime: 5 * 60 * 1000` for most queries |
| 7 | **Performance** | All admin/teacher pages are lazy-loaded but no prefetch on hover | Add `onMouseEnter` prefetch for sidebar links |
| 8 | **Routes** | `/profile` redirects to `/settings` but there's no dedicated profile tab in settings | Verify settings page has a profile section or remove redirect |
| 9 | **Routes** | No `/student-dashboard` route — `DashboardPage` dispatches by role but URL doesn't reflect this | Consider role-specific dashboard URLs |
| 10 | **Security** | `student-uploads` bucket is private but `getPublicUrl()` is used — this returns a URL that won't work without auth | Either make bucket public or use `createSignedUrl()` |
| 11 | **Accessibility** | Missing `aria-label` on icon-only buttons (edit, delete, grip) in ExerciseBuilder | Add descriptive aria-labels |
| 12 | **Accessibility** | No skip-to-content link in AppLayout | Add hidden skip link |
| 13 | **i18n** | Some `t()` calls use template literals in fallback text (e.g., `Max duration: ${x}`) — these won't translate properly | Use i18n interpolation: `t('key', { count: x })` |
| 14 | **Data** | Exercise attempts have no retry/reset mechanism in the UI | Add "Retry" button on failed attempts |
| 15 | **Mobile** | ExerciseBuilder dialog at `max-w-3xl` is hard to use on mobile | Make dialog responsive with full-screen on mobile |
| 16 | **Error handling** | No error boundary inside individual pages — a single component crash takes down the whole app | Add per-page error boundaries |
| 17 | **Chat** | No message read receipts or typing indicators | Implement via Supabase Realtime presence |
| 18 | **Storage** | `exercise-media` bucket has no RLS policies for teacher uploads | Add INSERT policy for teachers and admins |

