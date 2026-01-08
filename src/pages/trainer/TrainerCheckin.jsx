import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  UserCheck,
  Monitor,
  Video,
  Coffee,
  CheckCircle2,
  Clock,
  Users
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_OPTIONS = [
  { id: 'present', label: 'In Office', icon: UserCheck, color: 'emerald' },
  { id: 'remote', label: 'Remote', icon: Monitor, color: 'blue' },
  { id: 'in_session', label: 'In Session', icon: Video, color: 'purple' },
  { id: 'out', label: 'Out / Off', icon: Coffee, color: 'slate' },
]

function TrainerCheckin() {
  const { profile } = useAuth()
  const [todayStatus, setTodayStatus] = useState(null)
  const [notes, setNotes] = useState('')
  const [teamCheckins, setTeamCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCheckins()
  }, [profile])

  const fetchCheckins = async () => {
    if (!profile) return

    const today = new Date().toISOString().split('T')[0]

    try {
      // Get current user's check-in for today
      const { data: myCheckin } = await supabase
        .from('trainer_checkins')
        .select('*')
        .eq('trainer_id', profile.id)
        .eq('check_in_date', today)
        .single()

      if (myCheckin) {
        setTodayStatus(myCheckin.status)
        setNotes(myCheckin.notes || '')
      }

      // Get all trainer check-ins for today
      const { data: allCheckins } = await supabase
        .from('trainer_checkins')
        .select(`
          *,
          profiles (full_name, avatar_url)
        `)
        .eq('check_in_date', today)
        .order('checked_in_at', { ascending: false })

      setTeamCheckins(allCheckins || [])
    } catch (error) {
      // Single row not found is okay
      if (error.code !== 'PGRST116') {
        console.error('Error fetching check-ins:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (status) => {
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      const { error } = await supabase
        .from('trainer_checkins')
        .upsert({
          trainer_id: profile.id,
          check_in_date: today,
          status,
          notes: notes.trim() || null,
        }, {
          onConflict: 'trainer_id,check_in_date'
        })

      if (error) throw error

      setTodayStatus(status)
      fetchCheckins()
    } catch (error) {
      console.error('Error saving check-in:', error)
      alert('Failed to save check-in. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusConfig = (status) => {
    return STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0]
  }

  const getStatusColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
    }
    return colors[color] || colors.slate
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Daily Check-In
        </h1>
        <p className="text-slate-500">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Check-in card */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-800">
              {todayStatus ? 'Update Your Status' : 'Mark Your Attendance'}
            </h2>
            <p className="text-sm text-slate-500">
              Let your team know where you are today
            </p>
          </div>
        </div>

        {/* Status options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = todayStatus === option.id
            const Icon = option.icon

            return (
              <button
                key={option.id}
                onClick={() => handleCheckin(option.id)}
                disabled={saving}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? `${getStatusColorClasses(option.color)} border-current`
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />
                )}
                <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? '' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            )
          })}
        </div>

        {/* Notes input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Available for questions after 2pm, In training session until noon..."
            className="input resize-none h-20"
          />
          {todayStatus && (
            <button
              onClick={() => handleCheckin(todayStatus)}
              disabled={saving}
              className="btn-secondary mt-3"
            >
              {saving ? 'Saving...' : 'Update Notes'}
            </button>
          )}
        </div>
      </div>

      {/* Team status */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-800">
              Team Status
            </h2>
            <p className="text-sm text-slate-500">
              See who's available today
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : teamCheckins.length > 0 ? (
          <div className="space-y-3">
            {teamCheckins.map((checkin) => {
              const statusConfig = getStatusConfig(checkin.status)
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={checkin.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-50"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold">
                    {checkin.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {checkin.profiles?.full_name || 'Unknown'}
                      {checkin.trainer_id === profile?.id && (
                        <span className="text-slate-400 font-normal ml-2">(you)</span>
                      )}
                    </p>
                    {checkin.notes && (
                      <p className="text-sm text-slate-500 truncate">{checkin.notes}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusColorClasses(statusConfig.color)}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{statusConfig.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No one has checked in yet today</p>
            <p className="text-sm text-slate-400 mt-1">Be the first!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainerCheckin
