import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BarChart3, Calendar, Users, Clock, TrendingUp, Plus } from 'lucide-react'
import { format } from 'date-fns'

function TrainingTracker() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalLearners: 0,
    totalHours: 0
  })

  useEffect(() => {
    fetchSessions()
  }, [profile])

  const fetchSessions = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('trainer_id', profile.id)
        .order('session_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setSessions(data || [])

      setStats({
        totalSessions: data?.length || 0,
        totalLearners: 0,
        totalHours: 0
      })
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Training Tracker
          </h1>
          <p className="text-slate-500">
            Track your sessions and monitor delivery metrics
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Log Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalSessions}</p>
              <p className="text-sm text-slate-500">Sessions Delivered</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalLearners}</p>
              <p className="text-sm text-slate-500">Learners Trained</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalHours}</p>
              <p className="text-sm text-slate-500">Hours Delivered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">Recent Sessions</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-800 mb-1">
                      Training Session
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`badge ${
                        session.status === 'completed' ? 'badge-green' :
                        session.status === 'cancelled' ? 'badge-slate' : 'badge-amber'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">
                      {format(new Date(session.session_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {session.start_time?.slice(0, 5)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No sessions yet</h3>
            <p className="text-slate-500">Start logging your training sessions</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainingTracker
