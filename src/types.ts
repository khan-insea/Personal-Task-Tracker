export enum TaskType {
  NEW = 'Công việc mới',
  FIXED = 'Công việc cố định',
  OCCURRING = 'Công việc phát sinh'
}

export enum TaskStatus {
  TODO = 'Chưa làm',
  DOING = 'Đang làm',
  DONE = 'Hoàn thành',
  PAUSED = 'Tạm dừng'
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // reporter name
  type: TaskType;
  title: string;
  link?: string;
  status: TaskStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FixedTask {
  id: string;
  title: string;
  link?: string;
  active: boolean; // boolean represented as strings in google sheets (TRUE/FALSE)
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  reporterName: string;
  [key: string]: string;
}
