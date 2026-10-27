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
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col text-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Search Configuration & Admin Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Roles, Locations (Tamil Nadu & India) & Scraping Limits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {/* Alerts */}
          {successMsg && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] sm:text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: JOB ROLES & KEYWORDS */}
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Target Roles & Keywords ({roles.length})</span>
              </label>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Scrapes across selected platforms</span>
            </div>

            {/* Input to add custom role */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="text"
                placeholder="Enter role (e.g. PHP, React.js)..."
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole();
                  }
                }}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => handleAddRole()}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs shrink-0 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick preset suggestion buttons */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mr-0.5">Suggestions:</span>
              {PRESET_ROLES.map((preset) => {
                const isAdded = roles.some((r) => r.toLowerCase() === preset.toLowerCase());
                if (isAdded) return null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddRole(preset)}
                    className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/70 transition flex items-center gap-0.5"
                  >
                    <span>+ {preset}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Tags */}
            <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap gap-1.5 max-h-32 sm:max-h-36 overflow-y-auto">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[180px]">{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="text-slate-400 hover:text-rose-500 transition p-0.5 ml-0.5"
                    aria-label={`Remove ${role}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 2: LOCATIONS */}
          <div className="space-y-2 sm:space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Locations ({locations.length})</span>
              </label>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Tamil Nadu, India & Remote</span>
            </div>

            {/* Input to add custom location */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="text"
                placeholder="Enter city or state (e.g. Trichy, Remote)..."
                value={newLocationInput}
                onChange={(e) => setNewLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocation();
                  }
                }}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => handleAddLocation()}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs shrink-0 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Preset locations suggestions */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mr-0.5">Popular:</span>
              {PRESET_LOCATIONS.map((loc) => {
                const isAdded = locations.some((l) => l.toLowerCase() === loc.toLowerCase());
                if (isAdded) return null;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleAddLocation(loc)}
                    className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/70 transition flex items-center gap-0.5"
                  >
                    <span>+ {loc}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Location Tags */}
            <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap gap-1.5 max-h-28 sm:max-h-32 overflow-y-auto">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[170px]">{loc}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(loc)}
                    className="text-slate-400 hover:text-rose-500 transition p-0.5 ml-0.5"
                    aria-label={`Remove ${loc}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 3: SITES TO SCRAPE & LIMITS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-slate-100">
            {/* Sites checkboxes */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Platforms To Scrape</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5">
                {ALL_SITES.map((site) => {
                  const isChecked = sites.includes(site.id);
                  return (
                    <label
                      key={site.id}
                      className={`flex items-center justify-between px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border text-[11px] sm:text-xs font-medium cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-blue-50/70 border-blue-200 text-slate-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <PortalIcon source={site.label} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{site.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSite(site.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 ml-1.5"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scrape Parameters */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Scrape Limits & Frequency</span>
              </label>

              <div className="space-y-2 sm:space-y-3 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                    <span>Lookback Window:</span>
                    <strong className="font-bold text-blue-600">{hoursOld} Hours</strong>
                  </div>
                  <select
                    value={hoursOld}
                    onChange={(e) => setHoursOld(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={12}>Past 12 Hours (Fresh only)</option>
                    <option value={24}>Past 24 Hours (Daily standard)</option>
                    <option value={48}>Past 48 Hours (Last 2 days)</option>
                    <option value={72}>Past 72 Hours (Weekend cover)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                    <span>Results Per Role:</span>
                    <strong className="font-bold text-blue-600">{resultsPerRole} Results</strong>
                  </div>
                  <select
                    value={resultsPerRole}
                    onChange={(e) => setResultsPerRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 jobs per role (Fast)</option>
                    <option value={25}>25 jobs per role (Balanced)</option>
                    <option value={50}>50 jobs per role (Comprehensive)</option>
                    <option value={75}>75 jobs per role (Deep scan)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <div className="text-[10px] sm:text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 order-2 sm:order-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Syncs to Firestore <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[9px] sm:text-[10px]">app_config</code></span>
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex-2 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition transform active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
