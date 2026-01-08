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
  AlertCircle,
  GraduationCap,
  BarChart3,
  PieChart
} from 'lucide-react'
import { format, parseISO, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts'

const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

const TOPICS = {
  hrp_navigation: 'HRP Navigation',
  hr_answers_standard: 'HR Answers Standard',
  hr_answers_adhoc: 'HR Answers Adhoc',
  dlp_role_specific: 'DLP-Role Specific',
  learninglab: 'LearningLab',
  refresher: 'Refresher',
}

const CLIENTS = {
  ibx: 'IBX',
  hwc: 'HWC',
  az_blue: 'AZ Blue',
  clover: 'Clover',
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

function Dashboard() {
  const { profile, isTrainer } = useAuth()
  const [stats, setStats] = useState({})
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [analytics, setAnalytics] = useState({
    byClient: [],
    byTopic: [],
    monthlyTrend: [],
    attendanceRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    if (!profile) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      if (isTrainer) {
        // Fetch all trainer sessions for analytics
        const { data: allSessions } = await supabase
          .from('training_sessions')
          .select('*, session_enrollments (id, status)')
          .eq('trainer_id', profile.id)
          .order('session_date', { ascending: false })

        const sessions = allSessions || []

        // Upcoming sessions (not cancelled, end date >= today)
        const upcoming = sessions.filter(s => {
          const endDate = s.end_date || s.session_date
          return !isBefore(parseISO(endDate), today) && s.status !== 'cancelled'
        }).slice(0, 5)

        setUpcomingSessions(upcoming)

        // Stats
        const activeSessions = sessions.filter(s => s.status !== 'cancelled')
        const completedSessions = activeSessions.filter(s => {
          const endDate = s.end_date || s.session_date
          return isBefore(parseISO(endDate), today)
        })

        const { count: questionsCount } = await supabase
          .from('learner_questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')

        const totalLearners = sessions.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0)

        setStats({
          totalClasses: activeSessions.length,
          completedClasses: completedSessions.length,
          openQuestions: questionsCount || 0,
          totalLearners
        })

        // Analytics - By Client
        const clientCounts = {}
        activeSessions.forEach(s => {
          const client = s.client || 'unknown'
          clientCounts[client] = (clientCounts[client] || 0) + 1
        })
        const byClient = Object.entries(clientCounts).map(([client, count]) => ({
          name: CLIENTS[client] || client,
          value: count
        }))

        // Analytics - By Topic
        const topicCounts = {}
        activeSessions.forEach(s => {
          const topic = s.topic || 'unknown'
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        })
        const byTopic = Object.entries(topicCounts).map(([topic, count]) => ({
          name: TOPICS[topic] || topic,
          value: count
        })).sort((a, b) => b.value - a.value)

        // Analytics - Monthly Trend (last 6 months)
        const monthlyTrend = []
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(today, i))
          const monthEnd = endOfMonth(subMonths(today, i))
          const monthSessions = activeSessions.filter(s => {
            const sessionDate = parseISO(s.session_date)
            return sessionDate >= monthStart && sessionDate <= monthEnd
          })
          monthlyTrend.push({
            month: format(monthStart, 'MMM'),
            classes: monthSessions.length,
            learners: monthSessions.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0)
          })
        }

        // Attendance rate
        const { data: attendanceData } = await supabase
          .from('learner_attendance')
          .select('status, session_id')
          .in('session_id', sessions.map(s => s.id))

        const totalAttendance = attendanceData?.length || 0
        const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0
        const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

        setAnalytics({
          byClient,
          byTopic,
          monthlyTrend,
          attendanceRate
        })

      } else {
        // Learner dashboard
        const { data: enrollments } = await supabase
          .from('session_enrollments')
          .select(`
            id,
            status,
            training_sessions (
              id,
              topic,
              audience,
              session_date,
              end_date,
              start_time,
              end_time,
              location,
              status
            )
          `)
          .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

        const sessions = (enrollments || [])
          .filter(e => {
            if (!e.training_sessions) return false
            if (e.training_sessions.status === 'cancelled') return false
            if (e.status === 'cancelled') return false
            return true
          })

        const upcoming = sessions
          .filter(e => {
            const endDate = e.training_sessions.end_date || e.training_sessions.session_date
            return !isBefore(parseISO(endDate), today)
          })
          .map(e => e.training_sessions)
          .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
          .slice(0, 5)

        setUpcomingSessions(upcoming)

        const enrolled = sessions.filter(e => e.status === 'enrolled').length
        const attended = sessions.filter(e => e.status === 'attended').length

        // Fetch certificates
        const { count: certCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('learner_id', profile.id)

        setStats({
          enrolledTrainings: enrolled,
          completedTrainings: attended,
          certificates: certCount || 0
        })
      }

      // Fetch announcements
      const { data: announceData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      setAnnouncements(announceData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTopicLabel = (topic) => TOPICS[topic] || topic || 'Training Session'

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
            ? "Here's what's happening with your training classes."
            : 'Track your progress and view your upcoming training.'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isTrainer ? (
          <>
            <StatCard icon={Calendar} label="Total Classes" value={stats.totalClasses || 0} color="brand" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completedClasses || 0} color="emerald" />
            <StatCard icon={Users} label="Total Learners" value={stats.totalLearners || 0} color="purple" />
            <StatCard icon={MessageSquare} label="Open Questions" value={stats.openQuestions || 0} color="amber" alert={stats.openQuestions > 0} />
          </>
        ) : (
          <>
            <StatCard icon={Calendar} label="Enrolled Trainings" value={stats.enrolledTrainings || 0} color="brand" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completedTrainings || 0} color="emerald" />
            <StatCard icon={Award} label="Certificates" value={stats.certificates || 0} color="purple" />
            <StatCard icon={Clock} label="Hours Learned" value="--" color="amber" />
          </>
        )}
      </div>

      {/* Analytics Section (Trainer Only) */}
      {isTrainer && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              Training Trend (Last 6 Months)
            </h3>
            {analytics.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="classes" stroke="#3b82f6" strokeWidth={2} name="Classes" />
                  <Line type="monotone" dataKey="learners" stroke="#10b981" strokeWidth={2} name="Learners" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>

          {/* Classes by Client */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand-600" />
              Classes by Client
            </h3>
            {analytics.byClient.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={analytics.byClient}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {analytics.byClient.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {analytics.byClient.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
                        />
                        <span className="text-sm text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>

          {/* Classes by Topic */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              Classes by Topic
            </h3>
            {analytics.byTopic.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.byTopic} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Classes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>

          {/* Attendance Rate */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" />
              Overall Attendance Rate
            </h3>
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e2e8f0"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={analytics.attendanceRate >= 80 ? '#10b981' : analytics.attendanceRate >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(analytics.attendanceRate / 100) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800">{analytics.attendanceRate}%</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {analytics.attendanceRate >= 80 ? 'Excellent attendance!' : 
                   analytics.attendanceRate >= 60 ? 'Good attendance' : 
                   'Needs improvement'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-slate-800">
              {isTrainer ? 'Your Upcoming Classes' : 'My Upcoming Training'}
            </h2>
            <Link to={isTrainer ? "/trainer/tracking" : "/my-learning"} className="btn-ghost text-sm">
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
              {upcomingSessions.map((session) => {
                const startDate = parseISO(session.session_date)
                const endDate = session.end_date ? parseISO(session.end_date) : null
                const isMultiDay = endDate && session.end_date !== session.session_date

                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-brand-100 flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-brand-600">
                        {format(startDate, 'MMM')}
                      </span>
                      <span className="text-lg font-bold text-brand-700">
                        {format(startDate, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {getTopicLabel(session.topic)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`badge ${getAudienceBadge(session.audience)}`}>
                          {session.audience || 'General'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatTime(session.start_time)}
                        </span>
                        {isMultiDay && (
                          <span className="text-sm text-slate-500">
                            • {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-slate-300" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {isTrainer ? 'No upcoming classes scheduled' : 'No training sessions assigned to you yet'}
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
              <QuickActionCard to="/trainer/tracking" icon={GraduationCap} label="My Classes" />
              <QuickActionCard to="/trainer/learner-questions" icon={Users} label="Answer Questions" />
              <QuickActionCard to="/resources" icon={BookOpen} label="Resources" />
              <QuickActionCard to="/calendar" icon={Calendar} label="Calendar" />
            </>
          ) : (
            <>
              <QuickActionCard to="/my-learning" icon={BookOpen} label="My Learning" />
              <QuickActionCard to="/ask-trainer" icon={MessageSquare} label="Ask a Trainer" />
              <QuickActionCard to="/resources" icon={BookOpen} label="Resources" />
              <QuickActionCard to="/calendar" icon={Calendar} label="Calendar" />
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
