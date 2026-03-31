import useSWR from "swr";
import type { ApiResponse } from "@/lib/types";
import type { ArticlePerformance } from "@/app/api/performance/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type { ArticlePerformance };

export function usePerformance() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<ArticlePerformance[]>>(
    "/api/performance",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    performance: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
