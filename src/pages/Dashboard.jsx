import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Calendar,
  BookOpen,
  MessageSquare,
  Award,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

function Dashboard() {
  const { profile, isTrainer } = useAuth()
  const [stats, setStats] = useState({})
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [profile])

  const fetchDashboardData = async () => {
    if (!profile) return

    try {
      // Fetch upcoming training sessions
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select(`
          *,
          trainings (title, category)
        `)
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(5)

      setUpcomingSessions(sessions || [])

      // Fetch announcements
      const { data: announceData } = await supabase
        .from('announcements')
        .select('*')
        .or(`audience.eq.all,audience.eq.${isTrainer ? 'trainers' : 'learners'}`)
        .order('created_at', { ascending: false })
        .limit(3)

      setAnnouncements(announceData || [])

      // Calculate stats based on role
      if (isTrainer) {
        const { count: sessionsCount } = await supabase
          .from('training_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('trainer_id', profile.id)

        const { count: questionsCount } = await supabase
          .from('learner_questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')

        setStats({
          sessionsDelivered: sessionsCount || 0,
          openQuestions: questionsCount || 0,
        })
      } else {
        const { count: completedCount } = await supabase
          .from('learner_progress')
          .select('*', { count: 'exact', head: true })
          .eq('learner_id', profile.id)
          .eq('status', 'completed')

        const { count: badgesCount } = await supabase
          .from('learner_badges')
          .select('*', { count: 'exact', head: true })
          .eq('learner_id', profile.id)

        setStats({
          completedTrainings: completedCount || 0,
          badgesEarned: badgesCount || 0,
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      claims: 'badge-blue',
      enrollment: 'badge-green',
      provider_data: 'badge-amber',
      hrp_system: 'badge-purple',
      general: 'badge-slate',
    }
    return colors[category] || 'badge-slate'
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-slate-500">
          {isTrainer
            ? 'Here\'s what\'s happening with your training team today.'
            : 'Track your progress and continue your learning journey.'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isTrainer ? (
          <>
            <StatCard
              icon={Calendar}
              label="Sessions This Month"
              value={stats.sessionsDelivered || 0}
              color="brand"
            />
            <StatCard
              icon={MessageSquare}
              label="Open Questions"
              value={stats.openQuestions || 0}
              color="amber"
              alert={stats.openQuestions > 0}
            />
            <StatCard
              icon={Users}
              label="Learners Trained"
              value="--"
              color="emerald"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg. Rating"
              value="--"
              color="purple"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={BookOpen}
              label="Completed Trainings"
              value={stats.completedTrainings || 0}
              color="brand"
            />
            <StatCard
              icon={Award}
              label="Badges Earned"
              value={stats.badgesEarned || 0}
              color="amber"
            />
            <StatCard
              icon={Clock}
              label="Hours Learned"
              value="--"
              color="emerald"
            />
            <StatCard
              icon={TrendingUp}
              label="Progress"
              value="--"
              color="purple"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-slate-800">
              Upcoming Training Sessions
            </h2>
            <Link to="/calendar" className="btn-ghost text-sm">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-brand-100 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-brand-600">
                      {format(new Date(session.session_date), 'MMM')}
                    </span>
                    <span className="text-lg font-bold text-brand-700">
                      {format(new Date(session.session_date), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">
                      {session.trainings?.title || 'Untitled Session'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${getCategoryColor(session.trainings?.category)}`}>
                        {session.trainings?.category?.replace('_', ' ') || 'General'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {session.start_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-slate-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No upcoming sessions scheduled</p>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-slate-800">
              Announcements
            </h2>
            <Link to="/announcements" className="btn-ghost text-sm">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-brand-200 transition-colors"
                >
                  {announcement.is_pinned && (
                    <span className="badge badge-amber mb-2">Pinned</span>
                  )}
                  <h3 className="font-medium text-slate-800 mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {announcement.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No announcements</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isTrainer ? (
            <>
              <QuickActionCard to="/trainer/checkin" icon={CheckCircle2} label="Check In" />
              <QuickActionCard to="/trainer/qa-board" icon={MessageSquare} label="Team Q&A" />
              <QuickActionCard to="/trainer/learner-questions" icon={Users} label="Answer Questions" />
              <QuickActionCard to="/resources" icon={BookOpen} label="Resources" />
            </>
          ) : (
            <>
              <QuickActionCard to="/my-learning" icon={BookOpen} label="My Courses" />
              <QuickActionCard to="/ask-trainer" icon={MessageSquare} label="Ask a Trainer" />
              <QuickActionCard to="/resources" icon={BookOpen} label="Job Aids" />
              <QuickActionCard to="/calendar" icon={Calendar} label="Schedule" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, alert }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-amber-500" />}
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-4">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  )
}

function QuickActionCard({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="card p-5 flex flex-col items-center justify-center gap-3 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
        <Icon className="w-6 h-6 text-slate-600 group-hover:text-brand-600 transition-colors" />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors">
        {label}
      </span>
    </Link>
  )
}

export default Dashboard
