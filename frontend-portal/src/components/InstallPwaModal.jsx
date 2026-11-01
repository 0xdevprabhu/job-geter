import React from 'react';
import { X, Download, Smartphone, Monitor, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

export default function InstallPwaModal({
  isOpen,
  onClose,
  onInstall,
  canDirectInstall,
  isInstalled
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Top Header Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo Badge */}
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 mx-auto mb-3 shadow-lg flex items-center justify-center">
            <img src="/zipzap_logo.png" alt="ZipZap" className="w-12 h-12 rounded-xl" />
          </div>

          <h3 className="text-xl font-black tracking-tight">Install ZipZap App</h3>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Fast, lightning-speed access right from your Home Screen & Desktop
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
              <Sparkles className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">1-Tap Access</div>
              <div className="text-[9px] text-slate-500">No URL typing</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-100">
              <Monitor className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">Fullscreen</div>
              <div className="text-[9px] text-slate-500">Native app feel</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">Lightweight</div>
              <div className="text-[9px] text-slate-500">Less than 1 MB</div>
            </div>
          </div>

          {/* Direct Install Button (If supported by browser prompt) */}
          {canDirectInstall && !isInstalled ? (
            <div className="pt-1">
              <button
                onClick={() => {
                  onInstall();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>Install ZipZap Now</span>
              </button>
            </div>
          ) : isInstalled ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-semibold text-emerald-700">
              ✓ ZipZap App is already installed on your device!
            </div>
          ) : (
            /* Step-by-Step Instructions for Chrome/Edge/Android/iOS */
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                How to install:
              </div>

              {/* Desktop (Chrome / Edge / Brave) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Monitor className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Chrome / Edge on PC/Mac:</span>
                  <p className="mt-0.5 text-slate-500">
                    Click the <strong className="text-slate-800">Install icon (⊕)</strong> on the right side of your browser address bar, then click <strong className="text-slate-800">"Install"</strong>.
                  </p>
                </div>
              </div>

              {/* Android Chrome */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Android Chrome:</span>
                  <p className="mt-0.5 text-slate-500">
                    Tap the <strong>three dots (⋮)</strong> at top-right &gt; select <strong className="text-slate-800">"Install app"</strong> or <strong className="text-slate-800">"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>

              {/* iPhone Safari */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">iPhone / iPad Safari:</span>
                  <p className="mt-0.5 text-slate-500">
                    Tap the <strong className="text-slate-800">Share button (⎋)</strong> at the bottom &gt; scroll and tap <strong className="text-slate-800">"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

