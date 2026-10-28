import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-resq-navy text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-resq-blue" />
              <span>RESQNET Disaster Coordination</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Intelligent triage, deterministic priority calculation, responder allocation, and offline-resilient field coordination.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2 uppercase tracking-wider text-[11px]">
              Prototype Limitations
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              RESQNET is a demonstration platform (Problem ID: HACK-P437) and is not connected to official governmental dispatch networks.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2 uppercase tracking-wider text-[11px]">
              Immediate Emergency
            </h4>
            <div className="space-y-1 text-slate-300 text-xs font-medium">
              <p>USA / Canada: <strong className="text-red-400">911</strong></p>
              <p>European Union / International: <strong className="text-red-400">112</strong></p>
              <p>National Disaster Response: <strong className="text-red-400">1070 / 108</strong></p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} RESQNET Coordination Prototype. All synthetic test records fictionalized.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Map data © OpenStreetMap contributors</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
