import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { GraduationCap, BookOpen, Award, Clock, CheckCircle2, Play, Lock } from 'lucide-react'

function MyLearning() {
  const { profile } = useAuth()
  const [trainings, setTrainings] = useState([])
  const [progress, setProgress] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('courses')

  useEffect(() => {
    fetchLearningData()
  }, [profile])

  const fetchLearningData = async () => {
    if (!profile) return

    try {
      // Fetch all trainings
      const { data: trainingsData } = await supabase
        .from('trainings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Fetch user progress
      const { data: progressData } = await supabase
        .from('learner_progress')
        .select('*')
        .eq('learner_id', profile.id)

      // Fetch user badges
      const { data: badgesData } = await supabase
        .from('learner_badges')
        .select(`
          *,
          badges (name, description, icon)
        `)
        .eq('learner_id', profile.id)

      setTrainings(trainingsData || [])
      setProgress(progressData || [])
      setBadges(badgesData || [])
    } catch (error) {
      console.error('Error fetching learning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrainingProgress = (trainingId) => {
    return progress.find(p => p.training_id === trainingId)
  }

  const getCategoryColor = (category) => {
    const colors = {
      claims: 'bg-blue-100 text-blue-700',
      enrollment: 'bg-emerald-100 text-emerald-700',
      provider_data: 'bg-amber-100 text-amber-700',
      hrp_system: 'bg-purple-100 text-purple-700',
      general: 'bg-slate-100 text-slate-700',
    }
    return colors[category] || 'bg-slate-100 text-slate-700'
  }

  const stats = {
    total: trainings.length,
    completed: progress.filter(p => p.status === 'completed').length,
    inProgress: progress.filter(p => p.status === 'in_progress').length,
    badges: badges.length,
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          My Learning
        </h1>
        <p className="text-slate-500">
          Track your progress and continue your learning journey
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} value={stats.total} label="Available Courses" color="brand" />
        <StatCard icon={CheckCircle2} value={stats.completed} label="Completed" color="emerald" />
        <StatCard icon={Clock} value={stats.inProgress} label="In Progress" color="amber" />
        <StatCard icon={Award} value={stats.badges} label="Badges Earned" color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'courses' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'badges' ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Badges
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-48 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : activeTab === 'courses' ? (
        trainings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainings.map((training) => {
              const progressData = getTrainingProgress(training.id)
              return (
                <CourseCard
                  key={training.id}
                  training={training}
                  progress={progressData}
                  categoryColor={getCategoryColor(training.category)}
                />
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="No courses available"
            description="Check back later for new training opportunities"
          />
        )
      ) : badges.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{badge.badges?.name}</h3>
              <p className="text-sm text-slate-500">{badge.badges?.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Award}
          title="No badges yet"
          description="Complete courses to earn badges!"
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

function CourseCard({ training, progress, categoryColor }) {
  const getStatusBadge = () => {
    if (!progress) return null
    if (progress.status === 'completed') {
      return (
        <span className="badge bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
        </span>
      )
    }
    if (progress.status === 'in_progress') {
      return (
        <span className="badge bg-amber-100 text-amber-700">
          <Clock className="w-3 h-3 mr-1" /> In Progress
        </span>
      )
    }
    return null
  }

  const getActionButton = () => {
    if (!progress || progress.status === 'not_started') {
      return (
        <button className="btn-primary w-full mt-4">
          <Play className="w-4 h-4 mr-2" /> Start Course
        </button>
      )
    }
    if (progress.status === 'in_progress') {
      return (
        <button className="btn-primary w-full mt-4">
          <Play className="w-4 h-4 mr-2" /> Continue
        </button>
      )
    }
    return (
      <button className="btn-secondary w-full mt-4">
        <BookOpen className="w-4 h-4 mr-2" /> Review
      </button>
    )
  }

  return (
    <div className="card p-5 hover:border-brand-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`badge ${categoryColor} capitalize`}>
          {training.category?.replace('_', ' ')}
        </span>
        {getStatusBadge()}
      </div>
      <h3 className="font-semibold text-slate-800 mb-2">{training.title}</h3>
      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{training.description}</p>
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {training.duration_minutes || 30} min
        </span>
        <span className="capitalize">{training.training_type?.replace('_', '-')}</span>
      </div>
      {getActionButton()}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="card p-12 text-center">
      <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h3 className="font-display font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}

export default MyLearning
