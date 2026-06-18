import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout
import Layout from './components/Layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import CalculatorPage from './pages/CalculatorPage';
import InsightsPage from './pages/InsightsPage';
import GamificationPage from './pages/GamificationPage';
import GoalsPage from './pages/GoalsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

import './App.css';

// Route guards
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-spinner"></div>
        <p>Loading EcoTrack...</p>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-spinner"></div>
        <p>Loading EcoTrack...</p>
      </div>
    );
  }
  
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } />

          {/* Protected Main App Layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="gamification" element={<GamificationPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-family)',
          },
          success: {
            iconTheme: {
              primary: 'var(--primary-light)',
              secondary: 'white',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
