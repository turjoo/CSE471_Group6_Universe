import { AcademicTask } from '@prisma/client';

export type UrgencyLevel = 'OVERDUE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'COMPLETED';

export function calculateUrgency(dueAt: Date, isCompleted: boolean): UrgencyLevel {
  if (isCompleted) return 'COMPLETED';

  const now = new Date();
  const dueDate = new Date(dueAt);
  const diffTime = dueDate.getTime() - now.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);

  if (diffHours < 0) return 'OVERDUE';
  if (diffHours <= 24) return 'HIGH';
  if (diffHours <= 72) return 'MEDIUM';
  return 'LOW';
}

export function sortTasksByUrgency(tasks: AcademicTask[]): AcademicTask[] {
  return [...tasks].sort((a, b) => {
    // If both are completed, sort by due date (descending)
    if (a.isCompleted && b.isCompleted) {
      return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
    }
    // Push completed tasks to the bottom
    if (a.isCompleted) return 1;
    if (b.isCompleted) return -1;

    // For incomplete tasks, sort by due date (ascending)
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}
