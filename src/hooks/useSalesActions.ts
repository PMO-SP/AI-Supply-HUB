import useSWR from "swr";
import type { SalesAction, ApiResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSalesActions() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<SalesAction[]>>(
    "/api/sales-actions",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    salesActions: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
