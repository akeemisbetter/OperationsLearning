import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hwgllpgkaepfbvvqqowi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Z2xscGdrYWVwZmJ2dnFxb3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODkzMzIsImV4cCI6MjA4MzQ2NTMzMn0.eqwntDVm_z8NMO6d2SgLjCe8St9_38W68SmlIdsKv7U'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  return {
    error: true,
    message: error?.message || 'An unexpected error occurred'
  }
}
