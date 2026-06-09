import React, { useState, useEffect, FormEvent } from "react";
import { Task, TaskStatus, TaskType } from "../types";
import { api } from "../api";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  ChevronDown,
  Loader2,
  CheckCircle,
  Eye,
  Check,
  X,
  FileText
} from "lucide-react";

interface TodayTasksViewProps {
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
}

export default function TodayTasksView({ showNotification }: TodayTasksViewProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState({ reporterName: "Khan" });

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>(TaskType.NEW);
  const [newLink, setNewLink] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<TaskType>(TaskType.NEW);
  const [editLink, setEditLink] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>(TaskStatus.TODO);

  // Zalo Copy Modal State
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [zaloDate, setZaloDate] = useState("");
  const [zaloReportText, setZaloReportText] = useState("");
  const [loadingZaloText, setLoadingZaloText] = useState(false);

  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateStr();

  const loadTasksAndSettings = async () => {
    setLoading(true);
    try {
      const tData = await api.getTasks(todayStr);
      const sData = await api.getSettings();
      setTasks(tData);
      setSettings(sData);
    } catch (err: any) {
      showNotification(err.message || "Không thể tải danh sách công việc hôm nay", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksAndSettings();
    setZaloDate(todayStr);
  }, []);

  // Format date correctly
  const formatDateDMY = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Add a task
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showNotification("Tiêu đề công việc không thể bỏ trống!", "error");
      return;
    }

    setSubmitting(true);
    try {
      const addedTask = await api.createTask({
        date: todayStr,
        name: settings.reporterName || "Khan",
        type: newType,
        title: newTitle.trim(),
        link: newLink.trim() || undefined,
        status: newStatus,
        note: newNote.trim() || undefined
      });

      setTasks([addedTask, ...tasks]);
      showNotification("Thêm công việc thành công!", "success");

      // Reset form
      setNewTitle("");
      setNewLink("");
      setNewNote("");
      setNewStatus(TaskStatus.TODO);
      setShowAddForm(false);
    } catch (err: any) {
      showNotification(err.message || "Không thể thêm công việc", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Start edit task
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditType(task.type);
    setEditLink(task.link || "");
    setEditNote(task.note || "");
    setEditStatus(task.status);
  };

  // Save edited task
  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      showNotification("Tiêu đề công việc không được bỏ trống!", "error");
      return;
    }

    try {
      const updated = await api.updateTask(id, {
        title: editTitle.trim(),
        type: editType,
        link: editLink.trim() || "",
        note: editNote.trim() || "",
        status: editStatus,
        date: todayStr // keep matching today
      });

      setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      showNotification("Cập nhật công việc thành công!", "success");
      setEditingTaskId(null);
    } catch (err: any) {
      showNotification(err.message || "Không thể cập nhật công việc", "error");
    }
  };

  // Quick Inline Status Update
  const handleQuickStatusUpdate = async (id: string, nextStatus: TaskStatus) => {
    try {
      await api.updateTask(id, { status: nextStatus });
      setTasks(tasks.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
      showNotification(`Đã chuyển trạng thái sang "${nextStatus}"`, "success");
    } catch (err: any) {
      showNotification(err.message || "Không thể cập nhật trạng thái", "error");
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string, titleTxt: string) => {
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa công việc: "${titleTxt}"?`);
    if (!isConfirmed) return;

    try {
      await api.deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
      showNotification("Đã xóa công việc khỏi danh sách thành công!", "success");
    } catch (err: any) {
      showNotification(err.message || "Không thể xóa công việc", "error");
    }
  };

  // Compile report for Zalo
  const compileZaloReport = async (dateVal: string) => {
    setLoadingZaloText(true);
    try {
      const rawTasks = await api.getTasks(dateVal);
      const dmY = formatDateDMY(dateVal);

      const fixed = rawTasks.filter((t) => t.type === TaskType.FIXED);
      const news = rawTasks.filter((t) => t.type === TaskType.NEW);
      const spontaneous = rawTasks.filter((t) => t.type === TaskType.OCCURRING);

      let text = `To do list ${settings.reporterName || "Khan"} ngày ${dmY}\n\n`;

      if (news.length > 0) {
        text += `Công việc mới:\n`;
        news.forEach((t, i) => {
          text += `${i + 1}. ${t.title}${t.link ? ` (${t.link})` : ""} - ${t.status}\n`;
        });
        text += `\n`;
      }

      if (spontaneous.length > 0) {
        text += `Công việc phát sinh:\n`;
        spontaneous.forEach((t, i) => {
          text += `${i + 1}. ${t.title}${t.link ? ` (${t.link})` : ""} - ${t.status}\n`;
        });
        text += `\n`;
      }

      if (news.length > 0 || spontaneous.length > 0) {
        text += `---\n\n`;
      }

      if (fixed.length > 0) {
        text += `Công việc cố định:\n`;
        fixed.forEach((t, i) => {
          text += `${i + 1}. ${t.title}${t.link ? ` (${t.link})` : ""} - ${t.status}\n`;
        });
      }

      if (rawTasks.length === 0) {
        text += `Không có công việc nào được tạo cho ngày này.`;
      }

      setZaloReportText(text);
    } catch (err: any) {
      showNotification("Lỗi biên soạn báo cáo Zalo", "error");
    } finally {
      setLoadingZaloText(false);
    }
  };

  useEffect(() => {
    if (showZaloModal) {
      compileZaloReport(zaloDate);
    }
  }, [showZaloModal, zaloDate]);

  // Click Copy Action
  const copyZaloToClipboard = () => {
    navigator.clipboard.writeText(zaloReportText);
    showNotification("Đã copy báo cáo Zalo thành công!", "success");
    setShowZaloModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm">Đang tải danh sách công việc hôm nay...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b233e] p-5 border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Công Việc Hôm Nay</h1>
          <p className="text-xs text-slate-400">
            Ngày {formatDateDMY(todayStr)} &bull; {tasks.length} Tổng công việc
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowZaloModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#05111f] hover:bg-slate-850 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Copy báo cáo Zalo</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAddForm ? "Đóng" : "Thêm việc"}</span>
          </button>
        </div>
      </div>

      {/* Task Creation Form (collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleAddTask}
          className="bg-[#0b233e]/90 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn"
        >
          <h3 className="text-md font-bold text-white border-b border-slate-800 pb-2">Thêm Công Việc Mới</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title / Content */}
            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Nội dung công việc *</label>
              <input
                type="text"
                required
                placeholder="Nhập nội dung task, dự án, chỉnh sửa..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Phân loại công việc *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as TaskType)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={TaskType.NEW}>{TaskType.NEW}</option>
                <option value={TaskType.OCCURRING}>{TaskType.OCCURRING}</option>
                <option value={TaskType.FIXED}>{TaskType.FIXED}</option>
              </select>
            </div>

            {/* Target Link */}
            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Link liên quan (nếu có)</label>
              <input
                type="url"
                placeholder="https://quatanglinhphat.com / https://..."
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Trạng thái ban đầu</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={TaskStatus.TODO}>{TaskStatus.TODO}</option>
                <option value={TaskStatus.DOING}>{TaskStatus.DOING}</option>
                <option value={TaskStatus.DONE}>{TaskStatus.DONE}</option>
                <option value={TaskStatus.PAUSED}>{TaskStatus.PAUSED}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-slate-350 font-semibold tracking-wide">Ghi chú chi tiết</label>
            <textarea
              placeholder="Ghi chú các chỉnh sửa hoàn thành..."
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Lưu công việc</span>
            </button>
          </div>
        </form>
      )}

      {/* Daily Task lists container board */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0b233e] border border-slate-800 rounded-2xl text-slate-450 text-sm">
            <p className="font-semibold text-slate-300">Không có công việc nào trong ngày hôm nay.</p>
            <p className="text-xs mt-1 text-slate-400">Ấn nút "Thêm việc" để tự quản lý hoặc cài đặt Công việc cố định.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => {
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`bg-[#0b233e] border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all ${
                    isEditing ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {isEditing ? (
                    /* EDIT INTEGRATED FORM */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-blue-400">Đang chỉnh sửa đầu việc</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          ID: <span className="font-mono">{task.id}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Nội dung công việc</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Phân loại</label>
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as TaskType)}
                            className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none"
                          >
                            <option value={TaskType.NEW}>{TaskType.NEW}</option>
                            <option value={TaskType.OCCURRING}>{TaskType.OCCURRING}</option>
                            <option value={TaskType.FIXED}>{TaskType.FIXED}</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Link đính kèm</label>
                          <input
                            type="text"
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Trạng thái</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                            className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none"
                          >
                            <option value={TaskStatus.TODO}>{TaskStatus.TODO}</option>
                            <option value={TaskStatus.DOING}>{TaskStatus.DOING}</option>
                            <option value={TaskStatus.DONE}>{TaskStatus.DONE}</option>
                            <option value={TaskStatus.PAUSED}>{TaskStatus.PAUSED}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ghi chú</label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-850 hover:bg-slate-750 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Mở rộng / Hủy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(task.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu chỉnh sửa</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* TASK READ-ONLY CARD */
                    <div className="space-y-3">
                      {/* Flex upper line header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                task.type === TaskType.FIXED
                                  ? "bg-purple-950/60 text-purple-300 border border-purple-500/20"
                                  : task.type === TaskType.OCCURRING
                                  ? "bg-amber-950/60 text-amber-300 border border-amber-500/20"
                                  : "bg-blue-950/60 text-blue-300 border border-blue-500/20"
                              }`}
                            >
                              {task.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Bởi: {task.name}</span>
                          </div>
                          <p className="text-[#f1f5f9] text-base font-semibold leading-relaxed">
                            {task.title}
                          </p>
                        </div>

                        {/* Status Select Badge */}
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                              task.status === TaskStatus.DONE
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                                : task.status === TaskStatus.DOING
                                ? "bg-yellow-950/60 text-yellow-400 border border-yellow-500/40"
                                : task.status === TaskStatus.PAUSED
                                ? "bg-red-950/60 text-red-400 border border-red-500/40"
                                : "bg-[#05111f] text-slate-350 border border-slate-700/60"
                            }`}
                          >
                            {task.status}
                          </span>

                          {/* Quick change status pills */}
                          <div className="flex items-center gap-1">
                            {Object.values(TaskStatus).map((s) => (
                              <button
                                key={s}
                                title={`Chuyển sang: ${s}`}
                                onClick={() => handleQuickStatusUpdate(task.id, s)}
                                className={`w-3.5 h-3.5 rounded-full border border-slate-700/80 cursor-pointer ${
                                  s === TaskStatus.DONE
                                    ? "bg-emerald-500 hover:scale-125"
                                    : s === TaskStatus.DOING
                                    ? "bg-yellow-500 hover:scale-125"
                                    : s === TaskStatus.PAUSED
                                    ? "bg-red-500 hover:scale-125"
                                    : "bg-slate-400 hover:scale-125"
                                }`}
                              ></button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Link & Note Info rows */}
                      {(task.link || task.note) && (
                        <div className="bg-[#05111f]/80 rounded-xl p-3 border border-slate-850/50 space-y-2 text-xs">
                          {task.link && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-slate-500 font-bold">Liên kết:</span>
                              <a
                                href={task.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1 max-w-xs md:max-w-md truncate"
                              >
                                {task.link}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {task.note && (
                            <div className="text-slate-300">
                              <span className="text-slate-500 font-bold">Ghi chú:</span> {task.note}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer: dates / controllers */}
                      <div className="flex items-center justify-between border-t border-slate-850/80 pt-3 mt-1.5 text-[10px] text-slate-450">
                        <div>
                          <span>Tạo lúc: {new Date(task.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                          {task.updatedAt !== task.createdAt && (
                            <span className="ml-3">&bull; Sửa: {new Date(task.updatedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditing(task)}
                            className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors p-1"
                            title="Sửa công việc"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>
                          <span className="text-slate-700">|</span>
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors p-1"
                            title="Xóa công việc"
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

      {/* MODERN COPY ZALO REPORT DIALOG MODAL */}
      {showZaloModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b233e] border border-slate-700/60 rounded-2xl p-6 w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-emerald-400 w-5 h-5" />
                Xuất Báo Cáo Zalo
              </h3>
              <button
                onClick={() => setShowZaloModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto mb-4">
              {/* Date selection row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#05111f] p-3 border border-slate-800 rounded-xl text-slate-400 text-sm">
                <span>Chọn ngày xuất báo cáo:</span>
                <input
                  type="date"
                  value={zaloDate}
                  onChange={(e) => setZaloDate(e.target.value)}
                  className="bg-[#0b233e] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Editable Compilation box */}
              <div className="space-y-1.5 flex flex-col h-[300px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Nội dung báo cáo (Có thể chỉnh sửa trước khi Copy)
                  </span>
                  {loadingZaloText && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </div>

                <textarea
                  value={zaloReportText}
                  onChange={(e) => setZaloReportText(e.target.value)}
                  className="flex-1 w-full bg-[#05111f] border border-slate-700 rounded-xl p-4 text-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Đang tải dữ liệu và biên dịch báo cáo phong cách Zalo..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowZaloModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={copyZaloToClipboard}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-emerald-900/35 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Copy Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
