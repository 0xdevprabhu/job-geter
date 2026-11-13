import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Briefcase,
  Calendar,
  MapPin,
  Search,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Compass,
  Send,
  BarChart2,
  TrendingUp,
  Bell,
  X,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  Building2,
  Clock,
  ArrowUpRight,
  Download,
  Eye,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  User,
  LogIn,
  Filter,
  CheckCheck,
  Landmark
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
import { getFallbackGovtData } from './demoGovtData';
import PortalIcon from './components/PortalIcon';
import CustomSelectDropdown from './components/CustomSelectDropdown';
import TraptipLogo from './components/TraptipLogo';
import GovtJobsSection from './components/GovtJobsSection';
import DynamicJobPostingSeo from './components/DynamicJobPostingSeo';
import {
  HeroIllustration,
  RocketIllustration,
  EmptySearchIllustration,
  SparklineBars
} from './components/Illustrations';
import AdminConfigModal from './components/AdminConfigModal';
import AdminAuthModal from './components/AdminAuthModal';
import UserAuthModal from './components/UserAuthModal';
import UserProfileModal from './components/UserProfileModal';
import InstallPwaModal from './components/InstallPwaModal';
import {
  getSavedSession,
  setSavedSession,
  toggleSavedJob,
  toggleSavedGovtJob,
  toggleReadJob,
  subscribeToUserData,
  cleanMissingSavedJobs,
  cleanMissingSavedGovtJobs
} from './services/authService';

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
      day: '2-digit'
    }).format(d);
  };

  // Format date for display matching inspiration screenshot: DD/MM/YYYY
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Primary state
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [jobs, setJobs] = useState([]);
  const [allSavedJobs, setAllSavedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(!isFirebaseConfigured);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active Navigation Tab: 'dashboard' | 'discover' | 'saved' | 'applications' | 'insights' | 'govt'
  const [activeNav, setActiveNav] = useState('dashboard');

  // Indian Government Jobs & Exams States
  const [govtItems, setGovtItems] = useState(() => getFallbackGovtData());
  const [isGovtLoading, setIsGovtLoading] = useState(false);

  // Notification Drawer State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Mobile Filter Bottom Sheet Modal State
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState(false);

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

  // Search input ref & Date input ref
  const searchInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const mobileDateInputRef = useRef(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PWA listeners
  useEffect(() => {
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

  // Subscribe to real-time updates for logged-in user's saved & read lists and name
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

  // Synchronize / Fetch All Saved Jobs across all dates
  useEffect(() => {
    if (!currentUser?.email) {
      setAllSavedJobs([]);
      return;
    }
    const savedIds = currentUser.saved_job_ids || [];
    if (savedIds.length === 0) {
      setAllSavedJobs([]);
      return;
    }

    if (!isFirebaseConfigured || demoMode || !db) {
      const samples = generateSampleJobs();
      const matched = samples.filter((j) => savedIds.includes(j.id));
      setAllSavedJobs(matched);
      return;
    }

    let isMounted = true;
    async function loadSavedJobs() {
      try {
        const validSaved = [];
        const validIds = [];

        for (const id of savedIds) {
          const docRef = doc(db, 'daily_jobs', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            validSaved.push({ id: snap.id, ...snap.data() });
            validIds.push(id);
          }
        }

        if (!isMounted) return;
        setAllSavedJobs(validSaved);

        // Auto-clean any saved job IDs that were deleted from Firebase
        if (validIds.length !== savedIds.length) {
          cleanMissingSavedJobs(currentUser.email, validIds);
          setCurrentUser((prev) => ({ ...prev, saved_job_ids: validIds }));
        }

        // Auto-clean any saved govt job IDs that were removed from Firebase or expired
        const savedGovtIds = currentUser.saved_govt_job_ids || [];
        if (savedGovtIds.length > 0 && govtItems.length > 0) {
          const liveGovtIdSet = new Set(govtItems.map((g) => g.id));
          const validGovtIds = savedGovtIds.filter((id) => liveGovtIdSet.has(id));
          if (validGovtIds.length !== savedGovtIds.length) {
            cleanMissingSavedGovtJobs(currentUser.email, validGovtIds);
            setCurrentUser((prev) => ({ ...prev, saved_govt_job_ids: validGovtIds }));
          }
        }
      } catch (err) {
        console.warn('Error loading saved jobs:', err);
      }
    }

    loadSavedJobs();
    return () => { isMounted = false; };
  }, [currentUser?.email, currentUser?.saved_job_ids, demoMode]);

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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'saved', 'unread', 'read', 'applied'

  // Dynamic config roles & locations
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

  // Automated Sync Metadata in IST
  const [syncMetadata, setSyncMetadata] = useState({
    last_synced_time: '10:55 PM IST',
    last_synced_date: getTodayString(),
    status: 'success'
  });

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

  const getNextSyncSlot = () => {
    const now = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istMinutes = (utcMinutes + 330) % 1440;
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

  // Fetch & Subscribe to Indian Government Jobs from Firestore
  const fetchGovtNotifications = () => {
    setIsGovtLoading(true);
    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'govt_notifications');
        const unsubscribe = onSnapshot(
          colRef,
          (snapshot) => {
            const fetched = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (fetched.length > 0) {
              fetched.sort((a, b) => (b.post_date_iso || '').localeCompare(a.post_date_iso || ''));
              setGovtItems(fetched);
            } else {
              setGovtItems(getFallbackGovtData());
            }
            setIsGovtLoading(false);
          },
          (err) => {
            console.warn('Govt notifications error:', err);
            setGovtItems(getFallbackGovtData());
            setIsGovtLoading(false);
          }
        );
        return unsubscribe;
      } catch (e) {
        console.warn('Failed to listen to govt_notifications:', e);
        setGovtItems(getFallbackGovtData());
        setIsGovtLoading(false);
      }
    } else {
      setGovtItems(getFallbackGovtData());
      setIsGovtLoading(false);
    }
    return () => {};
  };

  useEffect(() => {
    const unsub = fetchGovtNotifications();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleSaveGovtJob = async (jobId) => {
    if (!currentUser) {
      setUserAuthMode('login');
      setIsUserAuthModalOpen(true);
      return;
    }

    const savedGovtList = currentUser.saved_govt_job_ids || [];
    const isCurrentlySaved = savedGovtList.includes(jobId);
    const updatedSaved = isCurrentlySaved
      ? savedGovtList.filter((id) => id !== jobId)
      : [...savedGovtList, jobId];

    const updatedUser = { ...currentUser, saved_govt_job_ids: updatedSaved };
    setCurrentUser(updatedUser);
    setSavedSession(updatedUser);

    await toggleSavedGovtJob(currentUser.email, jobId, isCurrentlySaved);
  };

  // Toggle Saved status
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

  // Toggle Read status
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

  // Available locations
  const availableLocations = useMemo(() => {
    const locSet = new Set();
    cloudLocations.forEach((loc) => {
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

  // Available roles
  const availableRoles = useMemo(() => {
    const roleSet = new Set(cloudRoles);
    jobs.forEach((j) => {
      if (j.search_category) roleSet.add(j.search_category);
    });
    return Array.from(roleSet).filter(Boolean);
  }, [jobs, cloudRoles]);

  // Filtered jobs calculation (supports saved jobs from ANY date)
  const filteredJobs = useMemo(() => {
    const sourceList = statusFilter === 'saved' ? allSavedJobs : jobs;

    return sourceList.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (job.title && job.title.toLowerCase().includes(q)) ||
        (job.company && job.company.toLowerCase().includes(q)) ||
        (job.location && job.location.toLowerCase().includes(q)) ||
        (job.search_category && job.search_category.toLowerCase().includes(q));

      const matchesRole =
        selectedRole === 'All' ||
        (job.search_category &&
          job.search_category.toLowerCase() === selectedRole.toLowerCase());

      const matchesLocation =
        selectedLocation === 'All' ||
        (job.location &&
          job.location.toLowerCase().includes(selectedLocation.toLowerCase()));

      const matchesSource =
        selectedSource === 'All' ||
        (job.source_app &&
          job.source_app.toLowerCase() === selectedSource.toLowerCase());

      let matchesStatus = true;
      const userRead = currentUser?.read_job_ids || [];

      if (statusFilter === 'saved') {
        matchesStatus = true; // Sourced directly from allSavedJobs
      } else if (statusFilter === 'unread') {
        matchesStatus = !userRead.includes(job.id);
      } else if (statusFilter === 'read') {
        matchesStatus = userRead.includes(job.id);
      } else if (statusFilter === 'applied') {
        matchesStatus = job.is_applied === true;
      }

      return matchesSearch && matchesRole && matchesLocation && matchesSource && matchesStatus;
    });
  }, [jobs, allSavedJobs, searchQuery, selectedRole, selectedLocation, selectedSource, statusFilter, currentUser]);

  // Dynamic Platform Counts
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

  // Total saved jobs across all dates
  const userSavedCount = currentUser?.saved_job_ids?.length || allSavedJobs.length || 0;

  const userReadCount = useMemo(() => {
    if (!currentUser?.read_job_ids?.length) return 0;
    const set = new Set(currentUser.read_job_ids);
    return jobs.filter((j) => set.has(j.id)).length;
  }, [jobs, currentUser?.read_job_ids]);

  const userUnreadCount = Math.max(0, jobs.length - userReadCount);

  // Active filters count indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== 'All') count++;
    if (selectedLocation !== 'All') count++;
    if (selectedSource !== 'All') count++;
    if (statusFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    if (selectedDate !== getTodayString() && statusFilter !== 'saved') count++;
    return count;
  }, [selectedRole, selectedLocation, selectedSource, statusFilter, searchQuery, selectedDate]);

  const isAnyFilterActive = activeFiltersCount > 0;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedRole('All');
    setSelectedLocation('All');
    setSelectedSource('All');
    setStatusFilter('all');
    setActiveNav('dashboard');
  };

  // User details (ONLY when logged in)
  const userDisplayName = currentUser
    ? currentUser.displayName || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'User')
    : null;

  // Derive initial from name (alphabetical character, so 0xdevprabhu gives D, not 0)
  const userInitial = useMemo(() => {
    if (!userDisplayName) return null;
    const clean = userDisplayName.trim();
    const match = clean.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : clean.charAt(0).toUpperCase();
  }, [userDisplayName]);

  // Navigation handlers
  const handleNavClick = (nav) => {
    setActiveNav(nav);
    if (nav === 'saved') {
      if (!currentUser) {
        setUserAuthMode('login');
        setIsUserAuthModalOpen(true);
      } else {
        setStatusFilter('saved');
      }
    } else if (nav === 'applications') {
      setStatusFilter('applied');
    } else if (nav === 'discover') {
      resetAllFilters();
      searchInputRef.current?.focus();
    } else if (nav === 'dashboard') {
      setStatusFilter('all');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Dynamic Google for Jobs Rich Snippets (SEO JSON-LD Injection) */}
      <DynamicJobPostingSeo jobs={jobs} govtItems={govtItems} activeNav={activeNav} />

      {/* ========================================================= */}
      {/* 1. MOBILE TOP STICKY HEADER                               */}
      {/* ========================================================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div
          onClick={handleSecretLogoClick}
          className="cursor-pointer select-none"
          title="Traptip Jobs (Click 3 times for Admin)"
        >
          <TraptipLogo size={34} showText={true} subtitle="Jobs" />
        </div>

        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {!isAppInstalled && (
            <button
              onClick={handleTriggerInstall}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
              title="Install Traptip App"
            >
              <Download className="w-4 h-4 text-[#1E60FF]" />
            </button>
          )}

          {/* Notification Bell (Only in mobile top header) */}
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
          </button>

          {/* User Auth: Avatar if Logged In / Sign In Button if Logged Out */}
          {currentUser ? (
            <button
              onClick={() => setIsUserProfileModalOpen(true)}
              className="w-8 h-8 rounded-full bg-[#002262] text-white flex items-center justify-center font-black text-xs shadow-xs"
              title={`Profile: ${currentUser.email}`}
            >
              {userInitial}
            </button>
          ) : (
            <button
              onClick={() => {
                setUserAuthMode('login');
                setIsUserAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E60FF] hover:bg-[#1B54E0] text-white text-xs font-bold shadow-xs transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT (Sidebar + Dashboard)                      */}
      {/* ========================================================= */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex gap-6">
        {/* ------------------------------------------------------- */}
        {/* 2.1 DESKTOP LEFT SIDEBAR                                */}
        {/* ------------------------------------------------------- */}
        <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 bg-white rounded-3xl p-5 border border-slate-200/70 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex-col justify-between sticky top-6 h-[calc(100vh-3rem)]">
          <div className="space-y-6">
            {/* Brand Logo in Sidebar with authentic image */}
            <div
              onClick={handleSecretLogoClick}
              className="cursor-pointer select-none pt-1"
              title="Traptip Jobs - Daily Multi-Portal Aggregator (Click 3 times for Admin)"
            >
              <TraptipLogo size={42} showText={true} stacked={true} subtitle="Jobs" />
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5 pt-2">
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'dashboard'
                    ? 'bg-[#1E60FF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick('discover')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'discover'
                    ? 'bg-[#1E60FF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Compass className="w-5 h-5 shrink-0" />
                <span>Discover</span>
              </button>

              <button
                onClick={() => handleNavClick('govt')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'govt'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50/70'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Landmark className={`w-5 h-5 shrink-0 ${activeNav === 'govt' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Govt Jobs & Exams</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    activeNav === 'govt' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {govtItems.length > 0 ? govtItems.length : 'LIVE'}
                </span>
              </button>

              <button
                onClick={() => handleNavClick('saved')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'saved'
                    ? 'bg-[#1E60FF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Bookmark className="w-5 h-5 shrink-0" />
                  <span>Saved</span>
                </div>
                {userSavedCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      activeNav === 'saved' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {userSavedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNavClick('applications')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'applications'
                    ? 'bg-[#1E60FF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Send className="w-5 h-5 shrink-0" />
                  <span>Applications</span>
                </div>
                {appliedJobsCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      activeNav === 'applications' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {appliedJobsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNavClick('insights')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeNav === 'insights'
                    ? 'bg-[#1E60FF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-5 h-5 shrink-0" />
                <span>Insights</span>
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            {/* Promo Card: Build a Better Career */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#EBF4FE] to-[#DFEDFE] p-4 text-center border border-blue-100 overflow-hidden shadow-2xs">
              <div className="flex justify-center -mt-1 mb-1">
                <RocketIllustration className="w-16 h-16 drop-shadow-sm" />
              </div>
              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                Build a Better Career
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 mb-3">
                One Job at a Time
              </p>
              <button
                onClick={() => {
                  resetAllFilters();
                  setActiveNav('dashboard');
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#1E60FF] hover:bg-[#1B54E0] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Explore Jobs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Profile Footer: Signed In State vs Clear Sign In Prompt */}
            {currentUser ? (
              <div
                onClick={() => setIsUserProfileModalOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-pointer transition select-none"
                title={`Signed in as ${currentUser.email}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-full bg-[#002262] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                    {userInitial}
                  </div>
                  <div className="truncate text-left">
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {userDisplayName}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Active Member
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
              </div>
            ) : (
              <button
                onClick={() => {
                  setUserAuthMode('login');
                  setIsUserAuthModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 cursor-pointer transition select-none group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1E60FF] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition">
                      Sign In / Register
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Save jobs & sync profile
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* 2.2 MAIN CONTENT AREA                                    */}
        {/* ------------------------------------------------------- */}
        <main className="flex-1 min-w-0 space-y-3.5 sm:space-y-4 pb-20 lg:pb-6">
          {/* ===================================================== */}
          {/* TOP SEARCH BAR (Desktop action icons only on desktop) */}
          {/* ===================================================== */}
          <div className="flex items-center justify-between gap-3">
            {/* Search Input Bar with Ctrl+K shortcut pill */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by job title, company, or keywords (e.g. React, Zoho, PHP...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-20 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E60FF] focus:ring-2 focus:ring-[#1E60FF]/20 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md border border-slate-200/60 select-none">
                  Ctrl + K
                </span>
              </div>
            </div>

            {/* DESKTOP-ONLY Action Cluster (HIDDEN ON MOBILE to prevent duplicate bell) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Firestore Live Sync Pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-700"
                title={`Last synced: ${getLastSyncedISTDisplay()}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  {isFirebaseConfigured && !demoMode ? 'Live Sync' : 'Demo Mode'}
                </span>
              </div>

              {/* Install PWA Button */}
              {!isAppInstalled && (
                <button
                  onClick={handleTriggerInstall}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition"
                  title="Install Traptip on desktop or phone"
                >
                  <Download className="w-3.5 h-3.5 text-[#1E60FF]" />
                  <span>Install App</span>
                </button>
              )}

              {/* Notification Bell with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs transition relative"
                  title="Notifications & Sync Info"
                >
                  <Bell className="w-4 h-4 text-slate-700" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Sync & Alerts</span>
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="py-2.5 space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-blue-900">
                          <span>Latest Radar Scan</span>
                          <span className="text-[10px] text-blue-600">Success</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Scraped {jobs.length} listings across Naukri, Indeed, LinkedIn, Glassdoor, and RemoteOK.
                        </p>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Synced: {getLastSyncedISTDisplay()}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <div className="font-bold text-slate-800 text-[11px]">Upcoming Sync Slot</div>
                        <p className="text-[11px] text-slate-500">{getNextSyncSlot()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar if Logged in / Sign In Button if Logged out */}
              {currentUser ? (
                <button
                  onClick={() => setIsUserProfileModalOpen(true)}
                  className="flex items-center gap-1.5 p-1.5 pr-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs transition"
                  title={`Profile: ${currentUser.email}`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#002262] text-white flex items-center justify-center text-xs font-bold">
                    {userInitial}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setUserAuthMode('login');
                    setIsUserAuthModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#1E60FF] hover:bg-[#1B54E0] text-white text-xs font-bold shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* TAB: DEDICATED ALL INDIA & STATE GOVT EXAMS PORTAL   */}
          {/* ===================================================== */}
          {activeNav === 'govt' ? (
            <GovtJobsSection
              govtItems={govtItems}
              isLoading={isGovtLoading}
              currentUser={currentUser}
              savedJobIds={currentUser?.saved_govt_job_ids || []}
              onSaveJob={handleSaveGovtJob}
              onRefresh={fetchGovtNotifications}
            />
          ) : (
            <>
              {/* ===================================================== */}
              {/* WELCOME HERO BANNER                                    */}
              {/* ===================================================== */}
          <section className="relative rounded-3xl bg-gradient-to-r from-[#EBF3FE] via-[#EDF5FF] to-[#DBEAFE] p-4 sm:p-5 xl:p-6 border border-blue-100/90 shadow-[0_4px_20px_rgba(37,99,235,0.04)] overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                  {currentUser ? `Welcome Back, ${userDisplayName}! 👋` : 'Welcome to Traptip Jobs! 👋'}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  {currentUser
                    ? "Let's find your next opportunity with Traptip Jobs"
                    : 'Discover & track fresh daily jobs across 5 top portals in real time'}
                </p>

                {/* Sign In Prompt in Hero if logged out */}
                {!currentUser && (
                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        setUserAuthMode('login');
                        setIsUserAuthModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E60FF] hover:bg-[#1B54E0] text-white text-xs font-bold shadow-xs transition"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In to Save Jobs & Sync Data →</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Briefcase Graphic (matching the phone mockup) */}
              <div className="md:hidden shrink-0">
                <div className="w-12 h-11 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] flex items-center justify-center shadow-md shadow-sky-500/20 text-white relative">
                  <Briefcase className="w-5 h-5" />
                  <span className="w-2 h-2 rounded-full bg-white/40 absolute top-2 right-2" />
                </div>
              </div>

              {/* Desktop Illustration */}
              <div className="hidden md:flex justify-end shrink-0">
                <HeroIllustration className="w-56 sm:w-64 lg:w-72 h-24 sm:h-28 object-contain" />
              </div>
            </div>
          </section>

          {/* ===================================================== */}
          {/* QUICK PLATFORM STATS CARDS (Compact Horizontal Layout) */}
          {/* Icon & Name on LEFT, Count & Status on RIGHT          */}
          {/* ===================================================== */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {/* 1. Total Active Jobs */}
            <div
              onClick={() => setSelectedSource('All')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource === 'All' ? 'border-[#1E60FF] ring-2 ring-[#1E60FF]/20' : 'border-slate-200/80 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-[#1E60FF] flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    Total Jobs
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Active
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {statusFilter === 'saved' ? allSavedJobs.length : totalJobsCount}
                </div>
                <div className="flex items-center justify-end mt-1">
                  <SparklineBars className="w-5 h-2.5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* 2. Naukri */}
            <div
              onClick={() => setSelectedSource('Naukri')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource.toLowerCase() === 'naukri' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PortalIcon source="Naukri" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    Naukri
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Portal
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {platformCounts.Naukri}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* 3. Indeed */}
            <div
              onClick={() => setSelectedSource('Indeed')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource.toLowerCase() === 'indeed' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200/80 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PortalIcon source="Indeed" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    Indeed
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Portal
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {platformCounts.Indeed}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* 4. LinkedIn */}
            <div
              onClick={() => setSelectedSource('LinkedIn')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource.toLowerCase() === 'linkedin' ? 'border-[#0A66C2] ring-2 ring-[#0A66C2]/20' : 'border-slate-200/80 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PortalIcon source="LinkedIn" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    LinkedIn
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Portal
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {platformCounts.LinkedIn}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* 5. Glassdoor */}
            <div
              onClick={() => setSelectedSource('Glassdoor')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource.toLowerCase() === 'glassdoor' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PortalIcon source="Glassdoor" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    Glassdoor
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Portal
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {platformCounts.Glassdoor}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* 6. RemoteOK */}
            <div
              onClick={() => setSelectedSource('RemoteOK')}
              className={`rounded-2xl bg-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 border transition cursor-pointer flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md ${
                selectedSource.toLowerCase() === 'remoteok' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/80 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PortalIcon source="RemoteOK" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate leading-tight">
                    RemoteOK
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Global
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                  {platformCounts.RemoteOK}
                </div>
                <div className="text-[10px] font-bold text-purple-600 mt-1">
                  Remote
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================== */}
          {/* DESKTOP FILTER BAR: ULTRA COMPACT & CLEAN (lg: screens) */}
          {/* ===================================================== */}
          <section className="hidden lg:block rounded-2xl bg-white p-3 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-2.5">
            {/* Top Row: Dropdown Selectors + Status Tabs + Reset */}
            <div className="flex items-center justify-between gap-3">
              {/* Left Selectors */}
              <div className="flex items-center gap-2">
                {/* Date Switcher Pill */}
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 transition">
                  <button
                    onClick={() => shiftDate(-1)}
                    disabled={selectedDate <= getMinDateString()}
                    className="p-0.5 hover:text-blue-600 disabled:opacity-30 mr-1"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div
                    onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                    className="flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{formatDisplayDate(selectedDate)}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>

                  <button
                    onClick={() => shiftDate(1)}
                    disabled={selectedDate >= getTodayString()}
                    className="p-0.5 hover:text-blue-600 disabled:opacity-30 ml-1"
                    title="Next Day"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <input
                    ref={dateInputRef}
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
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                  />
                </div>

                {/* 30-Day Window Pill */}
                {/* <div
                  onClick={() => setDateToToday()}
                  className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer transition select-none"
                  title="Click to jump to Today"
                >
                  <span>30-Day Window</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div> */}

                {/* Job Role Dropdown Pill (Custom UI) */}
                <CustomSelectDropdown
                  icon={Briefcase}
                  iconColor="text-slate-500"
                  value={selectedRole}
                  onChange={(val) => setSelectedRole(val)}
                  options={availableRoles.map((role) => ({
                    value: role,
                    label: role === 'All' ? `All Job Roles (${availableRoles.length - 1})` : role
                  }))}
                  placeholder="Select Job Role"
                />

                {/* Location Dropdown Pill (Custom UI) */}
                <CustomSelectDropdown
                  icon={MapPin}
                  iconColor="text-emerald-600"
                  value={selectedLocation}
                  onChange={(val) => setSelectedLocation(val)}
                  options={availableLocations.map((loc) => ({
                    value: loc,
                    label: loc === 'All' ? `All Locations (${availableLocations.length - 1})` : loc
                  }))}
                  placeholder="Select Location"
                />
              </div>

              {/* Right: Status Filter Tabs + Reset */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({totalJobsCount})
                  </button>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setUserAuthMode('login');
                        setIsUserAuthModalOpen(true);
                      } else {
                        setStatusFilter('saved');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      statusFilter === 'saved'
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Bookmark className="w-3 h-3 text-purple-600" />
                    <span>Saved ({userSavedCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setUserAuthMode('login');
                        setIsUserAuthModalOpen(true);
                      } else {
                        setStatusFilter('unread');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      statusFilter === 'unread'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Eye className="w-3 h-3 text-blue-500" />
                    <span>Unread ({userUnreadCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setUserAuthMode('login');
                        setIsUserAuthModalOpen(true);
                      } else {
                        setStatusFilter('read');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      statusFilter === 'read'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Read ({userReadCount})</span>
                  </button>
                </div>

                {isAnyFilterActive && (
                  <button
                    onClick={resetAllFilters}
                    title="Reset all active filters"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: All 5 Portal Chips with crisp badges & counts */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
              {['All', 'Naukri', 'Indeed', 'LinkedIn', 'Glassdoor', 'RemoteOK'].map((portal) => {
                const isSelected = selectedSource.toLowerCase() === portal.toLowerCase();
                const count = portal === 'All' ? (statusFilter === 'saved' ? allSavedJobs.length : totalJobsCount) : platformCounts[portal] || 0;
                return (
                  <button
                    key={portal}
                    onClick={() => setSelectedSource(portal)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#1E60FF] text-white shadow-2xs shadow-blue-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {portal !== 'All' && <PortalIcon source={portal} className="w-3.5 h-3.5 rounded-sm" />}
                    <span>{portal}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ===================================================== */}
          {/* MOBILE FILTER BAR: MODERN, COMPACT, ULTRA CLEAN       */}
          {/* ===================================================== */}
          <section className="lg:hidden rounded-2xl bg-white p-2.5 border border-slate-200/80 shadow-2xs space-y-2">
            {/* Top Quick Action Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
                {/* 1. Mobile Filter Button that opens Bottom Sheet */}
                <button
                  onClick={() => setIsMobileFilterDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1E60FF] text-xs font-black shrink-0 transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#1E60FF] text-white text-[10px] flex items-center justify-center font-black">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* 2. Date Quick Switcher Pill */}
                <div
                  onClick={() => mobileDateInputRef.current?.showPicker?.() || mobileDateInputRef.current?.focus()}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shrink-0 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{formatDisplayDate(selectedDate)}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                  <input
                    ref={mobileDateInputRef}
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
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                  />
                </div>

                {/* 3. Jump to Today button if on previous day */}
                {selectedDate !== getTodayString() && (
                  <button
                    onClick={setDateToToday}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-blue-600 shrink-0"
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Reset active filters button */}
              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  title="Clear all filters"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bottom Row: Smooth Horizontal Scrolling Chips (Portals + Reading Status) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* All Portals */}
              {['All', 'Naukri', 'Indeed', 'LinkedIn', 'Glassdoor', 'RemoteOK'].map((portal) => {
                const isSelected = selectedSource.toLowerCase() === portal.toLowerCase();
                const count = portal === 'All' ? (statusFilter === 'saved' ? allSavedJobs.length : totalJobsCount) : platformCounts[portal] || 0;
                return (
                  <button
                    key={portal}
                    onClick={() => setSelectedSource(portal)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#1E60FF] text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {portal !== 'All' && <PortalIcon source={portal} className="w-3 h-3 rounded-sm" />}
                    <span>{portal}</span>
                    <span
                      className={`text-[10px] px-1 py-0.1 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <span className="text-slate-300 mx-0.5">|</span>

              {/* Saved Chip */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    setUserAuthMode('login');
                    setIsUserAuthModalOpen(true);
                  } else {
                    setStatusFilter(statusFilter === 'saved' ? 'all' : 'saved');
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 shrink-0 ${
                  statusFilter === 'saved'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>Saved ({userSavedCount})</span>
              </button>

              {/* Unread Chip */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    setUserAuthMode('login');
                    setIsUserAuthModalOpen(true);
                  } else {
                    setStatusFilter(statusFilter === 'unread' ? 'all' : 'unread');
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 shrink-0 ${
                  statusFilter === 'unread'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Unread ({userUnreadCount})</span>
              </button>
            </div>
          </section>

          {/* ===================================================== */}
          {/* TAB: INSIGHTS & ANALYTICS OVERVIEW                    */}
          {/* ===================================================== */}
          {activeNav === 'insights' ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-2xs space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Job Market Insights & Portal Analytics</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live distribution and coverage breakdown for {formatDisplayDate(selectedDate)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Portal Share */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Platform Share
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(platformCounts).map(([portal, count]) => {
                        const pct = totalJobsCount > 0 ? Math.round((count / totalJobsCount) * 100) : 0;
                        return (
                          <div key={portal} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{portal}</span>
                              <span>{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1E60FF] h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sync Cadence */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Automated Sync Schedule (IST)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Traptip triggers automated cloud scrape jobs 4 times daily across all 5 major portals:
                    </p>
                    <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>09:00 AM IST (Morning Scan)</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>01:00 PM IST (Midday Scan)</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>05:00 PM IST (Evening Scan)</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>09:00 PM IST (Night Scan)</span>
                      </div>
                    </div>
                  </div>

                  {/* Roles Covered */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target Job Roles ({availableRoles.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {availableRoles.map((role) => (
                        <span
                          key={role}
                          onClick={() => {
                            setSelectedRole(role);
                            setActiveNav('dashboard');
                          }}
                          className="text-[11px] font-semibold bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 hover:border-blue-500 cursor-pointer transition"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ===================================================== */}
          {/* MAIN JOBS GRID OR EMPTY STATE                         */}
          {/* ===================================================== */}
          {activeNav !== 'insights' && (
            <div>
              {isLoading ? (
                <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                  <RefreshCw className="w-8 h-8 text-[#1E60FF] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    Scanning listings for {formatDisplayDate(selectedDate)}...
                  </p>
                </div>
              ) : filteredJobs.length === 0 ? (
                /* Empty state matching screenshot */
                <div className="rounded-3xl bg-white p-8 sm:p-14 border border-slate-200/80 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex justify-center">
                    <EmptySearchIllustration className="w-44 sm:w-52 h-36 sm:h-40 object-contain" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      No Jobs Found Yet!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                      {statusFilter === 'saved'
                        ? "You haven't saved any jobs yet. Browse listings and click the bookmark icon to save jobs here!"
                        : 'Try adjusting your filters or check back later for new opportunities.'}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={resetAllFilters}
                      className="px-6 py-2.5 rounded-full bg-[#1E60FF] hover:bg-[#1B54E0] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 transform active:scale-95"
                    >
                      <span>Explore All Jobs</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Jobs Card Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5">
                  {filteredJobs.map((job) => {
                    const isJobSaved = currentUser
                      ? (currentUser.saved_job_ids || []).includes(job.id)
                      : false;
                    const isJobRead = currentUser
                      ? (currentUser.read_job_ids || []).includes(job.id)
                      : false;

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`job-card group cursor-pointer relative rounded-2xl sm:rounded-3xl bg-white border p-4 sm:p-4.5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg transition ${
                          isJobRead
                            ? 'border-slate-200/60 bg-slate-50/50 opacity-90'
                            : isJobSaved
                            ? 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/10'
                            : 'border-slate-200/90 hover:border-[#1E60FF]'
                        }`}
                      >
                        <div>
                          {/* Card Header: Platform Icon + Actions */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <PortalIcon source={job.source_app} className="w-5 h-5 rounded-md shrink-0" />
                              <span className="text-xs font-bold text-slate-700">{job.source_app || 'Portal'}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Save Bookmark */}
                              <button
                                onClick={(e) => handleToggleSaved(e, job)}
                                title={
                                  isJobSaved
                                    ? 'Saved to your profile'
                                    : currentUser
                                    ? 'Save job'
                                    : 'Sign in to save'
                                }
                                className={`p-1.5 rounded-xl border transition ${
                                  isJobSaved
                                    ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-2xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200/80 hover:text-purple-600 hover:bg-purple-50/50'
                                }`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isJobSaved ? 'fill-purple-600' : ''}`} />
                              </button>

                              {/* Mark as Read */}
                              <button
                                onClick={(e) => handleToggleRead(e, job)}
                                title={isJobRead ? 'Marked as read' : 'Mark as read'}
                                className={`p-1.5 rounded-xl border transition ${
                                  isJobRead
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-2xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200/80 hover:text-emerald-600 hover:bg-emerald-50/50'
                                }`}
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${isJobRead ? 'fill-emerald-100' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Job Title */}
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#1E60FF] transition-colors line-clamp-2 leading-snug">
                            {job.title}
                          </h3>

                          {/* Company */}
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{job.company}</span>
                          </div>

                          {/* Location & Posted Date */}
                          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-slate-500 font-medium">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{job.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formatDisplayDate(job.scraped_date || job.date_posted)}</span>
                            </div>
                          </div>

                          {/* Description Excerpt */}
                          {job.description && (
                            <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {job.description}
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Category Tag & Apply CTA */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60 truncate max-w-[130px]">
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
                            <span className="text-xs font-bold text-[#1E60FF] flex items-center gap-0.5 group-hover:underline">
                              Apply
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. MOBILE FIXED BOTTOM NAVIGATION BAR                      */}
      {/* ========================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-safe">
        <div className="grid grid-cols-6 items-center w-full max-w-md mx-auto">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              activeNav === 'dashboard'
                ? 'text-[#1E60FF] font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'dashboard' ? 'bg-blue-50 text-[#1E60FF]' : ''}`}>
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Dashboard</span>
          </button>

          <button
            onClick={() => handleNavClick('discover')}
            className={`flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              activeNav === 'discover'
                ? 'text-[#1E60FF] font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'discover' ? 'bg-blue-50 text-[#1E60FF]' : ''}`}>
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Discover</span>
          </button>

          <button
            onClick={() => handleNavClick('govt')}
            className={`flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              activeNav === 'govt'
                ? 'text-amber-700 font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'govt' ? 'bg-amber-100 text-amber-700' : ''}`}>
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Govt</span>
          </button>

          <button
            onClick={() => handleNavClick('saved')}
            className={`flex flex-col items-center justify-center py-1 relative transition-all rounded-xl ${
              activeNav === 'saved'
                ? 'text-purple-700 font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'saved' ? 'bg-purple-100 text-purple-700' : ''}`}>
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Saved</span>
            {userSavedCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => handleNavClick('applications')}
            className={`flex flex-col items-center justify-center py-1 relative transition-all rounded-xl ${
              activeNav === 'applications'
                ? 'text-[#1E60FF] font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'applications' ? 'bg-blue-50 text-[#1E60FF]' : ''}`}>
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Applied</span>
          </button>

          <button
            onClick={() => handleNavClick('insights')}
            className={`flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              activeNav === 'insights'
                ? 'text-[#1E60FF] font-black scale-105'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeNav === 'insights' ? 'bg-blue-50 text-[#1E60FF]' : ''}`}>
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate max-w-full">Insights</span>
          </button>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* 4. MODERN MOBILE FILTER BOTTOM SHEET MODAL                */}
      {/* ========================================================= */}
      {isMobileFilterDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileFilterDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 text-slate-800"
          >
            {/* Drawer Drag Pill & Header */}
            <div className="pt-3 pb-3 px-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#1E60FF]" />
                <h3 className="text-base font-black text-slate-900">Filter Jobs</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#1E60FF] text-xs font-bold">
                    {activeFiltersCount} Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isAnyFilterActive && (
                  <button
                    onClick={resetAllFilters}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 p-1"
                  >
                    Reset All
                  </button>
                )}
                <button
                  onClick={() => setIsMobileFilterDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Options */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* 1. Date Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Scraped Date
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={setDateToToday}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border text-xs transition ${
                      selectedDate === getTodayString()
                        ? 'bg-[#1E60FF] text-white border-[#1E60FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Today ({formatDisplayDate(getTodayString())})
                  </button>
                  <button
                    onClick={() => shiftDate(-1)}
                    className="py-2 px-3 rounded-xl font-bold border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* 2. Job Role */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Target Job Role
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => setSelectedRole('All')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                      selectedRole === 'All'
                        ? 'bg-[#1E60FF] text-white border-[#1E60FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    All Roles
                  </button>
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                        selectedRole === role
                          ? 'bg-[#1E60FF] text-white border-[#1E60FF]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Location */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Location
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  <button
                    onClick={() => setSelectedLocation('All')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                      selectedLocation === 'All'
                        ? 'bg-[#1E60FF] text-white border-[#1E60FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    All Locations
                  </button>
                  {availableLocations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                        selectedLocation === loc
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Portal Source */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Hiring Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'Naukri', 'Indeed', 'LinkedIn', 'Glassdoor', 'RemoteOK'].map((portal) => (
                    <button
                      key={portal}
                      onClick={() => setSelectedSource(portal)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                        selectedSource.toLowerCase() === portal.toLowerCase()
                          ? 'bg-blue-50 border-[#1E60FF] text-[#1E60FF] ring-1 ring-[#1E60FF]'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {portal !== 'All' && <PortalIcon source={portal} className="w-4 h-4 rounded-sm" />}
                        <span>{portal}</span>
                      </div>
                      <span className="text-[11px] opacity-75">
                        {portal === 'All' ? (statusFilter === 'saved' ? allSavedJobs.length : totalJobsCount) : platformCounts[portal] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Apply Action Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 pb-safe">
              <button
                onClick={() => setIsMobileFilterDrawerOpen(false)}
                className="w-full py-3 rounded-2xl bg-[#1E60FF] hover:bg-[#1B54E0] text-white font-black text-sm shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
              >
                <span>Show {filteredJobs.length} Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODALS                                                 */}
      {/* ========================================================= */}

      {/* Job Detail & Direct Apply Modal */}
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
                  <PortalIcon source={selectedJob.source_app} showLabel={true} />

                  <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 font-bold">
                    {selectedJob.search_category}
                  </span>

                  {selectedJob.is_applied && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                      Applied ✓
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {selectedJob.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-[#1E60FF] shrink-0" />
                    <span>{selectedJob.company}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{selectedJob.location || 'Remote'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Listed: {formatDisplayDate(selectedJob.scraped_date || selectedJob.date_posted)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Application Link */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Application URL (Employer Site)
              </label>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-2.5">
                <span className="text-xs text-slate-700 font-mono break-all line-clamp-2 select-all flex-1">
                  {selectedJob.apply_link}
                </span>
                <button
                  onClick={() => handleCopyLink(selectedJob.apply_link)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shrink-0 shadow-2xs"
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

            {/* Overview / Details */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Job Overview & Details Snippet
              </label>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                {selectedJob.description ||
                  'No description snippet was provided by the job board. Click the Apply button below to view all qualifications and submit your application directly on the employer site.'}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleSaved(e, selectedJob)}
                  className={`text-xs px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                    currentUser && (currentUser.saved_job_ids || []).includes(selectedJob.id)
                      ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs'
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
                      ? 'Saved ★'
                      : 'Save Job'}
                  </span>
                </button>

                <button
                  onClick={(e) => handleToggleRead(e, selectedJob)}
                  className={`text-xs px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                    currentUser && (currentUser.read_job_ids || []).includes(selectedJob.id)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
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

              <a
                href={selectedJob.apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1E60FF] hover:bg-[#1B54E0] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition transform active:scale-95"
              >
                <span>🚀 Apply on {selectedJob.source_app || 'Employer Site'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Secret Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Admin Config Modal */}
      <AdminConfigModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onConfigSaved={(savedConfig) => {
          if (savedConfig.job_roles) setCloudRoles(savedConfig.job_roles);
          if (savedConfig.locations) setCloudLocations(savedConfig.locations);
        }}
      />

      {/* User Auth Modal */}
      <UserAuthModal
        isOpen={isUserAuthModalOpen}
        initialMode={userAuthMode}
        onClose={() => setIsUserAuthModalOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          setCurrentUser(loggedInUser);
          setSavedSession(loggedInUser);
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        user={currentUser}
        onClose={() => setIsUserProfileModalOpen(false)}
        onLogout={handleLogout}
        onFilterSaved={() => {
          setActiveNav('saved');
          setStatusFilter('saved');
        }}
        onFilterRead={() => {
          setActiveNav('dashboard');
          setStatusFilter('read');
        }}
        onNameUpdated={(newName) => {
          setCurrentUser((prev) => ({
            ...prev,
            name: newName,
            displayName: newName
          }));
        }}
        onOpenInstall={handleTriggerInstall}
        isAppInstalled={isAppInstalled}
      />

      {/* PWA Install Modal */}
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
