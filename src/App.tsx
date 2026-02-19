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

// Import i18n
import "@/i18n";

// Lazy-loaded pages
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminLayout = React.lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
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
const TeacherLayout = React.lazy(() => import("./components/teacher/TeacherLayout").then(m => ({ default: m.TeacherLayout })));
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
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
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
                    
                    {/* Teacher routes */}
                    <Route path="/teacher" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherLayout /></ProtectedRoute>}>
                      <Route index element={<TeacherDashboard />} />
                      <Route path="content-studio" element={<ContentStudioPage />} />
                      <Route path="lessons" element={<TeacherLessonsPage />} />
                      <Route path="recordings" element={<TeacherRecordingsPage />} />
                      <Route path="submissions" element={<TeacherSubmissionsPage />} />
                      <Route path="exercises" element={<TeacherExercisesPage />} />
                      <Route path="materials" element={<TeacherMaterialsPage />} />
                    </Route>
                    
                    {/* Knowledge base */}
                    <Route path="/faq" element={<KnowledgeBasePage />} />
                    
                    {/* Admin routes */}
                    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="teachers" element={<TeacherApprovalsPage />} />
                      <Route path="classes" element={<ClassesPage />} />
                      <Route path="levels" element={<LevelsPage />} />
                      <Route path="payments" element={<PaymentsPage />} />
                      <Route path="discounts" element={<DiscountCodesPage />} />
                      <Route path="placements" element={<PlacementsPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="faq" element={<KnowledgeBaseManagementPage />} />
                      <Route path="reports" element={<ContentReportsPage />} />
                      <Route path="invitations" element={<AdminInvitationsPage />} />
                      <Route path="final-exams" element={<FinalExamsPage />} />
                    </Route>
                    
                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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
