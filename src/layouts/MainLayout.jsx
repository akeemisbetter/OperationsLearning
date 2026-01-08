import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  MessageSquare,
  GraduationCap,
  Users,
  FileText,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown
} from 'lucide-react'

function MainLayout({ children }) {
  const { profile, signOut, isTrainer } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const learnerNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'My Learning', href: '/my-learning', icon: GraduationCap },
    { name: 'Training Calendar', href: '/calendar', icon: Calendar },
    { name: 'Ask a Trainer', href: '/ask-trainer', icon: MessageSquare },
    { name: 'Resources', href: '/resources', icon: FileText },
    { name: 'Announcements', href: '/announcements', icon: Bell },
  ]

  const trainerNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'My Classes', href: '/trainer/tracking', icon: GraduationCap },
    { name: 'Training Calendar', href: '/calendar', icon: Calendar },
    { name: 'Learner Questions', href: '/trainer/learner-questions', icon: Users },
    { name: 'Resources', href: '/resources', icon: FileText },
    { name: 'Announcements', href: '/announcements', icon: Bell },
  ]

  const navigation = isTrainer ? trainerNav : learnerNav

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-100 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-semibold text-slate-800">HRP Learning</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-slate-600" />
          ) : (
            <Menu className="w-6 h-6 text-slate-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-semibold text-slate-800">HRP Learning</span>
              <span className="block text-xs text-slate-400">Hub</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white font-medium">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Learner'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

export default MainLayout
