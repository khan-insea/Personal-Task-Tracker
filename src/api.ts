import { Task, FixedTask, AppSettings } from "./types";

const getAuthToken = (): string | null => {
  return sessionStorage.getItem("app_token");
};

export const setAuthToken = (token: string) => {
  sessionStorage.setItem("app_token", token);
};

export const clearAuthToken = () => {
  sessionStorage.removeItem("app_token");
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = "Đã xảy ra lỗi!";
    try {
      const errData = await res.json();
      errMsg = errData.error || errMsg;
    } catch (_) {
      errMsg = res.statusText || errMsg;
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: async (password: string): Promise<{ success: boolean; token: string }> => {
    return apiFetch<{ success: boolean; token: string }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  getTasks: async (date: string): Promise<Task[]> => {
    return apiFetch<Task[]>(`/api/tasks?date=${date}`);
  },

  getAllTasks: async (): Promise<Task[]> => {
    return apiFetch<Task[]>("/api/all-tasks");
  },

  createTask: async (task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> => {
    return apiFetch<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    return apiFetch<Task>(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(task),
    });
  },

  deleteTask: async (id: string): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>(`/api/tasks/${id}`, {
      method: "DELETE",
    });
  },

  getFixedTasks: async (): Promise<FixedTask[]> => {
    return apiFetch<FixedTask[]>("/api/fixed-tasks");
  },

  createFixedTask: async (ft: Omit<FixedTask, "id" | "createdAt" | "updatedAt">): Promise<FixedTask> => {
    return apiFetch<FixedTask>("/api/fixed-tasks", {
      method: "POST",
      body: JSON.stringify(ft),
    });
  },

  updateFixedTask: async (id: string, ft: Partial<FixedTask>): Promise<FixedTask> => {
    return apiFetch<FixedTask>(`/api/fixed-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(ft),
    });
  },

  deleteFixedTask: async (id: string): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>(`/api/fixed-tasks/${id}`, {
      method: "DELETE",
    });
  },

  getSettings: async (): Promise<AppSettings> => {
    return apiFetch<AppSettings>("/api/settings");
  },

  updateSettings: async (settings: AppSettings): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};
