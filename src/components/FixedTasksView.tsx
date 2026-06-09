import React, { useState, useEffect, FormEvent } from "react";
import { FixedTask } from "../types";
import { api } from "../api";
import { Plus, Trash2, Edit2, Link2, Check, X, Loader2, Eye, ToggleLeft, ToggleRight } from "lucide-react";

interface FixedTasksViewProps {
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
}

export default function FixedTasksView({ showNotification }: FixedTasksViewProps) {
  const [loading, setLoading] = useState(true);
  const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);
  
  // Creation States
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editActive, setEditActive] = useState(true);

  const loadFixedTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getFixedTasks();
      setFixedTasks(data);
    } catch (err: any) {
      showNotification(err.message || "Không thể tải danh sách công việc cố định", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFixedTasks();
  }, []);

  // Add FixedTask
  const handleAddFixedTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification("Tiêu đề không thể bỏ trống!", "error");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createFixedTask({
        title: title.trim(),
        link: link.trim() || undefined,
        active
      });

      setFixedTasks([...fixedTasks, created]);
      showNotification("Đã thêm công việc cố định thành công!", "success");
      
      // Reset Form State
      setTitle("");
      setLink("");
      setActive(true);
      setShowAddForm(false);
    } catch (err: any) {
      showNotification(err.message || "Không thể thêm công việc cố định", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Start Edit
  const startEditing = (ft: FixedTask) => {
    setEditingId(ft.id);
    setEditTitle(ft.title);
    setEditLink(ft.link || "");
    setEditActive(ft.active);
  };

  // Save Edit
  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      showNotification("Tiêu đề không được để trống!", "error");
      return;
    }

    try {
      const updated = await api.updateFixedTask(id, {
        title: editTitle.trim(),
        link: editLink.trim() || "",
        active: editActive
      });

      setFixedTasks(fixedTasks.map((ft) => (ft.id === id ? { ...ft, ...updated } : ft)));
      showNotification("Cập nhật công việc cố định thành công!", "success");
      setEditingId(null);
    } catch (err: any) {
      showNotification(err.message || "Không thể cập nhật công việc cố định", "error");
    }
  };

  // Toggle Active state directly (instant save)
  const handleToggleActive = async (ft: FixedTask) => {
    const nextActive = !ft.active;
    try {
      await api.updateFixedTask(ft.id, { active: nextActive });
      setFixedTasks(fixedTasks.map((t) => (t.id === ft.id ? { ...t, active: nextActive } : t)));
      showNotification(
        `Đã ${nextActive ? "kích hoạt" : "tạm ngưng"} tạo mới tự động cho công việc này`,
        "success"
      );
    } catch (err: any) {
      showNotification(err.message || "Không thể cập nhật trạng thái hoạt động", "error");
    }
  };

  // Delete FixedTask
  const handleDeleteFixedTask = async (id: string, titleTxt: string) => {
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa công việc cố định: "${titleTxt}"?`);
    if (!isConfirmed) return;

    try {
      await api.deleteFixedTask(id);
      setFixedTasks(fixedTasks.filter((ft) => ft.id !== id));
      showNotification("Đã xóa công việc cố định thành công!", "success");
    } catch (err: any) {
      showNotification(err.message || "Không thể xóa công việc cố định", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm">Đang tải danh sách công việc cố định...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b233e] p-5 border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Cấu Hình Công Việc Cố Định</h1>
          <p className="text-xs text-slate-400">
            Tổng cộng {fixedTasks.length} việc cố định &bull; Những việc chuyển tiếp tự động hằng ngày
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/30 transition-all cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? "Đóng mẫu" : "Thêm việc cố định"}</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddFixedTask}
          className="bg-[#0b233e]/90 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn"
        >
          <h3 className="text-md font-bold text-white border-b border-slate-800 pb-2">Đăng Ký Việc Cố Định Mới</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Tiêu đề / Tên công việc *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Theo dõi GG ADS Sao Xanh..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-350 font-semibold tracking-wide">Link liên quan (nếu có)</label>
              <input
                type="url"
                placeholder="https://quatanglinhphat.com / https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full bg-[#05111f] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
            />
            <label htmlFor="activeCheckbox" className="text-xs text-slate-300 font-semibold cursor-pointer">
              Tự động thêm vào Todo list hằng ngày
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs cursor-pointer"
            >
              Hủy bỏ
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
              <span>Tạo nhiệm vụ</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of Fixed Tasks list cards */}
      <div className="space-y-4">
        {fixedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0b233e] border border-slate-800 rounded-2xl text-slate-400 text-sm">
            <p className="font-semibold text-slate-300">Không có công việc cố định nào được định cấu hình.</p>
            <p className="text-xs mt-1 text-slate-450">Các công việc cố định giúp đồng bộ nhanh vào danh sách hằng ngày tự động.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedTasks.map((ft) => {
              const isEditing = editingId === ft.id;

              return (
                <div
                  key={ft.id}
                  className={`bg-[#0b233e] border rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all ${
                    isEditing ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-4 w-full">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className="text-xs font-bold text-blue-400">Sửa công việc cố định</span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {ft.id}</span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tên công việc</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-[#05111f] border border-slate-750 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Link liên kết</label>
                          <input
                            type="text"
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            className="w-full bg-[#05111f] border border-slate-750 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`editActive-${ft.id}`}
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-550 focus:ring-2 accent-blue-600"
                          />
                          <label htmlFor={`editActive-${ft.id}`} className="text-xs text-slate-350 cursor-pointer">
                            Nhân bản hằng ngày
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-slate-850 hover:bg-slate-750 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(ft.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only state cards */
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Upper flex alignment */}
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-slate-100 font-bold font-sans text-sm md:text-base leading-relaxed line-clamp-2">
                            {ft.title}
                          </h3>

                          <button
                            onClick={() => handleToggleActive(ft)}
                            title={ft.active ? "Click để tắt kích hoạt" : "Click để kích hoạt tự động theo dõi"}
                            className="shrink-0 focus:outline-none cursor-pointer"
                          >
                            {ft.active ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                                <span>Hoạt động</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-850 border border-slate-700/60 px-2 py-0.5 rounded-full">
                                <span>Tạm ngưng</span>
                              </div>
                            )}
                          </button>
                        </div>

                        {ft.link && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-400 max-w-full">
                            <Link2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <a
                              href={ft.link}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate text-ellipsis overflow-hidden"
                            >
                              {ft.link}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Footer actions bar */}
                      <div className="flex items-center justify-between border-t border-slate-850/80 pt-3 mt-4 text-[10px] text-slate-400">
                        <span>Tạo: {new Date(ft.createdAt).toLocaleDateString("vi-VN")}</span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditing(ft)}
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>
                          <span>|</span>
                          <button
                            onClick={() => handleDeleteFixedTask(ft.id, ft.title)}
                            className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
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
    </div>
  );
}
