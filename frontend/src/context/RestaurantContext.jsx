import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRestaurantStatus, toggleRestaurantStatus as toggleApi } from '../services/restaurantService';

const RestaurantContext = createContext(null);

export function RestaurantProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleStatus = async () => {
    const res = await toggleApi();
    setStatus(res.data.status);
    return res.data;
  };

  return (
    <RestaurantContext.Provider value={{ status, loading, fetchStatus, toggleStatus }}>
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
