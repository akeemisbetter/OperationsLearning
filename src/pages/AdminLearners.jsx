import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Search, Mail, Award, BookOpen, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

function AdminLearners() {
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLearner, setSelectedLearner] = useState(null)

  useEffect(() => {
    fetchLearners()
  }, [])

  const fetchLearners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'learner')
        .order('full_name', { ascending: true })

      if (error) throw error

      // Fetch stats for each learner
      const learnersWithStats = await Promise.all(
        (data || []).map(async (learner) => {
          const { count: enrollmentCount } = await supabase
            .from('session_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('learner_id', learner.id)

          const { count: certificateCount } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('learner_id', learner.id)

          const { data: enrollments } = await supabase
            .from('session_enrollments')
            .select('status')
            .eq('learner_id', learner.id)

          const completedCount = enrollments?.filter(e => e.status === 'attended').length || 0

          return {
            ...learner,
            enrollmentCount: enrollmentCount || 0,
            certificateCount: certificateCount || 0,
            completedCount
          }
        })
      )

      setLearners(learnersWithStats)
    } catch (error) {
      console.error('Error fetching learners:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLearners = learners.filter(l =>
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800">Learners</h1>
          <p className="text-slate-500">Manage all learners in the system</p>
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
            placeholder="Search learners..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{learners.length}</p>
          <p className="text-sm text-slate-500">Total Learners</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {learners.reduce((sum, l) => sum + l.completedCount, 0)}
          </p>
          <p className="text-sm text-slate-500">Trainings Completed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {learners.reduce((sum, l) => sum + l.certificateCount, 0)}
          </p>
          <p className="text-sm text-slate-500">Certificates Issued</p>
        </div>
      </div>

      {/* Learners List */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-display font-semibold text-slate-800">
            All Learners ({filteredLearners.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredLearners.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredLearners.map((learner) => (
              <div
                key={learner.id}
                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLearner(selectedLearner?.id === learner.id ? null : learner)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-emerald-600">
                        {learner.full_name?.charAt(0) || 'L'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{learner.full_name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {learner.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-slate-800">{learner.enrollmentCount}</p>
                      <p className="text-slate-500">Enrolled</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800">{learner.completedCount}</p>
                      <p className="text-slate-500">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800">{learner.certificateCount}</p>
                      <p className="text-slate-500">Certificates</p>
                    </div>
                  </div>
                </div>

                {selectedLearner?.id === learner.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Member Since</p>
                        <p className="font-medium text-slate-800">
                          {learner.created_at ? format(new Date(learner.created_at), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="font-medium text-slate-800">{learner.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total Enrollments</p>
                        <p className="font-medium text-slate-800">{learner.enrollmentCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Completion Rate</p>
                        <p className="font-medium text-slate-800">
                          {learner.enrollmentCount > 0
                            ? Math.round((learner.completedCount / learner.enrollmentCount) * 100)
                            : 0}%
                        </p>
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
            <h3 className="font-display font-semibold text-slate-800 mb-2">No learners found</h3>
            <p className="text-slate-500">
              {search ? 'Try a different search term' : 'No learners registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminLearners
