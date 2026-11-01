import React from 'react';
import {
  X,
  User,
  LogOut,
  Bookmark,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Mail,
  ExternalLink,
  Download
} from 'lucide-react';

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onFilterSaved,
  onFilterRead,
  onOpenInstall,
  isAppInstalled = false
}) {
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

  // Get initial letter
  const userInitial = (user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Top Gradient Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-black tracking-wide -mt-3">
            <span>⚡ ZipZap Member</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Avatar Circle */}
        <div className="relative flex justify-center -mt-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-4 border-white shadow-xl flex items-center justify-center text-white text-3xl font-extrabold tracking-wider">
            {userInitial}
          </div>
          <span className="absolute bottom-0 right-1/2 translate-x-7 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>

        {/* User Info */}
        <div className="text-center px-6 pt-3 pb-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified User</span>
          </div>
          <h3 className="text-base font-bold text-slate-800 break-all">{user.email}</h3>
          <p className="text-xs text-slate-400 flex items-center justify-center space-x-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            <span>Member since {memberDate}</span>
          </p>
        </div>

        {/* Activity Quick Stats */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onFilterSaved?.();
                onClose();
              }}
              className="p-3 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 rounded-xl text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <Bookmark className="w-4 h-4 text-purple-600 fill-purple-200" />
                <span className="text-xs font-semibold text-purple-600 group-hover:underline">View</span>
              </div>
              <div className="text-xl font-bold text-purple-900 mt-1">{savedCount}</div>
              <div className="text-[11px] font-medium text-purple-600/80">Saved Jobs</div>
            </button>

            <button
              onClick={() => {
                onFilterRead?.();
                onClose();
              }}
              className="p-3 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 rounded-xl text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600 group-hover:underline">View</span>
              </div>
              <div className="text-xl font-bold text-emerald-900 mt-1">{readCount}</div>
              <div className="text-[11px] font-medium text-emerald-600/80">Marked Read</div>
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 flex items-center justify-center space-x-2 transition-all shadow-2xs"
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
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 font-medium text-sm rounded-xl border border-slate-200 hover:border-red-200 flex items-center justify-center space-x-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

