import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  BarChart3, Calendar, Users, Clock, Plus, X, 
  Trash2, UserPlus, Search, Check, MessageSquare,
  Lock, Globe, ArrowLeft, CheckCircle2, XCircle,
  Edit, AlertTriangle, TrendingUp, Save, Download,
  Upload, FileSpreadsheet, Award, ChevronDown
} from 'lucide-react'
import { format, parseISO, eachDayOfInterval, isBefore, isToday, startOfWeek } from 'date-fns'
import { exportRoster, exportAttendance, exportProgress, parseImportFile, downloadImportTemplate } from '../../lib/exportService'
import { sendNotification, sendBatchNotifications } from '../../lib/emailService'
import { downloadCertificate } from '../../lib/certificateGenerator'

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

const CLIENTS = [
  { id: 'ibx', label: 'IBX' },
  { id: 'hwc', label: 'HWC' },
  { id: 'az_blue', label: 'AZ Blue' },
  { id: 'clover', label: 'Clover' },
]

const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

const getTopicLabel = (topicId) => TOPICS.find(t => t.id === topicId)?.label || topicId || 'Training'
const getAudienceLabel = (audienceId) => AUDIENCES.find(a => a.id === audienceId)?.label || audienceId || 'All'
const getClientLabel = (clientId) => CLIENTS.find(c => c.id === clientId)?.label || clientId || 'N/A'

