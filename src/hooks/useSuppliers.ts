import useSWR from "swr";
import type { Supplier } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSuppliers() {
  const { data, error, isLoading, mutate } = useSWR("/api/suppliers", fetcher);

  return {
    suppliers: (data?.data || []) as Supplier[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
