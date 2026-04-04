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

  // Only fetch last session for logged-in staff.
  // MUST check token first — if no token, skip entirely so the 401 interceptor
  // in api.js never fires and hard-redirects customers away from /order or /menu.
  const fetchLastSession = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await getLastSessionSummary();
      setLastSession(res.data);
    } catch {
      // Not authorized or network error — ignore silently
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchLastSession();
  }, [fetchStatus, fetchLastSession]);

  // Poll status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleStatus = async () => {
    const res = await toggleApi();
    setStatus(res.data.status);
    // Refresh last session after close so the summary card updates immediately
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
