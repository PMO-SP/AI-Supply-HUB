import useSWR from "swr";
import type { ShipmentPlan } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWarnings() {
  const { data, error, isLoading, mutate } = useSWR("/api/warnings", fetcher);

  return {
    warnings: (data?.data || []) as ShipmentPlan[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
