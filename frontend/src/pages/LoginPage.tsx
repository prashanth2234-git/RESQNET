import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, UserPlus, KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = (role: string) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') return from;
    if (role === 'COORDINATOR') return '/coordinator';
    if (role === 'RESPONDER') return '/responder';
    return '/citizen';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const user = await register({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
        });
        navigate(redirectPath(user.role));
      } else {
        const user = await login(email, password);
        navigate(redirectPath(user.role));
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setIsRegister(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <DisclaimerBanner compact />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-6">
        {/* Left Column: Quick Synthetic Demo Accounts */}
        <div className="md:col-span-5 bg-resq-navy text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-resq-amber" />
            <span>Synthetic Demo Accounts</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            One-click test credentials populated with synthetic disaster scenarios, incident triage feeds, and unit assignments:
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => fillDemoAccount('coordinator@resqnet.org', 'ResqnetCoord#2026')}
              className="w-full text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-300 group-hover:text-white">
                  Incident Coordinator
                </span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                  COORDINATOR
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Elena Vance • Incident Commander</p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                coordinator@resqnet.org
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('sar.alpha@resqnet.org', 'Responder#2026')}
              className="w-full text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-300 group-hover:text-white">
                  Search &amp; Rescue Alpha
                </span>
                <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                  RESPONDER
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Capt. Marcus Vance • Rescue &amp; Evac</p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                sar.alpha@resqnet.org
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('water.bravo@resqnet.org', 'Responder#2026')}
              className="w-full text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-cyan-300 group-hover:text-white">
                  Flood Boat Squadron Bravo
                </span>
                <span className="text-[10px] bg-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded font-mono">
                  RESPONDER
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Lt. Carlos Mendez • Water Rescue &amp; Evac</p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                water.bravo@resqnet.org
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('medic.delta@resqnet.org', 'Responder#2026')}
              className="w-full text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-300 group-hover:text-white">
                  Medical Unit Delta
                </span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                  RESPONDER
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Dr. Sarah Lin • Medical First Aid</p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                medic.delta@resqnet.org
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('citizen.marina@example.com', 'Citizen#2026')}
              className="w-full text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200 group-hover:text-white">
                  Citizen Account
                </span>
                <span className="text-[10px] bg-slate-500/30 text-slate-200 px-1.5 py-0.5 rounded font-mono">
                  CITIZEN
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Marina Santos • Submits &amp; tracks requests</p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                citizen.marina@example.com
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Login Form */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-xl border border-resq-border shadow-sm">
          <div className="flex border-b border-resq-border mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                !isRegister
                  ? 'border-resq-blue text-resq-blue'
                  : 'border-transparent text-resq-muted hover:text-resq-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                isRegister
                  ? 'border-resq-blue text-resq-blue'
                  : 'border-transparent text-resq-muted hover:text-resq-text'
              }`}
            >
              Citizen Registration
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-resq-red mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold text-resq-text mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Alex Johnson"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-resq-text mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-resq-text mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-resq-text mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2"
              icon={isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            >
              {isRegister ? 'Register Citizen Account' : 'Authenticate to RESQNET'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-resq-muted">
            Need emergency assistance without registering an account?{' '}
            <Link to="/request" className="text-resq-blue font-bold hover:underline">
              Submit Request as Guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
