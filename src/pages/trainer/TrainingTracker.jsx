import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  BarChart3, Calendar, Users, Clock, Plus, X, 
  ChevronDown, Trash2, UserPlus, Edit 
} from 'lucide-react'
import { format, eachDayOfInterval, parseISO } from 'date-fns'

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

function TrainingTracker() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
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
        .select(`
          *,
          session_enrollments (id, status, learner_name, learner_email, learner_unique_id),
          session_schedule_days (id, session_date, start_time, end_time)
        `)
        .eq('trainer_id', profile.id)
        .order('session_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setSessions(data || [])

      // Calculate stats
      const totalSessions = data?.length || 0
      const totalLearners = data?.reduce((sum, s) => 
        sum + (s.session_enrollments?.length || 0), 0
      ) || 0

      setStats({
        totalSessions,
        totalLearners,
        totalHours: 0
      })
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTopicLabel = (topicId) => {
    return TOPICS.find(t => t.id === topicId)?.label || topicId
  }

  const getAudienceLabel = (audienceId) => {
    return AUDIENCES.find(a => a.id === audienceId)?.label || audienceId
  }

  const handleEnroll = (session) => {
    setSelectedSession(session)
    setShowEnrollModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Training Tracker
          </h1>
          <p className="text-slate-500">
            Schedule sessions and manage learner enrollments
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
              <p className="text-2xl font-bold text-slate-800">{stats.totalSessions}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.totalLearners}</p>
              <p className="text-sm text-slate-500">Learners Enrolled</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">--</p>
              <p className="text-sm text-slate-500">Completion Rate</p>
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
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-slate-800">
                        {getTopicLabel(session.topic)}
                      </h3>
                      <span className="badge badge-blue">
                        {getAudienceLabel(session.audience)}
                      </span>
                      <span className={`badge ${
                        session.status === 'completed' ? 'badge-green' :
                        session.status === 'cancelled' ? 'badge-slate' : 'badge-amber'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.session_date), 'MMM d, yyyy')}
                        {session.end_date && session.end_date !== session.session_date && (
                          <> - {format(new Date(session.end_date), 'MMM d, yyyy')}</>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {session.start_time?.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.session_enrollments?.length || 0} enrolled
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEnroll(session)}
                      className="btn-secondary text-sm py-2"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Manage Learners
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No sessions yet</h3>
            <p className="text-slate-500 mb-4">Schedule your first training session</p>
            <button onClick={() => setShowScheduleModal(true)} className="btn-primary">
              Schedule Training
            </button>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleTrainingModal
          onClose={() => setShowScheduleModal(false)}
          onSubmit={() => {
            setShowScheduleModal(false)
            fetchSessions()
          }}
          profile={profile}
        />
      )}

      {/* Enroll Modal */}
      {showEnrollModal && selectedSession && (
        <ManageLearnersModal
          session={selectedSession}
          onClose={() => {
            setShowEnrollModal(false)
            setSelectedSession(null)
          }}
          onUpdate={fetchSessions}
        />
      )}
    </div>
  )
}

function ScheduleTrainingModal({ onClose, onSubmit, profile }) {
  const [formData, setFormData] = useState({
    topic: '',
    audience: '',
    startDate: '',
    endDate: '',
    sameTimeAllDays: true,
    defaultStartTime: '09:00',
    defaultEndTime: '17:00',
    dailySchedule: {},
    location: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getDateRange = () => {
    if (!formData.startDate || !formData.endDate) return []
    try {
      return eachDayOfInterval({
        start: parseISO(formData.startDate),
        end: parseISO(formData.endDate)
      })
    } catch {
      return []
    }
  }

  const handleDayTimeChange = (dateStr, field, value) => {
    setFormData(prev => ({
      ...prev,
      dailySchedule: {
        ...prev.dailySchedule,
        [dateStr]: {
          ...prev.dailySchedule[dateStr],
          [field]: value
        }
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.topic || !formData.audience || !formData.startDate) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      // Create the main session
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          trainer_id: profile.id,
          topic: formData.topic,
          audience: formData.audience,
          session_date: formData.startDate,
          end_date: formData.endDate || formData.startDate,
          start_time: formData.defaultStartTime,
          end_time: formData.defaultEndTime,
          location: formData.location || null,
          notes: formData.notes || null,
          status: 'scheduled'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // If different times per day, create schedule entries
      if (!formData.sameTimeAllDays && formData.endDate) {
        const days = getDateRange()
        const scheduleEntries = days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const daySchedule = formData.dailySchedule[dateStr] || {}
          return {
            session_id: session.id,
            session_date: dateStr,
            start_time: daySchedule.startTime || formData.defaultStartTime,
            end_time: daySchedule.endTime || formData.defaultEndTime
          }
        })

        const { error: scheduleError } = await supabase
          .from('session_schedule_days')
          .insert(scheduleEntries)

        if (scheduleError) throw scheduleError
      }

      onSubmit()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const dateRange = getDateRange()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            Schedule Training
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic *
            </label>
            <select
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              className="input"
              required
            >
              <option value="">Select a topic</option>
              {TOPICS.map(topic => (
                <option key={topic.id} value={topic.id}>{topic.label}</option>
              ))}
            </select>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Audience *
            </label>
            <select
              value={formData.audience}
              onChange={(e) => handleChange('audience', e.target.value)}
              className="input"
              required
            >
              <option value="">Select audience</option>
              {AUDIENCES.map(aud => (
                <option key={aud.id} value={aud.id}>{aud.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
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
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="input"
                min={formData.startDate}
              />
              <p className="text-xs text-slate-500 mt-1">Leave blank for single day</p>
            </div>
          </div>

          {/* Time Options */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={formData.sameTimeAllDays}
                onChange={(e) => handleChange('sameTimeAllDays', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-700">Same time for all days</span>
            </label>

            {formData.sameTimeAllDays ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.defaultStartTime}
                    onChange={(e) => handleChange('defaultStartTime', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.defaultEndTime}
                    onChange={(e) => handleChange('defaultEndTime', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            ) : dateRange.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
                {dateRange.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const daySchedule = formData.dailySchedule[dateStr] || {}
                  return (
                    <div key={dateStr} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700 w-32">
                        {format(day, 'EEE, MMM d')}
                      </span>
                      <input
                        type="time"
                        value={daySchedule.startTime || formData.defaultStartTime}
                        onChange={(e) => handleDayTimeChange(dateStr, 'startTime', e.target.value)}
                        className="input flex-1 py-2"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={daySchedule.endTime || formData.defaultEndTime}
                        onChange={(e) => handleDayTimeChange(dateStr, 'endTime', e.target.value)}
                        className="input flex-1 py-2"
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a date range to set individual times</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Room name, virtual link, etc."
              className="input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional details..."
              className="input resize-none h-20"
            />
          </div>

          <div className="flex gap-3 pt-2">
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

function ManageLearnersModal({ session, onClose, onUpdate }) {
  const [enrollments, setEnrollments] = useState(session.session_enrollments || [])
  const [newLearner, setNewLearner] = useState({
    name: '',
    email: '',
    uniqueId: ''
  })
  const [saving, setSaving] = useState(false)

  const handleAddLearner = async () => {
    if (!newLearner.name && !newLearner.email && !newLearner.uniqueId) {
      alert('Please enter at least a name, email, or ID')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('session_enrollments')
        .insert({
          session_id: session.id,
          learner_name: newLearner.name || null,
          learner_email: newLearner.email || null,
          learner_unique_id: newLearner.uniqueId || null,
          status: 'enrolled'
        })
        .select()
        .single()

      if (error) throw error

      setEnrollments(prev => [...prev, data])
      setNewLearner({ name: '', email: '', uniqueId: '' })
      onUpdate()
    } catch (error) {
      console.error('Error adding learner:', error)
      alert('Failed to add learner. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveLearner = async (enrollmentId) => {
    if (!confirm('Remove this learner from the session?')) return

    try {
      const { error } = await supabase
        .from('session_enrollments')
        .delete()
        .eq('id', enrollmentId)

      if (error) throw error

      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
      onUpdate()
    } catch (error) {
      console.error('Error removing learner:', error)
      alert('Failed to remove learner. Please try again.')
    }
  }

  const handleStatusChange = async (enrollmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('session_enrollments')
        .update({ status: newStatus })
        .eq('id', enrollmentId)

      if (error) throw error

      setEnrollments(prev => prev.map(e => 
        e.id === enrollmentId ? { ...e, status: newStatus } : e
      ))
      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-800">
              Manage Learners
            </h2>
            <p className="text-sm text-slate-500">
              {TOPICS.find(t => t.id === session.topic)?.label} - {format(new Date(session.session_date), 'MMM d, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {/* Add new learner */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-slate-800 mb-3">Add Learner</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                value={newLearner.name}
                onChange={(e) => setNewLearner(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="input py-2"
              />
              <input
                type="email"
                value={newLearner.email}
                onChange={(e) => setNewLearner(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="input py-2"
              />
              <input
                type="text"
                value={newLearner.uniqueId}
                onChange={(e) => setNewLearner(prev => ({ ...prev, uniqueId: e.target.value }))}
                placeholder="Unique ID"
                className="input py-2"
              />
            </div>
            <button
              onClick={handleAddLearner}
              disabled={saving}
              className="btn-primary w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {saving ? 'Adding...' : 'Add Learner'}
            </button>
          </div>

          {/* Enrolled learners list */}
          <h3 className="font-medium text-slate-800 mb-3">
            Enrolled Learners ({enrollments.length})
          </h3>

          {enrollments.length > 0 ? (
            <div className="space-y-2">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {enrollment.learner_name || enrollment.learner_email || enrollment.learner_unique_id || 'Unknown'}
                    </p>
                    <div className="flex gap-2 text-sm text-slate-500">
                      {enrollment.learner_email && <span>{enrollment.learner_email}</span>}
                      {enrollment.learner_unique_id && <span>ID: {enrollment.learner_unique_id}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={enrollment.status}
                      onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                    >
                      <option value="enrolled">Enrolled</option>
                      <option value="attended">Attended</option>
                      <option value="no_show">No Show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleRemoveLearner(enrollment.id)}
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

        <div className="p-5 border-t border-slate-200">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingTracker
