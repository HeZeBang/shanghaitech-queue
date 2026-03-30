import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface SessionInfo {
  id: string;
  code: string;
  name: string;
  status: "active" | "closed";
  createdAt: string;
}

export function useSession(code: string) {
  const { data, error, isLoading, mutate } = useSWR<SessionInfo>(
    `/api/sessions/${code}`,
    fetcher
  );

  return { session: data, error, isLoading, mutate };
}
