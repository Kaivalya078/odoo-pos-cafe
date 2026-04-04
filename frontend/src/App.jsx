import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider } from './context/RestaurantContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OwnerPanel from './pages/OwnerPanel';
import AdminPanel from './pages/AdminPanel';
import KitchenScreen from './pages/KitchenScreen';
import CashierScreen from './pages/CashierScreen';
import PublicMenu from './pages/PublicMenu';
import TableSelection from './pages/TableSelection';
import OrderPage from './pages/OrderPage';

const ROLE_REDIRECT = {
  OWNER: '/owner',
  ADMIN: '/admin',
  KITCHEN: '/kitchen',
  CASHIER: '/cashier',
};

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_REDIRECT[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#22262f',
                color: '#ececf1',
                border: '1px solid #2e3038',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />

          <Routes>
            {/* Public — accessible without login */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/menu" element={<PublicMenu />} />
            <Route path="/tables" element={<TableSelection />} />
            <Route path="/order" element={<OrderPage />} />

            {/* Protected (with sidebar layout) */}
            <Route element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'KITCHEN', 'CASHIER']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/owner" element={
                <ProtectedRoute allowedRoles={['OWNER']}>
                  <OwnerPanel />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['KITCHEN', 'OWNER']}>
                  <KitchenScreen />
                </ProtectedRoute>
              } />
              <Route path="/cashier" element={
                <ProtectedRoute allowedRoles={['CASHIER', 'OWNER', 'ADMIN']}>
                  <CashierScreen />
                </ProtectedRoute>
              } />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
