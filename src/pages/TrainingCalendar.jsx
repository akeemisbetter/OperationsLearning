import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'

// Helper to format time in 12-hour format
const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD'
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}

const TOPICS = {
  hrp_navigation: 'HRP Navigation',
  hr_answers_standard: 'HR Answers Standard',
  hr_answers_adhoc: 'HR Answers Adhoc',
  dlp_role_specific: 'DLP-Role Specific',
  learninglab: 'LearningLab',
  refresher: 'Refresher',
}

function TrainingCalendar() {
  const { profile, isTrainer } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    if (profile) {
      fetchSessions()
    }
  }, [currentMonth, profile])

  const fetchSessions = async () => {
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      if (isTrainer) {
        // Trainers see sessions they created
        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('trainer_id', profile.id)
          .gte('session_date', format(start, 'yyyy-MM-dd'))
          .lte('session_date', format(end, 'yyyy-MM-dd'))
          .order('session_date', { ascending: true })

        if (error) throw error
        setSessions(data || [])
      } else {
        // Learners see sessions they are enrolled in
        const { data: enrollments, error } = await supabase
          .from('session_enrollments')
          .select(`
            session_id,
            training_sessions (
              id,
              topic,
              audience,
              session_date,
              end_date,
              start_time,
              end_time,
              location,
              status
            )
          `)
          .or(`learner_id.eq.${profile.id},learner_email.eq.${profile.email}`)

        if (error) throw error

        // Filter for this month and flatten
        const filteredSessions = enrollments
          ?.map(e => e.training_sessions)
          ?.filter(s => {
            if (!s) return false
            const sessionDate = new Date(s.session_date)
            return sessionDate >= start && sessionDate <= end
          }) || []

        setSessions(filteredSessions)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const getSessionsForDate = (date) => {
    return sessions.filter(s => isSameDay(new Date(s.session_date), date))
  }

  const selectedSessions = getSessionsForDate(selectedDate)

  const getTopicLabel = (topic) => TOPICS[topic] || topic || 'Training Session'

  const getAudienceColor = (audience) => {
    if (audience === 'internal') return 'bg-blue-500'
    if (audience === 'external') return 'bg-emerald-500'
    return 'bg-slate-500'
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Training Calendar
        </h1>
        <p className="text-slate-500">
          {isTrainer 
            ? 'View your scheduled training classes' 
            : 'View training sessions you are enrolled in'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-slate-800">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const daySessions = getSessionsForDate(day)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-1 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-brand-100 ring-2 ring-brand-500'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-brand-600' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {daySessions.length > 0 && (
                    <div className="flex gap-0.5 justify-center flex-wrap">
                      {daySessions.slice(0, 3).map((session, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${getAudienceColor(session.audience)}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-slate-600">Internal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-600">External</span>
            </div>
          </div>
        </div>

        {/* Selected date sessions */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-slate-800 mb-4">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : selectedSessions.length > 0 ? (
            <div className="space-y-3">
              {selectedSessions.map((session) => {
                const startDate = parseISO(session.session_date)
                const endDate = session.end_date ? parseISO(session.end_date) : null
                const isMultiDay = endDate && session.end_date !== session.session_date

                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-brand-200 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${getAudienceColor(session.audience)} mb-2`} />
                    <h4 className="font-medium text-slate-800 mb-2">
                      {getTopicLabel(session.topic)}
                    </h4>
                    <div className="space-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </div>
                      {isMultiDay && (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                        </div>
                      )}
                      {session.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {session.location}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No sessions scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainingCalendar
