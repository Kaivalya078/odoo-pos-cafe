import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRestaurantStatus, toggleRestaurantStatus as toggleApi, getLastSessionSummary } from '../services/restaurantService';

const RestaurantContext = createContext(null);

export function RestaurantProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSession, setLastSession] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getRestaurantStatus();
      setStatus(res.data.status);
    } catch {
      // Silently fail — status stays stale
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch the last closed session summary (only accessible by OWNER/ADMIN/protected routes)
  const fetchLastSession = useCallback(async () => {
    try {
      const res = await getLastSessionSummary();
      setLastSession(res.data);
    } catch {
      // Not logged in or not authorized — silently ignore
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStatus();
    fetchLastSession();
  }, [fetchStatus, fetchLastSession]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleStatus = async () => {
    const res = await toggleApi();
    setStatus(res.data.status);
    // Refresh session data after toggle (especially useful when closing)
    fetchLastSession();
    return res.data;
  };

  return (
    <RestaurantContext.Provider value={{ status, loading, lastSession, fetchStatus, fetchLastSession, toggleStatus }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
