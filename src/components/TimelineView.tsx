"use client";

import { useMemo } from "react";
import type { ShipmentPlan, PerformanceInfo } from "@/lib/types";

interface TimelineViewProps {
  plans: ShipmentPlan[];
  onOverride: (plan: ShipmentPlan) => void;
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString("de-DE", {
    month: "short",
  });
}

function parsePerformanceInfo(plan: ShipmentPlan): PerformanceInfo | null {
  if (!plan.performance_info) return null;
  try {
    return typeof plan.performance_info === "string"
      ? JSON.parse(plan.performance_info)
      : plan.performance_info;
  } catch {
    return null;
  }
}

export default function TimelineView({ plans, onOverride }: TimelineViewProps) {
  const months = useMemo(() => {
    const now = new Date();
    const result: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: getMonthLabel(d.getFullYear(), d.getMonth() + 1),
      });
    }
    return result;
  }, []);

  const articleGroups = useMemo(() => {
    const groups = new Map<string, { name: string; plans: Map<string, ShipmentPlan> }>();
    for (const plan of plans) {
      if (!groups.has(plan.article_id)) {
        groups.set(plan.article_id, { name: plan.article_name || plan.article_id, plans: new Map() });
      }
      groups.get(plan.article_id)!.plans.set(`${plan.year}-${plan.month}`, plan);
    }
    return Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [plans]);

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-[12px]">
        Keine Plandaten vorhanden. &quot;Google Sheets sync&quot; klicken.
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Month headers */}
      <div className="grid grid-cols-12 gap-[3px] mb-1">
        {months.map((m) => (
          <div
            key={`${m.year}-${m.month}`}
            className="text-[10px] text-center text-gray-500"
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Article rows */}
      {articleGroups.map(([articleId, group]) => (
        <div key={articleId} className="mb-1">
          <div className="text-[11px] text-gray-500 mb-[3px]">{group.name}</div>
          <div className="grid grid-cols-12 gap-[3px]">
            {months.map((m) => {
              const key = `${m.year}-${m.month}`;
              const plan = group.plans.get(key);

              if (!plan || plan.containers_needed === 0) {
                return <div key={key} className="h-[18px] rounded-[3px]" />;
              }

              const perf = parsePerformanceInfo(plan);

              // Color based on status
              let blockClass = "bg-brand-red opacity-85"; // default: active = Sportstech red
              if (plan.status_color === "yellow") {
                blockClass = "bg-status-amber opacity-85";
              } else if (plan.status_color === "green") {
                blockClass = "bg-brand-red opacity-85"; // brand red for all active shipments
              }
              // Red status gets full opacity brand red
              if (plan.status_color === "red") {
                blockClass = "bg-brand-red opacity-100";
              }

              return (
                <div
                  key={key}
                  className={`h-[18px] rounded-[3px] cursor-pointer relative group ${blockClass}`}
                  onClick={() => onOverride(plan)}
                  title={[
                    `${plan.article_name} - ${plan.containers_needed}x Container`,
                    `Stock: ${plan.current_stock_units} (${plan.stock_coverage_months} Mo.)`,
                    `Safety: ${plan.safety_stock_units} St.`,
                    `Prod: ${plan.production_start}`,
                    `Ship: ${plan.ship_date}`,
                    perf ? `Abw.: ${perf.variance_pct > 0 ? "+" : ""}${perf.variance_pct}%` : "",
                    plan.warning_message || "",
                  ].filter(Boolean).join("\n")}
                >
                  {/* Container count overlay */}
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {plan.containers_needed}x
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-brand-red opacity-85 rounded-[2px]" />
          Container geplant
        </span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-status-amber opacity-85 rounded-[2px]" />
          Achtung
        </span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-gray-100 border border-gray-200 rounded-[2px]" />
          Kein Versand
        </span>
      </div>
    </div>
  );
}
