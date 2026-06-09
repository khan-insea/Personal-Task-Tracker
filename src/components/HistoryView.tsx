import { useState, useEffect } from "react";
import { Task, TaskStatus } from "../types";
import { api } from "../api";
import {
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Check,
  X,
  ExternalLink,
  Loader2,
  FolderOpen
} from "lucide-react";

interface HistoryViewProps {
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
}

export default function HistoryView({ showNotification }: HistoryViewProps) {
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  
  // Filtering States
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");

  // Tracking collapsed date groups
  const [collapsedGroups, setCollapsedGroups] = useState<{ [date: string]: boolean }>({});

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getAllTasks();
      setAllTasks(data);
    } catch (err: any) {
      showNotification(err.message || "Không thể tải lịch sử báo cáo", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTasks();
  }, []);

  // Filter tasks
  const filteredTasks = allTasks.filter((t) => {
    // 1. Date filter
    if (filterDate && t.date !== filterDate) return false;
    // 2. Status filter
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    // 3. Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchNote = t.note ? t.note.toLowerCase().includes(query) : false;
      const matchLink = t.link ? t.link.toLowerCase().includes(query) : false;
      if (!matchTitle && !matchNote && !matchLink) return false;
    }
    return true;
  });

  // Group filtered tasks by Date (descending order)
  const groupedTasks: { [date: string]: Task[] } = {};
  filteredTasks.forEach((t) => {
    if (!groupedTasks[t.date]) {
      groupedTasks[t.date] = [];
    }
    groupedTasks[t.date].push(t);
  });

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));

  // Toggle Collapse
  const toggleGroup = (date: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Start Edit
  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditLink(task.link || "");
    setEditStatus(task.status);
    setEditNote(task.note || "");
    setEditDate(task.date);
  };

  // Save Edit
  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      showNotification("Nội dung công việc không thể bỏ trống!", "error");
      return;
    }

    try {
      const updated = await api.updateTask(id, {
        title: editTitle.trim(),
        link: editLink.trim() || "",
        status: editStatus,
        note: editNote.trim() || "",
        date: editDate
      });

      setAllTasks(allTasks.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      showNotification("Đã cập nhật công việc trong lịch sử thành công!", "success");
      setEditingId(null);
    } catch (err: any) {
      showNotification(err.message || "Không thể cập nhật công việc lịch sử", "error");
    }
  };

  // Delete Task in History
  const handleDeleteTask = async (id: string, titleTxt: string) => {
    const isConfirmed = window.confirm(`Bạn có chắc muốn xóa vĩnh viễn đầu việc này khỏi lịch sử:\n"${titleTxt}"?`);
    if (!isConfirmed) return;

    try {
      await api.deleteTask(id);
      setAllTasks(allTasks.filter((t) => t.id !== id));
      showNotification("Đã xóa công việc khỏi lịch sử!", "success");
    } catch (err: any) {
      showNotification(err.message || "Không thể xóa công việc", "error");
    }
  };

  // Format date display (e.g. 09/06/2026)
  const formatDisplayDate = (dStr: string) => {
    const parts = dStr.split("-");
    if (parts.length === 3) return `Ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm">Đang tải toàn bộ dữ liệu lịch sử...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header card */}
      <div className="bg-[#0b233e] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Lịch Sử Công Việc</h1>
          <p className="text-xs text-slate-400">
            Xem, tìm kiếm, lọc và cập nhật lại thông tin báo cáo các ngày trước
          </p>
        </div>

        {/* Dynamic Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, link, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05111f] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#05111f] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#05111f] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.values(TaskStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick wipe filter button */}
        {(filterDate || filterStatus !== "ALL" || searchQuery) && (
          <div className="flex justify-start">
            <button
              onClick={() => {
                setFilterDate("");
                setFilterStatus("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold"
            >
              &times; Xóa bộ lọc đang chọn
            </button>
          </div>
        )}
      </div>

      {/* Main logs list grouped by Date */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0b233e] border border-slate-800 rounded-2xl text-slate-400 text-sm">
            <FolderOpen className="w-12 h-12 text-slate-650 mb-3" />
            <p className="font-semibold text-slate-350">Không khớp với kết quả tìm kiếm nào.</p>
            <p className="text-xs text-slate-450 mt-1">Vui lòng điều chỉnh lại bộ lọc hoặc ngày đã chọn.</p>
          </div>
        ) : (
          sortedDates.map((date) => {
            const dayTasks = groupedTasks[date];
            const isCollapsed = collapsedGroups[date] || false;

            return (
              <div key={date} className="bg-[#0b233e]/85 border border-slate-805 rounded-2xl shadow-md overflow-hidden">
                {/* Header accordion trigger */}
                <button
                  type="button"
                  onClick={() => toggleGroup(date)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-slate-900/50 hover:bg-slate-900/70 transition-colors focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-100 font-sans">
                      {formatDisplayDate(date)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0b233e] border border-slate-700/60 text-slate-350">
                      {dayTasks.length} việc
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span>{isCollapsed ? "Mở rộng" : "Thu gọn"}</span>
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </button>

                {/* Group details list */}
                {!isCollapsed && (
                  <div className="p-4 border-t border-slate-850 bg-[#0b233e] space-y-4">
                    {dayTasks.map((task) => {
                      const isEditing = editingId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`p-4 rounded-xl bg-[#05111f] border transition-all ${
                            isEditing ? "border-blue-500" : "border-slate-850 hover:border-slate-800"
                          }`}
                        >
                          {isEditing ? (
                            /* INLINE EDIT FORM */
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nội dung công việc</label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày báo cáo</label>
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</label>
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                                    className="w-full bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                  >
                                    <option value={TaskStatus.TODO}>{TaskStatus.TODO}</option>
                                    <option value={TaskStatus.DOING}>{TaskStatus.DOING}</option>
                                    <option value={TaskStatus.DONE}>{TaskStatus.DONE}</option>
                                    <option value={TaskStatus.PAUSED}>{TaskStatus.PAUSED}</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Link đính kèm</label>
                                  <input
                                    type="text"
                                    value={editLink}
                                    onChange={(e) => setEditLink(e.target.value)}
                                    className="w-full bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1 text-xs">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú</label>
                                <input
                                  type="text"
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  className="w-full bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(task.id)}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold cursor-pointer"
                                >
                                  Cập nhật
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* READ-ONLY LAYOUT inside accordion */
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        task.type === "Công việc cố định"
                                          ? "bg-purple-950/50 text-purple-300"
                                          : task.type === "Công việc phát sinh"
                                          ? "bg-amber-950/50 text-amber-300"
                                          : "bg-blue-950/50 text-blue-300"
                                      }`}
                                    >
                                      {task.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">Bởi: {task.name}</span>
                                  </div>
                                  <h4 className="text-[#e2e8f0] font-semibold text-sm leading-relaxed">
                                    {task.title}
                                  </h4>
                                </div>

                                <span
                                  className={`shrink-0 text-[11px] px-2 py-0.5 rounded border self-start ${
                                    task.status === TaskStatus.DONE
                                      ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/30"
                                      : task.status === TaskStatus.DOING
                                      ? "bg-yellow-950/50 text-yellow-400 border-yellow-500/30"
                                      : task.status === TaskStatus.PAUSED
                                      ? "bg-red-950/50 text-red-400 border-red-500/30"
                                      : "bg-slate-805 text-slate-350 border-slate-700"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </div>

                              {(task.link || task.note) && (
                                <div className="mt-2.5 bg-slate-900/50 rounded-lg p-2.5 border border-slate-850/50 space-y-1.5 text-xs">
                                  {task.link && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="text-slate-500 font-bold">Link:</span>
                                      <a
                                        href={task.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-400 hover:underline inline-flex items-center gap-1 max-w-full"
                                      >
                                        <span className="truncate">{task.link}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                  {task.note && (
                                    <div className="text-slate-350">
                                      <span className="text-slate-505 font-bold">Ghi chú:</span> {task.note}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action controllers row */}
                              <div className="flex items-center justify-between border-t border-slate-850/60 pt-2.5 mt-2.5 text-[9px] text-slate-450">
                                <span>Tạo: {new Date(task.createdAt).toLocaleString("vi-VN")}</span>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => startEditing(task)}
                                    className="flex items-center gap-1 hover:text-blue-400 transition-colors p-1"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                  <span className="text-slate-705">|</span>
                                  <button
                                    onClick={() => handleDeleteTask(task.id, task.title)}
                                    className="flex items-center gap-1 hover:text-red-400 transition-colors p-1"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
