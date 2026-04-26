import React, { useState, useEffect } from 'react';
import { Database, Upload, FileText, CheckCircle2, AlertCircle, Calendar, Trash2, Eye } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { parseExcelPOSBatch } from '../../lib/posDataParser';
import { useApp } from '../../store/AppContext';
import { dataStore } from '../../services/dataStore';
import { POSBatch } from '../../types/store';

export function POSUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { currentUser, isReady } = useApp();
  
  const [dateFrom, setDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [batches, setBatches] = useState<POSBatch[]>([]);

  useEffect(() => {
    if (isReady) loadBatches();
  }, [isReady]);

  const loadBatches = async () => {
    const list = await dataStore.getAllPOSBatches();
    setBatches(list);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploadStatus('uploading');
    setErrorMsg(null);
    
    try {
      if (dateTo < dateFrom) throw new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");

      // Check overlap
      const startMs = new Date(dateFrom).getTime();
      const endMs = new Date(dateTo).getTime();
      const isOverlap = batches.some(b => {
        const bStart = new Date(b.dateFrom).getTime();
        const bEnd = new Date(b.dateTo).getTime();
        return Math.max(startMs, bStart) <= Math.min(endMs, bEnd);
      });

      if (isOverlap) {
        if (!window.confirm("Khoảng thời gian này bị trùng lấn với lô dữ liệu đã có. Bạn có chắc muốn tiếp tục tải lên? Dữ liệu tính toán có thể bị gấp đôi nếu bạn không xóa lô cũ.")) {
          setUploadStatus('idle');
          return;
        }
      }

      const file = files[0];
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      if (!isExcel) throw new Error("Chỉ hỗ trợ upload file Excel đa sheet.");

      // Generate UUID
      const batchId = `pos_batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      let parsedBatch = await parseExcelPOSBatch(file, batchId, currentUser?.name || 'Unknown');
      
      // Override parsed dates with user inputs
      parsedBatch.dateFrom = dateFrom;
      parsedBatch.dateTo = dateTo;

      await dataStore.addPOSBatch(parsedBatch);
      
      setUploadStatus('success');
      loadBatches();
      
      setTimeout(() => {
        setFiles([]);
        setUploadStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Có lỗi xảy ra khi xử lý file.');
      setUploadStatus('error');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dữ liệu này? Hành động này không thể hoàn tác.")) {
      await dataStore.deletePOSBatch(batchId);
      loadBatches();
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-accent-blue)]/10 rounded-lg text-[var(--color-accent-blue)]">
            <Database className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Quản Lý Dữ Liệu POS</h1>
        </div>
        <p className="text-[var(--color-text-muted)] text-lg">Tải lên dữ liệu POS thô để hệ thống phân tích và quản lý kho dữ liệu lịch sử.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* UPPER: UPLOAD FORM */}
        <div className="bg-[var(--color-bg-surface)] p-6 md:p-8 rounded-2xl border border-[var(--color-border-main)] shadow-xl">
           <h3 className="text-white font-bold mb-6 uppercase tracking-wider">Form Upload Mới</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                   <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">Khoảng thời gian dữ liệu *</label>
                   <div className="flex items-center gap-3 bg-[var(--color-bg-main)] p-3 rounded-xl border border-[var(--color-border-main)]">
                      <input 
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none cursor-pointer [color-scheme:dark]"
                      />
                      <span className="text-[var(--color-text-muted)]">→</span>
                      <input 
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none cursor-pointer [color-scheme:dark]"
                      />
                   </div>
                </div>

                <div className="bg-[var(--color-accent-blue)]/5 p-4 rounded-xl border border-[var(--color-accent-blue)]/20">
                   <h4 className="text-sm font-bold text-[var(--color-accent-blue)] mb-2 flex items-center gap-2">
                     💡 Yêu cầu file
                   </h4>
                   <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
                     <li>• Dung lượng không quá 20MB.</li>
                     <li>• File xuất từ máy POS Master (Excel) chứa ít nhất 3 sheets: <br /><b>Transaction detail, Payment detail, Transaction summary</b></li>
                   </ul>
                </div>
              </div>

              <div>
                <div 
                  className={cn(
                    "relative h-[250px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300",
                    dragActive ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5" : "border-[var(--color-border-main)] bg-[var(--color-bg-main)]",
                    uploadStatus === 'success' && "border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/5"
                  )}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                  {uploadStatus === 'idle' && files.length === 0 && (
                    <>
                      <Upload className="w-10 h-10 text-[var(--color-text-muted)] mb-4" />
                      <p className="text-white font-bold text-sm mb-2 text-center">Kéo thả hoặc chọn file .xlsx</p>
                      
                      <input 
                        type="file" id="input-file-upload" className="hidden" 
                        onChange={handleChange}
                        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      />
                      <label htmlFor="input-file-upload" className="px-6 py-2 mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-lg transition-all cursor-pointer">
                        Duyệt File
                      </label>
                    </>
                  )}

                  {files.length > 0 && uploadStatus !== 'success' && (
                    <div className="w-full text-center">
                       <FileText className="w-10 h-10 text-[var(--color-accent-blue)] mx-auto mb-3" />
                       <p className="text-white font-bold text-sm truncate">{files[0].name}</p>
                       <p className="text-[var(--color-text-muted)] text-xs mb-4">{(files[0].size / 1024).toFixed(1)} KB</p>

                       {errorMsg && <p className="text-xs text-[var(--color-accent-red)] mb-4 bg-red-500/10 p-2 rounded">{errorMsg}</p>}

                       {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                         <div className="flex gap-2 justify-center">
                           <button onClick={() => { setFiles([]); setErrorMsg(null); setUploadStatus('idle'); }} className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-white">
                             Hủy
                           </button>
                           <button onClick={handleUpload} className="px-6 py-2 bg-[var(--color-accent-gold)] text-black font-bold text-xs rounded-lg uppercase tracking-wider">
                             Tải Lên Và Lưu
                           </button>
                         </div>
                       ) : (
                         <span className="text-[var(--color-accent-gold)] tracking-widest text-xs uppercase animate-pulse">Đang nạp file...</span>
                       )}
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-12 h-12 text-[var(--color-accent-green)] mb-3" />
                      <p className="text-white font-bold text-sm">Thành công!</p>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* LOWER: TABLE */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
           <div className="bg-[var(--color-bg-surface)] p-6 md:p-8 rounded-2xl border border-[var(--color-border-main)] shadow-xl">
             <h3 className="text-white font-bold mb-6 uppercase tracking-wider flex items-center justify-between">
               <span>Kho Dữ Liệu Đã Tải Lên</span>
               <span className="text-xs font-normal text-[var(--color-text-muted)] bg-white/5 py-1 px-3 rounded-full">Tổng: {batches.length} batch</span>
             </h3>

             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-main)]">
                    <tr>
                      <th className="px-4 py-3 font-black tracking-widest rounded-tl-lg">ID</th>
                      <th className="px-4 py-3 font-black tracking-widest">Khoảng TG</th>
                      <th className="px-4 py-3 font-black tracking-widest">Tên file gốc</th>
                      <th className="px-4 py-3 font-black tracking-widest text-right">Giao dịch</th>
                      <th className="px-4 py-3 font-black tracking-widest text-right">Doanh thu</th>
                      <th className="px-4 py-3 font-black tracking-widest">Nhân viên</th>
                      <th className="px-4 py-3 font-black tracking-widest">Ngày Up</th>
                      <th className="px-4 py-3 font-black tracking-widest text-right rounded-tr-lg">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.batchId} className="border-b border-[var(--color-border-main)] last:border-0 hover:bg-[var(--color-bg-main)]/50 transition-colors">
                        <td className="px-4 py-3 text-[10px] font-mono text-[var(--color-text-muted)]">{b.batchId.split('_').pop()}</td>
                        <td className="px-4 py-3 text-white font-medium">{new Date(b.dateFrom).toLocaleDateString('vi-VN')} - {new Date(b.dateTo).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-3 text-white text-xs truncate max-w-[150px]" title={b.fileName}>{b.fileName}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-accent-blue)]">{b.totalTransactions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-accent-gold)]">{formatCurrency(b.totalRevenue)}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">{b.uploadedBy}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)] text-[10px]">{new Date(b.uploadedAt).toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">
                           <button onClick={() => handleDeleteBatch(b.batchId)} className="p-1.5 text-red-400 hover:bg-red-400/20 rounded transition-colors" title="Xóa">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-[var(--color-text-muted)] italic text-xs">Kho dữ liệu trống. Vui lòng tải file mẫu lên.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
