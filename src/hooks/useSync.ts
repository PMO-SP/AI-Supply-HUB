import { useState } from "react";

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const sync = async () => {
    setIsSyncing(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        const d = data.data;
        setLastResult({
          success: true,
          message: `Synced ${d.articles} articles, ${d.forecasts} forecasts, ${d.plans} plans, ${d.stock_levels} stock levels, ${d.performance} performance, ${d.seasonality} seasonality, ${d.suppliers} suppliers, ${d.payments} payments, ${d.stockouts} stockouts, ${d.delay_by_month} delay records`,
        });
      } else {
        setLastResult({
          success: false,
          message: data.error || "Sync failed",
        });
      }

      return data.success;
    } catch (err) {
      setLastResult({
        success: false,
        message: err instanceof Error ? err.message : "Network error",
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing, lastResult };
}
