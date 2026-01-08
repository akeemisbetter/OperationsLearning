import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Users 
} from 'lucide-react'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, parseISO, addMonths, subMonths, isWithinInterval
} from 'date-fns'

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

function TrainingCalendar() {
  const { profile, isTrainer } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchSessions()
    }
  }, [profile, currentDate])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      if (isTrainer) {
        // Trainers see their own sessions (excluding cancelled)
        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('trainer_id', profile.id)
          .neq('status', 'cancelled')
          .or(`session_date.gte.${format(monthStart, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`)
          .lte('session_date', format(monthEnd, 'yyyy-MM-dd'))
          .order('session_date', { ascending: true })

        if (error) throw error
        setSessions(data || [])
      } else {
        // Learners see sessions they are enrolled in (excluding cancelled)
        const { data: enrollments, error } = await supabase
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
              status,
              trainer_id,
              profiles:trainer_id (full_name)
            )
          `)
          .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

        if (error) throw error

        // Filter: not cancelled (session or enrollment), within date range
        const filteredSessions = (enrollments || [])
          .filter(e => {
            if (!e.training_sessions) return false
            if (e.training_sessions.status === 'cancelled') return false
            if (e.status === 'cancelled') return false
            return true
          })
          .map(e => e.training_sessions)
          .filter(s => {
            const sessionStart = parseISO(s.session_date)
            const sessionEnd = s.end_date ? parseISO(s.end_date) : sessionStart
            // Check if session overlaps with current month
            return (
              isWithinInterval(sessionStart, { start: monthStart, end: monthEnd }) ||
              isWithinInterval(sessionEnd, { start: monthStart, end: monthEnd }) ||
              (sessionStart <= monthStart && sessionEnd >= monthEnd)
            )
          })

        setSessions(filteredSessions)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  const getSessionsForDay = (day) => {
    return sessions.filter(session => {
      const sessionStart = parseISO(session.session_date)
      const sessionEnd = session.end_date ? parseISO(session.end_date) : sessionStart
      return isWithinInterval(day, { start: sessionStart, end: sessionEnd }) || isSameDay(day, sessionStart)
    })
  }

  const firstDayOfMonth = startOfMonth(currentDate).getDay()
  const emptyDays = Array(firstDayOfMonth).fill(null)

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Training Calendar
          </h1>
          <p className="text-slate-500">
            {isTrainer ? 'View your scheduled training classes' : 'View your enrolled training sessions'}
          </p>
        </div>
      </div>

      {/* Calendar header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="font-display text-xl font-semibold text-slate-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="h-24 bg-slate-50 rounded-lg" />
            ))}
            {days.map(day => {
              const daySessions = getSessionsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentDate)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => daySessions.length > 0 && setSelectedDay(day)}
                  className={`h-24 p-2 rounded-lg border transition-all ${
                    isToday ? 'border-brand-300 bg-brand-50' : 'border-slate-100 bg-white'
                  } ${
                    !isCurrentMonth ? 'opacity-50' : ''
                  } ${
                    daySessions.length > 0 ? 'cursor-pointer hover:border-brand-300' : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-brand-600' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {daySessions.slice(0, 2).map((session, idx) => (
                    <div
                      key={session.id + idx}
                      className="text-xs px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 truncate mb-0.5"
                    >
                      {TOPICS[session.topic] || session.topic}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="text-xs text-slate-500">
                      +{daySessions.length - 2} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-800">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            {getSessionsForDay(selectedDay).map(session => (
              <div key={session.id} className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-800 mb-2">
                  {TOPICS[session.topic] || session.topic}
                </h4>
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </span>
                  {session.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {session.location}
                    </span>
                  )}
                  {session.profiles?.full_name && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {session.profiles.full_name}
                    </span>
                  )}
                </div>
                {session.end_date && session.end_date !== session.session_date && (
                  <div className="mt-2 text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Multi-day: {format(parseISO(session.session_date), 'MMM d')} - {format(parseISO(session.end_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingCalendar
