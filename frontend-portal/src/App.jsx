import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  MapPin,
  Search,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Copy,
  Check,
  X,
  RefreshCw,
  Building2,
  Globe,
  Clock,
  ArrowUpRight,
  Sliders,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  User,
  Eye,
  EyeOff,
  Download,
  Smartphone
} from 'lucide-react';
import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { generateSampleJobs } from './demoData';
import PortalIcon from './components/PortalIcon';
import ZipZapLogo from './components/ZipZapLogo';
import AdminConfigModal from './components/AdminConfigModal';
import AdminAuthModal from './components/AdminAuthModal';
import UserAuthModal from './components/UserAuthModal';
import UserProfileModal from './components/UserProfileModal';
import InstallPwaModal from './components/InstallPwaModal';
import {
  getSavedSession,
  setSavedSession,
  toggleSavedJob,
  toggleReadJob,
  subscribeToUserData
} from './services/authService';

// Source brand pill styling
const SOURCE_PILL_STYLES = {
  All: 'hover:border-slate-300',
  LinkedIn: 'hover:border-[#0A66C2]/40',
  Indeed: 'hover:border-[#2164F3]/40',
  Naukri: 'hover:border-[#004ECC]/40',
  Glassdoor: 'hover:border-[#0CAA41]/40',
  RemoteOK: 'hover:border-[#8B5CF6]/40',
};

export default function App() {
  // Always calculate current date strictly in Indian Standard Time (IST / Asia/Kolkata)
  const getTodayString = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()); // Formats as YYYY-MM-DD
  };

  // 30-Day lookback cutoff limit
  const getMinDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  };

  // Primary state
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(!isFirebaseConfigured);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // User Auth & Session States
  const [currentUser, setCurrentUser] = useState(() => getSavedSession());
  const [isUserAuthModalOpen, setIsUserAuthModalOpen] = useState(false);
  const [userAuthMode, setUserAuthMode] = useState('login');
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

  // PWA Install Prompt State & Handlers
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA window
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setCanInstallPwa(false);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstallPwa(false);
        setIsAppInstalled(true);
      }
      setDeferredInstallPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // Subscribe to real-time updates for logged-in user's saved & read lists
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = subscribeToUserData(currentUser.email, (updatedData) => {
      setCurrentUser((prev) => {
        const merged = { ...prev, ...updatedData };
        setSavedSession(merged);
        return merged;
      });
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  // Secret 3-Clicks Easter Egg on Logo to unlock Admin Panel
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastLogoClickTime, setLastLogoClickTime] = useState(0);

  const handleSecretLogoClick = () => {
    const now = Date.now();
    if (now - lastLogoClickTime < 1200) {
      const nextCount = logoClicks + 1;
      if (nextCount >= 3) {
        setLogoClicks(0);
        setIsAuthModalOpen(true);
      } else {
        setLogoClicks(nextCount);
      }
    } else {
      setLogoClicks(1);
    }
    setLastLogoClickTime(now);
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'saved', 'applied'

  // Dynamic config roles & locations (loaded from Firestore or local)
  const [cloudRoles, setCloudRoles] = useState([
    'PHP Developer',
    'Laravel Developer',
    'React.js Developer',
    'Full Stack Developer',
    'Junior Software Developer',
    'Frontend Developer',
    'Node.js Developer',
    'Web Developer'
  ]);

  const [cloudLocations, setCloudLocations] = useState([
    'Madurai, Tamil Nadu',
    'Chennai, Tamil Nadu',
    'Coimbatore, Tamil Nadu',
    'Tamil Nadu',
    'India',
    'Remote'
  ]);

  // Automated 4x Daily Sync Metadata in Indian Standard Time (IST)
  const [syncMetadata, setSyncMetadata] = useState({
    last_synced_time: '10:55 PM IST',
    last_synced_date: getTodayString(),
    status: 'success'
  });

  // Format last synced timestamp strictly to Indian Standard Time (IST)
  const getLastSyncedISTDisplay = () => {
    if (syncMetadata.last_synced_at) {
      try {
        const formatted = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date(syncMetadata.last_synced_at));
        return `${formatted} IST`;
      } catch (e) {
        // Fallback
      }
    }
    if (syncMetadata.last_synced_time) {
      return syncMetadata.last_synced_time.includes('IST')
        ? syncMetadata.last_synced_time
        : `${syncMetadata.last_synced_time} IST`;
    }
    return 'Recent (IST)';
  };

  // Calculate upcoming scheduled scan time strictly in IST (9:00 AM, 1:00 PM, 5:00 PM, 9:00 PM IST)
  const getNextSyncSlot = () => {
    const now = new Date();
    // Convert strictly to IST (UTC + 5:30)
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istMinutes = (utcMinutes + 330) % 1440; // 5 hours 30 mins = 330 mins
    const istHours = istMinutes / 60;

    if (istHours < 9) return 'Today at 09:00 AM IST';
    if (istHours < 13) return 'Today at 01:00 PM IST';
    if (istHours < 17) return 'Today at 05:00 PM IST';
    if (istHours < 21) return 'Today at 09:00 PM IST';
    return 'Tomorrow at 09:00 AM IST';
  };

  // Load app_config and sync_status from Firestore
  useEffect(() => {
    async function fetchConfig() {
      if (isFirebaseConfigured && db) {
        try {
          const docRef = doc(db, 'app_config', 'job_search_config');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.job_roles?.length) setCloudRoles(data.job_roles);
            if (data.locations?.length) setCloudLocations(data.locations);
          }
        } catch (e) {
          console.warn('Could not load app_config from Firestore:', e);
        }

        // Listen for live sync status updates
        try {
          const syncDocRef = doc(db, 'app_config', 'sync_status');
          const unsubscribeSync = onSnapshot(syncDocRef, (snap) => {
            if (snap.exists()) {
              setSyncMetadata(snap.data());
            }
          });
          return () => unsubscribeSync();
        } catch (err) {
          console.warn('Could not listen to sync_status:', err);
        }
      }
    }
    fetchConfig();
  }, []);

  // Date navigation handlers (with 30-day cutoff limit)
  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    const targetStr = current.toISOString().split('T')[0];
    const today = getTodayString();
    const minDate = getMinDateString();

    if (targetStr > today || targetStr < minDate) return;
    setSelectedDate(targetStr);
  };

  const setDateToToday = () => {
    setSelectedDate(getTodayString());
  };

  // Fetch jobs for selected date (Firestore or Demo data)
  useEffect(() => {
    setIsLoading(true);

    if (isFirebaseConfigured && !demoMode && db) {
      try {
        const jobsRef = collection(db, 'daily_jobs');
        const q = query(jobsRef, where('scraped_date', '==', selectedDate));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetched = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort: unapplied first, then by date_posted desc
            fetched.sort((a, b) => {
              if (a.is_applied === b.is_applied) {
                return (b.date_posted || '').localeCompare(a.date_posted || '');
              }
              return a.is_applied ? 1 : -1;
            });
            setJobs(fetched);
            setIsLoading(false);
          },
          (err) => {
            console.error('Firestore query error:', err);
            loadDemoJobs();
          }
        );

        return () => unsubscribe();
      } catch (e) {
        console.error('Failed to set up Firestore listener:', e);
        loadDemoJobs();
      }
    } else {
      loadDemoJobs();
    }
  }, [selectedDate, demoMode]);

  const loadDemoJobs = () => {
    const sample = generateSampleJobs();
    const filteredByDate = sample.filter((j) => j.scraped_date === selectedDate);
    if (filteredByDate.length === 0 && selectedDate === getTodayString()) {
      setJobs(sample);
    } else {
      setJobs(filteredByDate);
    }
    setIsLoading(false);
  };

  // Toggle Saved status (Per-User Firestore & Local state)
  const handleToggleSaved = async (e, job) => {
    e?.stopPropagation();
    if (!currentUser) {
      setUserAuthMode('login');
      setIsUserAuthModalOpen(true);
      return;
    }

    const savedList = currentUser.saved_job_ids || [];
    const isCurrentlySaved = savedList.includes(job.id);
    const updatedSaved = isCurrentlySaved
      ? savedList.filter((id) => id !== job.id)
      : [...savedList, job.id];

    const updatedUser = { ...currentUser, saved_job_ids: updatedSaved };
    setCurrentUser(updatedUser);
    setSavedSession(updatedUser);

    await toggleSavedJob(currentUser.email, job.id, isCurrentlySaved);
  };

  // Toggle Read status (Per-User Firestore & Local state)
  const handleToggleRead = async (e, job) => {
    e?.stopPropagation();
    if (!currentUser) {
      setUserAuthMode('login');
      setIsUserAuthModalOpen(true);
      return;
    }

    const readList = currentUser.read_job_ids || [];
    const isCurrentlyRead = readList.includes(job.id);
    const updatedRead = isCurrentlyRead
      ? readList.filter((id) => id !== job.id)
      : [...readList, job.id];

    const updatedUser = { ...currentUser, read_job_ids: updatedRead };
    setCurrentUser(updatedUser);
    setSavedSession(updatedUser);

    await toggleReadJob(currentUser.email, job.id, isCurrentlyRead);
  };

  // Handle User Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setSavedSession(null);
    setIsUserProfileModalOpen(false);
  };

  // Toggle Applied status
  const handleToggleApplied = async (e, job) => {
    e?.stopPropagation();
    const newStatus = !job.is_applied;

    setJobs((prev) =>
      prev.map((item) => (item.id === job.id ? { ...item, is_applied: newStatus } : item))
    );
    if (selectedJob?.id === job.id) {
      setSelectedJob((prev) => ({ ...prev, is_applied: newStatus }));
    }

    if (isFirebaseConfigured && !demoMode && db) {
      try {
        const jobRef = doc(db, 'daily_jobs', job.id);
        await updateDoc(jobRef, { is_applied: newStatus });
      } catch (err) {
        console.error('Error updating is_applied in Firestore:', err);
      }
    }
  };

  // Copy raw URL
  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Extract distinct locations from data + cloud config
  const availableLocations = useMemo(() => {
    const locSet = new Set();
    cloudLocations.forEach((loc) => {
      // Add city clean name
      const primary = loc.split(',')[0].trim();
      locSet.add(primary);
    });
    jobs.forEach((j) => {
      if (j.location) {
        const locClean = j.location.split(',')[0].trim();
        if (locClean) locSet.add(locClean);
      }
    });
    locSet.add('Remote');
    locSet.add('Tamil Nadu');
    locSet.add('India');
    return Array.from(locSet).filter(Boolean);
  }, [jobs, cloudLocations]);

  // Extract distinct roles from data + cloud config
  const availableRoles = useMemo(() => {
    const roleSet = new Set(cloudRoles);
    jobs.forEach((j) => {
      if (j.search_category) roleSet.add(j.search_category);
    });
    return Array.from(roleSet).filter(Boolean);
  }, [jobs, cloudRoles]);

  // Filtered jobs calculation
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword search (title, company, location, category)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (job.title && job.title.toLowerCase().includes(q)) ||
        (job.company && job.company.toLowerCase().includes(q)) ||
        (job.location && job.location.toLowerCase().includes(q)) ||
        (job.search_category && job.search_category.toLowerCase().includes(q));

      // Role filter
      const matchesRole =
        selectedRole === 'All' ||
        (job.search_category &&
          job.search_category.toLowerCase() === selectedRole.toLowerCase());

      // Location filter
      const matchesLocation =
        selectedLocation === 'All' ||
        (job.location &&
          job.location.toLowerCase().includes(selectedLocation.toLowerCase()));

      // Source app filter
      const matchesSource =
        selectedSource === 'All' ||
        (job.source_app &&
          job.source_app.toLowerCase() === selectedSource.toLowerCase());

      // Status filter (Per-User Saved, Unread, Read)
      let matchesStatus = true;
      const userSaved = currentUser?.saved_job_ids || [];
      const userRead = currentUser?.read_job_ids || [];

      if (statusFilter === 'saved') {
        matchesStatus = userSaved.includes(job.id);
      } else if (statusFilter === 'unread') {
        matchesStatus = !userRead.includes(job.id);
      } else if (statusFilter === 'read') {
        matchesStatus = userRead.includes(job.id);
      } else if (statusFilter === 'applied') {
        matchesStatus = job.is_applied === true;
      }

      return matchesSearch && matchesRole && matchesLocation && matchesSource && matchesStatus;
    });
  }, [jobs, searchQuery, selectedRole, selectedLocation, selectedSource, statusFilter, currentUser]);

  // Dynamic Platform Counts for selected date
  const platformCounts = useMemo(() => {
    const counts = {
      Naukri: 0,
      Indeed: 0,
      LinkedIn: 0,
      Glassdoor: 0,
      RemoteOK: 0,
    };
    jobs.forEach((job) => {
      const src = (job.source_app || '').toLowerCase();
      if (src.includes('naukri')) counts.Naukri++;
      else if (src.includes('indeed')) counts.Indeed++;
      else if (src.includes('linkedin')) counts.LinkedIn++;
      else if (src.includes('glassdoor')) counts.Glassdoor++;
      else if (src.includes('remoteok') || src.includes('remote ok')) counts.RemoteOK++;
    });
    return counts;
  }, [jobs]);

  const totalJobsCount = jobs.length;
  const appliedJobsCount = jobs.filter((j) => j.is_applied).length;

  // Real-time Per-User Counts for current day's jobs
  const userSavedCount = useMemo(() => {
    if (!currentUser?.saved_job_ids?.length) return 0;
    const set = new Set(currentUser.saved_job_ids);
    return jobs.filter((j) => set.has(j.id)).length;
  }, [jobs, currentUser?.saved_job_ids]);

  const savedJobsCount = userSavedCount;

  const userReadCount = useMemo(() => {
    if (!currentUser?.read_job_ids?.length) return 0;
    const set = new Set(currentUser.read_job_ids);
    return jobs.filter((j) => set.has(j.id)).length;
  }, [jobs, currentUser?.read_job_ids]);

  const userUnreadCount = Math.max(0, jobs.length - userReadCount);

  const isAnyFilterActive =
    searchQuery ||
    selectedRole !== 'All' ||
    selectedLocation !== 'All' ||
    selectedSource !== 'All' ||
    statusFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedRole('All');
    setSelectedLocation('All');
    setSelectedSource('All');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20 font-sans">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1780px] w-full mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Logo & Title - Secret Triple Click for Admin */}
          <div
            onClick={handleSecretLogoClick}
            className="cursor-pointer select-none group shrink-0"
            title="ZipZap - Instant Daily Job Radar (Click 3 times for Admin)"
          >
            <ZipZapLogo size={38} showText={true} />
          </div>

          {/* Right Action Controls: Live Sync & User Profile / Login Icon */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Sync Status Badge */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2 sm:px-3 py-1.5 text-xs text-slate-600 shadow-2xs shrink-0">
              <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured && !demoMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-medium hidden md:inline">
                {isFirebaseConfigured && !demoMode ? 'Firestore Live Sync' : 'Demo Mode'}
              </span>
            </div>

            {/* PWA INSTALL APP BUTTON */}
            {!isAppInstalled && (
              <button
                onClick={handleTriggerInstall}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-2xs hover:shadow transition transform hover:scale-[1.02] active:scale-[0.98] group shrink-0 whitespace-nowrap"
                title="Install ZipZap on your device (Desktop app / Android / iPhone)"
              >
                <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden text-[11px] font-bold">Install</span>
              </button>
            )}

            {/* USER ACCOUNT ICON (Before login -> Sign In indicator / After login -> Active User Badge) */}
            {currentUser && currentUser.email ? (
              <button
                onClick={() => setIsUserProfileModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-blue-400 group shrink-0"
                title={`Signed in as ${currentUser.email} (Click to view profile & logout)`}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {(currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {currentUser.email.includes('@') ? currentUser.email.split('@')[0] : currentUser.email}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium leading-none">
                    Signed In
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  setUserAuthMode('login');
                  setIsUserAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 shadow-2xs transition group shrink-0 whitespace-nowrap"
                title="Click to Sign In or Sign Up with OTP"
              >
                <div className="relative flex items-center justify-center w-4 h-4 text-slate-500 group-hover:text-blue-600 transition">
                  <User className="w-3.5 h-3.5" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 absolute -bottom-0.5 -right-0.5 ring-1 ring-white" />
                </div>
                <span className="whitespace-nowrap text-[11px] sm:text-xs">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN FULL-WIDTH CONTAINER */}
      <main className="max-w-[1780px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 space-y-3.5">
        {/* LIVE SYNC & PLATFORM SUMMARY BANNER */}
        <div className="bg-gradient-to-r from-navy-50/80 via-white to-cyan-50/70 border border-slate-200/90 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01ABB9] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#01ABB9]"></span>
            </span>
            <div className="text-xs text-slate-800">
              <span className="font-medium text-slate-500">Latest Live Sync: </span>
              <strong className="text-[#002262] font-bold">{getLastSyncedISTDisplay()}</strong>
              <span className="text-slate-400 font-medium hidden sm:inline"> ({syncMetadata.last_synced_date || getTodayString()})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#002262] bg-white px-3 py-1 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#01ABB9]" />
              Aggregated from 5 Major Hiring Portals
            </span>
          </div>
        </div>

        {/* 2.1 TOP STATS BAR WITH REAL BRAND ICONS */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Total Jobs */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Active Jobs</span>
              <Layers className="w-4 h-4 text-[#01ABB9]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#002262]">{totalJobsCount}</span>
              <span className="text-[11px] font-medium text-slate-500">{selectedDate}</span>
            </div>
          </div>

          {/* Naukri */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PortalIcon source="Naukri" className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Naukri</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Portal</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{platformCounts.Naukri}</span>
              <span className="text-[11px] text-blue-600 font-semibold">Live</span>
            </div>
          </div>

          {/* Indeed */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PortalIcon source="Indeed" className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Indeed</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Portal</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{platformCounts.Indeed}</span>
              <span className="text-[11px] text-[#2164F3] font-semibold">Live</span>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PortalIcon source="LinkedIn" className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">LinkedIn</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Portal</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{platformCounts.LinkedIn}</span>
              <span className="text-[11px] text-[#0A66C2] font-semibold">Live</span>
            </div>
          </div>

          {/* Glassdoor */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PortalIcon source="Glassdoor" className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Glassdoor</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Portal</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{platformCounts.Glassdoor}</span>
              <span className="text-[11px] text-[#0CAA41] font-semibold">Live</span>
            </div>
          </div>

          {/* RemoteOK */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PortalIcon source="RemoteOK" className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">RemoteOK</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Global</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{platformCounts.RemoteOK}</span>
              <span className="text-[11px] text-purple-600 font-semibold">Remote</span>
            </div>
          </div>

          {/* Applied & Saved status */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Applied / Saved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{appliedJobsCount}</span>
                <span className="text-xs text-slate-400">applied</span>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                ★ {savedJobsCount}
              </span>
            </div>
          </div>
        </section>

        {/* 2.2 ADVANCED FILTER CONTROLLER */}
        <section className="rounded-2xl bg-white border border-slate-200/90 p-3.5 sm:p-4 shadow-sm space-y-3">
          {/* Top Row: Date Picker & Search Input */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Quick Date Switcher (Restricted to Last 30 Days) */}
            <div className="md:col-span-5 flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 p-1 w-full sm:w-auto shadow-inner">
                <button
                  onClick={() => shiftDate(-1)}
                  disabled={selectedDate <= getMinDateString()}
                  title="Previous Day (within last 30 days)"
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="date"
                    min={getMinDateString()}
                    max={getTodayString()}
                    value={selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val <= getTodayString() && val >= getMinDateString()) {
                        setSelectedDate(val);
                      }
                    }}
                    className="bg-transparent border-none text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => shiftDate(1)}
                  disabled={selectedDate >= getTodayString()}
                  title="Next Day"
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {selectedDate !== getTodayString() && (
                <button
                  onClick={setDateToToday}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition"
                >
                  Today
                </button>
              )}

              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 hidden lg:inline">
                30-Day Window
              </span>
            </div>

            {/* Keyword Search */}
            <div className="md:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by job title, company, or keywords (e.g. React, Zoho, PHP, Madurai)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Role Dropdown, Location Dropdown, Source App Pills & Status */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            {/* Left Dropdowns: Roles & Locations */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Job Role Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All">All Job Roles ({availableRoles.length})</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOCATION DROPDOWN (Tamil Nadu & India) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All">All Locations ({availableLocations.length})</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Center: Source App Filter Pills with Real Icons */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
              {['All', 'Naukri', 'Indeed', 'LinkedIn', 'Glassdoor', 'RemoteOK'].map((src) => {
                const isSelected = selectedSource.toLowerCase() === src.toLowerCase();
                const count = src === 'All' ? jobs.length : platformCounts[src] || 0;
                return (
                  <button
                    key={src}
                    onClick={() => setSelectedSource(src)}
                    className={`text-xs px-2.5 py-1 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm shadow-blue-500/20'
                        : `bg-slate-50 text-slate-700 border-slate-200 ${SOURCE_PILL_STYLES[src] || ''}`
                    }`}
                  >
                    {src !== 'All' && <PortalIcon source={src} className="w-3.5 h-3.5" />}
                    <span>{src}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: User-Specific Status Filter Tabs & Reset */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs overflow-x-auto">
                {/* All Jobs */}
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({totalJobsCount})
                </button>

                {/* User Saved */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setUserAuthMode('login');
                      setIsUserAuthModalOpen(true);
                    } else {
                      setStatusFilter('saved');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    statusFilter === 'saved'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={currentUser ? 'View your saved jobs' : 'Sign in to view saved jobs'}
                >
                  <Bookmark className={`w-3 h-3 ${statusFilter === 'saved' ? 'text-purple-600 fill-purple-600' : 'text-slate-400'}`} />
                  <span>Saved ({userSavedCount})</span>
                </button>

                {/* Unread */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setUserAuthMode('login');
                      setIsUserAuthModalOpen(true);
                    } else {
                      setStatusFilter('unread');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    statusFilter === 'unread'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={currentUser ? 'View unread jobs' : 'Sign in to view unread jobs'}
                >
                  <Eye className="w-3 h-3 text-blue-500" />
                  <span>Unread ({userUnreadCount})</span>
                </button>

                {/* Marked as Read */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setUserAuthMode('login');
                      setIsUserAuthModalOpen(true);
                    } else {
                      setStatusFilter('read');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    statusFilter === 'read'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={currentUser ? 'View jobs you marked as read' : 'Sign in to view read jobs'}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Read ({userReadCount})</span>
                </button>
              </div>

              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  title="Clear all active filters"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2.3 JOB CARDS GRID (Full-Width High Density) */}
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading listings for {selectedDate}...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No jobs found matching your filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No matching listings for date <span className="font-mono text-blue-600 font-bold">{selectedDate}</span> with your selected role, location, or source criteria.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={resetAllFilters}
                className="text-xs px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
            {filteredJobs.map((job) => {
              const isJobSaved = currentUser ? (currentUser.saved_job_ids || []).includes(job.id) : false;
              const isJobRead = currentUser ? (currentUser.read_job_ids || []).includes(job.id) : false;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`job-card group cursor-pointer relative rounded-2xl bg-white border p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.07)] transition ${
                    isJobRead
                      ? 'border-slate-200/60 bg-slate-50/60 opacity-90'
                      : isJobSaved
                      ? 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/10'
                      : 'border-slate-200/90 hover:border-blue-400'
                  }`}
                >
                  {/* Card Header: Real Brand Icon + Source Label & Quick Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      {/* Brand Logo & Name */}
                      <div className="flex items-center gap-1.5">
                        <PortalIcon source={job.source_app} className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">{job.source_app || 'Portal'}</span>
                      </div>

                      {/* Card Action Icons */}
                      <div className="flex items-center gap-1">
                        {/* Bookmark / Saved Button */}
                        <button
                          onClick={(e) => handleToggleSaved(e, job)}
                          title={
                            isJobSaved
                              ? 'Saved to your profile (Click to remove)'
                              : currentUser
                              ? 'Save to your profile'
                              : 'Sign in to save this job'
                          }
                          className={`p-1.5 rounded-lg border transition ${
                            isJobSaved
                              ? 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 shadow-2xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-purple-600 hover:bg-purple-50/50'
                          }`}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              isJobSaved ? 'text-purple-600 fill-purple-600' : ''
                            }`}
                          />
                        </button>

                        {/* Mark as Read Button */}
                        <button
                          onClick={(e) => handleToggleRead(e, job)}
                          title={
                            isJobRead
                              ? 'Marked as read (Click to mark unread)'
                              : currentUser
                              ? 'Mark as Read'
                              : 'Sign in to mark job as read'
                          }
                          className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                            isJobRead
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50/50'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${isJobRead ? 'text-emerald-600 fill-emerald-100' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                      {job.title}
                    </h3>

                    {/* Company */}
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{job.company}</span>
                    </div>

                    {/* Location Badge */}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{job.location || 'Remote'}</span>
                    </div>

                    {/* Description preview */}
                    {job.description && (
                      <p className="mt-2.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Category Tag & Status */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {/* Category Tag */}
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[130px]">
                      {job.search_category || 'General'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isJobRead && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Read ✓
                        </span>
                      )}
                      {isJobSaved && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          Saved ★
                        </span>
                      )}
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5 group-hover:underline">
                        Apply
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. JOB DETAIL & APPLY MODAL */}
      {selectedJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedJob(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-2xl space-y-5 text-slate-800"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Real Brand Logo */}
                  <PortalIcon source={selectedJob.source_app} showLabel={true} />

                  <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 font-medium">
                    Category: {selectedJob.search_category}
                  </span>

                  {selectedJob.is_applied && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                      Applied ✓
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {selectedJob.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{selectedJob.company}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{selectedJob.location || 'Remote'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Listed: {selectedJob.scraped_date}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Link Verification Container */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Application URL (Verify Link)
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2">
                <span className="text-xs text-slate-700 font-mono break-all line-clamp-2 select-all flex-1">
                  {selectedJob.apply_link}
                </span>
                <button
                  onClick={() => handleCopyLink(selectedJob.apply_link)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shrink-0 shadow-sm"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Job Overview & Details Snippet
              </label>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                {selectedJob.description ||
                  'No description snippet was provided by the job board. Click the Apply button below to view all qualifications and submit your application directly on the employer site.'}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Save Job */}
                <button
                  onClick={(e) => handleToggleSaved(e, selectedJob)}
                  className={`text-xs px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                    currentUser && (currentUser.saved_job_ids || []).includes(selectedJob.id)
                      ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      currentUser && (currentUser.saved_job_ids || []).includes(selectedJob.id)
                        ? 'text-purple-600 fill-purple-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>
                    {currentUser && (currentUser.saved_job_ids || []).includes(selectedJob.id)
                      ? 'Saved to Profile ★'
                      : 'Save Job'}
                  </span>
                </button>

                {/* Mark as Read */}
                <button
                  onClick={(e) => handleToggleRead(e, selectedJob)}
                  className={`text-xs px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                    currentUser && (currentUser.read_job_ids || []).includes(selectedJob.id)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      currentUser && (currentUser.read_job_ids || []).includes(selectedJob.id)
                        ? 'text-emerald-600 fill-emerald-100'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>
                    {currentUser && (currentUser.read_job_ids || []).includes(selectedJob.id)
                      ? 'Marked as Read ✓'
                      : 'Mark as Read'}
                  </span>
                </button>
              </div>

              {/* Prominent Apply on Platform Button */}
              <a
                href={selectedJob.apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition transform active:scale-95"
              >
                <span>🚀 Apply on {selectedJob.source_app || 'Employer Site'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECRET ADMIN PASSWORD AUTH MODAL */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* 5. ADMIN CONFIGURATION MODAL */}
      <AdminConfigModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onConfigSaved={(savedConfig) => {
          if (savedConfig.job_roles) setCloudRoles(savedConfig.job_roles);
          if (savedConfig.locations) setCloudLocations(savedConfig.locations);
        }}
      />

      {/* 6. USER AUTH MODAL (Login / Signup with OTP / Forgot Password with OTP) */}
      <UserAuthModal
        isOpen={isUserAuthModalOpen}
        initialMode={userAuthMode}
        onClose={() => setIsUserAuthModalOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          setCurrentUser(loggedInUser);
          setSavedSession(loggedInUser);
        }}
      />

      {/* 7. USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        user={currentUser}
        onClose={() => setIsUserProfileModalOpen(false)}
        onLogout={handleLogout}
        onFilterSaved={() => setStatusFilter('saved')}
        onFilterRead={() => setStatusFilter('read')}
        onOpenInstall={handleTriggerInstall}
        isAppInstalled={isAppInstalled}
      />

      {/* 8. PWA INSTALL MODAL */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={handleTriggerInstall}
        canDirectInstall={canInstallPwa}
        isInstalled={isAppInstalled}
      />
    </div>
  );
}
