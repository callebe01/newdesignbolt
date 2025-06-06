import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPlan, UserUsage, getUserPlan, getCurrentUsage } from '../services/usage';
import { useAuth } from './AuthContext';

interface UsageContextType {
  plan: UserPlan | null;
  usage: UserUsage | null;
  loading: boolean;
  refreshUsage: () => Promise<void>;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const UsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshUsage = async () => {
    if (!user) return;
    
    try {
      const [planData, usageData] = await Promise.all([
        getUserPlan(),
        getCurrentUsage()
      ]);
      
      setPlan(planData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error refreshing usage data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshUsage();
      setLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setPlan(null);
      setUsage(null);
      setLoading(false);
    }
  }, [user]);

  return (
    <UsageContext.Provider value={{ plan, usage, loading, refreshUsage }}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsage = (): UsageContextType => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
};