import React, { useState, useEffect, FormEvent } from "react";
import { api } from "../api";
import { Save, User, Database, ShieldAlert, BookOpen, AlertCircle, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";

interface SettingsViewProps {
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  onLogout: () => void;
}

export default function SettingsView({ showNotification, onLogout }: SettingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reporterName, setReporterName] = useState("Khan");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      if (data.reporterName) {
        setReporterName(data.reporterName);
      }
    } catch (err: any) {
      showNotification(err.message || "Không thể tải cài đặt", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim()) {
      showNotification("Tên người báo báo không được để trống!", "error");
      return;
    }

    setUpdating(true);
    try {
      await api.updateSettings({ reporterName: reporterName.trim() });
      showNotification("Đã cập nhật cài đặt thành công và đồng bộ lên Google Sheets!", "success");
    } catch (err: any) {
      showNotification(err.message || "Không thể lưu cài đặt", "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Panel & Account editing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0b233e] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-850 pb-3">
              <User className="text-blue-400 w-5 h-5" />
              Cấu hình cá nhân
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-sm">Đang tải cài đặt...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-350 font-semibold tracking-wide">Tên người báo cáo mặc định</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Nhập tên người báo cáo..."
                    className="w-full bg-[#05111f] border border-slate-705 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">Tên này sẽ tự động điền khi tạo báo cáo mới.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    {updating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Cập nhật</span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-red-950/40 text-red-400 border border-red-900/30 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    title="Đăng xuất khỏi thiết bị này"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Secure Environment Validation statuses card */}
          <div className="bg-[#0b233e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-2">
              <Database className="text-emerald-400 w-4.5 h-4.5" />
              Trạng thái máy chủ
            </h2>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between items-center bg-[#05111f] p-2.5 border border-slate-850 rounded-xl">
                <span>Database Sync:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/25">Google Sheets Online</span>
              </div>
              <div className="flex justify-between items-center bg-[#05111f] p-2.5 border border-slate-850 rounded-xl">
                <span>Xác thực:</span>
                <span className="text-blue-400 font-bold bg-blue-950/30 px-2 py-0.5 rounded border border-blue-505/25">APP_PASSWORD</span>
              </div>
              <div className="flex justify-between items-center bg-[#05111f] p-2.5 border border-slate-850 rounded-xl">
                <span>Lưu trữ cục bộ:</span>
                <span className="text-slate-400 font-semibold">Tắt (Không chia sẻ)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation details */}
        <div className="lg:col-span-2 bg-[#0b233e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3">
            <BookOpen className="text-purple-400 w-5 h-5" />
            Hướng dẫn thiết lập cơ sở dữ liệu & deploy
          </h2>

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 scrollbar">
            {/* Step 1 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-205 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                Bước 1: Tạo Google Service Account & Lấy JSON Credentials
              </h3>
              <div className="bg-[#05111f] p-3 border border-slate-850 rounded-xl text-xs text-slate-400 space-y-2 leading-relaxed">
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>.</li>
                  <li>Tạo một dự án mới hoặc chọn dự án hiện tại.</li>
                  <li>Vào <b>APIs & Services &gt; Library</b>, tìm kiếm <b>Google Sheets API</b> và bật nó (Enable).</li>
                  <li>Vào <b>APIs & Services &gt; Credentials</b>, bấm <b>Create Credentials</b> &gt; Chọn <b>Service Account</b>.</li>
                  <li>Đặt tên Service Account rồi ấn Create.</li>
                  <li>Sau khi tạo, chọn Service Account đó, vào tab <b>Keys</b> &gt; Bấm <b>Add Key</b> &gt; <b>Create new key</b> &gt; Chọn định dạng <b>JSON</b> rồi tải xuống.</li>
                  <li>Mở file JSON vừa tải, lưu lại giá trị của <b>client_email</b> (Email Service Account) và <b>private_key</b> (Khóa riêng tư).</li>
                </ol>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-205 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                Bước 2: Cài đặt Google Sheet Database
              </h3>
              <div className="bg-[#05111f] p-3 border border-slate-850 rounded-xl text-xs text-slate-400 space-y-2 leading-relaxed">
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Tạo một bảng tính Google Sheets mới trên Google Drive của bạn.</li>
                  <li>Bấm nút <b>Chia sẻ</b> (Share) ở góc trên bên phải, dán email của Service Account (giá trị <b>client_email</b> đã lưu ở Bước 1) vào và cấp quyền <b>Người chỉnh sửa</b> (Editor).</li>
                  <li>Sao chép <b>Sheet ID</b> từ URL của bảng tính:
                    <br />
                    <code className="text-blue-400 select-all block bg-slate-900/60 p-1.5 rounded mt-1 font-mono break-all text-[10px]">
                      https://docs.google.com/spreadsheets/d/<b>[SHEET_ID_CẦN_SAO_CHÉP]</b>/edit...
                    </code>
                  </li>
                  <li>Dự án của bạn sẽ tự động chạy cơ chế di chuyển (Migration) tự tạo các sheet <code className="text-purple-300 font-mono">Tasks</code>, <code className="text-purple-300 font-mono">FixedTasks</code> và <code className="text-purple-305 font-mono">Settings</code> với cấu trúc chuẩn khi kết nối lần đầu!</li>
                </ol>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-205 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                Bước 3: Deploy Vercel & Cấu hình Biến môi trường
              </h3>
              <div className="bg-[#05111f] p-3 border border-slate-850 rounded-xl text-xs text-slate-400 space-y-2 leading-relaxed">
                <p>Khi đẩy code lên Vercel, hãy vào phần <b>Settings &gt; Environment Variables</b> của dự án trên Vercel Dashboard và thêm chính xác 4 biến môi trường sau:</p>
                <div className="space-y-2 font-mono text-[10.5px]">
                  <div className="p-2 bg-slate-905 border border-slate-800 rounded">
                    <span className="text-yellow-400">APP_PASSWORD</span>
                    <span className="text-white"> = [Mật khẩu bạn tự chọn để mở khóa website trên điện thoại/laptop]</span>
                  </div>
                  <div className="p-2 bg-slate-905 border border-slate-800 rounded">
                    <span className="text-yellow-400">GOOGLE_SERVICE_ACCOUNT_EMAIL</span>
                    <span className="text-white"> = [Giá trị <i>client_email</i> trong file JSON tải từ Google Cloud]</span>
                  </div>
                  <div className="p-2 bg-slate-905 border border-slate-800 rounded">
                    <span className="text-yellow-400">GOOGLE_PRIVATE_KEY</span>
                    <span className="text-white"> = [Giá trị <i>private_key</i> bắt đầu bằng "-----BEGIN PRIVATE KEY-----\n..." trong file JSON]</span>
                  </div>
                  <div className="p-2 bg-slate-905 border border-slate-800 rounded">
                    <span className="text-yellow-400">GOOGLE_SHEET_ID</span>
                    <span className="text-white"> = [Mã ID chuỗi ký tự của liên kết Google Sheet đã copy ở Bước 2]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
