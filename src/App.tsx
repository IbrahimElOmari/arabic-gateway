import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClassProvider } from "@/contexts/ClassContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import TranslatedErrorBoundary from "@/components/TranslatedErrorBoundary";
import { FullPageLoader } from "@/components/FullPageLoader";
import { CookieConsent } from "@/components/CookieConsent";
import { HelpWidget } from "@/components/HelpWidget";
import { IdleTimeoutWarning } from "@/components/IdleTimeoutWarning";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { lazyWithRetry } from "@/lib/lazy-retry";

// Import i18n
import "@/i18n";

// Lazy-loaded pages
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));

// Admin pages
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const UsersPage = lazyWithRetry(() => import("./pages/admin/UsersPage"));
const TeacherApprovalsPage = lazyWithRetry(() => import("./pages/admin/TeacherApprovalsPage"));
const ClassesPage = lazyWithRetry(() => import("./pages/admin/ClassesPage"));
const LevelsPage = lazyWithRetry(() => import("./pages/admin/LevelsPage"));
const PaymentsPage = lazyWithRetry(() => import("./pages/admin/PaymentsPage"));
const DiscountCodesPage = lazyWithRetry(() => import("./pages/admin/DiscountCodesPage"));
const PlacementsPage = lazyWithRetry(() => import("./pages/admin/PlacementsPage"));
const AnalyticsPage = lazyWithRetry(() => import("./pages/admin/AnalyticsPage"));
const KnowledgeBaseManagementPage = lazyWithRetry(() => import("./pages/admin/KnowledgeBaseManagementPage"));
const ContentReportsPage = lazyWithRetry(() => import("./pages/admin/ContentReportsPage"));
const AdminInvitationsPage = lazyWithRetry(() => import("./pages/admin/AdminInvitationsPage"));
const FinalExamsPage = lazyWithRetry(() => import("./pages/admin/FinalExamsPage"));
const EnrollmentRequestsPage = lazyWithRetry(() => import("./pages/admin/EnrollmentRequestsPage"));
const DesignSystemPage = lazyWithRetry(() => import("./pages/admin/DesignSystemPage"));

// Teacher pages
const TeacherDashboard = lazyWithRetry(() => import("./pages/teacher/TeacherDashboard"));
const TeacherLessonsPage = lazyWithRetry(() => import("./pages/teacher/TeacherLessonsPage"));
const TeacherRecordingsPage = lazyWithRetry(() => import("./pages/teacher/TeacherRecordingsPage"));
const TeacherSubmissionsPage = lazyWithRetry(() => import("./pages/teacher/TeacherSubmissionsPage"));
const ContentStudioPage = lazyWithRetry(() => import("./pages/teacher/ContentStudioPage"));
const TeacherExercisesPage = lazyWithRetry(() => import("./pages/teacher/TeacherExercisesPage"));
const TeacherMaterialsPage = lazyWithRetry(() => import("./pages/teacher/TeacherMaterialsPage"));

// Self-Study pages
const SelfStudyPage = lazyWithRetry(() => import("./pages/SelfStudyPage"));
const CategoryPage = lazyWithRetry(() => import("./pages/CategoryPage"));
const ExercisePage = lazyWithRetry(() => import("./pages/ExercisePage"));
const FinalExamPage = lazyWithRetry(() => import("./pages/FinalExamPage"));

// Knowledge base
const KnowledgeBasePage = lazyWithRetry(() => import("./pages/KnowledgeBasePage"));

// Live Lessons pages
const LiveLessonsPage = lazyWithRetry(() => import("./pages/LiveLessonsPage"));
const RecordingsPage = lazyWithRetry(() => import("./pages/RecordingsPage"));

// Calendar page
const CalendarPage = lazyWithRetry(() => import("./pages/CalendarPage"));

// Settings and Install pages
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const InstallPage = lazyWithRetry(() => import("./pages/InstallPage"));
const HelpdeskPage = lazyWithRetry(() => import("./pages/HelpdeskPage"));
const GamificationPage = lazyWithRetry(() => import("./pages/GamificationPage"));
const ProgressPage = lazyWithRetry(() => import("./pages/ProgressPage"));

