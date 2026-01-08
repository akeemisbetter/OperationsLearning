import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Calendar,
  FolderOpen,
  Megaphone,
  UserCheck,
  MessageSquare,
  BarChart3,
  HelpCircle,
  GraduationCap,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User
} from 'lucide-react'

function MainLayout() {
  const { profile, signOut, isTrainer } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trainerMenuOpen, setTrainerMenuOpen] = useState(true)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
    }`

  const sharedLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Training Calendar' },
    { to: '/resources', icon: FolderOpen, label: 'Resources' },
    { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  ]

  const trainerLinks = [
    { to: '/trainer/checkin', icon: UserCheck, label: 'Daily Check-in' },
    { to: '/trainer/qa-board', icon: MessageSquare, label: 'Team Q&A' },
    { to: '/trainer/tracking', icon: BarChart3, label: 'Training Tracker' },
    { to: '/trainer/learner-questions', icon: HelpCircle, label: 'Learner Questions' },
  ]

  const learnerLinks = [
    { to: '/my-learning', icon: GraduationCap, label: 'My Learning' },
    { to: '/ask-trainer', icon: HelpCircle, label: 'Ask a Trainer' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <span className="font-display font-semibold text-slate-800">HRP Learning Hub</span>
        <div className="w-10" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-semibold text-slate-800 text-sm">HRP Learning Hub</h1>
                <p className="text-xs text-slate-500">UST HealthProof</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Main Navigation */}
            <div>
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Main
              </p>
              <div className="space-y-1">
                {sharedLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={navLinkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Trainer Section */}
            {isTrainer && (
              <div>
                <button
                  onClick={() => setTrainerMenuOpen(!trainerMenuOpen)}
                  className="w-full px-4 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
                >
                  Trainer Tools
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      trainerMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {trainerMenuOpen && (
                  <div className="space-y-1">
                    {trainerLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={navLinkClass}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <link.icon className="w-5 h-5" />
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Learner Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                My Learning
              </p>
              <div className="space-y-1">
                {learnerLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={navLinkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Learner'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default MainLayout
