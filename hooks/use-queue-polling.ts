import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface QueueEntry {
  id: string;
  position: number;
  status: "waiting" | "checking" | "done" | "absent";
  joinedAt: string;
  checkStartedAt: string | null;
  checkEndedAt: string | null;
  notes: string | null;
  studentId: string;
  studentName: string;
}

export interface QueueStats {
  waiting: number;
  checking: number;
  done: number;
  absent: number;
  total: number;
  avgCheckSeconds: number;
  estimatedWaitSeconds: number;
}

export function useQueuePolling(code: string) {
  const { data, error, isLoading, mutate } = useSWR<QueueEntry[]>(
    `/api/sessions/${code}/queue`,
    fetcher,
    { refreshInterval: 3000 }
  );

  return { queue: data, error, isLoading, mutate };
}

export function useStatsPolling(code: string) {
  const { data, error, isLoading } = useSWR<QueueStats>(
    `/api/sessions/${code}/stats`,
    fetcher,
    { refreshInterval: 3000 }
  );

  return { stats: data, error, isLoading };
}
