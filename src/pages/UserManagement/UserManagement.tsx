import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../store/AppContext';
import { UserProfile } from '../../hooks/useAuth';
import { toast } from '../../components/ui/Toast';
import { confirmModal } from '../../components/ui/ConfirmModal';
import { auditLogger } from '../../services/auditLogger';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { cn } from '../../lib/utils';
import { Users, Activity } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  user_profiles: {
    name: string;
    email: string;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const { currentUser } = useApp();

  useEffect(() => { 
    if (activeTab === 'users') {
      loadUsers(); 
    } else {
      loadLogs();
    }
  }, [activeTab]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profiles ( name, email )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (!error && data) {
      setLogs(data as any);
    } else if (error) {
       console.error("Failed to load logs:", error);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setUsers(data as UserProfile[]);
    } else if (error) {
       console.error("Failed to load users:", error);
       toast.error("Không thể tải danh sách người dùng.");
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const ok = await confirmModal({
      title: 'Đổi quyền truy cập',
      message: `Đổi role thành ${newRole}?`,
    });
    if (!ok) return;
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
      
    if (!error) {
      toast.success('Đã cập nhật quyền truy cập');
      auditLogger.log('Thay đổi quyền người dùng', { targetUserId: userId, newRole });
      loadUsers();
    } else {
      toast.error('Có lỗi xảy ra khi cập nhật.');
      console.error(error);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const ok = await confirmModal({
      title: isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      message: isActive ? 'Bạn có chắc chắn muốn khóa tài khoản này không?' : 'Bạn có chắc chắn muốn mở khóa tài khoản này không?',
    });
    if (!ok) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !isActive })
      .eq('id', userId);
      
    if (!error) {
      toast.success('Đã cập nhật trạng thái hoạt động.');
      auditLogger.log('Đổi trạng thái tài khoản', { targetUserId: userId, isActive: !isActive });
      loadUsers();
    } else {
      toast.error('Có lỗi xảy ra khi cập nhật.');
      console.error(error);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    const ok = await confirmModal({
      title: 'Xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa tài khoản ${email} vĩnh viễn không? Dữ liệu người dùng sẽ bị xóa khỏi hồ sơ.`,
    });
    if (!ok) return;

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);
      
    if (!error) {
      toast.success('Đã xóa tài khoản.');
      auditLogger.log('Xóa tài khoản', { targetUserId: userId, email });
      loadUsers();
    } else {
      toast.error('Có lỗi xảy ra khi xóa.');
      console.error(error);
    }
  };

  const pendingUsers = users.filter(u => u.role === 'pending');
  const activeUsers = users.filter(u => u.role !== 'pending');

  return (
    <div className="p-6 md:p-8 space-y-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[var(--color-accent-gold)]" />
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Quản Lý Người Dùng</h1>
        </div>
      </div>

      <div className="flex border-b border-[var(--color-border-main)] gap-6">
        <button 
          onClick={() => setActiveTab('users')} 
          className={cn("pb-3 text-sm tracking-wider uppercase font-bold transition-colors border-b-2", activeTab === 'users' ? "border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]" : "border-transparent text-[var(--color-text-muted)] hover:text-white")}
        >
          Người dùng
        </button>
        <button 
          onClick={() => setActiveTab('logs')} 
          className={cn("pb-3 text-sm tracking-wider uppercase font-bold transition-colors border-b-2 flex items-center gap-2", activeTab === 'logs' ? "border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]" : "border-transparent text-[var(--color-text-muted)] hover:text-white")}
        >
          Lịch sử hoạt động
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {pendingUsers.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span>⏳</span> Chờ phê duyệt ({pendingUsers.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map(u => (
                  <div key={u.id} className="bg-[var(--color-bg-surface)] p-4 rounded-xl flex flex-col justify-between gap-4 border border-[var(--color-border-main)]">
                    <div>
                      <p className="font-bold text-white truncate text-lg" title={u.name}>{u.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)] truncate" title={u.email}>{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateRole(u.id, 'staff')} className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 transition-colors text-white rounded-lg text-xs font-bold uppercase tracking-wider">Staff</button>
                      <button onClick={() => updateRole(u.id, 'manager')} className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 transition-colors text-white rounded-lg text-xs font-bold uppercase tracking-wider">Manager</button>
                      <button onClick={() => updateRole(u.id, 'admin')} className="flex-1 py-2 bg-[var(--color-accent-gold)] hover:bg-[#d4b045] transition-colors text-black rounded-lg text-xs font-bold uppercase tracking-wider">Admin</button>
                      <button onClick={() => deleteUser(u.id, u.email)} className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors" title="Từ chối / Xoá">Xoá</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--color-border-main)]">
              <h2 className="text-lg font-bold text-white">Người dùng đã kích hoạt ({activeUsers.length})</h2>
            </div>
            
            {loading ? (
               <div className="p-8 text-center text-white font-mono animate-pulse">Loading users...</div>
            ) : (
               <ResponsiveTable<UserProfile>
                 data={activeUsers}
                 keyExtractor={(u) => u.id}
                 emptyText="Chưa có người dùng nào được kích hoạt."
                 columns={[
                   { 
                     key: 'name', 
                     label: 'Tên', 
                     primary: true, 
                     render: (u) => <span className="font-bold">{u.name}</span> 
                   },
                   { 
                     key: 'email', 
                     label: 'Email', 
                     render: (u) => <span className="text-[var(--color-text-muted)]">{u.email}</span> 
                   },
                   { 
                     key: 'role', 
                     label: 'Quyền', 
                     align: 'center',
                     render: (u) => (
                       <select 
                         value={u.role}
                         onChange={(e) => updateRole(u.id, e.target.value)}
                         disabled={u.id === currentUser?.id}
                         className="bg-[var(--color-bg-main)] text-white px-3 py-1.5 rounded-lg border border-[var(--color-border-main)] text-xs font-bold focus:border-[var(--color-accent-gold)] outline-none transition-colors"
                       >
                         <option value="admin">Admin</option>
                         <option value="manager">Manager</option>
                         <option value="staff">Staff</option>
                       </select>
                     )
                   },
                   { 
                     key: 'status', 
                     label: 'Trạng thái', 
                     align: 'center',
                     render: (u) => (
                       <button 
                         onClick={() => toggleActive(u.id, u.is_active)}
                         disabled={u.id === currentUser?.id}
                         className={cn(
                           "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap", 
                           u.is_active ? 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]' : 'bg-red-500/20 text-red-400'
                         )}
                       >
                         {u.is_active ? 'Hoạt Động' : 'Đã Khóa'}
                       </button>
                     )
                   },
                   {
                     key: 'actions',
                     label: '',
                     align: 'right',
                     render: (u) => (
                       <button 
                         onClick={() => deleteUser(u.id, u.email)}
                         disabled={u.id === currentUser?.id}
                         className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Xoá
                       </button>
                     )
                   }
                 ]}
               />
            )}
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[var(--color-border-main)]">
            <h2 className="text-lg font-bold text-white">100 hoạt động gần nhất</h2>
          </div>
          {loading ? (
             <div className="p-8 text-center text-white font-mono animate-pulse">Loading logs...</div>
          ) : (
            <ResponsiveTable<ActivityLog>
               data={logs}
               keyExtractor={(l) => l.id}
               emptyText="Chưa có dữ liệu hoạt động"
               columns={[
                 {
                   key: 'time',
                   label: 'Thời gian',
                   render: (l) => <span className="text-xs font-mono text-[var(--color-text-muted)]">{new Date(l.created_at).toLocaleString('vi-VN')}</span>
                 },
                 {
                   key: 'user',
                   label: 'Người thực hiện',
                   primary: true,
                   render: (l) => (
                     <div>
                       <div className="font-bold text-white text-sm">{l.user_profiles?.name || 'Unknown'}</div>
                       <div className="text-[10px] text-[var(--color-text-muted)]">{l.user_profiles?.email || l.user_id}</div>
                     </div>
                   )
                 },
                 {
                   key: 'action',
                   label: 'Hoạt động',
                   render: (l) => <span className="text-sm font-bold text-[var(--color-accent-gold)]">{l.action}</span>
                 },
                 {
                   key: 'details',
                   label: 'Chi tiết',
                   render: (l) => (
                     <pre className="text-[10px] text-[var(--color-text-muted)] max-w-sm truncate">
                       {JSON.stringify(l.details)}
                     </pre>
                   )
                 }
               ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
