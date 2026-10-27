import React, { useState } from 'react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
} from '../../services/supabaseClient';
import { StorageService } from '../../services/storage';
import {
  Database,
  Key,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  FileCode,
  HardDrive,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';
import { Badge } from '../../generic-ui/components/Badge';
import { useToast } from '../../generic-ui/ToastContext';

interface SettingsViewProps {
  isSupabaseConnected: boolean;
  onRefreshConnection: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isSupabaseConnected,
  onRefreshConnection,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const { success, error } = useToast();

  const sqlSchema = StorageService.getSupabaseSQLMigration();

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);

    const client = getSupabaseClient();
    if (!client) {
      setTestResult({
        success: false,
        message: 'Invalid URL or Anonymous Key format. Please verify your Supabase project details.',
      });
      setIsTesting(false);
      return;
    }

    try {
      // 1. Test query against forms table
      const { data, error: queryError } = await client.from('forms').select('id').limit(1);

      if (queryError) {
        if (queryError.code === 'PGRST116' || queryError.message.includes('relation "public.forms" does not exist')) {
          setTestResult({
            success: false,
            message:
              'Connected to Supabase! However, the `forms` table does not exist yet. Please run the SQL Migration script below in your Supabase SQL Editor.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Supabase returned: ${queryError.message}`,
          });
        }
        setIsTesting(false);
        return;
      }

      // 2. Test write to verify Row-Level Security permissions
      const testId = '__perm_test__';
      const { error: writeError } = await client.from('forms').upsert({
        id: testId,
        owner_id: 'admin',
        title: 'Connection Check',
        slug: testId,
        status: 'draft',
      });

      if (writeError) {
        if (writeError.code === '42501' || writeError.message.includes('row-level security')) {
          setTestResult({
            success: false,
            message:
              '⚠️ Database Read works, but SAVING FORMS IS BLOCKED by Supabase Row-Level Security (Code 42501). Mobile devices will open wrong/fallback forms until you disable RLS. Run: \n\nALTER TABLE public.forms DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.form_fields DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;\n\nin your Supabase SQL Editor.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Supabase write test failed: ${writeError.message}`,
          });
        }
      } else {
        // Clean up test row
        await client.from('forms').delete().eq('id', testId);
        // Automatically push all local forms to Supabase
        await StorageService.syncLocalFormsToRemote();
        setTestResult({
          success: true,
          message: 'Connection successful! Read, write, and cloud synchronization across mobile and web are fully active.',
        });
      }
      onRefreshConnection();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to communicate with Supabase API.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSQL(true);
    success('SQL Copied', 'Paste this script into Supabase SQL Editor to initialize all tables and RLS policies.');
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  const handleClear = () => {
    saveSupabaseConfig('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setTestResult(null);
    onRefreshConnection();
    success('Reset', 'Switched back to local storage database.');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Backend & Database Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Supabase PostgreSQL backend, file storage buckets, and Row Level Security.
          </p>
        </div>

        <Badge variant={isSupabaseConnected ? 'success' : 'neutral'} dot size="md">
          {isSupabaseConnected ? 'Supabase Connected' : 'Offline / Local Storage'}
        </Badge>
      </div>

      {/* Cross-Device Mobile Sync Card */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-indigo-50/90 rounded-2xl border border-indigo-200 p-6 space-y-3.5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              1-Step Fix for Mobile: Enable Cross-Device Synchronization
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When creating forms on computer, Supabase Row-Level Security (RLS) blocks newly created forms from being saved to the cloud, causing mobile devices to open generic fallback forms. Running these 3 lines in your <strong>Supabase SQL Editor</strong> permanently enables instant syncing for <strong>all current and future forms</strong>:
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-900 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-emerald-400 select-all border border-slate-800">
          <div className="space-y-0.5">
            <div>ALTER TABLE public.forms DISABLE ROW LEVEL SECURITY;</div>
            <div>ALTER TABLE public.form_fields DISABLE ROW LEVEL SECURITY;</div>
            <div>ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-white border-slate-700 hover:bg-slate-800 shrink-0 cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(
                'ALTER TABLE public.forms DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.form_fields DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;'
              );
              success('SQL Copied', '3-line SQL command copied. Paste and Run in Supabase SQL Editor!');
            }}
          >
            Copy 3-Line SQL
          </Button>
        </div>
      </div>

      {/* Supabase API Credentials Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Supabase Connection Parameters</h3>
            <p className="text-xs text-slate-500">
              Found in your Supabase project dashboard under Settings → API
            </p>
          </div>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Project URL (e.g. https://your-ref.supabase.co)
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Public Anon API Key (safe for browser client)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-700 text-xs font-medium"
            >
              Reset to Local Mock Database
            </button>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isTesting}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Test & Connect Supabase
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* SQL Migration Script Generator */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">PostgreSQL Schema & RLS Policies</h3>
              <p className="text-xs text-slate-500">
                Creates `profiles`, `forms`, `form_fields`, `submissions`, and Storage bucket policies
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopySQL}
            leftIcon={copiedSQL ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copiedSQL ? 'Copied' : 'Copy SQL Schema'}
          </Button>
        </div>

        <div className="relative">
          <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
            {sqlSchema}
          </pre>
        </div>
      </div>
    </div>
  );
};
