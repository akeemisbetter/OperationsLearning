import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  Users, GraduationCap, Calendar, Award, TrendingUp,
  MessageCircle, Star, ArrowRight, BarChart3, CheckCircle2
} from 'lucide-react'
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns'

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

function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [recentFeedback, setRecentFeedback] = useState([])
  const [topTrainers, setTopTrainers] = useState([])
  const [sessionsByClient, setSessionsByClient] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch basic stats
      const { data: trainers } = await supabase.from('profiles').select('id').eq('role', 'trainer')
      const { data: learners } = await supabase.from('profiles').select('id').eq('role', 'learner')
      const { data: sessions } = await supabase.from('training_sessions').select('*, session_enrollments(id)').neq('status', 'cancelled')
      const { data: certificates } = await supabase.from('certificates').select('id')
      const { data: feedback } = await supabase.from('anonymous_feedback').select('*').order('created_at', { ascending: false })

      const avgRating = feedback && feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
        : 0

      setStats({
        totalTrainers: trainers?.length || 0,
        totalLearners: learners?.length || 0,
        totalSessions: sessions?.length || 0,
        totalCertificates: certificates?.length || 0,
        totalFeedback: feedback?.length || 0,
        avgRating: avgRating,
        totalEnrollments: sessions?.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0) || 0
      })

      // Recent feedback
      setRecentFeedback((feedback || []).slice(0, 5))

      // Sessions by client
      const clientCounts = {}
      ;(sessions || []).forEach(s => {
        const client = s.client || 'unknown'
        clientCounts[client] = (clientCounts[client] || 0) + 1
      })
      setSessionsByClient(Object.entries(clientCounts).map(([client, count]) => ({
        name: CLIENTS[client] || client,
        value: count
      })))

      // Top trainers by session count
      const { data: trainerStats } = await supabase
        .from('training_sessions')
        .select('trainer_id, profiles:trainer_id(full_name)')
        .neq('status', 'cancelled')

      const trainerCounts = {}
      ;(trainerStats || []).forEach(s => {
        const trainerId = s.trainer_id
        const trainerName = s.profiles?.full_name || 'Unknown'
        if (!trainerCounts[trainerId]) {
          trainerCounts[trainerId] = { name: trainerName, sessions: 0 }
        }
        trainerCounts[trainerId].sessions++
      })

      setTopTrainers(
        Object.values(trainerCounts)
          .sort((a, b) => b.sessions - a.sessions)
          .slice(0, 5)
      )

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-slate-500">
          Bird's eye view of the entire learning platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="Trainers" value={stats.totalTrainers} color="brand" />
        <StatCard icon={Users} label="Learners" value={stats.totalLearners} color="emerald" />
        <StatCard icon={Calendar} label="Sessions" value={stats.totalSessions} color="purple" />
        <StatCard icon={CheckCircle2} label="Enrollments" value={stats.totalEnrollments} color="blue" />
        <StatCard icon={Award} label="Certificates" value={stats.totalCertificates} color="amber" />
        <StatCard icon={MessageCircle} label="Feedback" value={stats.totalFeedback} color="pink" />
        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} color="orange" />
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Trainers */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-800">Top Trainers</h3>
            <Link to="/admin/trainers" className="text-sm text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {topTrainers.length > 0 ? (
            <div className="space-y-3">
              {topTrainers.map((trainer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-slate-800">{trainer.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{trainer.sessions} sessions</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No trainers yet</div>
          )}
        </div>

        {/* Sessions by Client */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-slate-800 mb-4">Sessions by Client</h3>
          {sessionsByClient.length > 0 ? (
            <div className="space-y-3">
              {sessionsByClient.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-sm font-bold text-brand-600">{item.value} sessions</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No data</div>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-800">Recent Feedback</h3>
            <Link to="/admin/feedback" className="text-sm text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {recentFeedback.length > 0 ? (
            <div className="space-y-3">
              {recentFeedback.map((fb) => (
                <div key={fb.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    {renderStars(fb.rating)}
                    <span className="text-xs text-slate-400">
                      {format(new Date(fb.created_at), 'MMM d')}
                    </span>
                  </div>
                  {fb.feedback_text && (
                    <p className="text-sm text-slate-600 line-clamp-2">{fb.feedback_text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No feedback yet</div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink to="/admin/trainers" icon={GraduationCap} label="Manage Trainers" />
        <QuickLink to="/admin/learners" icon={Users} label="Manage Learners" />
        <QuickLink to="/admin/sessions" icon={Calendar} label="All Sessions" />
        <QuickLink to="/admin/feedback" icon={MessageCircle} label="View Feedback" />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    pink: 'bg-pink-50 text-pink-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="card p-5 flex items-center gap-4 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
        <Icon className="w-6 h-6 text-slate-600 group-hover:text-brand-600 transition-colors" />
      </div>
      <div className="flex-1">
        <span className="font-medium text-slate-700 group-hover:text-brand-700 transition-colors">
          {label}
        </span>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
    </Link>
  )
}

export default AdminDashboard
