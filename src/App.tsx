import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClassProvider } from "@/contexts/ClassContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Import i18n
import "@/i18n";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

// Admin pages
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import TeacherApprovalsPage from "./pages/admin/TeacherApprovalsPage";
import ClassesPage from "./pages/admin/ClassesPage";
import LevelsPage from "./pages/admin/LevelsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import DiscountCodesPage from "./pages/admin/DiscountCodesPage";
import PlacementsPage from "./pages/admin/PlacementsPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

// Teacher pages
import { TeacherLayout } from "./components/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherLessonsPage from "./pages/teacher/TeacherLessonsPage";
import TeacherRecordingsPage from "./pages/teacher/TeacherRecordingsPage";
import TeacherSubmissionsPage from "./pages/teacher/TeacherSubmissionsPage";
import ContentStudioPage from "./pages/teacher/ContentStudioPage";

// Self-Study pages
import SelfStudyPage from "./pages/SelfStudyPage";
import CategoryPage from "./pages/CategoryPage";
import ExercisePage from "./pages/ExercisePage";
import FinalExamPage from "./pages/FinalExamPage";

// Teacher exercise and materials pages
import TeacherExercisesPage from "./pages/teacher/TeacherExercisesPage";
import TeacherMaterialsPage from "./pages/teacher/TeacherMaterialsPage";

// Knowledge base
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import KnowledgeBaseManagementPage from "./pages/admin/KnowledgeBaseManagementPage";
import ContentReportsPage from "./pages/admin/ContentReportsPage";
import AdminInvitationsPage from "./pages/admin/AdminInvitationsPage";
import FinalExamsPage from "./pages/admin/FinalExamsPage";
// Live Lessons pages
import LiveLessonsPage from "./pages/LiveLessonsPage";
import RecordingsPage from "./pages/RecordingsPage";

// Calendar page
import CalendarPage from "./pages/CalendarPage";

// Settings and Install pages
import SettingsPage from "./pages/SettingsPage";
import InstallPage from "./pages/InstallPage";
import HelpdeskPage from "./pages/HelpdeskPage";
import GamificationPage from "./pages/GamificationPage";
import ProgressPage from "./pages/ProgressPage";

// Community pages
import ForumPage from "./pages/ForumPage";
import ForumRoomPage from "./pages/ForumRoomPage";
import ForumPostPage from "./pages/ForumPostPage";
import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ClassProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
              <Route path="/profile" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/helpdesk" element={<ProtectedRoute><HelpdeskPage /></ProtectedRoute>} />
              <Route path="/gamification" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
              <Route path="/install" element={<InstallPage />} />
              
              {/* Teacher routes */}
              <Route path="/teacher" element={<TeacherLayout />}>
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
              <Route path="/admin" element={<AdminLayout />}>
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
          </BrowserRouter>
        </TooltipProvider>
      </ClassProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
