import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, allowedRole }) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-300 border-t-brand-800"></div>
          <span className="text-sm font-medium tracking-wide text-brand-300">Loading Session...</span>
        </div>
      </div>
    );
  }

  if (!userRole || userRole !== allowedRole) {
    if (allowedRole === 'admin') {
      return <Navigate to="/login" replace />;
    } else {
      return <Navigate to="/parent/login" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
