import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, Search, Users, Clock, Filter, ArrowLeft } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import { Link } from 'react-router-dom'

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

const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

function AdminSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterClient, setFilterClient] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          profiles:trainer_id (full_name),
          session_enrollments (id)
        `)
        .order('session_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getSessionStatus = (session) => {
    if (session.status === 'cancelled') return 'cancelled'
    const endDate = session.end_date || session.session_date
    if (isBefore(parseISO(endDate), today)) return 'completed'
    return 'upcoming'
  }

  const filteredSessions = sessions.filter(s => {
    const status = getSessionStatus(s)
    
    // Status filter
    if (filterStatus !== 'all' && status !== filterStatus) return false
    
    // Client filter
    if (filterClient && s.client !== filterClient) return false
    
    // Search
    if (search) {
      const searchLower = search.toLowerCase()
      const topicLabel = TOPICS[s.topic] || s.topic || ''
      const trainerName = s.profiles?.full_name || ''
      return (
        topicLabel.toLowerCase().includes(searchLower) ||
        trainerName.toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })

  const stats = {
    total: sessions.filter(s => s.status !== 'cancelled').length,
    upcoming: sessions.filter(s => getSessionStatus(s) === 'upcoming').length,
    completed: sessions.filter(s => getSessionStatus(s) === 'completed').length,
    cancelled: sessions.filter(s => s.status === 'cancelled').length
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800">All Sessions</h1>
          <p className="text-slate-500">View all training sessions across the platform</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-sm text-slate-500">Total Active</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{stats.upcoming}</p>
          <p className="text-sm text-slate-500">Upcoming</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-sm text-slate-500">Completed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          <p className="text-sm text-slate-500">Cancelled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic or trainer..."
              className="input pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input py-2 w-auto"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="input py-2 w-auto"
          >
            <option value="">All Clients</option>
            {Object.entries(CLIENTS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">
            Sessions ({filteredSessions.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredSessions.map((session) => {
              const status = getSessionStatus(session)
              const startDate = parseISO(session.session_date)
              const endDate = session.end_date ? parseISO(session.end_date) : null
              const isMultiDay = endDate && session.end_date !== session.session_date

              return (
                <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-medium text-slate-800">
                          {TOPICS[session.topic] || session.topic}
                        </h3>
                        <span className={`badge ${
                          status === 'upcoming' ? 'badge-blue' :
                          status === 'completed' ? 'badge-green' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status}
                        </span>
                        {session.progress_tracking_enabled && (
                          <span className="badge badge-purple">Progress</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="badge badge-slate">{CLIENTS[session.client] || session.client}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(startDate, 'MMM d, yyyy')}
                          {isMultiDay && ` - ${format(endDate, 'MMM d, yyyy')}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.session_enrollments?.length || 0} enrolled
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Trainer: <span className="font-medium text-slate-700">{session.profiles?.full_name || 'Unknown'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No sessions found</h3>
            <p className="text-slate-500">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSessions
