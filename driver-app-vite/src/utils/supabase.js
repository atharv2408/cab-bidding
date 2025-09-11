// Import Supabase client
import { createClient } from '@supabase/supabase-js'

// Your web app's Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://demo-project.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'demo-key'

let supabase = null;

try {
  // Initialize Supabase client
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://demo-project.supabase.co' && supabaseKey !== 'demo-key') {
    supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase initialized successfully')
  } else {
    console.warn('Supabase credentials not properly configured, using fallback mode')
    throw new Error('Invalid Supabase configuration')
  }
} catch (error) {
  console.warn('Supabase initialization failed:', error.message)
  // Create mock object to prevent app crashes
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ data: [], error: null }) }) }),
      insert: () => ({ select: () => ({ data: [], error: new Error('Database not available') }) }),
      update: () => ({ eq: () => ({ data: [], error: null }) }),
      rpc: () => null
    })
  };
}

export { supabase }
export default supabase
