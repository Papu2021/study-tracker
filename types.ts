export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  bio?: string;
  createdAt: number;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: number; // timestamp
  completed: boolean;
  completedAt?: number; // timestamp
  createdAt: number; // timestamp
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  count: number;
}