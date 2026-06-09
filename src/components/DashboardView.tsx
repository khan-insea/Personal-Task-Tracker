import { useEffect, useState } from "react";
import { Task, TaskStatus } from "../types";
import { api } from "../api";
import { CheckCircle2, Circle, PlayCircle, AlertTriangle, ListTodo, Calendar, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface DashboardViewProps {
  onNavigateToToday: () => void;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
}

export default function DashboardView({ onNavigateToToday, showNotification }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState({ reporterName: "Khan" });

  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateStr();

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayTasksResult, allTasksResult, settingsResult] = await Promise.all([
        api.getTasks(todayStr),
        api.getAllTasks(),
        api.getSettings(),
      ]);

      setTodayTasks(todayTasksResult);
      setAllTasks(allTasksResult);
      setSettings(settingsResult);
    } catch (err: any) {
      showNotification(err.message || "Không thể tải dữ liệu Dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute status metrics for today's tasks
  const todayTotal = todayTasks.length;
  const todayTodo = todayTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const todayDoing = todayTasks.filter((t) => t.status === TaskStatus.DOING).length;
  const todayDone = todayTasks.filter((t) => t.status === TaskStatus.DONE).length;
  const todayPaused = todayTasks.filter((t) => t.status === TaskStatus.PAUSED).length;

  // Compute rollover/overdue tasks (tasks from previous days that are NOT completed)
  const rolloverTasks = allTasks.filter(
    (t) => t.date !== todayStr && t.status !== TaskStatus.DONE
  );
  const rolloverCount = rolloverTasks.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm">Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  // Format date display (e.g. 09/06/2026)
  const formatDisplayDate = (dStr: string) => {
    const parts = dStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-[#0b233e] border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Xin chào, {settings.reporterName || "Khan"}
            </h1>
            <p className="text-slate-400 text-sm">
              Theo dõi và hoàn thành các mục tiêu công việc ngày hôm nay.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#05111f] border border-slate-800 rounded-xl text-blue-400 text-sm font-medium self-start font-mono">
            <Calendar className="w-4 h-4" />
            <span>Ngày {formatDisplayDate(todayStr)}</span>
          </div>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Today */}
        <div className="bg-[#0b233e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Tổng việc hôm nay</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-white tracking-tight">{todayTotal}</span>
            <p className="text-xs text-slate-400 mt-1">báo cáo công việc</p>
          </div>
        </div>

        {/* Todo */}
        <div className="bg-[#0b233e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Chưa làm</span>
            <div className="p-2 bg-slate-500/10 rounded-xl text-slate-400">
              <Circle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-300 tracking-tight">{todayTodo}</span>
            <p className="text-xs text-slate-400 mt-1">chưa bắt đầu</p>
          </div>
        </div>

        {/* Doing */}
        <div className="bg-[#0b233e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Đang làm</span>
            <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400">
              <PlayCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-yellow-400 tracking-tight">{todayDoing}</span>
            <p className="text-xs text-slate-400 mt-1">trong tiến trình</p>
          </div>
        </div>

        {/* Done */}
        <div className="bg-[#0b233e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Hoàn thành</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">{todayDone}</span>
            <p className="text-xs text-slate-450 mt-1">đã hoàn thành ({todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0}%)</p>
          </div>
        </div>

        {/* Rollover (Việc còn tồn từ ngày trước) */}
        <div className="bg-[#0b233e] border border-[#ef4444]/20 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-[#ef4444]/40 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-red-300 tracking-wider uppercase">Số việc còn tồn</span>
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-red-400 tracking-tight">{rolloverCount}</span>
            <p className="text-xs text-slate-400 mt-1">chưa làm ngày trước</p>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick List Today */}
        <div className="bg-[#0b233e] border border-slate-800 rounded-2xl p-6 shadow-xl xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Công việc hôm nay</h2>
              <p className="text-slate-400 text-xs mt-0.5">Danh sách các đầu mục cần thực hiện</p>
            </div>
            <button
              onClick={onNavigateToToday}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
            >
              Quản lý danh sách &rarr;
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
                <ListTodo className="w-12 h-12 text-slate-600 mb-3" />
                <p>Hôm nay chưa có công việc nào được tạo.</p>
                <button
                  onClick={onNavigateToToday}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-colors"
                >
                  Tạo công việc cố định/mới
                </button>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-4 p-4 bg-[#05111f] border border-slate-850 rounded-xl hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          task.type === "Công việc cố định"
                            ? "bg-purple-950/55 text-purple-300 border border-purple-500/25"
                            : task.type === "Công việc phát sinh"
                            ? "bg-amber-950/55 text-amber-300 border border-amber-500/25"
                            : "bg-blue-950/55 text-blue-300 border border-blue-500/25"
                        }`}
                      >
                        {task.type}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm font-semibold truncate-2-lines">
                      {task.title}
                    </p>
                    {task.link && (
                      <a
                        href={task.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-block truncate max-w-xs"
                      >
                        {task.link}
                      </a>
                    )}
                  </div>

                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 ${
                      task.status === TaskStatus.DONE
                        ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30"
                        : task.status === TaskStatus.DOING
                        ? "bg-yellow-950/50 text-yellow-400 border border-yellow-500/30"
                        : task.status === TaskStatus.PAUSED
                        ? "bg-red-950/50 text-red-400 border border-red-500/30"
                        : "bg-slate-800 text-slate-350 border border-slate-700"
                    }`}
                  >
                    {task.status === TaskStatus.DONE && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {task.status === TaskStatus.DOING && <PlayCircle className="w-3.5 h-3.5 animate-spin" />}
                    {task.status === TaskStatus.TODO && <Circle className="w-3.5 h-3.5" />}
                    {task.status === TaskStatus.PAUSED && <AlertTriangle className="w-3.5 h-3.5" />}
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rollover Task Detailed Card lists */}
        <div className="bg-[#0b233e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-850 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Sổ tồn đọng ngày trước
            </h2>
            <p className="text-xs text-slate-400 mt-1">Các công việc đã lên danh sách nhưng chưa hoàn thành</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {rolloverCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm h-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/80 mb-3" />
                <p className="text-center font-medium text-slate-300">Tuyệt vời!</p>
                <p className="text-center text-xs mt-1">Không có công việc tồn đọng từ các ngày trước.</p>
              </div>
            ) : (
              rolloverTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-red-400 font-mono font-bold">
                      {formatDisplayDate(t.date)}
                    </span>
                    <span className="text-[10px] text-slate-400">{t.name}</span>
                  </div>
                  <h4 className="text-slate-200 text-xs font-semibold leading-relaxed line-clamp-2">
                    {t.title}
                  </h4>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-purple-300 bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-500/20">
                      {t.type}
                    </span>
                    <span className="text-red-300 bg-red-950/20 px-1.5 py-0.5 rounded border border-[#ef4444]/20">
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
