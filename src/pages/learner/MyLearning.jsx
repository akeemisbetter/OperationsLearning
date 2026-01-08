import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  GraduationCap, BookOpen, Calendar, Clock, CheckCircle2, 
  XCircle, ArrowLeft, MessageSquare, User, Lock, Globe,
  ChevronRight, TrendingUp, BarChart3, AlertTriangle, Award, Download,
  Star, Send
} from 'lucide-react'
import { format, eachDayOfInterval, parseISO, isBefore, isToday, startOfWeek } from 'date-fns'
import { downloadCertificate } from '../../lib/certificateGenerator'

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

function MyLearning() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [feedbackSubmissions, setFeedbackSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackSession, setFeedbackSession] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchEnrollments()
      fetchCertificates()
      fetchFeedbackSubmissions()
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
            client,
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

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          training_sessions (
            id,
            topic,
            client,
            profiles:trainer_id (full_name)
          )
        `)
        .eq('learner_id', profile.id)
        .order('issued_at', { ascending: false })

      if (error) throw error
      setCertificates(data || [])
    } catch (error) {
      console.error('Error fetching certificates:', error)
    }
  }

  const fetchFeedbackSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('session_id')
        .eq('learner_id', profile.id)

      if (error) throw error
      setFeedbackSubmissions(data?.map(f => f.session_id) || [])
    } catch (error) {
      console.error('Error fetching feedback submissions:', error)
    }
  }

  const handleDownloadCertificate = (cert) => {
    downloadCertificate({
      learnerName: cert.learner_name || profile.full_name || 'Learner',
      sessionTopic: TOPICS[cert.training_sessions?.topic] || cert.training_sessions?.topic || 'Training',
      trainerName: cert.training_sessions?.profiles?.full_name || 'Trainer',
      completionDate: format(new Date(cert.issued_at), 'MMMM d, yyyy'),
      certificateNumber: cert.certificate_number,
      clientName: CLIENTS[cert.training_sessions?.client] || cert.training_sessions?.client || ''
    })
  }

  const openFeedbackModal = (session) => {
    setFeedbackSession(session)
    setShowFeedbackModal(true)
  }

  const handleFeedbackSubmitted = () => {
    setShowFeedbackModal(false)
    setFeedbackSession(null)
    fetchFeedbackSubmissions()
  }

  const hasFeedbackSubmitted = (sessionId) => feedbackSubmissions.includes(sessionId)

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
        <StatCard icon={Award} value={certificates.length} label="Certificates" color="purple" />
        <StatCard icon={Clock} value="--" label="Hours Learned" color="amber" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'active' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({activeEnrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'completed' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed ({pastEnrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'certificates' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Certificates ({certificates.length})
        </button>
        {cancelledEnrollments.length > 0 && (
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
      ) : activeTab === 'certificates' ? (
        // Certificates Tab
        <div className="space-y-4">
          {certificates.length > 0 ? (
            certificates.map((cert) => (
              <div key={cert.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Award className="w-7 h-7 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {TOPICS[cert.training_sessions?.topic] || cert.training_sessions?.topic || 'Training'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Issued on {format(new Date(cert.issued_at), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Certificate No: {cert.certificate_number}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadCertificate(cert)}
                    className="btn-primary text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card p-12 text-center">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-slate-800 mb-2">
                No certificates yet
              </h3>
              <p className="text-slate-500">
                Complete your trainings to earn certificates
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'completed' ? (
        // Completed Tab with Feedback Option
        <div className="space-y-4">
          {pastEnrollments.length > 0 ? (
            pastEnrollments.map((enrollment) => (
              <TrainingCard
                key={enrollment.id}
                enrollment={enrollment}
                onClick={() => setSelectedTraining(enrollment)}
                showFeedback={true}
                hasFeedback={hasFeedbackSubmitted(enrollment.training_sessions.id)}
                onFeedbackClick={() => openFeedbackModal(enrollment.training_sessions)}
              />
            ))
          ) : (
            <div className="card p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-slate-800 mb-2">
                No completed trainings
              </h3>
              <p className="text-slate-500">
                Your completed trainings will appear here
              </p>
            </div>
          )}
        </div>
      ) : (
        // Active/Cancelled Tabs
        <div className="space-y-4">
          {(activeTab === 'active' ? activeEnrollments : cancelledEnrollments).length > 0 ? (
            (activeTab === 'active' ? activeEnrollments : cancelledEnrollments).map((enrollment) => (
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
                {activeTab === 'active' ? 'No active trainings' : 'No cancelled trainings'}
              </h3>
              <p className="text-slate-500">
                {activeTab === 'active' && 'You will see trainings here once a trainer enrolls you'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackSession && (
        <FeedbackModal
          session={feedbackSession}
          learnerId={profile.id}
          onClose={() => setShowFeedbackModal(false)}
          onSubmitted={handleFeedbackSubmitted}
        />
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

function TrainingCard({ enrollment, onClick, showFeedback, hasFeedback, onFeedbackClick }) {
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
    <div className={`card p-5 ${isCancelled ? 'opacity-60' : ''}`}>
      <div
        onClick={onClick}
        className="cursor-pointer hover:bg-slate-50 -m-5 p-5 rounded-2xl transition-colors"
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

      {/* Feedback Section for Completed Trainings */}
      {showFeedback && !isCancelled && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {hasFeedback ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Feedback submitted - Thank you!</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFeedbackClick()
              }}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <Star className="w-4 h-4" />
              Leave Anonymous Feedback
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FeedbackModal({ session, learnerId, onClose, onSubmitted }) {
  const [overallRating, setOverallRating] = useState(0)
  const [trainerRating, setTrainerRating] = useState(0)
  const [contentRating, setContentRating] = useState(0)
  const [paceRating, setPaceRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [improvements, setImprovements] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (overallRating === 0) {
      alert('Please provide an overall rating')
      return
    }

    setSubmitting(true)
    try {
      // Submit anonymous feedback
      const { error: feedbackError } = await supabase
        .from('anonymous_feedback')
        .insert({
          session_id: session.id,
          rating: overallRating,
          trainer_rating: trainerRating || null,
          content_rating: contentRating || null,
          pace_rating: paceRating || null,
          feedback_text: feedbackText || null,
          improvements: improvements || null,
          would_recommend: wouldRecommend
        })

      if (feedbackError) throw feedbackError

      // Record that this user submitted feedback (to prevent duplicates)
      const { error: submissionError } = await supabase
        .from('feedback_submissions')
        .insert({
          session_id: session.id,
          learner_id: learnerId
        })

      if (submissionError) throw submissionError

      onSubmitted()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ value, onChange, label }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            Training Feedback
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {TOPICS[session.topic] || session.topic}
          </p>
        </div>

        <div className="p-5">
          {/* Anonymous Notice */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Your feedback is anonymous.</strong> Your responses help us improve our training programs. Only administrators can view this feedback.
            </p>
          </div>

          {/* Overall Rating */}
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            label="Overall Experience *"
          />

          {/* Trainer Rating */}
          <StarRating
            value={trainerRating}
            onChange={setTrainerRating}
            label="Trainer Effectiveness"
          />

          {/* Content Rating */}
          <StarRating
            value={contentRating}
            onChange={setContentRating}
            label="Content Quality"
          />

          {/* Pace Rating */}
          <StarRating
            value={paceRating}
            onChange={setPaceRating}
            label="Training Pace"
          />

          {/* Would Recommend */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Would you recommend this training?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
                  wouldRecommend === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
                  wouldRecommend === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <XCircle className="w-5 h-5" />
                No
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Comments
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your thoughts about the training..."
              className="input resize-none h-24"
            />
          </div>

          {/* Improvements */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Suggestions for Improvement
            </label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="What could be improved?"
              className="input resize-none h-20"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || overallRating === 0}
              className="btn-primary flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
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
  const [certificate, setCertificate] = useState(null)
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

      // Fetch certificate
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('session_id', session.id)
        .eq('learner_id', profile.id)
        .single()

      setCertificate(certData || null)
    } catch (error) {
      console.error('Error fetching training data:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
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

  const handleDownloadCertificate = () => {
    if (!certificate) return

    downloadCertificate({
      learnerName: certificate.learner_name || profile.full_name || 'Learner',
      sessionTopic: TOPICS[session.topic] || session.topic || 'Training',
      trainerName: session.profiles?.full_name || 'Trainer',
      completionDate: format(new Date(certificate.issued_at), 'MMMM d, yyyy'),
      certificateNumber: certificate.certificate_number,
      clientName: CLIENTS[session.client] || session.client || ''
    })
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

      {/* Certificate Banner */}
      {certificate && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">You have a certificate!</p>
              <p className="text-sm text-purple-600">Certificate No: {certificate.certificate_number}</p>
            </div>
          </div>
          <button onClick={handleDownloadCertificate} className="btn-primary text-sm bg-purple-600 hover:bg-purple-700">
            <Download className="w-4 h-4 mr-2" />Download Certificate
          </button>
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

                  {certificate && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h3 className="font-medium text-slate-800 mb-3">Certificate</h3>
                      <div className="bg-purple-50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Award className="w-8 h-8 text-purple-600" />
                          <div>
                            <p className="font-medium text-purple-800">Certificate of Completion</p>
                            <p className="text-sm text-purple-600">Issued: {format(new Date(certificate.issued_at), 'MMMM d, yyyy')}</p>
                          </div>
                        </div>
                        <button onClick={handleDownloadCertificate} className="btn-secondary text-sm">
                          <Download className="w-4 h-4 mr-1" />Download
                        </button>
                      </div>
                    </div>
                  )}
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
