import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Shared pages
import Dashboard from './pages/Dashboard'
import TrainingCalendar from './pages/TrainingCalendar'
import Resources from './pages/Resources'
import Announcements from './pages/Announcements'
import Profile from './pages/Profile'

// Trainer pages
import TrainingTracker from './pages/trainer/TrainingTracker'
import LearnerQuestions from './pages/trainer/LearnerQuestions'

// Learner pages
import MyLearning from './pages/learner/MyLearning'
import AskTrainer from './pages/learner/AskTrainer'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminLearners from './pages/admin/AdminLearners'
import AdminSessions from './pages/admin/AdminSessions'
import AdminFeedback from './pages/admin/AdminFeedback'

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Home redirect based on role
function HomeRedirect() {
  const { profile } = useAuth()
  
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  return <Navigate to="/dashboard" replace />
}

function App() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<TrainingCalendar />} />
        <Route path="resources" element={<Resources />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="profile" element={<Profile />} />

        {/* Trainer routes */}
        <Route
          path="trainer/tracking"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'manager']}>
              <TrainingTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="trainer/learner-questions"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'manager']}>
              <LearnerQuestions />
            </ProtectedRoute>
          }
        />

        {/* Learner routes */}
        <Route path="my-learning" element={<MyLearning />} />
        <Route path="ask-trainer" element={<AskTrainer />} />

        {/* Admin routes */}
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/trainers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminTrainers />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/learners"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLearners />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/sessions"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/feedback"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFeedback />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
