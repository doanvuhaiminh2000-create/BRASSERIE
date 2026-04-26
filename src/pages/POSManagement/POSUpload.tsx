import React, { useState } from 'react';
import { Database, Upload, FileText, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseFile, processPOSData, parseExcelMultiSheet } from '../../lib/posDataParser';
import { useApp } from '../../store/AppContext';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

export function POSUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('monthly');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setDashboardMetrics, setPosRawData } = useApp();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    day: new Date().getDate().toString().padStart(2, '0'),
    source: 'POS Brasserie Master'
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
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
      let summaryData: string = "";
      let detailData: string = "";
      let paymentData: string = "";

      let errorDetails = "";

      for (const file of files) {
        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        
        if (isExcel) {
          const sheets = await parseExcelMultiSheet(file);
          Object.entries(sheets).forEach(([name, data]) => {
            const lower = name.toLowerCase();
            if (lower.includes('summary')) summaryData = Papa.unparse(data as any[]);
            else if (lower.includes('payment')) paymentData = Papa.unparse(data as any[]);
            else if (lower.includes('detail')) detailData = Papa.unparse(data as any[]);
          });
        } else {
          const data = await parseFile<any>(file);
          
          if (data.length === 0) {
            errorDetails += `File ${file.name} trống hoặc không đọc được. `;
            continue;
          }

          const csvString = Papa.unparse(data);

          // Extract sample keys to guess file type
          const sampleKeys = Object.keys(data[0] || {}).map(k => k.toLowerCase()).join(' ');

          if (sampleKeys.includes('time start') || sampleKeys.includes('final total') || file.name.toLowerCase().includes('summary')) {
            summaryData = csvString;
          } else if (sampleKeys.includes('product name') || sampleKeys.includes('final amout') || sampleKeys.includes('category') || file.name.toLowerCase().includes('detail')) {
            detailData = csvString;
          } else if (sampleKeys.includes('payment method') || sampleKeys.includes('tender') || file.name.toLowerCase().includes('payment')) {
            paymentData = csvString;
          } else {
            // Fallback based on content if name is ambiguous
            if (!summaryData) summaryData = csvString;
            else if (!detailData) detailData = csvString;
            else paymentData = csvString;
          }
        }
      }

      if (!summaryData) {
        throw new Error(`Không tìm thấy sheet 'Transaction summary' trong file. File POS phải có 3 sheets: Transaction summary, Transaction detail, Payment detail. ${errorDetails}`);
      }

      const { metrics, detailRows } = processPOSData(summaryData, detailData, paymentData);
      setDashboardMetrics(metrics);
      setPosRawData({ detailRows, uploadedAt: Date.now() });
      
      setUploadStatus('success');
      
      setTimeout(() => {
        setFiles([]);
        setUploadStatus('idle');
        navigate('/'); // Go back to dashboard to view results
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Có lỗi xảy ra khi xử lý file.');
      setUploadStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-accent-blue)]/10 rounded-lg text-[var(--color-accent-blue)]">
            <Database className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Quản Lý Dữ Liệu POS</h1>
        </div>
        <p className="text-[var(--color-text-muted)] text-lg">Tải lên dữ liệu POS thô để hệ thống phân tích và đối soát vận hành.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] shadow-xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-sm">
              <Calendar className="w-4 h-4 text-[var(--color-accent-gold)]" />
              Thông tin cấu hình
            </h3>
            
            <div className="space-y-4">
              <div className="flex bg-[var(--color-bg-main)] p-1 rounded-xl border border-[var(--color-border-main)] mb-2">
                <button 
                  onClick={() => setActiveTab('monthly')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                    activeTab === 'monthly' ? "bg-[var(--color-accent-blue)] text-white shadow-lg" : "text-[var(--color-text-muted)] hover:text-white"
                  )}
                >
                  Theo Tháng
                </button>
                <button 
                  onClick={() => setActiveTab('daily')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                    activeTab === 'daily' ? "bg-[var(--color-accent-blue)] text-white shadow-lg" : "text-[var(--color-text-muted)] hover:text-white"
                  )}
                >
                  Theo Ngày
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">Hệ quản trị POS</label>
                <select className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-white focus:border-[var(--color-accent-gold)] outline-none transition-colors">
                  <option>POS Brasserie Master</option>
                  <option>IPOS / KiotViet</option>
                  <option>Dữ liệu CSV Tùy chỉnh</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {activeTab === 'daily' && (
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Ngày</label>
                      <input 
                        type="text" 
                        value={formData.day}
                        onChange={(e) => setFormData({...formData, day: e.target.value})}
                        className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-2 py-2 text-center text-white outline-none focus:border-[var(--color-accent-gold)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Tháng</label>
                      <input 
                        type="text" 
                        value={formData.month}
                        onChange={(e) => setFormData({...formData, month: e.target.value})}
                        className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-2 py-2 text-center text-white outline-none focus:border-[var(--color-accent-gold)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Năm</label>
                      <input 
                        type="text" 
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-2 py-2 text-center text-white outline-none focus:border-[var(--color-accent-gold)]"
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'monthly' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Tháng</label>
                      <select 
                        value={formData.month}
                        onChange={(e) => setFormData({...formData, month: e.target.value})}
                        className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-2 py-2 text-center text-white outline-none focus:border-[var(--color-accent-gold)]"
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                          <option key={m} value={m}>Tháng {m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Năm</label>
                      <input 
                        type="text" 
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg px-2 py-2 text-center text-white outline-none focus:border-[var(--color-accent-gold)]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-accent-blue)]/5 p-5 rounded-2xl border border-[var(--color-accent-blue)]/20">
             <h4 className="text-sm font-bold text-[var(--color-accent-blue)] mb-2 flex items-center gap-2">
               💡 Lưu ý về định dạng
             </h4>
             <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
               <li>• Chỉ chấp nhận file <strong>.xlsx, .xls, .csv</strong></li>
               <li>• Dung lượng file không quá 20MB</li>
               <li>• Dữ liệu phải bao gồm mã món, đơn giá và mốc thời gian</li>
             </ul>
          </div>
        </div>

        {/* Upload Column */}
        <div className="lg:col-span-2">
          <div 
            className={cn(
              "relative h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all duration-300",
              dragActive ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5" : "border-[var(--color-border-main)] bg-[var(--color-bg-surface)]",
              uploadStatus === 'success' && "border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploadStatus === 'idle' && files.length === 0 && (
              <>
                <div className="w-20 h-20 bg-[var(--color-bg-main)] rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-white/5">
                  <Upload className="w-10 h-10 text-[var(--color-accent-gold)]" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Kéo thả hoặc chọn file</h2>
                <p className="text-[var(--color-text-muted)] mb-8 text-center max-w-sm">Tải lên các file báo cáo từ máy POS của bạn (Summary, Detail) để đồng bộ Dữ Liệu Thực Tế.</p>
                
                <input 
                  type="file" 
                  id="input-file-upload" 
                  className="hidden" 
                  multiple={true} 
                  onChange={handleChange}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <label 
                  htmlFor="input-file-upload"
                  className="px-8 py-3 bg-[var(--color-accent-gold)] hover:bg-[#c09142] text-black font-bold rounded-xl transition-all shadow-lg cursor-pointer transform active:scale-95"
                >
                  Duyệt File Trên Máy
                </label>
              </>
            )}

            {files.length > 0 && uploadStatus !== 'success' && (
              <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
                {files.map((file, idx) => (
                  <div key={idx} className="bg-[var(--color-bg-main)] p-4 rounded-xl border border-[var(--color-border-main)] flex items-center gap-4 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-white font-bold text-sm truncate">{file.name}</p>
                      <p className="text-[var(--color-text-muted)] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}

                {errorMsg && (
                  <div className="mb-6 p-4 bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/20 rounded-xl flex items-start gap-3 text-[var(--color-accent-red)]">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{errorMsg}</p>
                  </div>
                )}

                {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => { setFiles([]); setErrorMsg(null); setUploadStatus('idle'); }}
                      className="flex-1 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                    <button 
                      onClick={handleUpload}
                      className="flex-1 py-3 bg-[var(--color-accent-gold)] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-xl"
                    >
                      BẮT ĐẦU TẢI LÊN
                    </button>
                  </div>
                ) : null}

                {uploadStatus === 'uploading' && (
                  <div className="space-y-4 mt-6">
                     <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
                       <span className="animate-pulse">Đang nén và tải dữ liệu...</span>
                       <span>85%</span>
                     </div>
                     <div className="h-2 w-full bg-[var(--color-bg-main)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-accent-gold)] w-[85%] rounded-full animate-pulse transition-all duration-300" />
                     </div>
                  </div>
                )}
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-[var(--color-accent-green)]/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-[var(--color-accent-green)]/10">
                  <CheckCircle2 className="w-12 h-12 text-[var(--color-accent-green)]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Tải Lên Thành Công!</h2>
                <p className="text-[var(--color-text-muted)]">
                  {activeTab === 'monthly' 
                    ? `Dữ liệu tháng ${formData.month}/${formData.year} đã được xử lý.` 
                    : `Dữ liệu ngày ${formData.day}/${formData.month}/${formData.year} đã được xử lý.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
