import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  BarChart3, Calendar, Users, Clock, Plus, X, 
  Trash2, UserPlus, Search, Check, MessageSquare,
  Lock, Globe, ArrowLeft, CheckCircle2, XCircle
} from 'lucide-react'
import { format, parseISO, eachDayOfInterval, isAfter, isBefore, isToday } from 'date-fns'

const TOPICS = [
  { id: 'hrp_navigation', label: 'HRP Navigation' },
  { id: 'hr_answers_standard', label: 'HR Answers Standard' },
  { id: 'hr_answers_adhoc', label: 'HR Answers Adhoc' },
  { id: 'dlp_role_specific', label: 'DLP-Role Specific' },
  { id: 'learninglab', label: 'LearningLab' },
  { id: 'refresher', label: 'Refresher' },
]

const AUDIENCES = [
  { id: 'internal', label: 'Internal' },
  { id: 'external', label: 'External' },
]

// Helper to format time in 12-hour format
const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

// Helper to get topic label
const getTopicLabel = (topicId) => {
  return TOPICS.find(t => t.id === topicId)?.label || topicId || 'Training'
}

// Helper to get audience label
const getAudienceLabel = (audienceId) => {
  return AUDIENCES.find(a => a.id === audienceId)?.label || audienceId || 'All'
}

