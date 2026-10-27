import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
  MapPin,
  Briefcase,
  Globe,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import PortalIcon from './PortalIcon';

const PRESET_ROLES = [
  'PHP Developer',
  'Laravel Developer',
  'React.js Developer',
  'Full Stack Developer',
  'Junior Software Developer',
  'Frontend Developer',
  'Node.js Developer',
  'Python Developer',
  'MERN Stack Developer',
  'Web Developer'
];

const PRESET_LOCATIONS = [
  'Madurai, Tamil Nadu',
  'Chennai, Tamil Nadu',
  'Coimbatore, Tamil Nadu',
  'Trichy, Tamil Nadu',
  'Salem, Tamil Nadu',
  'Tamil Nadu',
  'India',
  'Remote',
  'Bengaluru, Karnataka'
];

const ALL_SITES = [
  { id: 'naukri', label: 'Naukri' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'glassdoor', label: 'Glassdoor' },
  { id: 'remoteok', label: 'RemoteOK (API)' },
];

export default function AdminConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [roles, setRoles] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  const [locations, setLocations] = useState([]);
  const [newLocationInput, setNewLocationInput] = useState('');

  const [sites, setSites] = useState(['naukri', 'indeed', 'linkedin', 'glassdoor', 'remoteok']);
  const [hoursOld, setHoursOld] = useState(24);
  const [resultsPerRole, setResultsPerRole] = useState(25);

  // Load config from Firestore or default
  useEffect(() => {
    if (!isOpen) return;

    async function loadConfig() {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const fallbackConfig = {
        job_roles: [
          'PHP Developer',
          'Laravel Developer',
          'React.js Developer',
          'Full Stack Developer',
          'Junior Software Developer',
          'Frontend Developer',
          'Node.js Developer',
          'Web Developer'
        ],
        locations: [
          'Madurai, Tamil Nadu',
          'Chennai, Tamil Nadu',
          'Coimbatore, Tamil Nadu',
          'Tamil Nadu',
          'India',
          'Remote'
        ],
        sites_to_scrape: ['naukri', 'indeed', 'linkedin', 'glassdoor'],
        hours_old: 24,
        results_per_role: 25
      };

      if (isFirebaseConfigured && db) {
        try {
          const docRef = doc(db, 'app_config', 'job_search_config');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setRoles(data.job_roles || fallbackConfig.job_roles);
            setLocations(data.locations || fallbackConfig.locations);
            setSites(data.sites_to_scrape || fallbackConfig.sites_to_scrape);
            setHoursOld(data.hours_old || 24);
            setResultsPerRole(data.results_per_role || 25);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not read app_config from Firestore:', err);
        }
      }

      // Default state
      setRoles(fallbackConfig.job_roles);
      setLocations(fallbackConfig.locations);
      setSites(fallbackConfig.sites_to_scrape);
      setHoursOld(fallbackConfig.hours_old);
      setResultsPerRole(fallbackConfig.results_per_role);
      setLoading(false);
    }

    loadConfig();
  }, [isOpen]);

  // Roles Tag handlers
  const handleAddRole = (roleToAdd) => {
    const val = (roleToAdd || newRoleInput).trim();
    if (!val) return;
    if (!roles.some(r => r.toLowerCase() === val.toLowerCase())) {
      setRoles(prev => [...prev, val]);
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleToRemove) => {
    setRoles(prev => prev.filter(r => r !== roleToRemove));
  };

  // Locations Tag handlers
  const handleAddLocation = (locToAdd) => {
    const val = (locToAdd || newLocationInput).trim();
    if (!val) return;
    if (!locations.some(l => l.toLowerCase() === val.toLowerCase())) {
      setLocations(prev => [...prev, val]);
    }
    setNewLocationInput('');
  };

  const handleRemoveLocation = (locToRemove) => {
    setLocations(prev => prev.filter(l => l !== locToRemove));
  };

  // Toggle Site
  const handleToggleSite = (siteId) => {
    setSites(prev => {
      if (prev.includes(siteId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(s => s !== siteId);
      }
      return [...prev, siteId];
    });
  };

  // Save to Firestore
  const handleSaveConfig = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newConfig = {
      job_roles: roles,
      locations: locations,
      sites_to_scrape: sites,
      hours_old: Number(hoursOld),
      results_per_role: Number(resultsPerRole),
      updated_at: new Date().toISOString()
    };

    try {
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'app_config', 'job_search_config');
        await setDoc(docRef, newConfig, { merge: true });
        setSuccessMsg('Successfully saved to Cloud Firestore! The Python scraper will use these exact settings on every run.');
      } else {
        setSuccessMsg('Settings saved locally in session! Connect Firebase to sync with Cloud.');
      }

      if (onConfigSaved) {
        onConfigSaved(newConfig);
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setErrorMsg(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col text-slate-800"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Search Configuration & Admin Control</h2>
              <p className="text-xs text-slate-500">Manage Job Roles, Locations (Tamil Nadu & India), and Scraper Settings</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Alerts */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: JOB ROLES & KEYWORDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Target Job Roles & Keywords ({roles.length})
              </label>
              <span className="text-[11px] text-slate-400">Scrapes each role across all selected platforms</span>
            </div>

            {/* Input to add custom role */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter job role or keyword (e.g. Flutter Developer, Python Engineer)..."
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => handleAddRole()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>

            {/* Quick preset suggestion buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Suggestions:</span>
              {PRESET_ROLES.map((preset) => {
                const isAdded = roles.some(r => r.toLowerCase() === preset.toLowerCase());
                if (isAdded) return null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddRole(preset)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 transition flex items-center gap-1"
                  >
                    <span>+ {preset}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Tags */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap gap-2 max-h-44 overflow-y-auto">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-sm"
                >
                  <span>{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="text-slate-400 hover:text-rose-500 transition p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 2: LOCATIONS */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Locations (Tamil Nadu, India & Remote) ({locations.length})
              </label>
              <span className="text-[11px] text-slate-400">Cities or broad regions</span>
            </div>

            {/* Input to add custom location */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter city or state (e.g. Trichy, Tamil Nadu, India, Remote)..."
                value={newLocationInput}
                onChange={(e) => setNewLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocation();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => handleAddLocation()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            </div>

            {/* Preset locations suggestions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Popular:</span>
              {PRESET_LOCATIONS.map((loc) => {
                const isAdded = locations.some(l => l.toLowerCase() === loc.toLowerCase());
                if (isAdded) return null;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleAddLocation(loc)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 transition flex items-center gap-1"
                  >
                    <span>+ {loc}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Location Tags */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{loc}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(loc)}
                    className="text-slate-400 hover:text-rose-500 transition p-0.5 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 3: SITES TO SCRAPE & LIMITS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Sites checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-600" />
                Platforms To Scrape
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ALL_SITES.map((site) => {
                  const isChecked = sites.includes(site.id);
                  return (
                    <label
                      key={site.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-200 text-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PortalIcon source={site.label} className="w-4 h-4" />
                        <span>{site.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSite(site.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scrape Parameters */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Scrape Limits & Frequency
              </label>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Lookback Window:</span>
                    <span className="font-bold text-blue-600">{hoursOld} Hours Old</span>
                  </div>
                  <select
                    value={hoursOld}
                    onChange={(e) => setHoursOld(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={12}>Past 12 Hours (Fresh only)</option>
                    <option value={24}>Past 24 Hours (Daily standard)</option>
                    <option value={48}>Past 48 Hours (Last 2 days)</option>
                    <option value={72}>Past 72 Hours (Weekend cover)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Results Per Role / Location:</span>
                    <span className="font-bold text-blue-600">{resultsPerRole} Results</span>
                  </div>
                  <select
                    value={resultsPerRole}
                    onChange={(e) => setResultsPerRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 jobs per role (Fast)</option>
                    <option value={25}>25 jobs per role (Balanced - Recommended)</option>
                    <option value={50}>50 jobs per role (Comprehensive)</option>
                    <option value={75}>75 jobs per role (Deep scan)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Updates Firestore collection <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">app_config</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 transition transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving to Cloud...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
