import useSWR from "swr";
import type { InboundOrder, ApiResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInboundOrders() {
  const { data, error, mutate } = useSWR<ApiResponse<InboundOrder[]>>(
    "/api/inbound-orders",
    fetcher
  );

  return {
    orders: data?.data ?? [],
    isLoading: !error && !data,
    isError: !!error || (data !== undefined && !data.success),
    mutate,
  };
}