function TrainingTracker() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchSessions()
    }
  }, [profile])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          session_enrollments (id)
        `)
        .eq('trainer_id', profile.id)
        .order('session_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  // If a session is selected, show the detail view
  if (selectedSession) {
    return (
      <TrainingDetailView
        session={selectedSession}
        profile={profile}
        onBack={() => {
          setSelectedSession(null)
          fetchSessions()
        }}
      />
    )
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
            Schedule sessions and manage learners
          </p>
        </div>
        <button 
          onClick={() => setShowScheduleModal(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          Schedule Training
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
              <p className="text-2xl font-bold text-slate-800">{sessions.length}</p>
              <p className="text-sm text-slate-500">Sessions Scheduled</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {sessions.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0)}
              </p>
              <p className="text-sm text-slate-500">Learners Enrolled</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">--</p>
              <p className="text-sm text-slate-500">Hours Delivered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">Your Training Sessions</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const startDate = parseISO(session.session_date)
              const endDate = session.end_date ? parseISO(session.end_date) : null
              const isMultiDay = endDate && session.end_date !== session.session_date

              return (
                <div 
                  key={session.id} 
                  onClick={() => setSelectedSession(session)}
                  className="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-800 mb-2">
                        {getTopicLabel(session.topic)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="badge badge-blue">
                          {getAudienceLabel(session.audience)}
                        </span>
                        <span className="badge badge-slate">
                          {session.status || 'scheduled'}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(startDate, 'MMM d, yyyy')}
                          {isMultiDay && (
                            <span> - {format(endDate, 'MMM d, yyyy')}</span>
                          )}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.session_enrollments?.length || 0} enrolled
                        </span>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm py-2">
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No sessions yet</h3>
            <p className="text-slate-500 mb-4">Schedule your first training</p>
            <button onClick={() => setShowScheduleModal(true)} className="btn-primary">
              Schedule Training
            </button>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          profile={profile}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false)
            fetchSessions()
          }}
        />
      )}
    </div>
  )
}

/* ======================== */
/* TRAINING DETAIL VIEW     */
/* ======================== */

function TrainingDetailView({ session, profile, onBack }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [learners, setLearners] = useState([])
  const [messages, setMessages] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  // Message state
  const [newMessage, setNewMessage] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [saving, setSaving] = useState(false)

  // Add learner state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualId, setManualId] = useState('')

  const startDate = parseISO(session.session_date)
  const endDate = session.end_date ? parseISO(session.end_date) : startDate
  const isMultiDay = session.end_date && session.end_date !== session.session_date
  const trainingDays = isMultiDay 
    ? eachDayOfInterval({ start: startDate, end: endDate })
    : [startDate]

  useEffect(() => {
    fetchData()
  }, [session.id])

  const fetchData = async () => {
    try {
      // Fetch learners
      const { data: learnersData } = await supabase
        .from('session_enrollments')
        .select('*')
        .eq('session_id', session.id)

      setLearners(learnersData || [])

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('training_messages')
        .select(`
          *,
          profiles:sender_id (full_name),
          recipient:recipient_id (full_name)
        `)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })

      setMessages(messagesData || [])

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('learner_attendance')
        .select(`
          *,
          profiles:learner_id (full_name, email)
        `)
        .eq('session_id', session.id)

      setAttendance(attendanceData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search for users
  const handleSearch = async (query) => {
    setSearchQuery(query)
    
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      
      const enrolledIds = learners.map(l => l.learner_id)
      const enrolledEmails = learners.map(l => l.learner_email)
      const filtered = data.filter(u => 
        !enrolledIds.includes(u.id) && !enrolledEmails.includes(u.email)
      )
      
      setSearchResults(filtered || [])
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromSearch = async (user) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('session_enrollments')
        .insert({
          session_id: session.id,
          learner_id: user.id,
          learner_name: user.full_name,
          learner_email: user.email,
          status: 'enrolled'
        })

      if (error) throw error

      setSearchQuery('')
      setSearchResults([])
      fetchData()
    } catch (error) {
      console.error('Error adding learner:', error)
      alert('Failed to add learner: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddManual = async () => {
    if (!manualName && !manualEmail && !manualId) {
      alert('Please enter at least a name, email, or ID')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('session_enrollments')
        .insert({
          session_id: session.id,
          learner_name: manualName || null,
          learner_email: manualEmail || null,
          learner_unique_id: manualId || null,
          status: 'enrolled'
        })

      if (error) throw error

      setManualName('')
      setManualEmail('')
      setManualId('')
      setShowManualEntry(false)
      fetchData()
    } catch (error) {
      console.error('Error adding learner:', error)
      alert('Failed to add learner: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveLearner = async (id) => {
    if (!confirm('Remove this learner?')) return

    try {
      const { error } = await supabase
        .from('session_enrollments')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error removing learner:', error)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('session_enrollments')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      alert('Please enter a message')
      return
    }

    if (isPrivate && !selectedRecipient) {
      alert('Please select a recipient for private messages')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('training_messages')
        .insert({
          session_id: session.id,
          sender_id: profile.id,
          recipient_id: isPrivate ? selectedRecipient : null,
          message: newMessage.trim(),
          is_private: isPrivate
        })

      if (error) throw error

      setNewMessage('')
      setIsPrivate(false)
      setSelectedRecipient('')
      fetchData()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Get attendance for a specific learner on a specific date
  const getAttendanceForLearnerDate = (learnerId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return attendance.find(a => 
      a.learner_id === learnerId && a.attendance_date === dateStr
    )
  }

  // Get attendance summary for a date
  const getAttendanceSummaryForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayAttendance = attendance.filter(a => a.attendance_date === dateStr)
    return {
      present: dayAttendance.filter(a => a.status === 'present').length,
      absent: dayAttendance.filter(a => a.status === 'absent').length,
      late: dayAttendance.filter(a => a.status === 'late').length,
      total: learners.length
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Training Tracker
      </button>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">
              {getTopicLabel(session.topic)}
            </h1>
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">{getAudienceLabel(session.audience)}</span>
              <span className={`badge ${
                session.status === 'completed' ? 'badge-green' : 'badge-amber'
              }`}>
                {session.status || 'scheduled'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{learners.length}</p>
            <p className="text-sm text-slate-500">Learners Enrolled</p>
          </div>
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
              {formatTime(session.start_time)} - {formatTime(session.end_time)}
            </p>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('learners')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            activeTab === 'learners' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Learners ({learners.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            activeTab === 'attendance' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'messages' 
              ? 'bg-brand-100 text-brand-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Messages ({messages.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="card p-6 animate-pulse">
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <div className="card p-6">
                <h2 className="font-display font-semibold text-slate-800 mb-4">
                  Quick Stats
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Enrolled</span>
                    <span className="font-semibold text-slate-800">{learners.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Training Days</span>
                    <span className="font-semibold text-slate-800">{trainingDays.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Messages Sent</span>
                    <span className="font-semibold text-slate-800">{messages.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Attendance Records</span>
                    <span className="font-semibold text-slate-800">{attendance.length}</span>
                  </div>
                </div>
              </div>

              {/* Today's Attendance Summary */}
              <div className="card p-6">
                <h2 className="font-display font-semibold text-slate-800 mb-4">
                  Attendance by Day
                </h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {trainingDays.map((day) => {
                    const summary = getAttendanceSummaryForDate(day)
                    const isTodayDate = isToday(day)
                    
                    return (
                      <div 
                        key={day.toISOString()}
                        className={`p-3 rounded-lg ${
                          isTodayDate ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-800">
                            {format(day, 'EEE, MMM d')}
                            {isTodayDate && <span className="text-brand-600 ml-2">(Today)</span>}
                          </span>
                          <div className="flex gap-3 text-sm">
                            <span className="text-green-600">{summary.present} present</span>
                            <span className="text-red-600">{summary.absent} absent</span>
                            <span className="text-amber-600">{summary.late} late</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Learners Tab */}
          {activeTab === 'learners' && (
            <div className="card p-6">
              {/* Add learner section */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-slate-800 mb-3">Add Learner</h3>
                
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="input pl-10"
                  />
                </div>

                {searchQuery.length >= 2 && (
                  <div className="mb-3">
                    {searching ? (
                      <p className="text-sm text-slate-500 p-2">Searching...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-50"
                          >
                            <div>
                              <p className="font-medium text-slate-800">{user.full_name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                            <button
                              onClick={() => handleAddFromSearch(user)}
                              disabled={saving}
                              className="btn-primary text-sm py-1.5 px-3"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 p-2">No users found</p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  {showManualEntry ? 'Hide manual entry' : 'Or add manually...'}
                </button>

                {showManualEntry && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Name"
                        className="input py-2"
                      />
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="Email"
                        className="input py-2"
                      />
                      <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Unique ID"
                        className="input py-2"
                      />
                    </div>
                    <button onClick={handleAddManual} disabled={saving} className="btn-primary">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {saving ? 'Adding...' : 'Add Learner'}
                    </button>
                  </div>
                )}
              </div>

              {/* Learners list */}
              <h3 className="font-medium text-slate-800 mb-3">
                Enrolled Learners ({learners.length})
              </h3>

              {learners.length > 0 ? (
                <div className="space-y-2">
                  {learners.map((learner) => (
                    <div
                      key={learner.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {learner.learner_name || learner.learner_email || learner.learner_unique_id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {learner.learner_email && <span className="mr-3">{learner.learner_email}</span>}
                          {learner.learner_unique_id && <span>ID: {learner.learner_unique_id}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={learner.status}
                          onChange={(e) => handleStatusChange(learner.id, e.target.value)}
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                        >
                          <option value="enrolled">Enrolled</option>
                          <option value="attended">Attended</option>
                          <option value="no_show">No Show</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleRemoveLearner(learner.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No learners enrolled yet</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">
                Attendance Records
              </h2>

              {trainingDays.map((day) => {
                const dayAttendance = attendance.filter(
                  a => a.attendance_date === format(day, 'yyyy-MM-dd')
                )
                const isTodayDate = isToday(day)

                return (
                  <div key={day.toISOString()} className="mb-6 last:mb-0">
                    <h3 className={`font-medium mb-3 ${
                      isTodayDate ? 'text-brand-700' : 'text-slate-800'
                    }`}>
                      {format(day, 'EEEE, MMMM d, yyyy')}
                      {isTodayDate && <span className="text-brand-600 ml-2">(Today)</span>}
                    </h3>

                    {dayAttendance.length > 0 ? (
                      <div className="space-y-2">
                        {dayAttendance.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-slate-800">
                                {record.profiles?.full_name || record.profiles?.email || 'Learner'}
                              </p>
                            </div>
                            <span className={`badge ${
                              record.status === 'present' ? 'badge-green' :
                              record.status === 'absent' ? 'bg-red-100 text-red-700' :
                              'badge-amber'
                            }`}>
                              <span className="flex items-center gap-1">
                                {record.status === 'present' && <CheckCircle2 className="w-3 h-3" />}
                                {record.status === 'absent' && <XCircle className="w-3 h-3" />}
                                {record.status === 'late' && <Clock className="w-3 h-3" />}
                                {record.status}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                        No attendance records for this day yet
                      </p>
                    )}
                  </div>
                )
              })}

              {attendance.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No attendance records yet</p>
                  <p className="text-sm">Learners will mark their attendance during the training</p>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="card p-6">
              {/* Send message */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-slate-800 mb-3">Send Message to Learners</h3>
                
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message to learners..."
                  className="input resize-none h-24 mb-3"
                />

                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600"
                    />
                    <span className="text-sm text-slate-700">Private message</span>
                  </label>

                  {isPrivate && learners.length > 0 && (
                    <select
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="input py-2 flex-1"
                    >
                      <option value="">Select recipient...</option>
                      {learners.filter(l => l.learner_id).map((learner) => (
                        <option key={learner.id} value={learner.learner_id}>
                          {learner.learner_name || learner.learner_email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={saving}
                  className="btn-primary"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {saving ? 'Sending...' : 'Send Message'}
                </button>
              </div>

              {/* Messages list */}
              <h3 className="font-medium text-slate-800 mb-3">
                Sent Messages ({messages.length})
              </h3>

              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-xl ${
                        message.is_private ? 'bg-purple-50 border border-purple-100' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {message.is_private ? (
                          <Lock className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Globe className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-500">
                          {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        {message.is_private && (
                          <span className="badge bg-purple-100 text-purple-700 text-xs">
                            To: {message.recipient?.full_name || 'Learner'}
                          </span>
                        )}
                        {!message.is_private && (
                          <span className="badge badge-slate text-xs">
                            Public - All Learners
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
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No messages sent yet</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ======================== */
/* SCHEDULE MODAL           */
/* ======================== */

function ScheduleModal({ profile, onClose, onSuccess }) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!topic || !audience || !startDate) {
      alert('Please fill in Topic, Audience, and Start Date')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('training_sessions')
        .insert({
          trainer_id: profile.id,
          topic: topic,
          audience: audience,
          session_date: startDate,
          end_date: endDate || startDate,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          status: 'scheduled'
        })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            Schedule Training
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic *
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input"
              required
            >
              <option value="">Select a topic</option>
              {TOPICS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Audience *
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="input"
              required
            >
              <option value="">Select audience</option>
              {AUDIENCES.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                min={startDate}
              />
              <p className="text-xs text-slate-500 mt-1">Leave blank for single day</p>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room name, virtual link, etc."
              className="input"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TrainingTracker
