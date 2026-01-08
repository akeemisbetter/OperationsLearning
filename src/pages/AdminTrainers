import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Search, Mail, Calendar, Award, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

function AdminTrainers() {
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTrainer, setSelectedTrainer] = useState(null)

  useEffect(() => {
    fetchTrainers()
  }, [])

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('full_name', { ascending: true })

      if (error) throw error

      // Fetch session counts for each trainer
      const trainersWithStats = await Promise.all(
        (data || []).map(async (trainer) => {
          const { count: sessionCount } = await supabase
            .from('training_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('trainer_id', trainer.id)
            .neq('status', 'cancelled')

          const { data: sessions } = await supabase
            .from('training_sessions')
            .select('session_enrollments(id)')
            .eq('trainer_id', trainer.id)

          const totalLearners = sessions?.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0) || 0

          return {
            ...trainer,
            sessionCount: sessionCount || 0,
            totalLearners
          }
        })
      )

      setTrainers(trainersWithStats)
    } catch (error) {
      console.error('Error fetching trainers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTrainers = trainers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800">Trainers</h1>
          <p className="text-slate-500">Manage all trainers in the system</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{trainers.length}</p>
          <p className="text-sm text-slate-500">Total Trainers</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {trainers.reduce((sum, t) => sum + t.sessionCount, 0)}
          </p>
          <p className="text-sm text-slate-500">Total Sessions</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {trainers.reduce((sum, t) => sum + t.totalLearners, 0)}
          </p>
          <p className="text-sm text-slate-500">Total Learners Trained</p>
        </div>
      </div>

      {/* Trainers List */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">
            All Trainers ({filteredTrainers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredTrainers.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredTrainers.map((trainer) => (
              <div
                key={trainer.id}
                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTrainer(selectedTrainer?.id === trainer.id ? null : trainer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-brand-600">
                        {trainer.full_name?.charAt(0) || 'T'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{trainer.full_name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {trainer.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-slate-800">{trainer.sessionCount}</p>
                      <p className="text-slate-500">Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800">{trainer.totalLearners}</p>
                      <p className="text-slate-500">Learners</p>
                    </div>
                  </div>
                </div>

                {selectedTrainer?.id === trainer.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Member Since</p>
                        <p className="font-medium text-slate-800">
                          {trainer.created_at ? format(new Date(trainer.created_at), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="font-medium text-slate-800">{trainer.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total Sessions</p>
                        <p className="font-medium text-slate-800">{trainer.sessionCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Learners Trained</p>
                        <p className="font-medium text-slate-800">{trainer.totalLearners}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No trainers found</h3>
            <p className="text-slate-500">
              {search ? 'Try a different search term' : 'No trainers registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTrainers
