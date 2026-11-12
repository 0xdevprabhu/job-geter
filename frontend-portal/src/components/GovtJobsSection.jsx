import React, { useState, useMemo } from 'react';
import {
  Landmark,
  FileText,
  Calendar,
  Users,
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  Award,
  Ticket,
  Bookmark,
  Share2,
  RefreshCw,
  MapPin,
  ArrowUpRight,
  Check,
  Building2,
  SlidersHorizontal,
  X,
  Flame
} from 'lucide-react';
import CustomSelectDropdown from './CustomSelectDropdown';

// Helper: Current Indian Standard Time (YYYY-MM-DD)
function getTodayISTDate() {
  const istStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = istStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseIsoToLocalDate(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return null;
  const parts = isoStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function normalizeDedupeKey(item) {
  const cat = (item.category || 'job').toLowerCase().trim();
  const board = (item.board || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const title = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const postDate = (item.post_date || '').trim();
  return `${cat}_${board}_${title}_${postDate}`;
}

export default function GovtJobsSection({
  govtItems = [],
  isLoading = false,
  onRefresh,
  currentUser,
  onSaveJob,
  savedJobIds = []
}) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'job', 'admit_card', 'result', 'exam_date', 'saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedJobRole, setSelectedJobRole] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedQualification, setSelectedQualification] = useState('All');
  const [showClosed, setShowClosed] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Deduplicate items defensively & compute live days_left / status in IST
  const processedGovtItems = useMemo(() => {
    const todayDate = getTodayISTDate();
    const map = new Map();

    govtItems.forEach((rawItem) => {
      const key = normalizeDedupeKey(rawItem);
      const existing = map.get(key);

      // Prefer specific state over "All India" if duplicates exist in older data
      if (existing) {
        const existingIsGeneric = !existing.state || existing.state === 'All India';
        const currentIsSpecific = rawItem.state && rawItem.state !== 'All India';
        if (!(existingIsGeneric && currentIsSpecific)) {
          return;
        }
      }

      // Compute live status and days_left relative to today's IST date
      let liveDaysLeft = rawItem.days_left ?? null;
      let liveStatus = rawItem.status || 'Application Open';

      if ((rawItem.category === 'job' || !rawItem.category) && rawItem.last_date_iso) {
        const endDate = parseIsoToLocalDate(rawItem.last_date_iso);
        if (endDate) {
          const diffDays = Math.round((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          liveDaysLeft = diffDays;
          if (diffDays < 0) {
            liveStatus = 'Registration Closed';
          } else if (diffDays === 0) {
            liveStatus = 'Closes Today!';
          } else if (diffDays <= 3) {
            liveStatus = `Closes in ${diffDays}d`;
          } else {
            liveStatus = 'Application Open';
          }
        }
      }

      const vacNum = rawItem.vacancies
        ? parseInt(String(rawItem.vacancies).replace(/[^\d]/g, ''), 10) || 0
        : 0;

      map.set(key, {
        ...rawItem,
        days_left: liveDaysLeft,
        status: liveStatus,
        is_expired: liveDaysLeft !== null && liveDaysLeft < 0,
        vacancy_count: vacNum,
      });
    });

    return Array.from(map.values());
  }, [govtItems]);

  // Active (non-expired) pool unless user toggles closed
  const activePool = useMemo(() => {
    if (showClosed) return processedGovtItems;
    return processedGovtItems.filter((it) => !it.is_expired);
  }, [processedGovtItems, showClosed]);

  // Derive unique states list from live items
  const availableStates = useMemo(() => {
    const set = new Set();
    activePool.forEach((it) => {
      if (it.state && it.state !== 'All India') set.add(it.state);
    });
    const sorted = Array.from(set).sort();
    return ['All', 'All India', ...sorted];
  }, [activePool]);

  // Derive available districts for selected state
  const availableDistricts = useMemo(() => {
    if (selectedState === 'All' || selectedState === 'All India') {
      const set = new Set();
      activePool.forEach((it) => {
        if (it.district) set.add(it.district);
      });
      return ['All', ...Array.from(set).sort()];
    }
    const set = new Set();
    activePool.forEach((it) => {
      if (it.state === selectedState && it.district) {
        set.add(it.district);
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [activePool, selectedState]);

  // Dynamically derive available Job Roles based on selected State & District
  const availableJobRoles = useMemo(() => {
    const set = new Set();
    activePool.forEach((it) => {
      if (selectedState !== 'All') {
        if (selectedState === 'All India') {
          if (it.state !== 'All India') return;
        } else if (it.state !== selectedState) {
          return;
        }
      }
      if (selectedDistrict !== 'All' && it.district !== selectedDistrict) {
        return;
      }
      if (it.title) {
        set.add(it.title.trim());
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [activePool, selectedState, selectedDistrict]);

  // Derive sectors list
  const sectors = [
    'All',
    'Tamil Nadu Govt',
    'Banking & Finance',
    'Railways',
    'Central Govt / UPSC / SSC',
    'Defence & Police',
    'State Govt',
    'PSU / Technical',
    'Teaching & Education'
  ];

  // Derive qualifications list
  const qualifications = [
    'All',
    'Any Graduate',
    '10th / 12th',
    'B.Tech / Engineering',
    'Post Graduate / MBA',
    'Diploma / ITI'
  ];

  // Count active saved govt notifications
  const savedGovtCount = useMemo(() => {
    return processedGovtItems.filter((it) => savedJobIds.includes(it.id) && !it.is_expired).length;
  }, [processedGovtItems, savedJobIds]);

  const expiredCount = useMemo(() => {
    return processedGovtItems.filter((it) => it.is_expired).length;
  }, [processedGovtItems]);

  // Calculate live statistics strictly on active (open) items
  const stats = useMemo(() => {
    const openItems = processedGovtItems.filter((i) => !i.is_expired);
    const total = openItems.length;
    const jobsCount = openItems.filter((i) => i.category === 'job').length;
    const admitCardsCount = openItems.filter((i) => i.category === 'admit_card').length;
    const resultsCount = openItems.filter((i) => i.category === 'result').length;
    const examDatesCount = openItems.filter((i) => i.category === 'exam_date').length;

    let totalVacancies = 0;
    openItems.forEach((i) => {
      if (i.vacancy_count > 0) totalVacancies += i.vacancy_count;
    });

    return { total, jobsCount, admitCardsCount, resultsCount, examDatesCount, totalVacancies };
  }, [processedGovtItems]);

  // Filter & Sort items cleanly (Closing Soonest / Latest Posted first)
  const filteredItems = useMemo(() => {
    const filtered = activePool.filter((item) => {
      if (activeCategory === 'saved') {
        if (!savedJobIds.includes(item.id)) return false;
      } else if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // State Filter
      if (selectedState !== 'All') {
        if (selectedState === 'All India') {
          if (item.state !== 'All India') return false;
        } else {
          if (item.state !== selectedState) return false;
        }
      }

      // District Filter
      if (selectedDistrict !== 'All') {
        if (item.district !== selectedDistrict) return false;
      }

      // Job Role Filter
      if (selectedJobRole !== 'All') {
        if (item.title !== selectedJobRole) return false;
      }

      // Sector Filter
      if (selectedSector !== 'All') {
        if (!item.sector || !item.sector.toLowerCase().includes(selectedSector.toLowerCase())) {
          return false;
        }
      }

      // Qualification Filter
      if (selectedQualification !== 'All') {
        const itemQual = (item.qualification || '').toLowerCase();
        const searchQual = selectedQualification.toLowerCase();
        if (searchQual.includes('graduate') && !itemQual.includes('graduat') && !itemQual.includes('degree')) {
          return false;
        }
        if (searchQual.includes('10th') && !itemQual.includes('10th') && !itemQual.includes('12th') && !itemQual.includes('sslc')) {
          return false;
        }
        if (searchQual.includes('engineering') && !itemQual.includes('b.e') && !itemQual.includes('b.tech') && !itemQual.includes('eng')) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchBoard = (item.board || '').toLowerCase().includes(q);
        const matchQual = (item.qualification || '').toLowerCase().includes(q);
        const matchSector = (item.sector || '').toLowerCase().includes(q);
        const matchState = (item.state || '').toLowerCase().includes(q);
        const matchDistrict = (item.district || '').toLowerCase().includes(q);
        if (!matchTitle && !matchBoard && !matchQual && !matchSector && !matchState && !matchDistrict) {
          return false;
        }
      }

      return true;
    });

    // Prioritize urgent items closing within 2 days, then newest posted date
    return filtered.sort((a, b) => {
      const aUrgent = a.days_left !== null && a.days_left >= 0 && a.days_left <= 2;
      const bUrgent = b.days_left !== null && b.days_left >= 0 && b.days_left <= 2;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1;
      return (b.post_date_iso || '').localeCompare(a.post_date_iso || '');
    });
  }, [
    activePool,
    activeCategory,
    savedJobIds,
    selectedState,
    selectedDistrict,
    selectedJobRole,
    selectedSector,
    selectedQualification,
    searchQuery
  ]);

  const handleCopyLink = (item) => {
    const url = item.apply_url || item.details_url || window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSectorBadgeStyle = (sector = '') => {
    const s = sector.toLowerCase();
    if (s.includes('bank')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('rail')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('defence') || s.includes('police')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (s.includes('tamil') || s.includes('tnpsc')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (s.includes('upsc') || s.includes('ssc') || s.includes('central')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedState('All');
    setSelectedDistrict('All');
    setSelectedJobRole('All');
    setSelectedSector('All');
    setSelectedQualification('All');
    setActiveCategory('all');
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-12 animate-in fade-in duration-300">
      {/* ========================================================= */}
      {/* 1. HERO OFFICIAL PORTAL BANNER - DESKTOP & MOBILE POLISHED*/}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-300 shadow-xs">
              <div className="flex items-center gap-1.5 shrink-0">
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                <span>All India & State Govt Portal</span>
              </div>
              <span className="hidden sm:inline text-white/30">•</span>
              <div className="flex items-center gap-1.5 text-white/90 font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] sm:text-xs">State & District Wise Live Sync</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Government Jobs, Exams & Declared Results
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Real-time vacancies, official notification PDFs, and direct application links from UPSC, SSC, Banking, Railways, Tamil Nadu Govt, and 28+ State PSCs.
            </p>
          </div>

          {/* Clean Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            {/* Vacancies */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3 sm:p-3.5 text-center shadow-inner">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-400 block tracking-tight">
                {stats.totalVacancies > 0 ? stats.totalVacancies.toLocaleString('en-IN') : '12,500+'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
                Total Vacancies
              </span>
            </div>

            {/* Active Jobs */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3 sm:p-3.5 text-center shadow-inner">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 block tracking-tight">
                {stats.jobsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
                Active Jobs
              </span>
            </div>

            {/* Admit Cards */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3 sm:p-3.5 text-center shadow-inner">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-300 block tracking-tight">
                {stats.admitCardsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
                Admit Cards
              </span>
            </div>

            {/* Results */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3 sm:p-3.5 text-center shadow-inner">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-400 block tracking-tight">
                {stats.resultsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
                Exam Results
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CATEGORY TABS (PILLS)                                  */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'all'
              ? 'bg-[#1E60FF] text-white shadow-blue-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>All Updates</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('job')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'job'
              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Latest Jobs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'job' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.jobsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('admit_card')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'admit_card'
              ? 'bg-purple-600 text-white shadow-purple-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Admit Cards & Hall Tickets</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'admit_card' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.admitCardsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('result')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'result'
              ? 'bg-amber-600 text-white shadow-amber-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Results & Cut-Offs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'result' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.resultsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('exam_date')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'exam_date'
              ? 'bg-indigo-600 text-white shadow-indigo-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Exam Schedules</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'exam_date' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.examDatesCount}
          </span>
        </button>

        {/* Saved Govt Jobs Tab */}
        <button
          onClick={() => setActiveCategory('saved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
            activeCategory === 'saved'
              ? 'bg-purple-600 text-white shadow-purple-500/25'
              : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Govt Jobs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeCategory === 'saved' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
          }`}>
            {savedGovtCount}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. MULTI-LEVEL FILTER BAR: STATE, DISTRICT, SECTOR, QUAL  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs sm:shadow-sm space-y-3">
        {/* Top Row: Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Board, Post, State (Tamil Nadu), or District..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E60FF] focus:border-transparent transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Filters: Mobile 1-col (no squished overlap) / Tablet 2-col / Desktop 5-col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
          {/* State Filter */}
          <CustomSelectDropdown
            icon={MapPin}
            iconColor="text-rose-500"
            value={selectedState}
            onChange={(val) => {
              setSelectedState(val);
              setSelectedDistrict('All');
              setSelectedJobRole('All');
            }}
            options={availableStates.map((st) => ({
              value: st,
              label: st === 'All' ? `All States / UTs (${availableStates.length - 1})` : st
            }))}
            placeholder="Select State"
          />

          {/* District Filter */}
          <CustomSelectDropdown
            icon={Building2}
            iconColor="text-amber-500"
            value={selectedDistrict}
            onChange={(val) => {
              setSelectedDistrict(val);
              setSelectedJobRole('All');
            }}
            options={availableDistricts.map((dist) => ({
              value: dist,
              label:
                dist === 'All'
                  ? selectedState !== 'All'
                    ? `All ${selectedState} Districts`
                    : 'All Districts'
                  : dist
            }))}
            placeholder="Select District"
          />

          {/* Dynamic Job Name / Role Dropdown */}
          <CustomSelectDropdown
            icon={CheckCircle2}
            iconColor="text-blue-600"
            value={selectedJobRole}
            onChange={(val) => setSelectedJobRole(val)}
            options={availableJobRoles.map((role) => ({
              value: role,
              label:
                role === 'All'
                  ? selectedDistrict !== 'All'
                    ? `All Jobs in ${selectedDistrict} (${availableJobRoles.length - 1})`
                    : selectedState !== 'All'
                    ? `All Jobs in ${selectedState} (${availableJobRoles.length - 1})`
                    : `All Job Roles (${availableJobRoles.length - 1})`
                  : role
            }))}
            placeholder="Select Job Role"
          />

          {/* Sector Filter */}
          <CustomSelectDropdown
            icon={SlidersHorizontal}
            iconColor="text-blue-500"
            value={selectedSector}
            onChange={(val) => setSelectedSector(val)}
            options={sectors.map((sec) => ({
              value: sec,
              label: sec === 'All' ? 'All Sectors' : sec
            }))}
            placeholder="Select Sector"
            searchable={false}
          />

          {/* Qualification Filter */}
          <CustomSelectDropdown
            icon={GraduationCap}
            iconColor="text-emerald-500"
            value={selectedQualification}
            onChange={(val) => setSelectedQualification(val)}
            options={qualifications.map((q) => ({
              value: q,
              label: q === 'All' ? 'Any Qualification' : q
            }))}
            placeholder="Select Qualification"
            searchable={false}
          />
        </div>

        {/* Quick State Pills & Expired Jobs Toggle Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-semibold text-slate-600">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">Popular:</span>
            {['All', 'Tamil Nadu', 'All India', 'Kerala', 'Karnataka', 'Delhi', 'Maharashtra', 'Uttar Pradesh'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setSelectedState(st);
                  setSelectedDistrict('All');
                }}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition font-bold ${
                  selectedState === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Show / Hide Expired Jobs Toggle */}
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-[11px]">Include Closed ({expiredCount})</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. RESULTS HEADER & COUNTER                               */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
          <span>Showing {filteredItems.length} Government Notifications</span>
          {selectedState !== 'All' && (
            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-[11px] font-extrabold">
              📍 {selectedState} {selectedDistrict !== 'All' ? `• ${selectedDistrict}` : ''}
            </span>
          )}
          {(searchQuery || selectedState !== 'All' || selectedDistrict !== 'All' || selectedSector !== 'All' || selectedQualification !== 'All' || activeCategory !== 'all') && (
            <button
              onClick={resetAllFilters}
              className="text-blue-600 hover:underline font-semibold text-xs ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. GOVT CARDS GRID (COMPACT & SLEEK RESPONSIVE UX)        */}
      {/* ========================================================= */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Landmark className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Government Updates Found</h3>
          <p className="text-xs text-slate-500">
            No updates matched your selected State/District or filter criteria.
          </p>
          <div className="pt-2">
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-2xl bg-[#1E60FF] text-white text-xs font-bold shadow-md hover:bg-blue-600 transition"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {filteredItems.map((item) => {
            const isSaved = savedJobIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
              >
                {/* Clean Top Subtle Tint Header without harsh AI colored border */}
                <div className={`p-4 sm:p-5 flex-1 space-y-3 bg-gradient-to-b ${
                  item.category === 'admit_card'
                    ? 'from-purple-50/40'
                    : item.category === 'result'
                    ? 'from-emerald-50/40'
                    : item.category === 'exam_date'
                    ? 'from-indigo-50/40'
                    : item.days_left !== null && item.days_left <= 3
                    ? 'from-amber-50/40'
                    : 'from-blue-50/30'
                } via-white to-white`}>
                  {/* Card Header: Board Badge + State/District Pill + Live Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shadow-xs shrink-0 border border-slate-800">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-900 tracking-tight block truncate uppercase" title={item.board}>
                          {item.board || 'Govt of India'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.state && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap max-w-full">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{item.state}{item.district ? ` • ${item.district}` : ''}</span>
                            </span>
                          )}
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getSectorBadgeStyle(item.sector)}`}>
                            {item.sector || 'All India'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {item.is_expired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          <span>Closed</span>
                        </span>
                      ) : item.days_left !== null && item.days_left >= 0 && item.days_left <= 3 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>{item.status}</span>
                        </span>
                      ) : item.category === 'admit_card' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          <Ticket className="w-3 h-3 text-purple-600" />
                          <span>Admit Card</span>
                        </span>
                      ) : item.category === 'result' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Award className="w-3 h-3 text-emerald-600" />
                          <span>Result Out</span>
                        </span>
                      ) : item.category === 'exam_date' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Exam Date</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{item.status || 'Active'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post / Exam Title */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#1E60FF] transition-colors leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Highlights Chips: Vacancies & Qualification */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {item.vacancies && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                        <Users className="w-3 h-3 text-orange-600" />
                        <span>{item.vacancies}</span>
                      </span>
                    )}

                    {item.qualification && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[220px]" title={item.qualification}>
                        <GraduationCap className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.qualification}</span>
                      </span>
                    )}
                  </div>

                  {/* Important Dates Box */}
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium">Notification Date:</span>
                      <span className="font-bold text-slate-800">{item.post_date || 'Recent'}</span>
                    </div>

                    {item.last_date && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium">Last Date to Apply:</span>
                        <span className={`font-bold ${
                          item.days_left !== null && item.days_left <= 3
                            ? 'text-rose-600 font-black'
                            : 'text-slate-900'
                        }`}>
                          {item.last_date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 sm:p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {item.pdf_url && (
                      <a
                        href={item.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition"
                        title="Download Official Notification PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span className="hidden sm:inline">PDF</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleCopyLink(item)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition shadow-2xs"
                      title="Share / Copy Link"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {onSaveJob && (
                      <button
                        onClick={() => onSaveJob(item.id)}
                        className={`p-2 rounded-xl border transition shadow-2xs ${
                          isSaved
                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                        title={isSaved ? 'Saved in your list' : 'Save notification'}
                      >
                        <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>

                  <a
                    href={item.apply_url || item.details_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#1E60FF] to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>
                      {item.category === 'admit_card'
                        ? 'Download Admit Card'
                        : item.category === 'result'
                        ? 'Check Result'
                        : item.category === 'exam_date'
                        ? 'View Schedule'
                        : 'Apply Online'}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
