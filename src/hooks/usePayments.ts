import useSWR from "swr";
import type { PaymentWithDunning } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePayments() {
  const { data, error, isLoading, mutate } = useSWR("/api/payments", fetcher);

  return {
    payments: (data?.data || []) as PaymentWithDunning[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
