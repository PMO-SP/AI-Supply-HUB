import useSWR from "swr";
import type { ShipmentPlan } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePlans(articleId?: string, year?: number) {
  const params = new URLSearchParams();
  if (articleId) params.set("article_id", articleId);
  if (year) params.set("year", String(year));

  const query = params.toString();
  const url = `/api/plans${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    plans: (data?.data || []) as ShipmentPlan[],
    isLoading,
    isError: !!error,
    mutate,
  };
}
