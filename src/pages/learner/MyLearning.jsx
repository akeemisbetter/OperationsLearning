import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  GraduationCap, BookOpen, Calendar, Clock, CheckCircle2, 
  XCircle, ArrowLeft, MessageSquare, User, Lock, Globe,
  ChevronRight
} from 'lucide-react'
import { format, eachDayOfInterval, parseISO, isAfter, isBefore, isToday } from 'date-fns'

const TOPICS = {
  hrp_navigation: 'HRP Navigation',
  hr_answers_standard: 'HR Answers Standard',
  hr_answers_adhoc: 'HR Answers Adhoc',
  dlp_role_specific: 'DLP-Role Specific',
  learninglab: 'LearningLab',
  refresher: 'Refresher',
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
  
  const activeEnrollments = enrollments.filter(e => {
    if (!e.training_sessions) return false
    const endDate = e.training_sessions.end_date || e.training_sessions.session_date
    return (e.status === 'enrolled' || e.status === 'attended') && 
           !isBefore(parseISO(endDate), today)
  })

  const pastEnrollments = enrollments.filter(e => {
    if (!e.training_sessions) return false
    const endDate = e.training_sessions.end_date || e.training_sessions.session_date
    return e.status === 'attended' || isBefore(parseISO(endDate), today)
  })

  const getTopicLabel = (topic) => TOPICS[topic] || topic || 'Training'

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          My Learning
        </h1>
        <p className="text-slate-500">
          View your enrolled trainings and track your progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={BookOpen} 
          value={activeEnrollments.length} 
          label="Active Trainings" 
          color="brand" 
        />
        <StatCard 
          icon={CheckCircle2} 
          value={pastEnrollments.length} 
          label="Completed" 
          color="emerald" 
        />
        <StatCard 
          icon={Clock} 
          value="--" 
          label="Hours Learned" 
          color="amber" 
        />
        <StatCard 
          icon={GraduationCap} 
          value="--" 
          label="Certificates" 
          color="purple" 
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'active' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({activeEnrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'completed' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed ({pastEnrollments.length})
        </button>
      </div>

      {/* Training list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activeEnrollments : pastEnrollments).length > 0 ? (
            (activeTab === 'active' ? activeEnrollments : pastEnrollments).map((enrollment) => (
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
                {activeTab === 'active' ? 'No active trainings' : 'No completed trainings'}
              </h3>
              <p className="text-slate-500">
                {activeTab === 'active' 
                  ? 'You will see trainings here once a trainer enrolls you'
                  : 'Completed trainings will appear here'}
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
  const endDate = session.end_date ? parseISO(session.end_date) : startDate
  const isMultiDay = session.end_date && session.end_date !== session.session_date
  const today = new Date()
  const isOngoing = !isBefore(endDate, today) && !isAfter(startDate, today)

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:border-brand-200 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              {TOPICS[session.topic] || session.topic || 'Training'}
            </h3>
            {isOngoing && (
              <span className="badge bg-green-100 text-green-700">In Progress</span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(startDate, 'MMM d, yyyy')}
              {isMultiDay && <> - {format(endDate, 'MMM d, yyyy')}</>}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
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

/* ======================== */
/* TRAINING DETAIL VIEW     */
/* ======================== */

function TrainingDetail({ enrollment, profile, onBack }) {
  const session = enrollment.training_sessions
  const [activeTab, setActiveTab] = useState('overview')
  const [messages, setMessages] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

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

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('learner_attendance')
        .select('*')
        .eq('session_id', session.id)
        .eq('learner_id', profile.id)

      setAttendance(attendanceData || [])
    } catch (error) {
      console.error('Error fetching training data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startDate = parseISO(session.session_date)
  const endDate = session.end_date ? parseISO(session.end_date) : startDate
  const isMultiDay = session.end_date && session.end_date !== session.session_date

  // Get all training days for multi-day sessions
  const trainingDays = isMultiDay 
    ? eachDayOfInterval({ start: startDate, end: endDate })
    : [startDate]

  const handleMarkAttendance = async (date, status) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = attendance.find(a => a.attendance_date === dateStr)

    try {
      if (existing) {
        const { error } = await supabase
          .from('learner_attendance')
          .update({ status })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('learner_attendance')
          .insert({
            session_id: session.id,
            learner_id: profile.id,
            attendance_date: dateStr,
            status
          })
        if (error) throw error
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to My Learning
      </button>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">
              {TOPICS[session.topic] || session.topic || 'Training'}
            </h1>
            <p className="text-slate-500">
              with {session.profiles?.full_name || 'Trainer'}
            </p>
          </div>
          <span className={`badge ${
            enrollment.status === 'attended' ? 'badge-green' : 'badge-blue'
          }`}>
            {enrollment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Start Date</p>
            <p className="font-medium text-slate-800">{format(startDate, 'MMM d, yyyy')}</p>
          </div>
          {isMultiDay && (
            <div>
              <p className="text-slate-500 mb-1">End Date</p>
              <p className="font-medium text-slate-800">{format(endDate, 'MMM d, yyyy')}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500 mb-1">Time</p>
            <p className="font-medium text-slate-800">
              {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
            </p>
          </div>
          {session.location && (
            <div>
              <p className="text-slate-500 mb-1">Location</p>
              <p className="font-medium text-slate-800">{session.location}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'attendance' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'messages' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Messages
          {messages.length > 0 && (
            <span className="bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="card p-6 animate-pulse">
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">
                Training Overview
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600">
                  This is your {TOPICS[session.topic] || 'training'} session. 
                  {isMultiDay 
                    ? ` The training spans ${trainingDays.length} days from ${format(startDate, 'MMMM d')} to ${format(endDate, 'MMMM d, yyyy')}.`
                    : ` The training takes place on ${format(startDate, 'MMMM d, yyyy')}.`
                  }
                </p>
                <p className="text-slate-600 mt-4">
                  Please mark your attendance for each training day and check the Messages tab for any communications from your trainer.
                </p>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">
                Mark Your Attendance
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Select your attendance status for each training day
              </p>

              <div className="space-y-3">
                {trainingDays.map((day) => {
                  const dayAttendance = getAttendanceForDate(day)
                  const isPastDay = isBefore(day, new Date()) && !isToday(day)
                  const isTodayDate = isToday(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isTodayDate 
                          ? 'border-brand-200 bg-brand-50' 
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {format(day, 'EEEE, MMMM d')}
                          {isTodayDate && (
                            <span className="ml-2 text-brand-600 text-sm">(Today)</span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">
                          {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAttendance(day, 'present')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            dayAttendance?.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-600'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(day, 'absent')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            dayAttendance?.status === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(day, 'late')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            dayAttendance?.status === 'late'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          Late
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">
                Messages from Trainer
              </h2>

              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-xl ${
                        message.is_private 
                          ? 'bg-purple-50 border border-purple-100' 
                          : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {message.is_private ? (
                          <Lock className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Globe className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-slate-800">
                          {message.profiles?.full_name || 'Trainer'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </span>
                        {message.is_private && (
                          <span className="badge bg-purple-100 text-purple-700 text-xs">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No messages yet</p>
                  <p className="text-sm text-slate-400">
                    Your trainer will post updates here
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MyLearning
