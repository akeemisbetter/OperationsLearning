import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { HelpCircle, Send, CheckCircle, Clock, Filter, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function LearnerQuestions() {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [filter])

  const fetchQuestions = async () => {
    try {
      let query = supabase
        .from('learner_questions')
        .select(`
          *,
          profiles:learner_id (full_name),
          learner_question_responses (
            id,
            body,
            created_at,
            profiles:trainer_id (full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      claims: 'badge-blue',
      enrollment: 'badge-green',
      provider_data: 'badge-amber',
      hrp_system: 'badge-purple',
      general: 'badge-slate',
    }
    return colors[category] || 'badge-slate'
  }

  const getStatusIcon = (status) => {
    if (status === 'answered') return <CheckCircle className="w-5 h-5 text-emerald-500" />
    if (status === 'closed') return <CheckCircle className="w-5 h-5 text-slate-400" />
    return <Clock className="w-5 h-5 text-amber-500" />
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Learner Questions
        </h1>
        <p className="text-slate-500">
          Help learners by answering their questions
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-600 mr-2">Status:</span>
          {['all', 'open', 'answered', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`badge cursor-pointer capitalize ${
                filter === status ? 'bg-brand-100 text-brand-700' : 'badge-slate'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              onClick={() => setSelectedQuestion(question)}
              className="card p-5 cursor-pointer hover:border-brand-200 transition-all"
            >
              <div className="flex items-start gap-4">
                {getStatusIcon(question.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 mb-1">{question.subject}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{question.body}</p>
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span className={`badge ${getCategoryColor(question.category)}`}>
                      {question.category?.replace('_', ' ') || 'General'}
                    </span>
                    <span className="text-slate-400">
                      from {question.profiles?.full_name}
                    </span>
                    <span className="text-slate-400">
                      {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                    </span>
                    {question.learner_question_responses?.length > 0 && (
                      <span className="text-emerald-600">
                        {question.learner_question_responses.length} response(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-slate-800 mb-2">No questions</h3>
          <p className="text-slate-500">No {filter !== 'all' ? filter : ''} questions at the moment</p>
        </div>
      )}

      {/* Question detail modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onUpdate={fetchQuestions}
          profile={profile}
        />
      )}
    </div>
  )
}

function QuestionDetailModal({ question, onClose, onUpdate, profile }) {
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!response.trim()) return

    setSubmitting(true)
    try {
      // Add response
      const { error: responseError } = await supabase
        .from('learner_question_responses')
        .insert({
          question_id: question.id,
          trainer_id: profile.id,
          body: response.trim(),
        })

      if (responseError) throw responseError

      // Update question status
      const { error: updateError } = await supabase
        .from('learner_questions')
        .update({ status: 'answered' })
        .eq('id', question.id)

      if (updateError) throw updateError

      setResponse('')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('Failed to submit response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="flex-1 pr-4">
            <h2 className="font-display text-lg font-semibold text-slate-800 mb-2">
              {question.subject}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>From {question.profiles?.full_name}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-slate-700 whitespace-pre-wrap">{question.body}</p>
          </div>

          {/* Existing responses */}
          {question.learner_question_responses?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800 mb-3">Previous Responses</h3>
              <div className="space-y-3">
                {question.learner_question_responses.map((resp) => (
                  <div key={resp.id} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-slate-700 whitespace-pre-wrap mb-2">{resp.body}</p>
                    <p className="text-sm text-slate-500">
                      {resp.profiles?.full_name} • {formatDistanceToNow(new Date(resp.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add response */}
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Response
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Provide a helpful answer..."
              className="input resize-none h-32 mb-3"
              required
            />
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LearnerQuestions
