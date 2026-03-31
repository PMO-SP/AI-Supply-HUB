"use client";

import type { ShipmentPlan, PerformanceInfo } from "@/lib/types";

interface WarningsPanelProps {
  warnings: ShipmentPlan[];
  onOverride: (plan: ShipmentPlan) => void;
}

function parsePerformanceInfo(plan: ShipmentPlan): PerformanceInfo | null {
  if (!plan.performance_info) return null;
  try {
    return typeof plan.performance_info === "string"
      ? JSON.parse(plan.performance_info)
      : plan.performance_info;
  } catch { return null; }
}

function getWarningStyle(type: string | null) {
  switch (type) {
    case "ship_date_in_past":
    case "production_start_in_past":
    case "urgent_reorder":
      return { border: "border-brand-red/30", dot: "bg-brand-red", label: type === "ship_date_in_past" ? "Versanddatum verpasst" : type === "urgent_reorder" ? "Dringende Nachbestellung" : "Produktionsstart verspätet" };
    case "stock_running_low":
    case "high_container_count":
      return { border: "border-status-amber/30", dot: "bg-status-amber", label: type === "stock_running_low" ? "Bestand niedrig" : "Hohe Containeranzahl" };
    default:
      return { border: "border-gray-200", dot: "bg-gray-400", label: "Warnung" };
  }
}

export default function WarningsPanel({ warnings, onOverride }: WarningsPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-[12px]">
        Keine Warnungen. Alle Sendungen planmässig.
      </div>
    );
  }

  // Group by warning type
  const grouped = new Map<string, ShipmentPlan[]>();
  for (const w of warnings) {
    const key = w.warning_type || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(w);
  }

  const redTypes = ["production_start_in_past", "ship_date_in_past", "urgent_reorder"];
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const aIsRed = redTypes.includes(a[0]) ? 0 : 1;
    const bIsRed = redTypes.includes(b[0]) ? 0 : 1;
    return aIsRed - bIsRed;
  });

  return (
    <div className="p-4 space-y-5">
      {sortedGroups.map(([type, plans]) => {
        const style = getWarningStyle(type);
        const isRed = redTypes.includes(type);
        return (
          <div key={type}>
            <h3 className={`text-[11px] font-medium uppercase tracking-[0.4px] mb-2 ${
              isRed ? "text-brand-red" : "text-status-amber"
            }`}>
              {style.label} ({plans.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const perf = parsePerformanceInfo(plan);
                return (
                  <div
                    key={`${plan.article_id}-${plan.year}-${plan.month}`}
                    className={`border rounded-lg p-3 bg-white ${style.border}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${style.dot}`} />
                        <div>
                          <div className="font-medium text-[12px] text-gray-900">
                            {plan.article_name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(plan.year, plan.month - 1).toLocaleDateString("de-DE", {
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[16px] font-bold text-gray-700">
                        {plan.containers_needed}x
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                      {plan.warning_message}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        plan.stock_coverage_months < 1 ? "bg-status-red-light text-status-red-dark" :
                        plan.stock_coverage_months < 2 ? "bg-status-amber-light text-status-amber-dark" :
                        "bg-status-green-light text-status-green-dark"
                      }`}>
                        Bestand: {plan.current_stock_units} ({plan.stock_coverage_months} Mo.)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        Safety: {plan.safety_stock_units}
                      </span>
                      {perf && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          Math.abs(perf.variance_pct) > 25 ? "bg-status-red-light text-status-red-dark" :
                          Math.abs(perf.variance_pct) > 10 ? "bg-status-amber-light text-status-amber-dark" :
                          "bg-status-green-light text-status-green-dark"
                        }`}>
                          {perf.variance_pct > 0 ? "+" : ""}{perf.variance_pct}%
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOverride(plan)}
                      className="text-[11px] font-medium text-brand-red hover:text-brand-red-dark"
                    >
                      Override &rarr;
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
