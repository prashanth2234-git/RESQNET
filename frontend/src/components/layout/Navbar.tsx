import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  ClipboardList,
  Map,
  Users,
  BarChart3,
  FileText,
  UserCheck,
  PlusCircle,
  LogIn,
  LogOut,
  Menu,
  X,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../common/NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, logout, isCoordinator, isResponder, isCitizen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-resq-navy text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-md bg-resq-blue flex items-center justify-center text-white shadow group-hover:bg-resq-blue-light transition">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-wider text-white">RESQNET</span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300 uppercase tracking-widest border border-white/10">
                  Coordination
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
            {/* Public Links */}
            {!user && (
              <>
                <Link
                  to="/"
                  className={`px-3 py-1.5 rounded-md transition ${
                    isActive('/') ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/request"
                  className="px-3.5 py-1.5 rounded-md bg-resq-red hover:bg-red-700 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Request Assistance
                </Link>
              </>
            )}

            {/* Coordinator Links */}
            {isCoordinator && (
              <>
                <Link
                  to="/coordinator"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400" /> Command Center
                </Link>
                <Link
                  to="/coordinator/requests"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator/requests') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-amber-400" /> All Incidents
                </Link>
                <Link
                  to="/coordinator/map"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator/map') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Map className="w-4 h-4 text-emerald-400" /> Disaster Map
                </Link>
                <Link
                  to="/coordinator/responders"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator/responders') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-400" /> Responders
                </Link>
                <Link
                  to="/coordinator/analytics"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator/analytics') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-purple-400" /> Analytics
                </Link>
                <Link
                  to="/coordinator/audit"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/coordinator/audit') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <History className="w-4 h-4 text-slate-400" /> Audit Trail
                </Link>
              </>
            )}

            {/* Responder Links */}
            {isResponder && (
              <>
                <Link
                  to="/responder"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/responder') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Unit Dashboard
                </Link>
              </>
            )}

            {/* Citizen Links */}
            {isCitizen && (
              <>
                <Link
                  to="/citizen"
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive('/citizen') ? 'bg-white/20 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-400" /> My Requests
                </Link>
                <Link
                  to="/request"
                  className="px-3.5 py-1.5 rounded-md bg-resq-red hover:bg-red-700 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> New Request
                </Link>
              </>
            )}
          </div>

          {/* Right Action Icons & Auth Profile */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <NotificationDropdown />
                <div className="h-6 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white leading-tight">{user.full_name}</div>
                    <div className="text-[10px] font-semibold text-slate-300 tracking-wider">
                      {user.role}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 rounded-md transition flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
                <Link
                  to="/request"
                  className="px-3.5 py-1.5 text-sm font-semibold bg-resq-blue hover:bg-resq-blue-light text-white rounded-md transition shadow-sm"
                >
                  Need Help?
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            {user && <NotificationDropdown />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-md hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 px-4 pt-3 pb-5 bg-resq-navy-dark space-y-2">
          {user && (
            <div className="pb-3 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
              <div>
                <p className="font-bold text-white text-sm">{user.full_name}</p>
                <p>{user.email} • <span className="font-semibold text-resq-blue-light">{user.role}</span></p>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1 text-sm pt-1">
            {!user && (
              <>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10"
                >
                  Home
                </Link>
                <Link
                  to="/request"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded bg-resq-red font-semibold text-white text-center mt-1"
                >
                  Submit Request
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded bg-white/10 text-white text-center mt-2 flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" /> Demo Sign In
                </Link>
              </>
            )}

            {isCoordinator && (
              <>
                <Link
                  to="/coordinator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400" /> Command Center
                </Link>
                <Link
                  to="/coordinator/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <ClipboardList className="w-4 h-4 text-amber-400" /> All Incidents
                </Link>
                <Link
                  to="/coordinator/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <Map className="w-4 h-4 text-emerald-400" /> Disaster Map
                </Link>
                <Link
                  to="/coordinator/responders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-indigo-400" /> Responders Directory
                </Link>
                <Link
                  to="/coordinator/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 text-purple-400" /> Analytics
                </Link>
                <Link
                  to="/coordinator/audit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <History className="w-4 h-4 text-slate-400" /> Audit Trail
                </Link>
              </>
            )}

            {isResponder && (
              <Link
                to="/responder"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Unit Dashboard
              </Link>
            )}

            {isCitizen && (
              <>
                <Link
                  to="/citizen"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-400" /> My Requests
                </Link>
                <Link
                  to="/request"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded bg-resq-red font-semibold text-white text-center mt-2"
                >
                  New Request
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
