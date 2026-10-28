import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { OfflineBar } from './components/common/OfflineBar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Citizen Pages
import { CitizenRequestForm } from './pages/citizen/CitizenRequestForm';
import { SubmissionConfirmation } from './pages/citizen/SubmissionConfirmation';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { CitizenRequestDetail } from './pages/citizen/CitizenRequestDetail';

// Coordinator Pages
import { CoordinatorDashboard } from './pages/coordinator/CoordinatorDashboard';
import { RequestTriageList } from './pages/coordinator/RequestTriageList';
import { RequestDetailTriage } from './pages/coordinator/RequestDetailTriage';
import { CoordinatorMapPage } from './pages/coordinator/CoordinatorMapPage';
import { ResponderDirectoryPage } from './pages/coordinator/ResponderDirectoryPage';
import { CoordinatorAnalyticsPage } from './pages/coordinator/CoordinatorAnalyticsPage';
import { AuditLogsPage } from './pages/coordinator/AuditLogsPage';

// Responder Pages
import { ResponderDashboard } from './pages/responder/ResponderDashboard';
import { AssignmentDetailPage } from './pages/responder/AssignmentDetailPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-resq-bg text-resq-text selection:bg-resq-blue selection:text-white">
          <Navbar />
          <OfflineBar />

          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/request" element={<CitizenRequestForm />} />
              <Route path="/confirmation" element={<SubmissionConfirmation />} />
              <Route path="/track" element={<CitizenRequestDetail />} />
              <Route path="/requests/:id" element={<CitizenRequestDetail />} />

              {/* Citizen Dashboard */}
              <Route
                path="/citizen"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Coordinator Command Center */}
              <Route
                path="/coordinator"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <CoordinatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/requests"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <RequestTriageList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <RequestDetailTriage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/map"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <CoordinatorMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/responders"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <ResponderDirectoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/analytics"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <CoordinatorAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/audit"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Responder Unit Desk */}
              <Route
                path="/responder"
                element={
                  <ProtectedRoute allowedRoles={['RESPONDER']}>
                    <ResponderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/responder/assignments/:id"
                element={
                  <ProtectedRoute allowedRoles={['RESPONDER']}>
                    <AssignmentDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
