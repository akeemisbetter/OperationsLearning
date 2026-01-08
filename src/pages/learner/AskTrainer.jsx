import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { HelpCircle, Send, Plus, Clock, CheckCircle, X, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = [
  { id: 'claims', label: 'Claims Processing' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'provider_data', label: 'Provider Data' },
  { id: 'hrp_system', label: 'HRP System' },
  { id: 'general', label: 'General' },
]

function AskTrainer() {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [profile])

  const fetchQuestions = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('learner_questions')
        .select(`
          *,
          learner_question_responses (
            id,
            body,
            created_at,
            profiles:trainer_id (full_name)
          )
        `)
        .eq('learner_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryLabel = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId)?.label || 'General'
  }

  const getStatusIcon = (status) => {
    if (status === 'answered') return <CheckCircle className="w-5 h-5 text-emerald-500" />
    if (status === 'closed') return <CheckCircle className="w-5 h-5 text-slate-400" />
    return <Clock className="w-5 h-5 text-amber-500" />
  }

  const getStatusText = (status) => {
    if (status === 'answered') return 'Answered'
    if (status === 'closed') return 'Closed'
    return 'Awaiting Response'
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Ask a Trainer
          </h1>
          <p className="text-slate-500">
            Have a question? Our training team is here to help!
          </p>
        </div>
        <button
          onClick={() => setShowNewQuestion(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Question
        </button>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
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
                    <span className="badge badge-slate">
                      {getCategoryLabel(question.category)}
                    </span>
                    <span className={`${
                      question.status === 'answered' ? 'text-emerald-600' : 
                      question.status === 'closed' ? 'text-slate-400' : 'text-amber-600'
                    }`}>
                      {getStatusText(question.status)}
                    </span>
                    <span className="text-slate-400">
                      {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                    </span>
                    {question.learner_question_responses?.length > 0 && (
                      <span className="flex items-center gap-1 text-brand-600">
                        <MessageSquare className="w-4 h-4" />
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
          <h3 className="font-display font-semibold text-slate-800 mb-2">No questions yet</h3>
          <p className="text-slate-500 mb-4">Ask your first question to get help from our training team</p>
          <button onClick={() => setShowNewQuestion(true)} className="btn-primary">
            Ask a Question
          </button>
        </div>
      )}

      {/* New question modal */}
      {showNewQuestion && (
        <NewQuestionModal
          onClose={() => setShowNewQuestion(false)}
          onSubmit={() => {
            setShowNewQuestion(false)
            fetchQuestions()
          }}
          profile={profile}
        />
      )}

      {/* Question detail modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  )
}

function NewQuestionModal({ onClose, onSubmit, profile }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase.from('learner_questions').insert({
        learner_id: profile.id,
        subject: subject.trim(),
        body: body.trim(),
        category,
      })

      if (error) throw error
      onSubmit()
    } catch (error) {
      console.error('Error creating question:', error)
      alert('Failed to submit question. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            Ask a Question
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Question
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your question in detail..."
              className="input resize-none h-32"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              <Send className="w-4 h-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestionDetailModal({ question, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="flex-1 pr-4">
            <h2 className="font-display text-lg font-semibold text-slate-800 mb-2">
              {question.subject}
            </h2>
            <div className="text-sm text-slate-500">
              Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {/* Question */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-slate-700 whitespace-pre-wrap">{question.body}</p>
          </div>

          {/* Responses */}
          <h3 className="font-semibold text-slate-800 mb-4">
            Trainer Responses ({question.learner_question_responses?.length || 0})
          </h3>

          {question.learner_question_responses?.length > 0 ? (
            <div className="space-y-4">
              {question.learner_question_responses.map((response) => (
                <div key={response.id} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-slate-700 whitespace-pre-wrap mb-3">{response.body}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
                      {response.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <span>{response.profiles?.full_name || 'Trainer'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p>Waiting for a trainer to respond...</p>
              <p className="text-sm mt-1">You'll be notified when someone answers</p>
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

export default AskTrainer
