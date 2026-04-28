# Hướng dẫn cài đặt Supabase OAuth (Google Provider)

1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn -> **Authentication** -> **Providers** -> **Google**
3. Bật **Enable Google provider**
4. Lấy Client ID & Client Secret từ Google Cloud Console:
   - Tạo/Mở project ở [console.cloud.google.com](https://console.cloud.google.com/)
   - Vào **APIs & Services** -> **Credentials** -> **Create Credentials** -> **OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     (Copy URL redirect từ màn hình config Google trong Supabase)
5. Paste Client ID và Client Secret vào Supabase, sau đó **Save**.
6. Trong Supabase: **Authentication** -> **URL Configuration**:
   - Site URL: Điền URL production của trang web (VD: URL chia sẻ của AI Studio, hoặc của Vercel).
   - Redirect URLs: Nhấn **Add URL** và thêm `http://localhost:3000` (để dùng trong lúc dev), cũng như production url.
