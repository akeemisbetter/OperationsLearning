import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import TrainingCalendar from './pages/TrainingCalendar'
import Resources from './pages/Resources'
import Announcements from './pages/Announcements'
import MyLearning from './pages/learner/MyLearning'
import AskTrainer from './pages/learner/AskTrainer'
import TrainingTracker from './pages/trainer/TrainingTracker'
import LearnerQuestions from './pages/trainer/LearnerQuestions'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminLearners from './pages/admin/AdminLearners'
import AdminSessions from './pages/admin/AdminSessions'
import AdminFeedback from './pages/admin/AdminFeedback'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  const { user, isAdmin } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Redirect admin to admin dashboard */}
        <Route index element={isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />} />
        <Route path="calendar" element={<TrainingCalendar />} />
        <Route path="resources" element={<Resources />} />
        <Route path="announcements" element={<Announcements />} />

        {/* Learner routes */}
        <Route path="my-learning" element={
          <ProtectedRoute allowedRoles={['learner']}>
            <MyLearning />
          </ProtectedRoute>
        } />
        <Route path="ask-trainer" element={
          <ProtectedRoute allowedRoles={['learner']}>
            <AskTrainer />
          </ProtectedRoute>
        } />

        {/* Trainer routes */}
        <Route path="trainer/tracking" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainingTracker />
          </ProtectedRoute>
        } />
        <Route path="trainer/learner-questions" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <LearnerQuestions />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="admin/trainers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTrainers />
          </ProtectedRoute>
        } />
        <Route path="admin/learners" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLearners />
          </ProtectedRoute>
        } />
        <Route path="admin/sessions" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSessions />
          </ProtectedRoute>
        } />
        <Route path="admin/feedback" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminFeedback />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
