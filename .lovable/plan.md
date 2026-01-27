

# Huis van het Arabisch (HVA) - Implementation Plan

## Overview
A comprehensive Arabic language learning platform with a mobile-first PWA approach, supporting three user roles (admin, teacher, student), three learning levels (Beginner, Intermediate, Advanced), and blended learning combining self-study with live teacher-led sessions.

---

## Phase 1: Foundation & Authentication

### 1.1 Core Setup
- Configure PWA support with offline capabilities and home screen installation
- Implement multilingual support (Dutch, English, Arabic with RTL)
- Set up theming system with green/blue color palette and light/dark modes
- Create responsive layouts optimized for mobile-first experience

### 1.2 Authentication & User Management
- Email/password registration with verification
- Role-based accounts: Admin, Teacher, Student
- Profile management with required fields (name, email, phone, address, study level)
- Admin-only ability to invite new admins and approve teacher accounts
- Two-factor authentication for admin/teacher accounts

### 1.3 Database Structure
- Users table with role management (separate roles table for security)
- Levels table (Beginner, Intermediate, Advanced)
- Classes table (max 50 students per class)
- Class enrollment system with teacher assignments
- Payment and subscription tracking

---

## Phase 2: Self-Study Module

### 2.1 Exercise Categories
- **Reading**: Text comprehension with questions
- **Writing**: Open-ended assignments for teacher review
- **Listening**: Audio/video with embedded questions
- **Speaking**: Audio/video upload for teacher feedback
- **Grammar**: Theory, fill-in-the-blank, multiple choice

### 2.2 Question Types
- Multiple choice (auto-graded)
- Checkbox/multi-select (auto-graded)
- Open text (teacher-reviewed)
- Audio/video upload (teacher-reviewed)
- File upload for assignments
- Timer functionality for timed exercises

### 2.3 Content Management
- Admin/teacher content upload interface
- Support for text, PDF, audio, video files (stored in Supabase Storage)
- Exercise scheduling (auto-release every 2 days)
- Multilingual content support (NL/EN/AR)

### 2.4 Automatic Feedback System
- Instant results for auto-graded questions
- Teacher dashboard for reviewing open submissions
- Individual feedback per student answer

---

## Phase 3: Live Lessons & Recordings

### 3.1 Lesson Scheduling
- Calendar interface for planning live sessions
- Google Meet integration (link storage and distribution)
- Class-based scheduling with theme/topic assignment
- Email/push notifications for upcoming lessons

### 3.2 Recording Management
- Video upload interface for lesson recordings
- Theme/topic categorization system
- Attach supplementary materials (slides, documents)
- Post-lesson exercises linked to recordings

### 3.3 Level Progression
- End-of-class assessments
- Pass/fail system for level advancement
- Automatic enrollment in next class upon passing
- Repeat class option for students who don't pass

---

## Phase 4: Community Features

### 4.1 Forum System
- Four rooms: General, Exercises, Collaboration, Extras
- Post and comment functionality
- Role-based moderation (teachers moderate their class, admins moderate all)
- Report/flag system for inappropriate content

### 4.2 Class Chat
- Real-time messaging within each class
- Emoji reactions and likes
- Message history (with retention policy)
- Teacher presence indicators

### 4.3 Personal Calendar
- Individual event management
- Class schedule integration
- Study planning tools
- Reminder notifications

---

## Phase 5: Progress & Analytics

### 5.1 Student Dashboard
- Category-based progress visualization (radar/bar charts)
- Overall score calculation
- Exercise completion tracking
- Streak and engagement metrics

### 5.2 Teacher Dashboard
- Class-wide performance overview
- Individual student progress cards
- Submission queue for pending reviews
- Comparative analytics between students

### 5.3 Admin Dashboard
- Platform-wide metrics
- Enrollment and payment statistics
- Level/class population data
- Export functionality (CSV, PDF)

---

## Phase 6: Payments & Subscriptions

### 6.1 Stripe Integration
- Secure checkout with tokenized payments
- Class-based pricing (set by admin)
- Subscription and one-time payment options
- Installment payment plans
- Discount/promo code system

### 6.2 Payment Management
- Admin panel for manual payment recording
- Webhook integration for automatic status updates
- Access control based on payment status
- Failed payment handling and notifications

---

## Phase 7: Administration

### 7.1 Admin Controls
- User management (approve, suspend, delete)
- Class creation and configuration
- Teacher-to-class assignments
- Student-to-class assignments
- Pricing and discount management

### 7.2 Content Administration
- Bulk exercise creation tools
- Level/class curriculum overview
- Media library management
- Translation management interface

---

## Technical Architecture

### Frontend
- React + TypeScript + Vite
- Tailwind CSS with custom theming
- PWA configuration for installability
- i18next for internationalization
- RTL support for Arabic

### Backend (Supabase)
- PostgreSQL database with RLS policies
- Supabase Auth with role-based access
- Supabase Storage for media files
- Edge Functions for Stripe webhooks and email
- Real-time subscriptions for chat

### Key Integrations
- Stripe for payments
- Resend for transactional emails
- Google Meet links (stored, not integrated)

---

## Accessibility & Compliance
- WCAG 2.1 compliance
- Screen reader support
- Keyboard navigation
- Adjustable text sizes
- High contrast modes
- GDPR-compliant data handling
- 12-month data retention after unenrollment

---

## Deliverables
1. Mobile-first PWA accessible on all devices
2. Three distinct user experiences (admin/teacher/student)
3. Complete self-study module with 5 categories
4. Live lesson scheduling and recording system
5. Community features (forum + chat)
6. Comprehensive analytics dashboards
7. Secure payment processing
8. Multilingual interface (NL/EN/AR with RTL)

