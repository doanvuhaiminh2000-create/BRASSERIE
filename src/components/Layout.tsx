import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ClockWidget } from './ClockWidget';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { 
  LayoutDashboard, Database, Zap, Target, Clock, 
  RotateCw, ChefHat, ClipboardList, Users, Settings, LogOut, FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useBreakpoint();

  const isLiveEntry = location.pathname.startsWith('/live-entry');

  // If Staff, they only see the entry.
  // If Manager/Admin on Desktop, they see both Sidebar + Entry.
  // If Manager/Admin on Mobile/Tablet, hide sidebar for Live Entry focus.
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const hideSidebar = currentUser?.role === 'staff' || (isLiveEntry && !isDesktop);

  const navGroups = [
    {
      title: "Tổng Quan",
      items: [
        { name: "Dashboard Tổng Quan", path: "/dashboard", icon: LayoutDashboard, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Vận Hành",
      items: [
        { name: "Tải Lên Dữ Liệu POS", path: "/pos-upload", icon: Database, roles: ['admin', 'manager'] },
        { name: "Nhập Liệu Trực Tiếp", path: "/live-entry", icon: Zap, "roles": ['admin', 'manager', 'staff'] },
        { name: "Quản Lý Live Entry", path: "/live-history", icon: FileSpreadsheet, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Phân Tích Chuyên Sâu",
      items: [
        { name: "Hành Vi Order & Upsell", path: "/analysis/upsell", icon: Target, roles: ['admin', 'manager'] },
        { name: "Thời Gian Phục Vụ", path: "/analysis/service-time", icon: Clock, roles: ['admin', 'manager'] },
        { name: "Vòng Quay Bàn", path: "/analysis/table-turnover", icon: RotateCw, roles: ['admin', 'manager'] },
        { name: "Hiệu Quả Bếp", path: "/analysis/kitchen", icon: ChefHat, roles: ['admin', 'manager'] },
        { name: "Hiệu Quả Menu", path: "/analysis/menu", icon: ClipboardList, roles: ['admin', 'manager'] },
        { name: "Hiệu Suất Nhân Viên", path: "/analysis/staff", icon: Users, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Cấu Hình",
      items: [
        { name: "Quản Lý Menu", path: "/menu-management", icon: ClipboardList, roles: ['admin', 'manager'] },
        { name: "Cài Đặt Hệ Thống", path: "/settings", icon: Settings, roles: ['admin'] },
      ]
    }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-main)] text-[var(--color-text-main)] font-sans">
      {/* Sidebar */}
      {!hideSidebar && (
        <aside className="w-64 border-r border-[var(--color-border-main)] bg-[var(--color-bg-surface)] flex flex-col shrink-0">
          <div className="p-6 border-b border-[var(--color-border-main)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-accent-gold)] rounded-lg flex items-center justify-center font-bold text-black shrink-0">
                B
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white truncate">
                BRASSERIE Ops
              </h1>
            </div>
          </div>
          
          <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, idx) => {
              const visibleItems = group.items.filter(item => currentUser && item.roles.includes(currentUser.role));
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={idx} className="mb-6">
                  <div className="px-4 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer text-sm font-medium",
                          isActive 
                            ? "bg-[var(--color-border-main)] text-white" 
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-border-main)]/50 hover:text-[var(--color-text-main)]"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", "opacity-70")} />
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-[var(--color-border-main)]">
            <div className="flex justify-between items-center bg-[var(--color-border-main)]/50 p-3 rounded-xl border border-[var(--color-border-main)]">
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase mt-0.5">{currentUser?.role}</p>
              </div>
              <button 
                onClick={() => { logout(); navigate('/'); }}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors rounded-lg hover:bg-[var(--color-border-main)]"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col h-full overflow-hidden relative",
        isLiveEntry && !isDesktop && "max-w-md mx-auto shadow-2xl"
      )}>
        {/* Header - shown mainly for Staff view or quick info */}
        {currentUser?.role === 'staff' && (
          <header className="h-14 border-b border-[var(--color-border-main)] bg-[var(--color-bg-surface)] flex items-center justify-between px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[var(--color-accent-gold)] rounded-lg flex items-center justify-center font-bold text-black shrink-0">B</div>
              <h2 className="font-semibold text-white">Live Entry</h2>
            </div>
            <div className="flex items-center gap-6">
              <ClockWidget />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">{currentUser?.name}</span>
                <button 
                  onClick={() => { logout(); navigate('/'); }}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors rounded-md hover:bg-[var(--color-border-main)]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>
        )}
        
        <div className="flex-1 overflow-auto bg-[var(--color-bg-main)] custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

