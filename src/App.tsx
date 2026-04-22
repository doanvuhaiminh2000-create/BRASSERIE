import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './store/AppContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
// Import pages (we will create these next)
import { LiveEntry } from './pages/LiveEntry/LiveEntry';
import { Dashboard } from './pages/Dashboard/Dashboard';

// Placeholder Auth Guard
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to={currentUser.role === 'staff' ? "/live-entry" : "/dashboard"} replace /> : <Login />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Dashboard /></ProtectedRoute>} />
        <Route path="/live-entry/*" element={<LiveEntry />} />
        
        {/* Placeholders for other modules */}
        <Route path="/pos-upload" element={<div className="p-8 text-white">Quản Lý Dữ Liệu POS (Module 1) - Coming soon</div>} />
        <Route path="/analysis/upsell" element={<div className="p-8 text-white">Hành Vi Order & Upsell - Coming soon</div>} />
        <Route path="/analysis/service-time" element={<div className="p-8 text-white">Thời Gian Phục Vụ - Coming soon</div>} />
        <Route path="/analysis/table-turnover" element={<div className="p-8 text-white">Vòng Quay Bàn - Coming soon</div>} />
        <Route path="/analysis/kitchen" element={<div className="p-8 text-white">Hiệu Quả Bếp - Coming soon</div>} />
        <Route path="/analysis/menu" element={<div className="p-8 text-white">Hiệu Quả Menu - Coming soon</div>} />
        <Route path="/analysis/staff" element={<div className="p-8 text-white">Hiệu Suất Nhân Viên - Coming soon</div>} />
        <Route path="/settings" element={<div className="p-8 text-white">Cài Đặt Hệ Thống - Coming soon</div>} />
      </Route>
    </Routes>
  );
}

