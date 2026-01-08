import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  MessageSquare,
  Plus,
  Search,
  Tag,
  CheckCircle2,
  Clock,
  Send,
  X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TAGS = ['claims', 'enrollment', 'provider_data', 'hrp_system', 'process', 'general']

function TrainerQABoard() {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [selectedTag])

  const fetchQuestions = async () => {
    try {
      let query = supabase
        .from('trainer_questions')
        .select(`
          *,
          profiles:author_id (full_name),
          trainer_answers (
            id,
            body,
            is_accepted,
            created_at,
            profiles:author_id (full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (selectedTag) {
        query = query.contains('tags', [selectedTag])
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

  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.body.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Team Q&A Board
          </h1>
          <p className="text-slate-500">
            Share knowledge and get answers from your team
          </p>
        </div>
        <button
          onClick={() => setShowNewQuestion(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ask Question
        </button>
      </div>

      {/* Search and filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="input pl-12"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`badge ${!selectedTag ? 'bg-brand-100 text-brand-700' : 'badge-slate'} cursor-pointer`}
            >
              All
            </button>
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`badge ${tag === selectedTag ? 'bg-brand-100 text-brand-700' : 'badge-slate'} cursor-pointer capitalize`}
              >
                {tag.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filteredQuestions.length > 0 ? (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onClick={() => setSelectedQuestion(question)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-slate-800 mb-2">No questions yet</h3>
          <p className="text-slate-500 mb-4">Be the first to ask a question!</p>
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
          onUpdate={fetchQuestions}
          profile={profile}
        />
      )}
    </div>
  )
}

function QuestionCard({ question, onClick }) {
  const answerCount = question.trainer_answers?.length || 0
  const hasAcceptedAnswer = question.trainer_answers?.some(a => a.is_accepted)

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:border-brand-200 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
          hasAcceptedAnswer ? 'bg-emerald-100' : question.is_resolved ? 'bg-slate-100' : 'bg-brand-50'
        }`}>
          {hasAcceptedAnswer ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <>
              <span className={`text-lg font-bold ${question.is_resolved ? 'text-slate-600' : 'text-brand-600'}`}>
                {answerCount}
              </span>
              <span className="text-xs text-slate-500">
                {answerCount === 1 ? 'answer' : 'answers'}
              </span>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-1 line-clamp-1">
            {question.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">
            {question.body}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {question.tags?.map(tag => (
              <span key={tag} className="badge badge-slate text-xs capitalize">
                {tag.replace('_', ' ')}
              </span>
            ))}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
            </span>
            <span className="text-xs text-slate-400">
              by {question.profiles?.full_name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewQuestionModal({ onClose, onSubmit, profile }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase.from('trainer_questions').insert({
        author_id: profile.id,
        title: title.trim(),
        body: body.trim(),
        tags,
      })

      if (error) throw error
      onSubmit()
    } catch (error) {
      console.error('Error creating question:', error)
      alert('Failed to post question. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (tag) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
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
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question?"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Details
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide more context..."
              className="input resize-none h-32"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 flex-wrap">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`badge cursor-pointer capitalize ${
                    tags.includes(tag) ? 'bg-brand-100 text-brand-700' : 'badge-slate'
                  }`}
                >
                  {tag.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestionDetailModal({ question, onClose, onUpdate, profile }) {
  const [newAnswer, setNewAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!newAnswer.trim()) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('trainer_answers').insert({
        question_id: question.id,
        author_id: profile.id,
        body: newAnswer.trim(),
      })

      if (error) throw error
      setNewAnswer('')
      onUpdate()
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('Failed to submit answer. Please try again.')
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
              {question.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Asked by {question.profiles?.full_name}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {/* Question body */}
          <div className="prose prose-slate max-w-none mb-6">
            <p className="text-slate-700 whitespace-pre-wrap">{question.body}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mb-6">
            {question.tags?.map(tag => (
              <span key={tag} className="badge badge-slate capitalize">
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>

          {/* Answers */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              {question.trainer_answers?.length || 0} Answers
            </h3>

            {question.trainer_answers?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {question.trainer_answers.map(answer => (
                  <div
                    key={answer.id}
                    className={`p-4 rounded-xl ${
                      answer.is_accepted ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'
                    }`}
                  >
                    {answer.is_accepted && (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Accepted Answer
                      </div>
                    )}
                    <p className="text-slate-700 whitespace-pre-wrap mb-3">{answer.body}</p>
                    <div className="text-sm text-slate-500">
                      {answer.profiles?.full_name} • {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 mb-6">No answers yet. Be the first to help!</p>
            )}

            {/* Add answer */}
            <form onSubmit={handleSubmitAnswer}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Answer
              </label>
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Share your knowledge..."
                className="input resize-none h-24 mb-3"
                required
              />
              <button type="submit" disabled={submitting} className="btn-primary">
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainerQABoard
