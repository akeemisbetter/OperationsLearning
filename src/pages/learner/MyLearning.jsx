import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  GraduationCap, BookOpen, Calendar, Clock, CheckCircle2, 
  XCircle, ArrowLeft, MessageSquare, User, Lock, Globe,
  ChevronRight, TrendingUp, BarChart3, AlertTriangle
} from 'lucide-react'
import { format, eachDayOfInterval, parseISO, isBefore, isToday, startOfWeek, endOfWeek } from 'date-fns'

const TOPICS = {
  hrp_navigation: 'HRP Navigation',
  hr_answers_standard: 'HR Answers Standard',
  hr_answers_adhoc: 'HR Answers Adhoc',
  dlp_role_specific: 'DLP-Role Specific',
  learninglab: 'LearningLab',
  refresher: 'Refresher',
}

const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

function MyLearning() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [selectedTraining, setSelectedTraining] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchEnrollments()
    }
  }, [profile])

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('session_enrollments')
        .select(`
          *,
          training_sessions (
            id,
            topic,
            audience,
            session_date,
            end_date,
            start_time,
            end_time,
            location,
            status,
            progress_tracking_enabled,
            trainer_id,
            profiles:trainer_id (full_name)
          )
        `)
        .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

      if (error) throw error
      setEnrollments(data || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const activeEnrollments = enrollments.filter(e => {
    if (!e.training_sessions) return false
    if (e.training_sessions.status === 'cancelled') return false
    if (e.status === 'cancelled') return false
    const endDate = e.training_sessions.end_date || e.training_sessions.session_date
    const endDateObj = parseISO(endDate)
    endDateObj.setHours(23, 59, 59, 999)
    return !isBefore(endDateObj, today)
  })

  const pastEnrollments = enrollments.filter(e => {
    if (!e.training_sessions) return false
    if (e.training_sessions.status === 'cancelled') return false
    if (e.status === 'cancelled') return false
    const endDate = e.training_sessions.end_date || e.training_sessions.session_date
    const endDateObj = parseISO(endDate)
    endDateObj.setHours(23, 59, 59, 999)
    return isBefore(endDateObj, today)
  })

  const cancelledEnrollments = enrollments.filter(e => {
    if (!e.training_sessions) return false
    return e.training_sessions.status === 'cancelled' || e.status === 'cancelled'
  })

  if (selectedTraining) {
    return (
      <TrainingDetail 
        enrollment={selectedTraining} 
        profile={profile}
        onBack={() => {
          setSelectedTraining(null)
          fetchEnrollments()
        }} 
      />
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          My Learning
        </h1>
        <p className="text-slate-500">
          View your enrolled trainings and track your progress
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} value={activeEnrollments.length} label="Active Trainings" color="brand" />
        <StatCard icon={CheckCircle2} value={pastEnrollments.length} label="Completed" color="emerald" />
        <StatCard icon={Clock} value="--" label="Hours Learned" color="amber" />
        <StatCard icon={GraduationCap} value="--" label="Certificates" color="purple" />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'active' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({activeEnrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'completed' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed ({pastEnrollments.length})
        </button>
        {cancelledEnrollments.length > 0 && (
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'cancelled' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cancelled ({cancelledEnrollments.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activeEnrollments : activeTab === 'completed' ? pastEnrollments : cancelledEnrollments).length > 0 ? (
            (activeTab === 'active' ? activeEnrollments : activeTab === 'completed' ? pastEnrollments : cancelledEnrollments).map((enrollment) => (
              <TrainingCard
                key={enrollment.id}
                enrollment={enrollment}
                onClick={() => setSelectedTraining(enrollment)}
              />
            ))
          ) : (
            <div className="card p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-slate-800 mb-2">
                {activeTab === 'active' ? 'No active trainings' : activeTab === 'completed' ? 'No completed trainings' : 'No cancelled trainings'}
              </h3>
              <p className="text-slate-500">
                {activeTab === 'active' && 'You will see trainings here once a trainer enrolls you'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

function TrainingCard({ enrollment, onClick }) {
  const session = enrollment.training_sessions
  if (!session) return null

  const startDate = parseISO(session.session_date)
  const endDate = session.end_date ? parseISO(session.end_date) : null
  const isMultiDay = endDate && session.end_date !== session.session_date
  const isCancelled = session.status === 'cancelled' || enrollment.status === 'cancelled'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sessionEndDate = endDate || startDate
  const isOngoing = !isCancelled && !isBefore(sessionEndDate, today) && !isBefore(today, startDate)

  return (
    <div
      onClick={onClick}
      className={`card p-5 cursor-pointer hover:border-brand-200 transition-all group ${isCancelled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              {TOPICS[session.topic] || session.topic || 'Training'}
            </h3>
            {isCancelled && (
              <span className="badge bg-red-100 text-red-700">Cancelled</span>
            )}
            {isOngoing && !isCancelled && (
              <span className="badge bg-green-100 text-green-700">In Progress</span>
            )}
            {session.progress_tracking_enabled && !isCancelled && (
              <span className="badge badge-purple">Progress Tracked</span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(startDate, 'MMM d, yyyy')}
              {isMultiDay && <span> - {format(endDate, 'MMM d, yyyy')}</span>}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(session.start_time)} - {formatTime(session.end_time)}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {session.profiles?.full_name || 'Trainer'}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
      </div>
    </div>
  )
}

function TrainingDetail({ enrollment, profile, onBack }) {
  const session = enrollment.training_sessions
  const [activeTab, setActiveTab] = useState('overview')
  const [messages, setMessages] = useState([])
  const [attendance, setAttendance] = useState([])
  const [progress, setProgress] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const isCancelled = session.status === 'cancelled' || enrollment.status === 'cancelled'

  useEffect(() => {
    fetchTrainingData()
  }, [session.id])

  const fetchTrainingData = async () => {
    try {
      // Fetch messages
      const { data: messagesData } = await supabase
        .from('training_messages')
        .select(`
          *,
          profiles:sender_id (full_name)
        `)
        .eq('session_id', session.id)
        .or(`is_private.eq.false,recipient_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      setMessages(messagesData || [])

      // Fetch read status
      const { data: readsData } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', profile.id)

      const readIds = readsData?.map(r => r.message_id) || []
      const unread = (messagesData || []).filter(m => !readIds.includes(m.id)).length
      setUnreadCount(unread)

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('learner_attendance')
        .select('*')
        .eq('session_id', session.id)
        .eq('learner_id', profile.id)

      setAttendance(attendanceData || [])

      // Fetch progress if enabled
      if (session.progress_tracking_enabled) {
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('*')
          .eq('session_id', session.id)
          .eq('learner_id', profile.id)
          .order('progress_date', { ascending: true })

        setProgress(progressData || [])
      }
    } catch (error) {
      console.error('Error fetching training data:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(m => {
      return !m.read
    })
    
    for (const msg of messages) {
      try {
        await supabase
          .from('message_reads')
          .upsert({
            message_id: msg.id,
            user_id: profile.id
          }, { onConflict: 'message_id,user_id' })
      } catch (error) {
        // Ignore errors for already read messages
      }
    }
    setUnreadCount(0)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'messages') {
      markMessagesAsRead()
    }
  }

  const startDate = parseISO(session.session_date)
  const endDate = session.end_date ? parseISO(session.end_date) : startDate
  const isMultiDay = session.end_date && session.end_date !== session.session_date
  const trainingDays = isMultiDay ? eachDayOfInterval({ start: startDate, end: endDate }) : [startDate]

  const handleMarkAttendance = async (date, status) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = attendance.find(a => a.attendance_date === dateStr)

    try {
      if (existing) {
        await supabase.from('learner_attendance').update({ status }).eq('id', existing.id)
      } else {
        await supabase.from('learner_attendance').insert({
          session_id: session.id,
          learner_id: profile.id,
          attendance_date: dateStr,
          status
        })
      }
      fetchTrainingData()
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to mark attendance')
    }
  }

  const getAttendanceForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return attendance.find(a => a.attendance_date === dateStr)
  }

  // Calculate weekly averages for progress
  const getWeeklyAverages = () => {
    if (progress.length === 0) return []
    
    const weeks = {}
    progress.forEach(p => {
      const date = parseISO(p.progress_date)
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd')
      
      if (!weeks[weekStart]) {
        weeks[weekStart] = { accuracy: [], productivity: [], count: 0 }
      }
      if (p.accuracy_score !== null) weeks[weekStart].accuracy.push(p.accuracy_score)
      if (p.productivity_score !== null) weeks[weekStart].productivity.push(p.productivity_score)
      weeks[weekStart].count++
    })

    return Object.entries(weeks).map(([weekStart, data]) => ({
      week: weekStart,
      accuracy: data.accuracy.length > 0 ? Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length) : null,
      productivity: data.productivity.length > 0 ? Math.round(data.productivity.reduce((a, b) => a + b, 0) / data.productivity.length) : null,
    }))
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-5 h-5" /> Back to My Learning
      </button>

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">This training has been cancelled</p>
            <p className="text-sm text-red-600">Contact your trainer for more information</p>
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">
              {TOPICS[session.topic] || session.topic || 'Training'}
            </h1>
            <p className="text-slate-500">with {session.profiles?.full_name || 'Trainer'}</p>
          </div>
          <span className={`badge ${isCancelled ? 'bg-red-100 text-red-700' : enrollment.status === 'attended' ? 'badge-green' : 'badge-blue'}`}>
            {isCancelled ? 'Cancelled' : enrollment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Date</p>
            <p className="font-medium text-slate-800">
              {format(startDate, 'MMM d, yyyy')}
              {isMultiDay && ` - ${format(endDate, 'MMM d, yyyy')}`}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Time</p>
            <p className="font-medium text-slate-800">{formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
          </div>
          {session.location && (
            <div>
              <p className="text-slate-500 mb-1">Location</p>
              <p className="font-medium text-slate-800">{session.location}</p>
            </div>
          )}
          {isMultiDay && (
            <div>
              <p className="text-slate-500 mb-1">Duration</p>
              <p className="font-medium text-slate-800">{trainingDays.length} days</p>
            </div>
          )}
        </div>
      </div>

      {!isCancelled && (
        <>
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button onClick={() => handleTabChange('overview')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'overview' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Overview
            </button>
            <button onClick={() => handleTabChange('attendance')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'attendance' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Attendance
            </button>
            {session.progress_tracking_enabled && (
              <button onClick={() => handleTabChange('progress')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'progress' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <TrendingUp className="w-4 h-4" /> My Progress
              </button>
            )}
            <button onClick={() => handleTabChange('messages')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'messages' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <MessageSquare className="w-4 h-4" /> Messages
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="card p-6 animate-pulse"><div className="h-32 bg-slate-100 rounded-xl" /></div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-slate-800 mb-4">Training Overview</h2>
                  <p className="text-slate-600 mb-4">
                    This is your <strong>{TOPICS[session.topic] || 'training'}</strong> session with <strong>{session.profiles?.full_name}</strong>.
                    {isMultiDay ? ` The training spans ${trainingDays.length} days.` : ` The training takes place on ${format(startDate, 'MMMM d, yyyy')}.`}
                  </p>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="font-medium text-slate-800 mb-3">Your Attendance Summary</h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm text-slate-600">{attendance.filter(a => a.status === 'present').length} Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm text-slate-600">{attendance.filter(a => a.status === 'absent').length} Absent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-sm text-slate-600">{attendance.filter(a => a.status === 'late').length} Late</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-slate-800 mb-2">Mark Your Attendance</h2>
                  <p className="text-slate-500 text-sm mb-6">Select your attendance status for each training day</p>
                  <div className="space-y-3">
                    {trainingDays.map((day) => {
                      const dayAttendance = getAttendanceForDate(day)
                      const isTodayDate = isToday(day)
                      return (
                        <div key={day.toISOString()} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 ${isTodayDate ? 'border-brand-200 bg-brand-50' : 'border-slate-200'}`}>
                          <div>
                            <p className="font-medium text-slate-800">
                              {format(day, 'EEEE, MMMM d, yyyy')}
                              {isTodayDate && <span className="ml-2 text-brand-600 text-sm font-normal">(Today)</span>}
                            </p>
                            <p className="text-sm text-slate-500">{formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
                          </div>
                          <div className="flex gap-2">
                            {['present', 'absent', 'late'].map((status) => (
                              <button
                                key={status}
                                onClick={() => handleMarkAttendance(day, status)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  dayAttendance?.status === status
                                    ? status === 'present' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' :
                                      status === 'absent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' :
                                      'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {status === 'present' && <CheckCircle2 className="w-4 h-4" />}
                                {status === 'absent' && <XCircle className="w-4 h-4" />}
                                {status === 'late' && <Clock className="w-4 h-4" />}
                                <span className="capitalize">{status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'progress' && session.progress_tracking_enabled && (
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-slate-800 mb-4">My Performance</h2>
                  <p className="text-slate-500 text-sm mb-6">Your weekly performance scores</p>

                  {progress.length > 0 ? (
                    <>
                      {/* Weekly Averages */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {getWeeklyAverages().map((week, idx) => (
                          <div key={week.week} className="bg-slate-50 rounded-xl p-4">
                            <h3 className="font-medium text-slate-800 mb-3">Week {idx + 1}</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-slate-600">Accuracy</span>
                                  <span className="font-medium text-slate-800">{week.accuracy !== null ? `${week.accuracy}%` : '--'}</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${week.accuracy || 0}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-slate-600">Productivity</span>
                                  <span className="font-medium text-slate-800">{week.productivity !== null ? `${week.productivity}%` : '--'}</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${week.productivity || 0}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Daily breakdown */}
                      <h3 className="font-medium text-slate-800 mb-3">Daily Scores</h3>
                      <div className="space-y-2">
                        {progress.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium text-slate-800">{format(parseISO(p.progress_date), 'EEE, MMM d')}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-blue-600">Accuracy: {p.accuracy_score !== null ? `${p.accuracy_score}%` : '--'}</span>
                              <span className="text-emerald-600">Productivity: {p.productivity_score !== null ? `${p.productivity_score}%` : '--'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No progress data yet</p>
                      <p className="text-sm text-slate-400">Your trainer will add your scores during the training</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-slate-800 mb-4">Messages from Trainer</h2>
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`p-4 rounded-xl ${message.is_private ? 'bg-purple-50 border border-purple-100' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {message.is_private ? <Lock className="w-4 h-4 text-purple-600" /> : <Globe className="w-4 h-4 text-slate-400" />}
                            <span className="text-sm font-medium text-slate-800">{message.profiles?.full_name || 'Trainer'}</span>
                            <span className="text-xs text-slate-400">{format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}</span>
                            {message.is_private && <span className="badge bg-purple-100 text-purple-700 text-xs">Private</span>}
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No messages yet</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default MyLearning
