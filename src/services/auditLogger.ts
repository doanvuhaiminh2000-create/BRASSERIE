import { supabase } from './supabaseClient';

export const auditLogger = {
  async log(action: string, details?: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      await supabase.from('activity_logs').insert({
        user_id: session.user.id,
        action,
        details: details || {}
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
};
