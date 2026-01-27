import { apiFetch } from "./api";

export interface Reminder {
  id: string;
  title: string;
  prompt: string;
  schedule: string;
  timezone: string;
  frequency: string;
  isActive: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
}

export interface CreateReminderRequest {
  prompt: string;
  timezone?: string;
}

export interface CreateReminderResponse {
  success: boolean;
  message?: string;
  data?: {
    reminder: Reminder;
  };
}

export interface GetRemindersResponse {
  success: boolean;
  data?: {
    reminders: Reminder[];
    count: number;
  };
}

export interface ToggleReminderResponse {
  success: boolean;
  message?: string;
  data?: {
    reminder: Reminder;
  };
}

export interface DeleteReminderResponse {
  success: boolean;
  message?: string;
}

export async function createReminder(
  request: CreateReminderRequest
): Promise<CreateReminderResponse> {
  const response = await apiFetch<{ reminder: Reminder }>("/api/reminders", {
    method: "POST",
    body: JSON.stringify(request),
  });

  return {
    success: response.success,
    message: response.message,
    data: response.data,
  };
}

export async function getReminders(
  activeOnly = false
): Promise<GetRemindersResponse> {
  const url = activeOnly ? "/api/reminders?active=true" : "/api/reminders";
  const response = await apiFetch<{ reminders: Reminder[]; count: number }>(
    url,
    {
      method: "GET",
    }
  );

  return {
    success: response.success,
    data: response.data,
  };
}

export async function getReminder(id: string): Promise<CreateReminderResponse> {
  const response = await apiFetch<{ reminder: Reminder }>(
    `/api/reminders/${id}`,
    {
      method: "GET",
    }
  );

  return {
    success: response.success,
    message: response.message,
    data: response.data,
  };
}

export async function toggleReminder(
  id: string
): Promise<ToggleReminderResponse> {
  const response = await apiFetch<{ reminder: Reminder }>(
    `/api/reminders/${id}/toggle`,
    {
      method: "PATCH",
    }
  );

  return {
    success: response.success,
    message: response.message,
    data: response.data,
  };
}

export async function deleteReminder(
  id: string
): Promise<DeleteReminderResponse> {
  const response = await apiFetch<object>(`/api/reminders/${id}`, {
    method: "DELETE",
  });

  return {
    success: response.success,
    message: response.message,
  };
}
