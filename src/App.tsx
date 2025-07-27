import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import FishEnvironment from './pages/FishEnvironment';
import PlantEnvironment from './pages/PlantEnvironment';
import AIAnalysis from './pages/AIAnalysis';
import DataImport from './pages/DataImport';
import ESP32Download from './pages/ESP32Download';
import ProjectManagement from './pages/ProjectManagement';
import ProjectSettings from './pages/ProjectSettings';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ImportedFishDashboard from './pages/ImportedFishDashboard';
import ImportedPlantDashboard from './pages/ImportedPlantDashboard';
import { useAuthStore } from './store/useAuthStore';
import { useTheme } from './hooks/useTheme';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useTheme();
  
  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  
  return (
    <Router>
      <div className={theme}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          
          {/* Protected Routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          
          {/* Dashboard Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/fish-environment" element={
            <ProtectedRoute>
              <DashboardLayout>
                <FishEnvironment />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/plant-environment" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlantEnvironment />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/ai-analysis" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AIAnalysis />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/data-import" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataImport />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/esp32-download" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ESP32Download />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectManagement />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectSettings />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/project-settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectSettings />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Short Routes for Fish and Plant Pages */}
          <Route path="/fish" element={
            <ProtectedRoute>
              <DashboardLayout>
                <FishEnvironment />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/plants" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlantEnvironment />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Short Route for Import Page */}
          <Route path="/import" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataImport />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Imported Data Routes */}
          <Route path="/imported/fish" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ImportedFishDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/imported/plants" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ImportedPlantDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
        
        {/* Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: theme === 'dark' ? '#1f2937' : '#ffffff',
              color: theme === 'dark' ? '#f9fafb' : '#111827',
              border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;
