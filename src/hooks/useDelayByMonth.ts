import useSWR from "swr";
import type { DelayByMonth } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDelayByMonth() {
  const { data, error, isLoading, mutate } = useSWR("/api/delay-by-month", fetcher);

  return {
    delays: (data?.data || []) as DelayByMonth[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