// Community pages
const ForumPage = lazyWithRetry(() => import("./pages/ForumPage"));
const ForumRoomPage = lazyWithRetry(() => import("./pages/ForumRoomPage"));
const ForumPostPage = lazyWithRetry(() => import("./pages/ForumPostPage"));
const ChatPage = lazyWithRetry(() => import("./pages/ChatPage"));
const ApplyTeacherPage = lazyWithRetry(() => import("./pages/ApplyTeacherPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ClassProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <TranslatedErrorBoundary>
                {/* AppLayout is OUTSIDE Suspense so sidebar never unmounts */}
                <AppLayout>
                  <Suspense fallback={<FullPageLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      
                      {/* Protected routes */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* Self-Study routes */}
                      <Route path="/self-study" element={<ProtectedRoute><SelfStudyPage /></ProtectedRoute>} />
                      <Route path="/self-study/:category" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
                      <Route path="/self-study/:category/:exerciseId" element={<ProtectedRoute><ExercisePage /></ProtectedRoute>} />
                      <Route path="/final-exam/:examId" element={<ProtectedRoute><FinalExamPage /></ProtectedRoute>} />
                      
                      {/* Live Lessons routes */}
                      <Route path="/live-lessons" element={<ProtectedRoute><LiveLessonsPage /></ProtectedRoute>} />
                      <Route path="/recordings" element={<ProtectedRoute><RecordingsPage /></ProtectedRoute>} />
                      
                      {/* Community routes */}
                      <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
                      <Route path="/forum/:roomName" element={<ProtectedRoute><ForumRoomPage /></ProtectedRoute>} />
                      <Route path="/forum/:roomName/:postId" element={<ProtectedRoute><ForumPostPage /></ProtectedRoute>} />
                      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                      
                      {/* Other protected routes */}
                      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                      <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
                      <Route path="/profile" element={<Navigate to="/settings" replace />} />
                      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                      <Route path="/helpdesk" element={<ProtectedRoute><HelpdeskPage /></ProtectedRoute>} />
                      <Route path="/gamification" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
                      <Route path="/install" element={<InstallPage />} />
                      <Route path="/apply-teacher" element={<ProtectedRoute><ApplyTeacherPage /></ProtectedRoute>} />
                      {/* Teacher routes */}
                      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherDashboard /></ProtectedRoute>} />
                      <Route path="/teacher/content-studio" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><ContentStudioPage /></ProtectedRoute>} />
                      <Route path="/teacher/lessons" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherLessonsPage /></ProtectedRoute>} />
                      <Route path="/teacher/recordings" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherRecordingsPage /></ProtectedRoute>} />
                      <Route path="/teacher/submissions" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherSubmissionsPage /></ProtectedRoute>} />
                      <Route path="/teacher/exercises" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherExercisesPage /></ProtectedRoute>} />
                      <Route path="/teacher/materials" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherMaterialsPage /></ProtectedRoute>} />
                      
                      {/* Knowledge base */}
                      <Route path="/faq" element={<KnowledgeBasePage />} />
                      
                      {/* Admin routes */}
                      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
                      <Route path="/admin/teachers" element={<ProtectedRoute requiredRole="admin"><TeacherApprovalsPage /></ProtectedRoute>} />
                      <Route path="/admin/classes" element={<ProtectedRoute requiredRole="admin"><ClassesPage /></ProtectedRoute>} />
                      <Route path="/admin/levels" element={<ProtectedRoute requiredRole="admin"><LevelsPage /></ProtectedRoute>} />
                      <Route path="/admin/payments" element={<ProtectedRoute requiredRole="admin"><PaymentsPage /></ProtectedRoute>} />
                      <Route path="/admin/discounts" element={<ProtectedRoute requiredRole="admin"><DiscountCodesPage /></ProtectedRoute>} />
                      <Route path="/admin/placements" element={<ProtectedRoute requiredRole="admin"><PlacementsPage /></ProtectedRoute>} />
                      <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AnalyticsPage /></ProtectedRoute>} />
                      <Route path="/admin/faq" element={<ProtectedRoute requiredRole="admin"><KnowledgeBaseManagementPage /></ProtectedRoute>} />
                      <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><ContentReportsPage /></ProtectedRoute>} />
                      <Route path="/admin/invitations" element={<ProtectedRoute requiredRole="admin"><AdminInvitationsPage /></ProtectedRoute>} />
                      <Route path="/admin/final-exams" element={<ProtectedRoute requiredRole="admin"><FinalExamsPage /></ProtectedRoute>} />
                      <Route path="/admin/enrollments" element={<ProtectedRoute requiredRole="admin"><EnrollmentRequestsPage /></ProtectedRoute>} />
                      <Route path="/admin/design-system" element={<ProtectedRoute requiredRole="admin"><DesignSystemPage /></ProtectedRoute>} />
                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AppLayout>
                <CookieConsent />
                <HelpWidget />
                <IdleTimeoutWarning />
              </TranslatedErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </ClassProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
