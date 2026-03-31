import useSWR from "swr";
import type { GoodsOnTheWay, ApiResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGoodsOnTheWay() {
  const { data, error, mutate } = useSWR<ApiResponse<GoodsOnTheWay[]>>(
    "/api/goods-on-the-way",
    fetcher
  );

  return {
    goods: data?.data ?? [],
    isLoading: !error && !data,
    isError: !!error || (data !== undefined && !data.success),
    mutate,
  };
}
