import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Activity,
  Users,
  WifiOff,
  Flame,
  Waves,
  CloudLightning,
  ChevronRight,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      navigate(`/track?code=${encodeURIComponent(trackingCode.trim())}`);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Top Banner Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DisclaimerBanner />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-resq-navy text-white rounded-2xl p-8 sm:p-12 shadow-xl border border-slate-800 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Intelligent Disaster Coordination Platform • HACK-P437
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Rapid, explainable triage for simulated emergencies.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              RESQNET centralizes disaster assistance requests across floods, storms, fires, and earthquakes. Featuring deterministic priority scoring, responder workload governance, and offline request synchronization.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/request"
                className="px-6 py-3.5 bg-resq-red hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition flex items-center gap-2 text-sm sm:text-base"
              >
                <ShieldAlert className="w-5 h-5" />
                Submit Assistance Request
              </Link>

              {user ? (
                <Link
                  to={user.role === 'COORDINATOR' ? '/coordinator' : user.role === 'RESPONDER' ? '/responder' : '/citizen'}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold border border-white/20 transition flex items-center gap-2 text-sm sm:text-base"
                >
                  Go to {user.role} Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold border border-white/20 transition flex items-center gap-2 text-sm sm:text-base"
                >
                  Sign In with Demo Accounts <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Incident Tracking Quick Search Bar */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-resq-text font-bold text-sm">
            <Search className="w-4 h-4 text-resq-blue" />
            <span>Already submitted an incident? Track your request status</span>
          </div>
          <form onSubmit={handleTrackSubmit} className="flex gap-2">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Enter unique tracking code (e.g., REQ-0001, REQ-0002)..."
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-resq-blue hover:bg-resq-blue-dark text-white rounded-lg text-sm font-semibold transition"
            >
              Lookup
            </button>
          </form>
          <div className="mt-2 text-xs text-resq-muted flex items-center gap-2">
            <span>Try demo codes:</span>
            <button
              type="button"
              onClick={() => setTrackingCode('REQ-0001')}
              className="font-mono text-resq-blue hover:underline"
            >
              REQ-0001
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setTrackingCode('REQ-0002')}
              className="font-mono text-resq-blue hover:underline"
            >
              REQ-0002
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setTrackingCode('REQ-0004')}
              className="font-mono text-resq-blue hover:underline"
            >
              REQ-0004
            </button>
          </div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-resq-text">
            Engineered for Emergency Operations
          </h2>
          <p className="text-sm text-resq-muted mt-2">
            Rigorous operational workflow bridging affected citizens, incident commanders, and field response teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-resq-red flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-resq-text">Deterministic Priority Engine</h3>
            <p className="text-xs text-resq-muted leading-relaxed">
              Transparent 0–100 scoring based on life threats, urgent medical needs, affected populations, and waiting time. No opaque black-box AI decisions.
            </p>
            <div className="text-xs font-semibold text-resq-blue flex items-center gap-1 pt-1">
              <span>Audited overrides supported</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-resq-text">Offline-First Resilience</h3>
            <p className="text-xs text-resq-muted leading-relaxed">
              Citizens and field units can submit and store assistance requests when cell towers fail. IndexedDB queues requests and syncs idempotently when reconnected.
            </p>
            <div className="text-xs font-semibold text-resq-blue flex items-center gap-1 pt-1">
              <span>Zero duplicate submissions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-resq-blue flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-resq-text">Workload-Governed Dispatch</h3>
            <p className="text-xs text-resq-muted leading-relaxed">
              Coordinator command center enforces capacity limits on responder teams. Prevents overloading volunteer crews without documented commander override.
            </p>
            <div className="text-xs font-semibold text-resq-blue flex items-center gap-1 pt-1">
              <span>Live responder telemetry</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Simulated Incident Scenarios Covered */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100/70 rounded-2xl p-8 border border-slate-200">
          <h3 className="text-lg font-bold text-resq-text mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-resq-blue" />
            Simulated Emergency Scenarios Supported
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <Waves className="w-4 h-4 text-blue-600" />
              <span>Surge Flooding &amp; Levees</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <Flame className="w-4 h-4 text-red-600" />
              <span>Wildfires &amp; Evacuation</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <CloudLightning className="w-4 h-4 text-amber-600" />
              <span>Coastal Gale Storms</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Medical &amp; Life Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
