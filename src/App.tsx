import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './store/AppContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
// Import pages
import { LiveEntry } from './pages/LiveEntry/LiveEntry';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { UpsellAnalysis } from './pages/Analysis/UpsellAnalysis';
import { SessionHistory } from './pages/LiveEntry/SessionHistory';
import { POSUpload } from './pages/POSManagement/POSUpload';

import { ServiceTimeAnalysis } from './pages/Analysis/ServiceTimeAnalysis';
import { TableTurnoverAnalysis } from './pages/Analysis/TableTurnoverAnalysis';
import { KitchenAnalysis } from './pages/Analysis/KitchenAnalysis';
import { MenuAnalysis } from './pages/Analysis/MenuAnalysis';
import { StaffAnalysis } from './pages/Analysis/StaffAnalysis';
import { MenuManagement } from './pages/MenuManagement/MenuManagement';

import { ToastContainer, toast } from './components/ui/Toast';
import { ConfirmModalContainer } from './components/ui/ConfirmModal';
import { ConnectionStatus } from './components/ui/ConnectionStatus';

import { Settings as SettingsPage } from './pages/Settings/Settings';

// Placeholder Auth Guard
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { currentUser } = useApp();

  React.useEffect(() => {
    if (!window.indexedDB) {
      toast.error('Trình duyệt không hỗ trợ lưu dữ liệu local. Vui lòng dùng Chrome/Edge/Safari mới nhất, không dùng chế độ ẩn danh.');
    }
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        if (est.quota && est.quota < 50 * 1024 * 1024) {
          toast.error('Dung lượng lưu trữ thấp, dữ liệu có thể bị xóa.');
        }
      });
      if (navigator.storage.persist) {
        navigator.storage.persist().catch(console.error);
      }
    }
  }, []);

  return (
    <>
      <ConnectionStatus />
      <ToastContainer />
      <ConfirmModalContainer />
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to={currentUser.role === 'staff' ? "/live-entry" : "/dashboard"} replace /> : <Login />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Dashboard /></ProtectedRoute>} />
          <Route path="/live-entry/*" element={<LiveEntry />} />
          
          {/* Modules */}
          <Route path="/pos-upload" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><POSUpload /></ProtectedRoute>} />
          <Route path="/live-history" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SessionHistory /></ProtectedRoute>} />
          <Route path="/analysis/upsell" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><UpsellAnalysis /></ProtectedRoute>} />
          <Route path="/analysis/service-time" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ServiceTimeAnalysis /></ProtectedRoute>} />
          <Route path="/analysis/table-turnover" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><TableTurnoverAnalysis /></ProtectedRoute>} />
          <Route path="/analysis/kitchen" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><KitchenAnalysis /></ProtectedRoute>} />
          <Route path="/analysis/menu" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MenuAnalysis /></ProtectedRoute>} />
          <Route path="/analysis/staff" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><StaffAnalysis /></ProtectedRoute>} />
          <Route path="/menu-management" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MenuManagement /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SettingsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
}

