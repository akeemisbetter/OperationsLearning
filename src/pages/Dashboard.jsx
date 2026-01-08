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
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    if (!profile) return

    try {
      const today = new Date().toISOString().split('T')[0]

      if (isTrainer) {
        // Trainers see sessions they created
        const { data: sessions } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('trainer_id', profile.id)
          .gte('session_date', today)
          .order('session_date', { ascending: true })
          .limit(5)

        setUpcomingSessions(sessions || [])
      } else {
        // Learners see sessions they are enrolled in
        // Check by learner_id, learner_email, or learner_unique_id
        const { data: enrollments } = await supabase
          .from('session_enrollments')
          .select(`
            session_id,
            status,
            training_sessions (
              id,
              topic,
              audience,
              session_date,
              start_time,
              end_time,
              location,
              status
            )
          `)
          .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

        // Filter for upcoming sessions and flatten the data
        const sessions = enrollments
          ?.filter(e => e.training_sessions && e.training_sessions.session_date >= today)
          ?.filter(e => e.status === 'enrolled' || e.status === 'attended')
          ?.map(e => e.training_sessions)
          ?.sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
          ?.slice(0, 5) || []

        setUpcomingSessions(sessions)
      }

      // Fetch announcements
      const { data: announceData } = await supabase
        .from('announcements')
        .select('*')
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
        // Count enrolled sessions for learner
        const { data: enrolledData } = await supabase
          .from('session_enrollments')
          .select('id, status')
          .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

        const enrolled = enrolledData?.filter(e => e.status === 'enrolled').length || 0
        const attended = enrolledData?.filter(e => e.status === 'attended').length || 0

        setStats({
          enrolledTrainings: enrolled,
          completedTrainings: attended,
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTopicLabel = (topic) => {
    const topics = {
      hrp_navigation: 'HRP Navigation',
      hr_answers_standard: 'HR Answers Standard',
      hr_answers_adhoc: 'HR Answers Adhoc',
      dlp_role_specific: 'DLP-Role Specific',
      learninglab: 'LearningLab',
      refresher: 'Refresher',
    }
    return topics[topic] || topic || 'Training Session'
  }

  const getAudienceBadge = (audience) => {
    if (audience === 'internal') return 'badge-blue'
    if (audience === 'external') return 'badge-green'
    return 'badge-slate'
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
            ? "Here's what's happening with your training sessions."
            : 'Track your progress and view your upcoming training.'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isTrainer ? (
          <>
            <StatCard
              icon={Calendar}
              label="Sessions Scheduled"
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
              icon={Calendar}
              label="Enrolled Trainings"
              value={stats.enrolledTrainings || 0}
              color="brand"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.completedTrainings || 0}
              color="emerald"
            />
            <StatCard
              icon={Clock}
              label="Hours Learned"
              value="--"
              color="amber"
            />
            <StatCard
              icon={Award}
              label="Badges Earned"
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
              {isTrainer ? 'Your Upcoming Sessions' : 'My Upcoming Training'}
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
                      {getTopicLabel(session.topic)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${getAudienceBadge(session.audience)}`}>
                        {session.audience || 'General'}
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
              <p className="text-slate-500">
                {isTrainer ? 'No upcoming sessions scheduled' : 'No training sessions assigned to you yet'}
              </p>
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
              <QuickActionCard to="/trainer/tracking" icon={Calendar} label="Training Tracker" />
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
