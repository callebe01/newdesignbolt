import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse-subtle">Loading...</div>
      </div>
    );
  }
  
  return user ? <Outlet /> : <Navigate to="/login" />;
};