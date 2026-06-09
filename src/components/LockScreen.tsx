import React, { useState, FormEvent } from "react";
import { Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api, setAuthToken } from "../api";
import { motion } from "motion/react";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(password);
      if (res.success && res.token) {
        setAuthToken(res.token);
        onUnlock();
      } else {
        setError("Lỗi không xác định");
      }
    } catch (err: any) {
      setError(err.message || "Mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071628] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0b233e] border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center"
      >
        <div className="mx-auto w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center mb-6 border border-slate-700/50">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-wide font-sans">
          Báo Cáo Công Việc Cá Nhân
        </h1>
        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
          Nhập mật khẩu cá nhân của bạn để mở khóa bảng điều khiển và đồng bộ dữ liệu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-350 tracking-wider uppercase">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Nhập APP_PASSWORD..."
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors pr-12 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-250 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs mt-2 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-blue-900/40 transition-colors focus:outline-none mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Mở Khóa"
            )}
          </button>
        </form>

        <div className="mt-8 text-xs text-slate-500 border-t border-slate-800 pt-6">
          Dữ liệu được lưu trữ trực tuyến an toàn trên Google Sheets
        </div>
      </motion.div>
    </div>
  );
}
