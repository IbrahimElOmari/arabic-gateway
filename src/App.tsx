import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Import i18n
import "@/i18n";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
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
              
              {/* Placeholder routes - will be implemented in later phases */}
              <Route path="/self-study" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/self-study/:category" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/live-lessons" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/recordings" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/forum" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              
              {/* Admin routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
