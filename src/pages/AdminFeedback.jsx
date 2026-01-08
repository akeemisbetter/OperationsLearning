import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Star, Filter, ArrowLeft, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const TOPICS = {
  hrp_navigation: 'HRP Navigation',
  hr_answers_standard: 'HR Answers Standard',
  hr_answers_adhoc: 'HR Answers Adhoc',
  dlp_role_specific: 'DLP-Role Specific',
  learninglab: 'LearningLab',
  refresher: 'Refresher',
}

function AdminFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState('all')

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('anonymous_feedback')
        .select(`
          *,
          training_sessions (
            topic,
            client,
            session_date,
            profiles:trainer_id (full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeedback(data || [])
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFeedback = feedback.filter(f => {
    if (filterRating === 'all') return true
    if (filterRating === 'positive') return f.rating >= 4
    if (filterRating === 'neutral') return f.rating === 3
    if (filterRating === 'negative') return f.rating <= 2
    return true
  })

  const stats = {
    total: feedback.length,
    avgRating: feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
      : 0,
    avgTrainerRating: feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.trainer_rating || 0), 0) / feedback.filter(f => f.trainer_rating).length).toFixed(1)
      : 0,
    avgContentRating: feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.content_rating || 0), 0) / feedback.filter(f => f.content_rating).length).toFixed(1)
      : 0,
    wouldRecommend: feedback.filter(f => f.would_recommend).length,
    wouldNotRecommend: feedback.filter(f => f.would_recommend === false).length
  }

  const renderStars = (rating, size = 'w-4 h-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800">Anonymous Feedback</h1>
          <p className="text-slate-500">View learner feedback from completed trainings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-sm text-slate-500">Total Responses</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold text-slate-800">{stats.avgRating}</span>
          </div>
          <p className="text-sm text-slate-500">Avg Overall</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold text-slate-800">{stats.avgTrainerRating}</span>
          </div>
          <p className="text-sm text-slate-500">Avg Trainer</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold text-slate-800">{stats.avgContentRating}</span>
          </div>
          <p className="text-sm text-slate-500">Avg Content</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-green-600 font-bold">{stats.wouldRecommend}</span>
            <span className="text-slate-400">/</span>
            <span className="text-red-600 font-bold">{stats.wouldNotRecommend}</span>
          </div>
          <p className="text-sm text-slate-500">Would Recommend</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="input py-2 w-auto"
          >
            <option value="all">All Ratings</option>
            <option value="positive">Positive (4-5 stars)</option>
            <option value="neutral">Neutral (3 stars)</option>
            <option value="negative">Negative (1-2 stars)</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">
            Feedback ({filteredFeedback.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredFeedback.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredFeedback.map((fb) => (
              <div key={fb.id} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(fb.rating, 'w-5 h-5')}
                      <span className="text-sm text-slate-500">Overall</span>
                    </div>
                    {fb.training_sessions && (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">{TOPICS[fb.training_sessions.topic] || fb.training_sessions.topic}</span>
                        {fb.training_sessions.profiles?.full_name && (
                          <span className="text-slate-400"> • Trainer: {fb.training_sessions.profiles.full_name}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">
                      {format(new Date(fb.created_at), 'MMM d, yyyy')}
                    </p>
                    {fb.would_recommend !== null && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${fb.would_recommend ? 'text-green-600' : 'text-red-600'}`}>
                        {fb.would_recommend ? (
                          <>
                            <ThumbsUp className="w-4 h-4" />
                            Would recommend
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="w-4 h-4" />
                            Would not recommend
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Ratings */}
                <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Trainer</p>
                    {renderStars(fb.trainer_rating)}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Content</p>
                    {renderStars(fb.content_rating)}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Pace</p>
                    {renderStars(fb.pace_rating)}
                  </div>
                </div>

                {fb.feedback_text && (
                  <div className="mb-3">
                    <p className="text-sm text-slate-500 mb-1">Comments:</p>
                    <p className="text-slate-700">{fb.feedback_text}</p>
                  </div>
                )}

                {fb.improvements && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Suggested improvements:</span> {fb.improvements}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No feedback yet</h3>
            <p className="text-slate-500">Feedback will appear here after learners complete trainings</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminFeedback
