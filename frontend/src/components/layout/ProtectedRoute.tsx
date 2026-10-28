import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LoadingSpinner } from '../common/Loading';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-resq-bg">
        <LoadingSpinner message="Verifying authorization credentials..." />
      </div>
    );
  }

  if (!user) {
    // Redirect to login preserving intended target
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-lg border border-red-200 text-center shadow-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-resq-red mx-auto mb-3">
          <ShieldX className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-resq-text">Unauthorized Access</h2>
        <p className="text-xs text-resq-muted mt-2">
          Your current account role (<strong>{user.role}</strong>) does not have permission to view this operational section.
        </p>
        <div className="mt-5">
          <a
            href="/"
            className="inline-block px-4 py-2 bg-resq-blue text-white rounded text-xs font-semibold hover:bg-resq-blue-dark transition"
          >
            Return to Safety Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
