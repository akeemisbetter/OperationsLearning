import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

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

// Learner pages
import MyLearning from './pages/learner/MyLearning'
import AskTrainer from './pages/learner/AskTrainer'

// Trainer pages
import TrainingTracker from './pages/trainer/TrainingTracker'
import LearnerQuestions from './pages/trainer/LearnerQuestions'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout>{children}</MainLayout>
}

function TrainerRoute({ children }) {
  const { isTrainer, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isTrainer) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><TrainingCalendar /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />

      {/* Learner routes */}
      <Route path="/my-learning" element={<ProtectedRoute><MyLearning /></ProtectedRoute>} />
      <Route path="/ask-trainer" element={<ProtectedRoute><AskTrainer /></ProtectedRoute>} />

      {/* Trainer routes */}
      <Route path="/trainer/tracking" element={<ProtectedRoute><TrainerRoute><TrainingTracker /></TrainerRoute></ProtectedRoute>} />
      <Route path="/trainer/learner-questions" element={<ProtectedRoute><TrainerRoute><LearnerQuestions /></TrainerRoute></ProtectedRoute>} />

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
