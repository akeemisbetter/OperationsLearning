import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Megaphone, Pin, Plus, X, Calendar } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

function Announcements() {
  const { profile, isTrainer } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [isTrainer])

  const fetchAnnouncements = async () => {
    try {
      let query = supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id (full_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      // Filter by audience
      if (!isTrainer) {
        query = query.or('audience.eq.all,audience.eq.learners')
      }

      const { data, error } = await query

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAudienceBadge = (audience) => {
    const badges = {
      all: { class: 'badge-slate', label: 'Everyone' },
      trainers: { class: 'badge-purple', label: 'Trainers Only' },
      learners: { class: 'badge-blue', label: 'Learners' },
    }
    return badges[audience] || badges.all
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Announcements
          </h1>
          <p className="text-slate-500">
            Stay updated with the latest news and updates
          </p>
        </div>
        {isTrainer && (
          <button
            onClick={() => setShowNewAnnouncement(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Announcement
          </button>
        )}
      </div>

      {/* Announcements list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const audienceBadge = getAudienceBadge(announcement.audience)
            return (
              <div
                key={announcement.id}
                className={`card p-6 ${announcement.is_pinned ? 'border-amber-200 bg-amber-50/30' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {announcement.is_pinned && (
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Pin className="w-4 h-4 text-amber-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-display font-semibold text-slate-800 text-lg">
                        {announcement.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <span>{announcement.profiles?.full_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${audienceBadge.class}`}>
                    {audienceBadge.label}
                  </span>
                </div>

                {/* Body */}
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 whitespace-pre-wrap">{announcement.body}</p>
                </div>

                {/* Footer */}
                {announcement.expires_at && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-slate-800 mb-2">No announcements</h3>
          <p className="text-slate-500">Check back later for updates</p>
        </div>
      )}

      {/* New announcement modal */}
      {showNewAnnouncement && (
        <NewAnnouncementModal
          onClose={() => setShowNewAnnouncement(false)}
          onSubmit={() => {
            setShowNewAnnouncement(false)
            fetchAnnouncements()
          }}
          profile={profile}
        />
      )}
    </div>
  )
}

function NewAnnouncementModal({ onClose, onSubmit, profile }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase.from('announcements').insert({
        author_id: profile.id,
        title: title.trim(),
        body: body.trim(),
        audience,
        is_pinned: isPinned,
      })

      if (error) throw error
      onSubmit()
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('Failed to create announcement. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            New Announcement
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
              placeholder="Announcement title"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement..."
              className="input resize-none h-32"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="input"
            >
              <option value="all">Everyone</option>
              <option value="trainers">Trainers Only</option>
              <option value="learners">Learners Only</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="font-medium text-slate-700">Pin this announcement</span>
              <p className="text-sm text-slate-500">Pinned announcements appear at the top</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Announcements
