import useSWR from "swr";
import type { StockoutWithUrgency } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStockouts() {
  const { data, error, isLoading, mutate } = useSWR("/api/stockouts", fetcher);

  return {
    stockouts: (data?.data || []) as StockoutWithUrgency[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