function TrainingTracker() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [activeFilter, setActiveFilter] = useState('upcoming')

  useEffect(() => {
    if (profile) fetchSessions()
  }, [profile])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, session_enrollments (id)')
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingSessions = sessions.filter(s => {
    const endDate = s.end_date || s.session_date
    return !isBefore(parseISO(endDate), today) && s.status !== 'cancelled'
  })
  const pastSessions = sessions.filter(s => {
    const endDate = s.end_date || s.session_date
    return isBefore(parseISO(endDate), today) && s.status !== 'cancelled'
  })
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled')

  const getFilteredSessions = () => {
    switch (activeFilter) {
      case 'upcoming': return upcomingSessions
      case 'past': return pastSessions
      case 'cancelled': return cancelledSessions
      default: return sessions
    }
  }

  if (selectedSession) {
    return (
      <TrainingDetailView
        session={selectedSession}
        profile={profile}
        onBack={() => { setSelectedSession(null); fetchSessions() }}
        onUpdate={fetchSessions}
      />
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">My Classes</h1>
          <p className="text-slate-500">Schedule and manage your training classes</p>
        </div>
        <button onClick={() => setShowScheduleModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />Schedule Class
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{upcomingSessions.length}</p>
              <p className="text-sm text-slate-500">Upcoming Classes</p>
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
              <p className="text-sm text-slate-500">Total Learners</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{pastSessions.length}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['upcoming', 'past', 'cancelled'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              activeFilter === filter ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {filter} ({filter === 'upcoming' ? upcomingSessions.length : filter === 'past' ? pastSessions.length : cancelledSessions.length})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800 capitalize">{activeFilter} Classes</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : getFilteredSessions().length > 0 ? (
          <div className="divide-y divide-slate-100">
            {getFilteredSessions().map((session) => {
              const startDate = parseISO(session.session_date)
              const endDate = session.end_date ? parseISO(session.end_date) : null
              const isMultiDay = endDate && session.end_date !== session.session_date

              return (
                <div key={session.id} onClick={() => setSelectedSession(session)}
                  className={`p-5 hover:bg-slate-50 transition-colors cursor-pointer ${session.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-medium text-slate-800">{getTopicLabel(session.topic)}</h3>
                        {session.status === 'cancelled' && <span className="badge bg-red-100 text-red-700">Cancelled</span>}
                        {session.progress_tracking_enabled && <span className="badge badge-purple">Progress Tracking</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="badge badge-blue">{getAudienceLabel(session.audience)}</span>
                        <span className="badge badge-slate">{getClientLabel(session.client)}</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(startDate, 'MMM d, yyyy')}{isMultiDay && ` - ${format(endDate, 'MMM d, yyyy')}`}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />{formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="w-4 h-4" />{session.session_enrollments?.length || 0} enrolled
                        </span>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm py-2">Manage</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No classes found</h3>
            {activeFilter === 'upcoming' && (
              <button onClick={() => setShowScheduleModal(true)} className="btn-primary mt-4">Schedule Class</button>
            )}
          </div>
        )}
      </div>

      {showScheduleModal && (
        <ScheduleModal profile={profile} onClose={() => setShowScheduleModal(false)} onSuccess={() => { setShowScheduleModal(false); fetchSessions() }} />
      )}
    </div>
  )
}

function ScheduleModal({ profile, onClose, onSuccess }) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [client, setClient] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [progressTracking, setProgressTracking] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic || !audience || !client || !startDate) { 
      alert('Please fill in Topic, Audience, Client, and Start Date')
      return 
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('training_sessions').insert({
        trainer_id: profile.id,
        topic, 
        audience,
        client,
        session_date: startDate,
        end_date: endDate || startDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        status: 'scheduled',
        progress_tracking_enabled: progressTracking
      })
      if (error) throw error
      onSuccess()
    } catch (error) {
      alert('Failed to create class: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">Schedule Class</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Topic *</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="input" required>
              <option value="">Select a topic</option>
              {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Audience *</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input" required>
              <option value="">Select audience</option>
              {AUDIENCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Client *</label>
            <select value={client} onChange={(e) => setClient(e.target.value)} className="input" required>
              <option value="">Select client</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" min={startDate} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={progressTracking}
                onChange={(e) => setProgressTracking(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-slate-300 text-purple-600"
              />
              <div>
                <span className="font-medium text-slate-800">Enable Progress Tracking</span>
                <p className="text-sm text-slate-500 mt-1">
                  Track daily participation, accuracy, and productivity scores for each learner.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add any additional notes about this class..."
              className="input resize-none h-24" 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Class'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TrainingDetailView({ session, profile, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('learners')
  const [learners, setLearners] = useState([])
  const [messages, setMessages] = useState([])
  const [attendance, setAttendance] = useState([])
  const [progress, setProgress] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState(session)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedLearnerForProgress, setSelectedLearnerForProgress] = useState(null)

  const [newMessage, setNewMessage] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [saving, setSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualId, setManualId] = useState('')

  const exportMenuRef = useRef(null)

  const startDate = parseISO(sessionData.session_date)
  const endDate = sessionData.end_date ? parseISO(sessionData.end_date) : startDate
  const isMultiDay = sessionData.end_date && sessionData.end_date !== sessionData.session_date
  const trainingDays = isMultiDay ? eachDayOfInterval({ start: startDate, end: endDate }) : [startDate]
  const isCancelled = sessionData.status === 'cancelled'

  useEffect(() => { fetchData() }, [sessionData.id])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    try {
      const { data: learnersData } = await supabase.from('session_enrollments').select('*').eq('session_id', sessionData.id)
      setLearners(learnersData || [])

      const { data: messagesData } = await supabase
        .from('training_messages')
        .select('*, profiles:sender_id (full_name), recipient:recipient_id (full_name)')
        .eq('session_id', sessionData.id)
        .order('created_at', { ascending: false })
      setMessages(messagesData || [])

      const { data: attendanceData } = await supabase
        .from('learner_attendance')
        .select('*, profiles:learner_id (full_name, email)')
        .eq('session_id', sessionData.id)
      setAttendance(attendanceData || [])

      if (sessionData.progress_tracking_enabled) {
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('*, profiles:learner_id (full_name, email)')
          .eq('session_id', sessionData.id)
          .order('progress_date', { ascending: true })
        setProgress(progressData || [])
      }

      const { data: certificatesData } = await supabase
        .from('certificates')
        .select('*')
        .eq('session_id', sessionData.id)
      setCertificates(certificatesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    const { data } = await supabase.from('training_sessions').select('*').eq('id', sessionData.id).single()
    if (data) setSessionData(data)
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(10)
      const enrolledIds = learners.map(l => l.learner_id)
      const enrolledEmails = learners.map(l => l.learner_email)
      setSearchResults((data || []).filter(u => !enrolledIds.includes(u.id) && !enrolledEmails.includes(u.email)))
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromSearch = async (user) => {
    setSaving(true)
    try {
      await supabase.from('session_enrollments').insert({ 
        session_id: sessionData.id, 
        learner_id: user.id, 
        learner_name: user.full_name, 
        learner_email: user.email, 
        status: 'enrolled' 
      })
      
      // Send enrollment notification
      await sendNotification(user.email, user.full_name, 'enrollment', {
        learnerName: user.full_name,
        sessionTopic: getTopicLabel(sessionData.topic),
        sessionDate: format(startDate, 'MMMM d, yyyy'),
        trainerName: profile.full_name
      }, sessionData.id)

      setSearchQuery(''); setSearchResults([])
      fetchData()
    } catch (error) { alert('Failed to add learner') }
    finally { setSaving(false) }
  }

  const handleAddManual = async () => {
    if (!manualName && !manualEmail && !manualId) { alert('Please enter at least a name, email, or ID'); return }
    setSaving(true)
    try {
      await supabase.from('session_enrollments').insert({ 
        session_id: sessionData.id, 
        learner_name: manualName || null, 
        learner_email: manualEmail || null, 
        learner_unique_id: manualId || null, 
        status: 'enrolled' 
      })

      // Send enrollment notification if email provided
      if (manualEmail) {
        await sendNotification(manualEmail, manualName || 'Learner', 'enrollment', {
          learnerName: manualName || 'Learner',
          sessionTopic: getTopicLabel(sessionData.topic),
          sessionDate: format(startDate, 'MMMM d, yyyy'),
          trainerName: profile.full_name
        }, sessionData.id)
      }

      setManualName(''); setManualEmail(''); setManualId(''); setShowManualEntry(false)
      fetchData()
    } catch (error) { alert('Failed to add learner') }
    finally { setSaving(false) }
  }

  const handleRemoveLearner = async (id) => {
    if (!confirm('Remove this learner?')) return
    await supabase.from('session_enrollments').delete().eq('id', id)
    fetchData()
  }

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('session_enrollments').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) { alert('Please enter a message'); return }
    if (isPrivate && !selectedRecipient) { alert('Please select a recipient'); return }
    setSaving(true)
    try {
      await supabase.from('training_messages').insert({ 
        session_id: sessionData.id, 
        sender_id: profile.id, 
        recipient_id: isPrivate ? selectedRecipient : null, 
        message: newMessage.trim(), 
        is_private: isPrivate 
      })

      // Send notification
      if (isPrivate) {
        const recipient = learners.find(l => l.learner_id === selectedRecipient)
        if (recipient?.learner_email) {
          await sendNotification(recipient.learner_email, recipient.learner_name || 'Learner', 'message', {
            learnerName: recipient.learner_name || 'Learner',
            sessionTopic: getTopicLabel(sessionData.topic),
            trainerName: profile.full_name,
            isPrivate: true
          }, sessionData.id)
        }
      } else {
        // Notify all learners with emails
        const recipients = learners.filter(l => l.learner_email).map(l => ({
          email: l.learner_email,
          name: l.learner_name || 'Learner'
        }))
        await sendBatchNotifications(recipients, 'message', (r) => ({
          learnerName: r.name,
          sessionTopic: getTopicLabel(sessionData.topic),
          trainerName: profile.full_name,
          isPrivate: false
        }), sessionData.id)
      }

      setNewMessage(''); setIsPrivate(false); setSelectedRecipient('')
      fetchData()
    } catch (error) { alert('Failed to send message') }
    finally { setSaving(false) }
  }

  const handleCancelClass = async () => {
    if (!confirm('Are you sure you want to cancel this class? This will notify all enrolled learners.')) return
    
    await supabase.from('training_sessions').update({ status: 'cancelled' }).eq('id', sessionData.id)

    // Notify all learners
    const recipients = learners.filter(l => l.learner_email).map(l => ({
      email: l.learner_email,
      name: l.learner_name || 'Learner'
    }))
    await sendBatchNotifications(recipients, 'cancellation', (r) => ({
      learnerName: r.name,
      sessionTopic: getTopicLabel(sessionData.topic),
      sessionDate: format(startDate, 'MMMM d, yyyy'),
      reason: ''
    }), sessionData.id)

    refreshSession()
    onUpdate()
  }

  const handleIssueCertificate = async (learner) => {
    if (!confirm(`Issue certificate to ${learner.learner_name || learner.learner_email}?`)) return

    try {
      const certificateNumber = `CERT-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Save to database
      const { error } = await supabase.from('certificates').insert({
        session_id: sessionData.id,
        learner_id: learner.learner_id,
        learner_name: learner.learner_name || learner.learner_email,
        learner_email: learner.learner_email,
        certificate_number: certificateNumber
      })

      if (error) throw error

      // Generate and download PDF
      downloadCertificate({
        learnerName: learner.learner_name || learner.learner_email || 'Learner',
        sessionTopic: getTopicLabel(sessionData.topic),
        trainerName: profile.full_name,
        completionDate: format(new Date(), 'MMMM d, yyyy'),
        certificateNumber: certificateNumber,
        clientName: getClientLabel(sessionData.client)
      })

      // Send notification
      if (learner.learner_email) {
        await sendNotification(learner.learner_email, learner.learner_name || 'Learner', 'certificate', {
          learnerName: learner.learner_name || 'Learner',
          sessionTopic: getTopicLabel(sessionData.topic),
          certificateNumber: certificateNumber
        }, sessionData.id)
      }

      fetchData()
      alert('Certificate issued successfully!')
    } catch (error) {
      console.error('Error issuing certificate:', error)
      alert('Failed to issue certificate: ' + error.message)
    }
  }

  const handleDownloadCertificate = (learner) => {
    const cert = certificates.find(c => c.learner_id === learner.learner_id)
    if (!cert) return

    downloadCertificate({
      learnerName: cert.learner_name || 'Learner',
      sessionTopic: getTopicLabel(sessionData.topic),
      trainerName: profile.full_name,
      completionDate: format(new Date(cert.issued_at), 'MMMM d, yyyy'),
      certificateNumber: cert.certificate_number,
      clientName: getClientLabel(sessionData.client)
    })
  }

  const handleExport = (type) => {
    setShowExportMenu(false)
    const topicLabel = getTopicLabel(sessionData.topic)
    const clientLabel = getClientLabel(sessionData.client)

    switch (type) {
      case 'roster':
        exportRoster(sessionData, learners, topicLabel, clientLabel)
        break
      case 'attendance':
        exportAttendance(sessionData, attendance, learners, trainingDays, topicLabel, clientLabel)
        break
      case 'progress':
        exportProgress(sessionData, progress, learners, trainingDays, topicLabel, clientLabel)
        break
    }
  }

  const getProgressForLearner = (learnerId) => progress.filter(p => p.learner_id === learnerId)

  const getWeeklyAveragesForLearner = (learnerId) => {
    const learnerProgress = getProgressForLearner(learnerId)
    if (learnerProgress.length === 0) return []
    
    const weeks = {}
    learnerProgress.forEach(p => {
      const date = parseISO(p.progress_date)
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd')
      if (!weeks[weekStart]) weeks[weekStart] = { participation: [], accuracy: [], productivity: [] }
      if (p.participation_score !== null) weeks[weekStart].participation.push(p.participation_score)
      if (p.accuracy_score !== null) weeks[weekStart].accuracy.push(p.accuracy_score)
      if (p.productivity_score !== null) weeks[weekStart].productivity.push(p.productivity_score)
    })

    return Object.entries(weeks).map(([weekStart, data]) => ({
      week: weekStart,
      participation: data.participation.length > 0 ? Math.round(data.participation.reduce((a, b) => a + b, 0) / data.participation.length) : null,
      accuracy: data.accuracy.length > 0 ? Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length) : null,
      productivity: data.productivity.length > 0 ? Math.round(data.productivity.reduce((a, b) => a + b, 0) / data.productivity.length) : null,
    }))
  }

  const hasCertificate = (learnerId) => certificates.some(c => c.learner_id === learnerId)

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-5 h-5" /> Back to My Classes
      </button>

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="font-medium text-red-800">This class has been cancelled</p>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-slate-800">{getTopicLabel(sessionData.topic)}</h1>
              {sessionData.progress_tracking_enabled && <span className="badge badge-purple">Progress Tracking</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-blue">{getAudienceLabel(sessionData.audience)}</span>
              <span className="badge badge-slate">{getClientLabel(sessionData.client)}</span>
              <span className={`badge ${sessionData.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'badge-amber'}`}>{sessionData.status || 'scheduled'}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />Export<ChevronDown className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-10">
                  <button onClick={() => handleExport('roster')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />Class Roster
                  </button>
                  <button onClick={() => handleExport('attendance')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />Attendance
                  </button>
                  {sessionData.progress_tracking_enabled && (
                    <button onClick={() => handleExport('progress')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500" />Progress Scores
                    </button>
                  )}
                </div>
              )}
            </div>
            {!isCancelled && (
              <>
                <button onClick={() => setShowEditModal(true)} className="btn-secondary text-sm"><Edit className="w-4 h-4 mr-1" />Edit</button>
                <button onClick={handleCancelClass} className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"><XCircle className="w-4 h-4 mr-1 inline" />Cancel</button>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-slate-500 mb-1">Date</p><p className="font-medium text-slate-800">{format(startDate, 'MMM d, yyyy')}{isMultiDay && ` - ${format(endDate, 'MMM d, yyyy')}`}</p></div>
          <div><p className="text-slate-500 mb-1">Time</p><p className="font-medium text-slate-800">{formatTime(sessionData.start_time)} - {formatTime(sessionData.end_time)}</p></div>
          <div><p className="text-slate-500 mb-1">Client</p><p className="font-medium text-slate-800">{getClientLabel(sessionData.client)}</p></div>
          <div><p className="text-slate-500 mb-1">Enrolled</p><p className="font-medium text-slate-800">{learners.length} learners</p></div>
        </div>
        {sessionData.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-500 text-sm mb-1">Notes</p>
            <p className="text-slate-700 whitespace-pre-wrap">{sessionData.notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('learners')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'learners' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>Learners ({learners.length})</button>
        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'attendance' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>Attendance</button>
        {sessionData.progress_tracking_enabled && (
          <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'progress' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
            <TrendingUp className="w-4 h-4" />Progress
          </button>
        )}
        <button onClick={() => setActiveTab('certificates')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'certificates' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Award className="w-4 h-4" />Certificates ({certificates.length})
        </button>
        <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'messages' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
          <MessageSquare className="w-4 h-4" />Messages ({messages.length})
        </button>
      </div>

      {loading ? (
        <div className="card p-6"><div className="h-32 bg-slate-100 rounded-xl animate-pulse" /></div>
      ) : (
        <>
          {activeTab === 'learners' && (
            <div className="card p-6">
              {!isCancelled && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-slate-800">Add Learners</h3>
                    <button onClick={() => setShowImportModal(true)} className="btn-secondary text-sm">
                      <Upload className="w-4 h-4 mr-1" />Bulk Import
                    </button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by name or email..." className="input pl-10" />
                  </div>
                  {searchQuery.length >= 2 && (
                    <div className="mb-3">
                      {searching ? <p className="text-sm text-slate-500 p-2">Searching...</p> : searchResults.length > 0 ? (
                        <div className="border border-slate-200 rounded-lg divide-y bg-white max-h-48 overflow-y-auto">
                          {searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                              <div><p className="font-medium text-slate-800">{user.full_name}</p><p className="text-sm text-slate-500">{user.email}</p></div>
                              <button onClick={() => handleAddFromSearch(user)} disabled={saving} className="btn-primary text-sm py-1.5 px-3"><Check className="w-4 h-4 mr-1" />Add</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-500 p-2">No users found</p>}
                    </div>
                  )}
                  <button onClick={() => setShowManualEntry(!showManualEntry)} className="text-sm text-brand-600 font-medium">{showManualEntry ? 'Hide manual entry' : 'Or add manually...'}</button>
                  {showManualEntry && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Name" className="input py-2" />
                        <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="Email" className="input py-2" />
                        <input type="text" value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Unique ID" className="input py-2" />
                      </div>
                      <button onClick={handleAddManual} disabled={saving} className="btn-primary"><UserPlus className="w-4 h-4 mr-2" />{saving ? 'Adding...' : 'Add Learner'}</button>
                    </div>
                  )}
                </div>
              )}
              <h3 className="font-medium text-slate-800 mb-3">Enrolled Learners ({learners.length})</h3>
              {learners.length > 0 ? (
                <div className="space-y-2">
                  {learners.map((learner) => (
                    <div key={learner.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">{learner.learner_name || learner.learner_email || learner.learner_unique_id}</p>
                        <p className="text-sm text-slate-500">{learner.learner_email}{learner.learner_unique_id && ` • ID: ${learner.learner_unique_id}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={learner.status} onChange={(e) => handleStatusChange(learner.id, e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1" disabled={isCancelled}>
                          <option value="enrolled">Enrolled</option>
                          <option value="attended">Attended</option>
                          <option value="no_show">No Show</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {!isCancelled && <button onClick={() => handleRemoveLearner(learner.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500"><Users className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p>No learners enrolled yet</p></div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">Attendance Records</h2>
              {trainingDays.map((day) => {
                const dayAttendance = attendance.filter(a => a.attendance_date === format(day, 'yyyy-MM-dd'))
                return (
                  <div key={day.toISOString()} className="mb-6 last:mb-0">
                    <h3 className={`font-medium mb-3 ${isToday(day) ? 'text-brand-700' : 'text-slate-800'}`}>
                      {format(day, 'EEEE, MMMM d, yyyy')}{isToday(day) && <span className="text-brand-600 ml-2">(Today)</span>}
                    </h3>
                    {dayAttendance.length > 0 ? (
                      <div className="space-y-2">
                        {dayAttendance.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <p className="font-medium text-slate-800">{record.profiles?.full_name || 'Learner'}</p>
                            <span className={`badge ${record.status === 'present' ? 'badge-green' : record.status === 'absent' ? 'bg-red-100 text-red-700' : 'badge-amber'}`}>{record.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">No attendance records yet</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'progress' && sessionData.progress_tracking_enabled && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">Progress Tracking</h2>
              <p className="text-slate-500 text-sm mb-6">Select a learner to view and update their daily progress</p>

              {learners.filter(l => l.learner_id).length > 0 ? (
                <div className="space-y-3">
                  {learners.filter(l => l.learner_id).map((learner) => {
                    const learnerProgress = getProgressForLearner(learner.learner_id)
                    const weeklyAvg = getWeeklyAveragesForLearner(learner.learner_id)
                    const latestWeek = weeklyAvg[weeklyAvg.length - 1]

                    return (
                      <div key={learner.id} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-800">{learner.learner_name || learner.learner_email}</p>
                            <p className="text-sm text-slate-500">{learnerProgress.length} days recorded</p>
                          </div>
                          <button onClick={() => setSelectedLearnerForProgress(learner)} className="btn-secondary text-sm">
                            <TrendingUp className="w-4 h-4 mr-1" /> Manage Progress
                          </button>
                        </div>

                        {latestWeek && (
                          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
                            <div className="text-center">
                              <p className="text-xs text-slate-500 mb-1">Participation</p>
                              <p className="font-bold text-lg text-orange-600">{latestWeek.participation ?? '--'}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500 mb-1">Accuracy</p>
                              <p className="font-bold text-lg text-blue-600">{latestWeek.accuracy ?? '--'}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500 mb-1">Productivity</p>
                              <p className="font-bold text-lg text-emerald-600">{latestWeek.productivity ?? '--'}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No learners with accounts enrolled</p>
                  <p className="text-sm">Progress tracking requires learners to have user accounts</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-slate-800 mb-4">Certificates</h2>
              <p className="text-slate-500 text-sm mb-6">Issue completion certificates to learners</p>

              {learners.filter(l => l.learner_id && l.status === 'attended').length > 0 ? (
                <div className="space-y-3">
                  {learners.filter(l => l.learner_id).map((learner) => {
                    const hasIssuedCert = hasCertificate(learner.learner_id)
                    const cert = certificates.find(c => c.learner_id === learner.learner_id)

                    return (
                      <div key={learner.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                        <div>
                          <p className="font-medium text-slate-800">{learner.learner_name || learner.learner_email}</p>
                          <p className="text-sm text-slate-500">
                            Status: <span className={learner.status === 'attended' ? 'text-green-600' : 'text-slate-500'}>{learner.status}</span>
                            {hasIssuedCert && <span className="ml-2 text-purple-600">• Certificate Issued</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasIssuedCert ? (
                            <button onClick={() => handleDownloadCertificate(learner)} className="btn-secondary text-sm">
                              <Download className="w-4 h-4 mr-1" />Download
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleIssueCertificate(learner)} 
                              disabled={learner.status !== 'attended'}
                              className={`text-sm px-3 py-2 rounded-lg font-medium flex items-center gap-1 ${
                                learner.status === 'attended' 
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <Award className="w-4 h-4" />Issue Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No learners eligible for certificates</p>
                  <p className="text-sm">Mark learners as "Attended" to issue certificates</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="card p-6">
              {!isCancelled && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="font-medium text-slate-800 mb-3">Send Message</h3>
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write a message..." className="input resize-none h-24 mb-3" />
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                      <span className="text-sm text-slate-700">Private message</span>
                    </label>
                    {isPrivate && learners.length > 0 && (
                      <select value={selectedRecipient} onChange={(e) => setSelectedRecipient(e.target.value)} className="input py-2 flex-1">
                        <option value="">Select recipient...</option>
                        {learners.filter(l => l.learner_id).map((l) => <option key={l.id} value={l.learner_id}>{l.learner_name || l.learner_email}</option>)}
                      </select>
                    )}
                  </div>
                  <button onClick={handleSendMessage} disabled={saving} className="btn-primary"><MessageSquare className="w-4 h-4 mr-2" />{saving ? 'Sending...' : 'Send'}</button>
                </div>
              )}
              <h3 className="font-medium text-slate-800 mb-3">Messages ({messages.length})</h3>
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`p-4 rounded-xl ${msg.is_private ? 'bg-purple-50 border border-purple-100' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {msg.is_private ? <Lock className="w-4 h-4 text-purple-600" /> : <Globe className="w-4 h-4 text-slate-400" />}
                        <span className="text-sm text-slate-500">{format(new Date(msg.created_at), 'MMM d, h:mm a')}</span>
                        {msg.is_private && <span className="badge bg-purple-100 text-purple-700 text-xs">To: {msg.recipient?.full_name || 'Learner'}</span>}
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500"><MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p>No messages yet</p></div>
              )}
            </div>
          )}
        </>
      )}

      {showEditModal && (
        <EditModal session={sessionData} onClose={() => setShowEditModal(false)} onSuccess={() => { setShowEditModal(false); refreshSession(); onUpdate() }} />
      )}

      {showImportModal && (
        <ImportModal 
          sessionId={sessionData.id} 
          sessionTopic={getTopicLabel(sessionData.topic)}
          sessionDate={format(startDate, 'MMMM d, yyyy')}
          trainerName={profile.full_name}
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchData() }} 
        />
      )}

      {selectedLearnerForProgress && (
        <LearnerProgressModal
          learner={selectedLearnerForProgress}
          session={sessionData}
          trainingDays={trainingDays}
          existingProgress={getProgressForLearner(selectedLearnerForProgress.learner_id)}
          onClose={() => setSelectedLearnerForProgress(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  )
}

function EditModal({ session, onClose, onSuccess }) {
  const [topic, setTopic] = useState(session.topic || '')
  const [audience, setAudience] = useState(session.audience || '')
  const [client, setClient] = useState(session.client || '')
  const [startDate, setStartDate] = useState(session.session_date || '')
  const [endDate, setEndDate] = useState(session.end_date || '')
  const [startTime, setStartTime] = useState(session.start_time || '09:00')
  const [endTime, setEndTime] = useState(session.end_time || '17:00')
  const [notes, setNotes] = useState(session.notes || '')
  const [progressTracking, setProgressTracking] = useState(session.progress_tracking_enabled || false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!client) {
      alert('Please select a client')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('training_sessions').update({
        topic, 
        audience, 
        client,
        session_date: startDate, 
        end_date: endDate || startDate,
        start_time: startTime, 
        end_time: endTime,
        notes: notes || null,
        progress_tracking_enabled: progressTracking
      }).eq('id', session.id)
      if (error) throw error
      onSuccess()
    } catch (error) { alert('Failed to update: ' + error.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">Edit Class</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="input">
              <option value="">Select a topic</option>
              {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
              <option value="">Select audience</option>
              {AUDIENCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Client *</label>
            <select value={client} onChange={(e) => setClient(e.target.value)} className="input" required>
              <option value="">Select client</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" min={startDate} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={progressTracking} onChange={(e) => setProgressTracking(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-purple-600" />
              <span className="font-medium text-slate-800">Enable Progress Tracking</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add any additional notes..."
              className="input resize-none h-24" 
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportModal({ sessionId, sessionTopic, sessionDate, trainerName, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')

    try {
      const data = await parseImportFile(selectedFile)
      setParsedData(data)
    } catch (err) {
      setError(err.message)
      setParsedData([])
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setImporting(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const learner of parsedData) {
        try {
          await supabase.from('session_enrollments').insert({
            session_id: sessionId,
            learner_name: learner.name || null,
            learner_email: learner.email || null,
            learner_unique_id: learner.uniqueId || null,
            status: 'enrolled'
          })

          // Send notification if email provided
          if (learner.email) {
            await sendNotification(learner.email, learner.name || 'Learner', 'enrollment', {
              learnerName: learner.name || 'Learner',
              sessionTopic: sessionTopic,
              sessionDate: sessionDate,
              trainerName: trainerName
            }, sessionId)
          }

          successCount++
        } catch (err) {
          errorCount++
          console.error('Error importing learner:', err)
        }
      }

      alert(`Import complete! ${successCount} learners added, ${errorCount} errors.`)
      onSuccess()
    } catch (err) {
      setError('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">Bulk Import Learners</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800 mb-2">Upload a CSV or Excel file with learner information.</p>
            <p className="text-sm text-blue-600">Required columns: <strong>Name</strong>, <strong>Email</strong>, or <strong>ID</strong> (at least one)</p>
            <button onClick={downloadImportTemplate} className="mt-2 text-sm text-blue-700 font-medium underline">
              Download Template
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors mb-4"
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">{file ? file.name : 'Click to select file'}</p>
            <p className="text-sm text-slate-400 mt-1">CSV or Excel (.xlsx, .xls)</p>
          </button>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {parsedData.length > 0 && (
            <div>
              <h3 className="font-medium text-slate-800 mb-2">Preview ({parsedData.length} learners)</h3>
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-600">Name</th>
                      <th className="text-left p-2 font-medium text-slate-600">Email</th>
                      <th className="text-left p-2 font-medium text-slate-600">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.slice(0, 10).map((learner, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-slate-800">{learner.name || '-'}</td>
                        <td className="p-2 text-slate-600">{learner.email || '-'}</td>
                        <td className="p-2 text-slate-600">{learner.uniqueId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="text-center text-sm text-slate-500 py-2">...and {parsedData.length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button 
            onClick={handleImport} 
            disabled={parsedData.length === 0 || importing} 
            className="btn-primary flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : `Import ${parsedData.length} Learners`}
          </button>
        </div>
      </div>
    </div>
  )
}

function LearnerProgressModal({ learner, session, trainingDays, existingProgress, onClose, onUpdate }) {
  const [progressData, setProgressData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const initial = {}
    trainingDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const existing = existingProgress.find(p => p.progress_date === dateStr)
      initial[dateStr] = {
        participation: existing?.participation_score ?? '',
        accuracy: existing?.accuracy_score ?? '',
        productivity: existing?.productivity_score ?? '',
        notes: existing?.notes ?? ''
      }
    })
    setProgressData(initial)
  }, [trainingDays, existingProgress])

  const handleChange = (date, field, value) => {
    setProgressData(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: value }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [date, data] of Object.entries(progressData)) {
        const hasData = data.participation !== '' || data.accuracy !== '' || data.productivity !== '' || data.notes !== ''
        if (!hasData) continue

        const payload = {
          session_id: session.id,
          learner_id: learner.learner_id,
          progress_date: date,
          participation_score: data.participation !== '' ? parseInt(data.participation) : null,
          accuracy_score: data.accuracy !== '' ? parseInt(data.accuracy) : null,
          productivity_score: data.productivity !== '' ? parseInt(data.productivity) : null,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('learner_progress')
          .upsert(payload, { onConflict: 'session_id,learner_id,progress_date' })

        if (error) throw error
      }
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error saving progress:', error)
      alert('Failed to save progress: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getWeeklyAverages = () => {
    const weeks = {}
    Object.entries(progressData).forEach(([dateStr, data]) => {
      const date = parseISO(dateStr)
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd')
      if (!weeks[weekStart]) weeks[weekStart] = { participation: [], accuracy: [], productivity: [] }
      if (data.participation !== '') weeks[weekStart].participation.push(parseInt(data.participation))
      if (data.accuracy !== '') weeks[weekStart].accuracy.push(parseInt(data.accuracy))
      if (data.productivity !== '') weeks[weekStart].productivity.push(parseInt(data.productivity))
    })

    return Object.entries(weeks).map(([weekStart, data]) => ({
      week: weekStart,
      participation: data.participation.length > 0 ? Math.round(data.participation.reduce((a, b) => a + b, 0) / data.participation.length) : null,
      accuracy: data.accuracy.length > 0 ? Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length) : null,
      productivity: data.productivity.length > 0 ? Math.round(data.productivity.reduce((a, b) => a + b, 0) / data.productivity.length) : null,
    }))
  }

  const weeklyAverages = getWeeklyAverages()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-800">Progress Tracking</h2>
            <p className="text-sm text-slate-500">{learner.learner_name || learner.learner_email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {weeklyAverages.length > 0 && weeklyAverages.some(w => w.participation !== null || w.accuracy !== null || w.productivity !== null) && (
            <div className="mb-6">
              <h3 className="font-medium text-slate-800 mb-3">Weekly Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklyAverages.map((week, idx) => (
                  <div key={week.week} className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-700 mb-2">Week {idx + 1}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Participation</span>
                        <span className="font-medium text-orange-600">{week.participation !== null ? `${week.participation}%` : '--'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Accuracy</span>
                        <span className="font-medium text-blue-600">{week.accuracy !== null ? `${week.accuracy}%` : '--'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Productivity</span>
                        <span className="font-medium text-emerald-600">{week.productivity !== null ? `${week.productivity}%` : '--'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-medium text-slate-800 mb-3">Daily Scores</h3>
          <div className="space-y-4">
            {trainingDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const data = progressData[dateStr] || {}
              const isTodayDate = isToday(day)

              return (
                <div key={dateStr} className={`border rounded-xl p-4 ${isTodayDate ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200'}`}>
                  <h4 className="font-medium text-slate-800 mb-3">
                    {format(day, 'EEEE, MMMM d, yyyy')}
                    {isTodayDate && <span className="text-brand-600 ml-2">(Today)</span>}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Participation (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={data.participation}
                        onChange={(e) => handleChange(dateStr, 'participation', e.target.value)}
                        className="input"
                        placeholder="--"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Accuracy (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={data.accuracy}
                        onChange={(e) => handleChange(dateStr, 'accuracy', e.target.value)}
                        className="input"
                        placeholder="--"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Productivity (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={data.productivity}
                        onChange={(e) => handleChange(dateStr, 'productivity', e.target.value)}
                        className="input"
                        placeholder="--"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                    <textarea
                      value={data.notes}
                      onChange={(e) => handleChange(dateStr, 'notes', e.target.value)}
                      className="input resize-none h-16"
                      placeholder="Add notes for this day..."
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingTracker
