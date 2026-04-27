# Changelog

## [Unreleased]
### Added
- **Khóa bàn (Table Locking)**: 
  - Staff khi vào màn hình order của bàn sẽ tự động khóa bàn lại (`lockedBy` & `lockedAt`). Bàn sẽ bị khóa trong tối đa 10 phút nếu không có thao tác để tự động nhả khóa.
  - Người dùng khác không thể vào bàn đang bị khóa và sẽ nhìn thấy thông báo lỗi/toast. Quản lý (admin/manager) có thể mử khóa cưỡng bức qua `confirmModal`.
- **Skeleton & EmptyState (`<SkeletonLoader />`, `<EmptyState />`)**: Trước khi loading dữ liệu cho `Dashboard` và `MenuAnalysis`, UI sẽ sử dụng Skeleton để giữ mượt layout thay vì load giật cục. Màn hình Dashboard khi không có dữ liệu sẽ hiển thị `EmptyState`.
- **Top 50% Revenue Toggle**: Bổ sung bộ lọc trên Scatter Chart của `MenuAnalysis` giúp giảm nhiễu (cluttered) cho các ma trận có lượng item lớn. Highlight category trên biểu đồ thay vì highlight tooltip cứng.
- **Cải thiện tính nhất quán UI/UX**: Chuyển đổi mọi thông báo `window.confirm` hay `window.alert` sang thiết kế Custom `confirmModal` và `toast` (áp dụng cho POSUpload, MenuManagement, TableMap).

### Fixed/Changed
- Rút gọn CSS utilities cho `SafeArea` ở `LiveEntry.tsx` (`h-screen-safe` và `pb-safe`) để tránh giật layout trên mobile Safari/Chrome.
- Refactor logic `isReady` context state để đồng bộ hóa cho đến khi Dexie DB (menu, sessions, pos_batches) hoàn tất hydrate dữ liệu. Tránh undefined error trong những milliseconds đầu của React render tree.
- Bọc toàn bộ các action cập nhật database (Session, createSession, updateSession) vào blocks `try...catch` cùng `toast.error`, ngăn chặn lỗi Uncaught Promise.
- Kiểm tra toàn bộ types in `src/types.ts` và `src/types/store.ts` đảm bảo đầy đủ strict-type check.
- Ẩn các Metrics Live không dùng trên Dashboard.
- **Biểu đồ Cải tiến (`MenuAnalysis.tsx`)**: Bổ sung `ZAxis` map theo `revenue` để thay đổi kích thước bong bóng trên biểu đồ ScatterChart, `fillOpacity` 0.75 để pha trộn màu khi trùng điểm, và Select dropdown `selectedSection` để chia tiết kiệm hiển thị Nhóm món (giảm bớt lượng bong bóng đè nhau một lúc do quá đông).
