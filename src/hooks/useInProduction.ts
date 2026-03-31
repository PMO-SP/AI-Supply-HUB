import useSWR from "swr";
import type { InProduction, ApiResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInProduction() {
  const { data, error, mutate } = useSWR<ApiResponse<InProduction[]>>(
    "/api/in-production",
    fetcher
  );

  return {
    orders: data?.data ?? [],
    isLoading: !error && !data,
    isError: !!error || (data !== undefined && !data.success),
    mutate,
  };
}
