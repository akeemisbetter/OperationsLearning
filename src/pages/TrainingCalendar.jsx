import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'

function TrainingCalendar() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    fetchSessions()
  }, [currentMonth])

  const fetchSessions = async () => {
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          trainings (title, category, duration_minutes),
          profiles:trainer_id (full_name)
        `)
        .gte('session_date', format(start, 'yyyy-MM-dd'))
        .lte('session_date', format(end, 'yyyy-MM-dd'))
        .order('session_date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
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

  const getCategoryColor = (category) => {
    const colors = {
      claims: 'bg-blue-500',
      enrollment: 'bg-emerald-500',
      provider_data: 'bg-amber-500',
      hrp_system: 'bg-purple-500',
      general: 'bg-slate-500',
    }
    return colors[category] || 'bg-slate-500'
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Training Calendar
        </h1>
        <p className="text-slate-500">
          View and enroll in upcoming training sessions
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
                          className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(session.trainings?.category)}`}
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
            {[
              { color: 'bg-blue-500', label: 'Claims' },
              { color: 'bg-emerald-500', label: 'Enrollment' },
              { color: 'bg-amber-500', label: 'Provider Data' },
              { color: 'bg-purple-500', label: 'HRP System' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-slate-600">{item.label}</span>
              </div>
            ))}
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
              {selectedSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-brand-200 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(session.trainings?.category)} mb-2`} />
                  <h4 className="font-medium text-slate-800 mb-2">
                    {session.trainings?.title}
                  </h4>
                  <div className="space-y-1 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5) || 'TBD'}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {session.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {session.profiles?.full_name || 'TBD'}
                    </div>
                  </div>
                  <button className="btn-primary w-full mt-4 text-sm py-2">
                    Enroll
                  </button>
                </div>
              ))}
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
