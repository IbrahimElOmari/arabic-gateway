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
import { AppLayout } from "@/components/layout/AppLayout";

// Import i18n
import "@/i18n";

// Lazy-loaded pages
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const PricingPage = React.lazy(() => import("./pages/PricingPage"));

// Admin pages
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const UsersPage = React.lazy(() => import("./pages/admin/UsersPage"));
const TeacherApprovalsPage = React.lazy(() => import("./pages/admin/TeacherApprovalsPage"));
const ClassesPage = React.lazy(() => import("./pages/admin/ClassesPage"));
const LevelsPage = React.lazy(() => import("./pages/admin/LevelsPage"));
const PaymentsPage = React.lazy(() => import("./pages/admin/PaymentsPage"));
const DiscountCodesPage = React.lazy(() => import("./pages/admin/DiscountCodesPage"));
const PlacementsPage = React.lazy(() => import("./pages/admin/PlacementsPage"));
const AnalyticsPage = React.lazy(() => import("./pages/admin/AnalyticsPage"));
const KnowledgeBaseManagementPage = React.lazy(() => import("./pages/admin/KnowledgeBaseManagementPage"));
const ContentReportsPage = React.lazy(() => import("./pages/admin/ContentReportsPage"));
const AdminInvitationsPage = React.lazy(() => import("./pages/admin/AdminInvitationsPage"));
const FinalExamsPage = React.lazy(() => import("./pages/admin/FinalExamsPage"));

// Teacher pages
const TeacherDashboard = React.lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherLessonsPage = React.lazy(() => import("./pages/teacher/TeacherLessonsPage"));
const TeacherRecordingsPage = React.lazy(() => import("./pages/teacher/TeacherRecordingsPage"));
const TeacherSubmissionsPage = React.lazy(() => import("./pages/teacher/TeacherSubmissionsPage"));
const ContentStudioPage = React.lazy(() => import("./pages/teacher/ContentStudioPage"));
const TeacherExercisesPage = React.lazy(() => import("./pages/teacher/TeacherExercisesPage"));
const TeacherMaterialsPage = React.lazy(() => import("./pages/teacher/TeacherMaterialsPage"));

// Self-Study pages
const SelfStudyPage = React.lazy(() => import("./pages/SelfStudyPage"));
const CategoryPage = React.lazy(() => import("./pages/CategoryPage"));
const ExercisePage = React.lazy(() => import("./pages/ExercisePage"));
const FinalExamPage = React.lazy(() => import("./pages/FinalExamPage"));

// Knowledge base
const KnowledgeBasePage = React.lazy(() => import("./pages/KnowledgeBasePage"));

// Live Lessons pages
const LiveLessonsPage = React.lazy(() => import("./pages/LiveLessonsPage"));
const RecordingsPage = React.lazy(() => import("./pages/RecordingsPage"));

// Calendar page
const CalendarPage = React.lazy(() => import("./pages/CalendarPage"));

// Settings and Install pages
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const InstallPage = React.lazy(() => import("./pages/InstallPage"));
const HelpdeskPage = React.lazy(() => import("./pages/HelpdeskPage"));
const GamificationPage = React.lazy(() => import("./pages/GamificationPage"));
const ProgressPage = React.lazy(() => import("./pages/ProgressPage"));

// Community pages
const ForumPage = React.lazy(() => import("./pages/ForumPage"));
const ForumRoomPage = React.lazy(() => import("./pages/ForumRoomPage"));
const ForumPostPage = React.lazy(() => import("./pages/ForumPostPage"));
const ChatPage = React.lazy(() => import("./pages/ChatPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ClassProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <TranslatedErrorBoundary>
                <Suspense fallback={<FullPageLoader />}>
                  <AppLayout>
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
                      
                      {/* Teacher routes - flat, no nested layout */}
                      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherDashboard /></ProtectedRoute>} />
                      <Route path="/teacher/content-studio" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><ContentStudioPage /></ProtectedRoute>} />
                      <Route path="/teacher/lessons" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherLessonsPage /></ProtectedRoute>} />
                      <Route path="/teacher/recordings" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherRecordingsPage /></ProtectedRoute>} />
                      <Route path="/teacher/submissions" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherSubmissionsPage /></ProtectedRoute>} />
                      <Route path="/teacher/exercises" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherExercisesPage /></ProtectedRoute>} />
                      <Route path="/teacher/materials" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherMaterialsPage /></ProtectedRoute>} />
                      
                      {/* Knowledge base */}
                      <Route path="/faq" element={<KnowledgeBasePage />} />
                      
                      {/* Admin routes - flat, no nested layout */}
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
                      
                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                  <CookieConsent />
                  <HelpWidget />
                </Suspense>
              </TranslatedErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </ClassProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
