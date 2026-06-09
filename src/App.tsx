import { useState, useEffect } from "react";
import { isAuthenticated, clearAuthToken, setAuthToken } from "./api";
import LockScreen from "./components/LockScreen";
import DashboardView from "./components/DashboardView";
import TodayTasksView from "./components/TodayTasksView";
import FixedTasksView from "./components/FixedTasksView";
import HistoryView from "./components/HistoryView";
import SettingsView from "./components/SettingsView";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Wrench,
  Settings,
  LogOut,
  X,
  Menu,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

type TabKey = "dashboard" | "today" | "history" | "fixed" | "settings";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Validate authentication state on mount
  useEffect(() => {
    setUnlocked(isAuthenticated());
  }, []);

  // Toast auto-dismiss system
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?");
    if (!confirmLogout) return;

    clearAuthToken();
    setUnlocked(false);
    triggerToast("Đã đăng xuất thành công!", "info");
  };

  // Switch tabs and scroll back to top
  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!unlocked) {
    return (
      <>
        <LockScreen onUnlock={() => {
          setUnlocked(true);
          triggerToast("Mở khóa thành công! Chào mừng trở lại.", "success");
        }} />
        {/* Floating toast stack for Lock Screen */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center justify-between gap-3 p-4 rounded-xl shadow-2xl border text-white animate-fadeIn ${
                toast.type === "success"
                  ? "bg-emerald-950 border-emerald-500/30 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-red-955 border-red-500/30 text-red-300"
                  : "bg-blue-955 border-blue-500/30 text-blue-300"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                {toast.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Define tab navigation buttons
  const navigationItems = [
    { key: "dashboard" as TabKey, label: "Bảng điều khiển", icon: LayoutDashboard },
    { key: "today" as TabKey, label: "Công việc hôm nay", icon: CheckSquare },
    { key: "history" as TabKey, label: "Lịch sử báo cáo", icon: CalendarDays },
    { key: "fixed" as TabKey, label: "Công việc cố định", icon: Wrench },
    { key: "settings" as TabKey, label: "Cài đặt & HDSD", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#071628] flex flex-col md:flex-row text-slate-100">
      
      {/* 1. DESKTOP NAVIGATION SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0b233e] border-r border-slate-800 shrink-0 select-none pb-6 h-screen sticky top-0 justify-between">
        <div className="space-y-6">
          {/* Brand header */}
          <div className="px-6 py-5 border-b border-slate-850 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/40">
              K
            </span>
            <div>
              <span className="font-bold text-sm tracking-wide block">WORK TRACKER</span>
              <span className="text-[10px] text-slate-400">Google Sheets DB</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="px-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => switchTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout bottom rail */}
        <div className="px-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-450 hover:text-red-400 hover:bg-red-950/20 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION DRAWER */}
      <header className="md:hidden flex items-center justify-between px-4 py-3.5 bg-[#0b233e] border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-7.5 h-7.5 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            K
          </span>
          <span className="font-bold text-sm tracking-wide text-white">WORK TRACKER</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-[#05111f] rounded-lg border border-slate-700 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Collapsible Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0b233e] border-b border-slate-850 overflow-hidden sticky top-[53px] z-30 shadow-2xl"
          >
            <nav className="p-4 space-y-1.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => switchTab(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-xs font-semibold tracking-wide transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-850"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-950/20 text-xs font-semibold transition-colors border-t border-slate-800 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            {activeTab === "dashboard" && (
              <DashboardView
                onNavigateToToday={() => switchTab("today")}
                showNotification={triggerToast}
              />
            )}
            {activeTab === "today" && (
              <TodayTasksView showNotification={triggerToast} />
            )}
            {activeTab === "history" && (
              <HistoryView showNotification={triggerToast} />
            )}
            {activeTab === "fixed" && (
              <FixedTasksView showNotification={triggerToast} />
            )}
            {activeTab === "settings" && (
              <SettingsView showNotification={triggerToast} onLogout={handleLogout} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. FLOATING GLOBAL TOAST NOTIFICATION STACK */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl border text-white ${
                toast.type === "success"
                  ? "bg-slate-900 border-emerald-500/30 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-slate-900 border-red-500/30 text-red-300"
                  : "bg-slate-900 border-blue-500/30 text-blue-300"
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                {toast.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />}
                {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 5. COMFORTABLE BOTTOM NAVIGATION BAR FOR MOBILE TOUCH */}
      <nav className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-[#0b233e]/95 backdrop-blur border border-slate-700/60 rounded-2xl flex justify-around p-2.5 shadow-2xl select-none">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => switchTab(item.key)}
              title={item.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive ? "text-blue-400 scale-105" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-tight">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
