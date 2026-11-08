import React, { useState } from 'react';
import {
  X,
  User,
  LogOut,
  Bookmark,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Mail,
  Download,
  Edit2,
  Check,
  Loader2
} from 'lucide-react';
import { updateUserName } from '../services/authService';

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onFilterSaved,
  onFilterRead,
  onOpenInstall,
  onNameUpdated,
  isAppInstalled = false
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [editError, setEditError] = useState('');

  if (!isOpen || !user) return null;

  const savedCount = user.saved_job_ids?.length || 0;
  const readCount = user.read_job_ids?.length || 0;

  // Format joined date
  const memberDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent Member';

  // Get user name and initial letter (Derived from Name, NOT email starting numbers)
  const currentDisplayName = user.name || user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  
  // Calculate alphabetical initial if possible
  const getInitial = (nameStr) => {
    if (!nameStr) return 'U';
    const clean = nameStr.trim();
    // Look for first alphabet character
    const match = clean.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : clean.charAt(0).toUpperCase();
  };

  const userInitial = getInitial(currentDisplayName);

  // Start editing name
  const handleStartEdit = () => {
    setEditNameValue(currentDisplayName);
    setEditError('');
    setIsEditingName(true);
  };

  // Save updated name
  const handleSaveName = async (e) => {
    e?.preventDefault();
    const clean = editNameValue.trim();
    if (!clean || clean.length < 2) {
      setEditError('Name must be at least 2 characters long.');
      return;
    }

    setIsSavingName(true);
    setEditError('');

    const res = await updateUserName(user.email, clean);
    setIsSavingName(false);

    if (res.success) {
      setIsEditingName(false);
      onNameUpdated?.(clean);
    } else {
      setEditError(res.error || 'Failed to update name.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Creative Top Brand Header Banner (Replacing lightning emoji with authentic ZipZap design) */}
        <div className="h-28 bg-gradient-to-r from-[#001744] via-[#002875] to-[#1E60FF] relative flex items-center justify-between px-6 pt-2 pb-6 overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-blue-500/20 blur-xl pointer-events-none" />

          {/* Left Brand Badge: Authentic Logo + ZipZap Member */}
          <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xs -mt-4">
            <img
              src="/portal/zip-zap.png"
              alt="ZipZap"
              className="w-5 h-5 rounded-md object-contain bg-white/20 p-0.5"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/zip-zap.png';
              }}
            />
            <div className="flex items-center gap-1 text-white text-xs font-black tracking-tight">
              <span>Zip<span className="text-[#01ABB9]">Zap</span></span>
              <span className="text-white/80 font-bold ml-0.5">Member</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="relative z-10 p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/15 transition-colors -mt-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Avatar Circle */}
        <div className="relative flex justify-center -mt-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#002262] via-[#1E60FF] to-[#01ABB9] border-4 border-white shadow-xl flex items-center justify-center text-white text-3xl font-black tracking-wider">
            {userInitial}
          </div>
          <span className="absolute bottom-0 right-1/2 translate-x-7 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>

        {/* User Info & Editable Name */}
        <div className="text-center px-6 pt-3 pb-2 space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified User Account</span>
          </div>

          {/* Editable Full Name */}
          <div className="pt-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex flex-col items-center gap-1.5 max-w-xs mx-auto">
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    required
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-3 py-1.5 border border-blue-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                    title="Save name"
                  >
                    {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editError && <span className="text-[10px] text-rose-600 font-semibold">{editError}</span>}
              </form>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {currentDisplayName}
                </h3>
                <button
                  onClick={handleStartEdit}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit your name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Email Address */}
          <p className="text-xs font-semibold text-slate-500 break-all">{user.email}</p>

          <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-1 pt-0.5">
            <Calendar className="w-3 h-3" />
            <span>Member since {memberDate}</span>
          </p>
        </div>

        {/* Activity Quick Stats */}
        <div className="px-6 py-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onFilterSaved?.();
                onClose();
              }}
              className="p-3 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 rounded-2xl text-left transition-colors group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <Bookmark className="w-4 h-4 text-purple-600 fill-purple-200" />
                <span className="text-[11px] font-bold text-purple-600 group-hover:underline">View All →</span>
              </div>
              <div className="text-xl font-black text-purple-900 mt-1">{savedCount}</div>
              <div className="text-[11px] font-semibold text-purple-600/90">Saved Jobs</div>
            </button>

            <button
              onClick={() => {
                onFilterRead?.();
                onClose();
              }}
              className="p-3 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 rounded-2xl text-left transition-colors group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-600 group-hover:underline">View All →</span>
              </div>
              <div className="text-xl font-black text-emerald-900 mt-1">{readCount}</div>
              <div className="text-[11px] font-semibold text-emerald-600/90">Marked Read</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 border-t border-slate-100 flex flex-col space-y-2">
          {!isAppInstalled && onOpenInstall && (
            <button
              onClick={() => {
                onClose();
                onOpenInstall();
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-bold text-xs rounded-2xl border border-blue-200 flex items-center justify-center space-x-2 transition-all shadow-2xs"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Install ZipZap App (Desktop/Mobile)</span>
            </button>
          )}

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs rounded-2xl border border-slate-200 hover:border-red-200 flex items-center justify-center space-x-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
