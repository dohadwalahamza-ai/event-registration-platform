import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or local storage configuration
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pxwrvkpefgeonbaflaqh.supabase.co';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3J2a3BlZmdlb25iYWZsYXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDk1MjAsImV4cCI6MjEwODU4NTUyMH0.IV0QxHwSJ4Gx__8Ui5eaNKVe6h-Hz4CypAIzI6FPvyM';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  try {
    const customConfig = localStorage.getItem('eventform_supabase_config');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url, anonKey: parsed.anonKey };
      }
    }
  } catch (e) {
    console.error('Error reading stored supabase config', e);
  }
  return {
    url: ENV_SUPABASE_URL,
    anonKey: ENV_SUPABASE_ANON_KEY,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(
    'eventform_supabase_config',
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
  // Re-initialize client
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey || !url.startsWith('https://')) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn('Failed to create Supabase client:', err);
    return null;
  }
}
