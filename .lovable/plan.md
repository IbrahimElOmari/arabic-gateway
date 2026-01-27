

# Huis van het Arabisch - Complete Implementation Plan

This plan covers all requested features: PWA icons/logo, Stripe payment preparation, Live Lessons system, Admin Panel, and Self-Study Module.

---

## 1. PWA Icons & App Logo

### Design Approach
Create a brand logo representing "Huis van het Arabisch" (House of Arabic) using the established green/blue color palette (primary: #3d8c6e, accent: #3db8a0).

### Logo Concept
- A stylized Arabic letter (ح - Ha) combined with a house/building silhouette
- Clean, modern design that works at small sizes
- Colors: Primary teal-green gradient

### Files to Create
- `public/pwa-192x192.png` - Standard icon (192x192)
- `public/pwa-512x512.png` - Large icon (512x512)
- `public/pwa-maskable-192x192.png` - Maskable icon for Android
- `public/pwa-maskable-512x512.png` - Maskable icon large
- `public/apple-touch-icon.png` - iOS icon (180x180)
- `public/logo.svg` - Scalable vector logo
- `src/components/Logo.tsx` - Reusable logo component

### Updates Required
- `index.html` - Add Apple touch icon meta tags

---

## 2. Stripe Payment Infrastructure (Prepared)

Since no Stripe account is available yet, we will build all the database tables, edge functions, and UI components that will work once a Stripe API key is provided.

### Database Tables

```text
+------------------+     +------------------+     +------------------+
|   subscriptions  |     |     payments     |     |  discount_codes  |
+------------------+     +------------------+     +------------------+
| id               |     | id               |     | id               |
| user_id          |     | user_id          |     | code             |
| class_id         |     | subscription_id  |     | discount_percent |
| stripe_sub_id    |     | stripe_payment_id|     | discount_amount  |
| stripe_cust_id   |     | amount           |     | valid_from       |
| status           |     | currency         |     | valid_until      |
| current_period   |     | status           |     | max_uses         |
| plan_type        |     | payment_method   |     | current_uses     |
| installment_plan |     | created_at       |     | class_id         |
+------------------+     +------------------+     +------------------+

+------------------+
| installment_plans|
+------------------+
| id               |
| name             |
| total_installments|
| interval_months  |
| description      |
+------------------+
```

### New Tables to Create

**subscriptions**
- `id` (UUID, PK)
- `user_id` (UUID, FK -> auth.users)
- `class_id` (UUID, FK -> classes)
- `stripe_customer_id` (TEXT, nullable until Stripe connected)
- `stripe_subscription_id` (TEXT, nullable)
- `status` (ENUM: pending, active, past_due, canceled, paused)
- `plan_type` (ENUM: one_time, subscription, installment)
- `installment_plan_id` (UUID, FK, nullable)
- `current_period_start`, `current_period_end`
- `created_at`, `updated_at`

**payments**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `subscription_id` (UUID, FK)
- `stripe_payment_intent_id` (TEXT, nullable)
- `amount`, `currency`
- `status` (ENUM: pending, succeeded, failed, refunded)
- `payment_method` (ENUM: stripe, manual, cash, bank_transfer)
- `notes` (TEXT, for manual payments)
- `created_at`

**discount_codes**
- `id` (UUID, PK)
- `code` (TEXT, unique)
- `discount_type` (ENUM: percentage, fixed_amount)
- `discount_value` (DECIMAL)
- `valid_from`, `valid_until` (TIMESTAMP)
- `max_uses`, `current_uses` (INTEGER)
- `class_id` (UUID, FK, nullable - null means all classes)
- `is_active` (BOOLEAN)
- `created_by` (UUID, FK)

**installment_plans**
- `id` (UUID, PK)
- `name` (TEXT)
- `total_installments` (INTEGER)
- `interval_months` (INTEGER)
- `description` (TEXT, multilingual JSON)
- `is_active` (BOOLEAN)

### Edge Functions (Prepared but inactive)

**`stripe-checkout`** - Creates Stripe checkout session
- Validates class enrollment eligibility
- Applies discount codes
- Supports one-time, subscription, and installment modes
- Returns checkout URL (placeholder until Stripe enabled)

**`stripe-webhook`** - Handles Stripe events
- `checkout.session.completed` - Activate subscription
- `invoice.payment_succeeded` - Record payment
- `invoice.payment_failed` - Handle failed payment
- `customer.subscription.updated` - Sync status

**`manual-payment`** - Admin records manual payments
- Creates payment record
- Updates subscription status
- Sends confirmation email

### Frontend Components

**New Files:**
- `src/components/payments/PricingCard.tsx` - Display class pricing
- `src/components/payments/CheckoutButton.tsx` - Initiate payment
- `src/components/payments/DiscountCodeInput.tsx` - Apply promo codes
- `src/components/payments/PaymentHistory.tsx` - User payment list
- `src/components/payments/SubscriptionStatus.tsx` - Current status
- `src/pages/PaymentPage.tsx` - Class payment flow
- `src/pages/admin/PaymentsPage.tsx` - Admin payment management

---

## 3. Live Lessons System

### Database Tables

```text
+------------------+     +------------------+     +------------------+
|     lessons      |     |  lesson_themes   |     |lesson_recordings |
+------------------+     +------------------+     +------------------+
| id               |     | id               |     | id               |
| class_id         |     | name_nl/en/ar    |     | lesson_id        |
| theme_id         |     | description      |     | video_url        |
| title            |     | created_by       |     | duration         |
| description      |     | created_at       |     | materials        |
| scheduled_at     |     +------------------+     | created_at       |
| duration_minutes |                              +------------------+
| meet_link        |     +------------------+
| status           |     |lesson_attendance |
| created_by       |     +------------------+
+------------------+     | id               |
                         | lesson_id        |
                         | student_id       |
                         | attended         |
                         | joined_at        |
                         +------------------+
```

### New Tables

**lesson_themes**
- `id` (UUID, PK)
- `name_nl`, `name_en`, `name_ar` (TEXT)
- `description` (TEXT)
- `display_order` (INTEGER)
- `created_by` (UUID, FK)
- `created_at`, `updated_at`

**lessons**
- `id` (UUID, PK)
- `class_id` (UUID, FK -> classes)
- `theme_id` (UUID, FK -> lesson_themes)
- `title` (TEXT)
- `description` (TEXT)
- `scheduled_at` (TIMESTAMP WITH TIME ZONE)
- `duration_minutes` (INTEGER, default 90)
- `meet_link` (TEXT) - Google Meet URL
- `status` (ENUM: scheduled, in_progress, completed, canceled)
- `created_by` (UUID, FK)
- `created_at`, `updated_at`

**lesson_recordings**
- `id` (UUID, PK)
- `lesson_id` (UUID, FK -> lessons)
- `video_url` (TEXT) - Supabase Storage URL
- `thumbnail_url` (TEXT)
- `duration_seconds` (INTEGER)
- `uploaded_by` (UUID, FK)
- `created_at`

**lesson_materials**
- `id` (UUID, PK)
- `lesson_id` (UUID, FK)
- `recording_id` (UUID, FK, nullable)
- `title` (TEXT)
- `file_url` (TEXT)
- `file_type` (TEXT) - pdf, pptx, video, etc.
- `display_order` (INTEGER)
- `uploaded_by` (UUID, FK)
- `created_at`

**lesson_attendance**
- `id` (UUID, PK)
- `lesson_id` (UUID, FK)
- `student_id` (UUID, FK)
- `attended` (BOOLEAN)
- `joined_at` (TIMESTAMP, nullable)
- `notes` (TEXT)

### Storage Buckets
- `lesson-recordings` - Video files (private, RLS protected)
- `lesson-materials` - PDFs, slides, documents

### Frontend Components

**Pages:**
- `src/pages/LiveLessonsPage.tsx` - Student view of upcoming lessons
- `src/pages/RecordingsPage.tsx` - Browse recorded lessons
- `src/pages/teacher/LessonSchedulerPage.tsx` - Teacher creates/edits lessons
- `src/pages/teacher/RecordingUploadPage.tsx` - Upload recordings

**Components:**
- `src/components/lessons/LessonCard.tsx` - Display lesson info
- `src/components/lessons/LessonCalendar.tsx` - Calendar view
- `src/components/lessons/MeetLinkButton.tsx` - Join Meet button
- `src/components/lessons/RecordingPlayer.tsx` - Video player
- `src/components/lessons/MaterialsList.tsx` - Attached materials
- `src/components/lessons/ThemeSelector.tsx` - Pick theme/topic
- `src/components/lessons/AttendanceTracker.tsx` - Mark attendance

---

## 4. Admin Panel

### New Pages Structure

```text
/admin
  /dashboard     - Overview metrics
  /users         - User management
  /users/:id     - User details
  /teachers      - Teacher approvals
  /classes       - Class management
  /classes/:id   - Class details
  /levels        - Level management
  /payments      - Payment overview
  /discounts     - Discount codes
  /settings      - Platform settings
```

### Database Additions

**teacher_applications**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `status` (ENUM: pending, approved, rejected)
- `qualifications` (TEXT)
- `experience` (TEXT)
- `requested_levels` (UUID[], array of level IDs)
- `reviewed_by` (UUID, FK, nullable)
- `reviewed_at` (TIMESTAMP, nullable)
- `review_notes` (TEXT)
- `created_at`

**admin_activity_log**
- `id` (UUID, PK)
- `admin_id` (UUID, FK)
- `action` (TEXT)
- `target_table` (TEXT)
- `target_id` (UUID)
- `details` (JSONB)
- `created_at`

### Frontend Components

**Layout:**
- `src/components/admin/AdminLayout.tsx` - Admin sidebar navigation
- `src/components/admin/AdminSidebar.tsx` - Navigation menu

**Dashboard:**
- `src/pages/admin/AdminDashboard.tsx` - Overview with key metrics
- `src/components/admin/StatsCards.tsx` - Quick stats display
- `src/components/admin/RecentActivityList.tsx` - Activity feed

**User Management:**
- `src/pages/admin/UsersPage.tsx` - List all users with filters
- `src/pages/admin/UserDetailsPage.tsx` - Individual user view
- `src/components/admin/UserTable.tsx` - Sortable user table
- `src/components/admin/UserRoleEditor.tsx` - Change user roles
- `src/components/admin/UserStatusBadge.tsx` - Active/suspended status

**Teacher Approval:**
- `src/pages/admin/TeacherApprovalsPage.tsx` - Pending teacher applications
- `src/components/admin/TeacherApplicationCard.tsx` - Application details
- `src/components/admin/ApprovalActions.tsx` - Approve/reject buttons

**Class Management:**
- `src/pages/admin/ClassesPage.tsx` - List all classes
- `src/pages/admin/ClassDetailsPage.tsx` - Class detail view
- `src/pages/admin/CreateClassPage.tsx` - Create new class
- `src/components/admin/ClassForm.tsx` - Class creation/edit form
- `src/components/admin/TeacherAssignment.tsx` - Assign teacher to class
- `src/components/admin/StudentEnrollment.tsx` - Enroll students
- `src/components/admin/EnrollmentLimitWarning.tsx` - 50 student limit alert

**Level Management:**
- `src/pages/admin/LevelsPage.tsx` - Manage levels
- `src/components/admin/LevelForm.tsx` - Create/edit level

**Discount Management:**
- `src/pages/admin/DiscountCodesPage.tsx` - Manage promo codes
- `src/components/admin/DiscountCodeForm.tsx` - Create discount

### RLS Policies Updates
- Admin-only access to teacher_applications
- Admin-only access to admin_activity_log
- Audit logging trigger for sensitive operations

---

## 5. Self-Study Module

### Database Tables

```text
+------------------+     +------------------+     +------------------+
| exercise_categories|   |    exercises     |     |    questions     |
+------------------+     +------------------+     +------------------+
| id               |     | id               |     | id               |
| name (enum)      |     | class_id         |     | exercise_id      |
| description      |     | category_id      |     | type (enum)      |
| icon             |     | title            |     | question_text    |
+------------------+     | description      |     | media_url        |
                         | release_date     |     | options (JSON)   |
+------------------+     | due_date         |     | correct_answer   |
| student_answers  |     | time_limit       |     | points           |
+------------------+     | created_by       |     | order            |
| id               |     +------------------+     +------------------+
| question_id      |
| student_id       |
| answer_text      |
| file_url         |
| score            |
| feedback         |
| reviewed_by      |
+------------------+
```

### New Tables

**exercise_categories** (Seed data)
- `id` (UUID, PK)
- `name` (ENUM: reading, writing, listening, speaking, grammar)
- `name_nl`, `name_en`, `name_ar` (TEXT)
- `description` (TEXT)
- `icon` (TEXT) - Lucide icon name
- `display_order` (INTEGER)

**exercises**
- `id` (UUID, PK)
- `class_id` (UUID, FK -> classes)
- `category_id` (UUID, FK -> exercise_categories)
- `title` (TEXT)
- `description` (TEXT)
- `instructions` (TEXT, multilingual JSON)
- `release_date` (TIMESTAMP) - When exercise becomes available
- `due_date` (TIMESTAMP, nullable)
- `time_limit_seconds` (INTEGER, nullable) - For timed exercises
- `is_published` (BOOLEAN)
- `max_attempts` (INTEGER, default 1)
- `passing_score` (INTEGER, default 60) - Percentage
- `created_by` (UUID, FK)
- `created_at`, `updated_at`

**questions**
- `id` (UUID, PK)
- `exercise_id` (UUID, FK -> exercises)
- `type` (ENUM: multiple_choice, checkbox, open_text, audio_upload, video_upload, file_upload)
- `question_text` (JSONB) - Multilingual: {nl, en, ar}
- `media_url` (TEXT, nullable) - Audio/video for question
- `options` (JSONB, nullable) - For multiple choice: [{label, value, isCorrect}]
- `correct_answer` (JSONB, nullable) - For auto-grading
- `points` (INTEGER, default 1)
- `time_limit_seconds` (INTEGER, nullable) - Per-question timer
- `display_order` (INTEGER)
- `explanation` (TEXT, nullable) - Shown after answer
- `created_at`

**student_answers**
- `id` (UUID, PK)
- `question_id` (UUID, FK -> questions)
- `student_id` (UUID, FK)
- `exercise_attempt_id` (UUID, FK)
- `answer_text` (TEXT, nullable)
- `answer_data` (JSONB, nullable) - For multiple choice selections
- `file_url` (TEXT, nullable) - For uploaded answers
- `is_correct` (BOOLEAN, nullable) - Auto-graded
- `score` (DECIMAL, nullable)
- `feedback` (TEXT, nullable) - Teacher feedback
- `reviewed_by` (UUID, FK, nullable)
- `reviewed_at` (TIMESTAMP, nullable)
- `submitted_at` (TIMESTAMP)

**exercise_attempts**
- `id` (UUID, PK)
- `exercise_id` (UUID, FK)
- `student_id` (UUID, FK)
- `attempt_number` (INTEGER)
- `started_at` (TIMESTAMP)
- `submitted_at` (TIMESTAMP, nullable)
- `total_score` (DECIMAL, nullable)
- `passed` (BOOLEAN, nullable)
- `time_spent_seconds` (INTEGER)

**student_progress**
- `id` (UUID, PK)
- `student_id` (UUID, FK)
- `class_id` (UUID, FK)
- `category_id` (UUID, FK)
- `exercises_completed` (INTEGER)
- `exercises_total` (INTEGER)
- `average_score` (DECIMAL)
- `updated_at` (TIMESTAMP)

### Storage Bucket
- `exercise-media` - Audio/video content for exercises
- `student-uploads` - Student audio/video/file submissions

### Frontend Components

**Pages:**
- `src/pages/SelfStudyPage.tsx` - Category overview
- `src/pages/CategoryPage.tsx` - Exercises in category
- `src/pages/ExercisePage.tsx` - Take an exercise
- `src/pages/ExerciseResultsPage.tsx` - View results/feedback
- `src/pages/teacher/ExerciseBuilderPage.tsx` - Create exercises
- `src/pages/teacher/SubmissionReviewPage.tsx` - Review student work

**Components:**
- `src/components/exercises/CategoryCard.tsx` - Category with progress
- `src/components/exercises/ExerciseCard.tsx` - Exercise preview
- `src/components/exercises/ExerciseTimer.tsx` - Countdown timer
- `src/components/exercises/QuestionRenderer.tsx` - Render any question type

**Question Type Components:**
- `src/components/exercises/questions/MultipleChoice.tsx`
- `src/components/exercises/questions/CheckboxQuestion.tsx`
- `src/components/exercises/questions/OpenTextQuestion.tsx`
- `src/components/exercises/questions/AudioUploadQuestion.tsx`
- `src/components/exercises/questions/VideoUploadQuestion.tsx`
- `src/components/exercises/questions/FileUploadQuestion.tsx`

**Teacher Components:**
- `src/components/exercises/builder/QuestionBuilder.tsx`
- `src/components/exercises/builder/OptionEditor.tsx`
- `src/components/exercises/builder/MediaUploader.tsx`
- `src/components/exercises/review/SubmissionCard.tsx`
- `src/components/exercises/review/FeedbackEditor.tsx`
- `src/components/exercises/review/AudioPlayer.tsx`

---

## 6. i18n Updates

### New Translation Keys

Add to all locale files (nl.json, en.json, ar.json):

```json
{
  "payments": {
    "checkout": "...",
    "subscription": "...",
    "oneTime": "...",
    "installments": "...",
    "discount": "...",
    "applyCode": "...",
    "paymentSuccess": "...",
    "paymentFailed": "..."
  },
  "lessons": {
    "upcoming": "...",
    "recordings": "...",
    "joinMeet": "...",
    "watchRecording": "...",
    "materials": "...",
    "theme": "..."
  },
  "exercises": {
    "start": "...",
    "submit": "...",
    "timeRemaining": "...",
    "attempts": "...",
    "score": "...",
    "passed": "...",
    "failed": "...",
    "feedback": "..."
  },
  "admin": {
    "users": "...",
    "teachers": "...",
    "classes": "...",
    "levels": "...",
    "payments": "...",
    "discounts": "...",
    "approve": "...",
    "reject": "..."
  }
}
```

---

## 7. Implementation Order

### Step 1: Database Migrations
Create all new tables with proper RLS policies in a single migration

### Step 2: Storage Buckets
Create storage buckets for media files

### Step 3: PWA Icons & Logo
Generate and add all icon assets

### Step 4: Admin Panel Foundation
Build admin layout and navigation, then implement:
- User management
- Teacher approval workflow
- Class/level management

### Step 5: Self-Study Module
Build in order:
- Category display
- Exercise builder (teacher)
- Exercise taking (student)
- Auto-grading logic
- Teacher review interface

### Step 6: Live Lessons
Implement:
- Lesson scheduling
- Google Meet link distribution
- Recording upload
- Material attachments

### Step 7: Payment System
Finally, implement payment infrastructure:
- Database tables for subscriptions/payments
- Edge functions (ready for Stripe)
- UI components
- Manual payment recording

---

## Technical Notes

### Stripe Preparation
All Stripe-related code will use environment variables:
- `STRIPE_SECRET_KEY` - Not required until Stripe enabled
- Edge functions will have graceful fallbacks
- UI will show "Payments coming soon" if Stripe not configured

### File Upload Strategy
- Use Supabase Storage with signed URLs
- Max file sizes: Video 500MB, Audio 50MB, Documents 20MB
- Supported formats: MP4, MP3, WAV, PDF, PPTX, DOCX

### Auto-grading Logic
Multiple choice and checkbox questions will be graded immediately on submission using a database function that compares student answers with correct answers stored in the questions table.

