import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { FolderOpen, FileText, Download, Search, Filter, ExternalLink } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All Resources' },
  { id: 'claims', label: 'Claims' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'provider_data', label: 'Provider Data' },
  { id: 'hrp_system', label: 'HRP System' },
  { id: 'general', label: 'General' },
]

const RESOURCE_TYPES = [
  { id: 'job_aid', label: 'Job Aid', icon: '📋' },
  { id: 'guide', label: 'Guide', icon: '📖' },
  { id: 'template', label: 'Template', icon: '📄' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'faq', label: 'FAQ', icon: '❓' },
]

function Resources() {
  const { isTrainer } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState(null)

  useEffect(() => {
    fetchResources()
  }, [selectedCategory, isTrainer])

  const fetchResources = async () => {
    try {
      let query = supabase
        .from('resources')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .order('created_at', { ascending: false })

      // Learners only see public resources
      if (!isTrainer) {
        query = query.eq('is_public', true)
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || r.resource_type === selectedType
    return matchesSearch && matchesType
  })

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

  const getTypeIcon = (type) => {
    return RESOURCE_TYPES.find(t => t.id === type)?.icon || '📄'
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Resources
        </h1>
        <p className="text-slate-500">
          {isTrainer 
            ? 'Training materials, templates, and team resources'
            : 'Job aids, guides, and quick references to help you work in HRP'}
        </p>
      </div>

      {/* Search and filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="input pl-12"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`badge cursor-pointer ${
                  selectedCategory === cat.id ? 'bg-brand-100 text-brand-700' : 'badge-slate'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <Filter className="w-4 h-4" /> Type:
          </span>
          <button
            onClick={() => setSelectedType(null)}
            className={`badge cursor-pointer ${!selectedType ? 'bg-brand-100 text-brand-700' : 'badge-slate'}`}
          >
            All
          </button>
          {RESOURCE_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id === selectedType ? null : type.id)}
              className={`badge cursor-pointer ${
                selectedType === type.id ? 'bg-brand-100 text-brand-700' : 'badge-slate'
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-48 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              categoryColor={getCategoryColor(resource.category)}
              typeIcon={getTypeIcon(resource.resource_type)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-slate-800 mb-2">No resources found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

function ResourceCard({ resource, categoryColor, typeIcon }) {
  return (
    <div className="card p-5 hover:border-brand-200 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{typeIcon}</span>
        {!resource.is_public && (
          <span className="badge badge-slate text-xs">Internal</span>
        )}
      </div>

      <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">
        {resource.title}
      </h3>

      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
        {resource.description || 'No description available'}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <span className={`badge ${categoryColor} capitalize text-xs`}>
          {resource.category?.replace('_', ' ')}
        </span>
        <span className="badge badge-slate capitalize text-xs">
          {resource.resource_type?.replace('_', ' ')}
        </span>
      </div>

      {resource.file_url ? (
        <a
          href={resource.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full text-sm py-2"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Resource
        </a>
      ) : (
        <button className="btn-secondary w-full text-sm py-2" disabled>
          <FileText className="w-4 h-4 mr-2" />
          No File Attached
        </button>
      )}
    </div>
  )
}

export default Resources
