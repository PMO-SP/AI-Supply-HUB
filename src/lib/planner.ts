import { subDays, format, isBefore, differenceInDays } from "date-fns";
import type {
  Article,
  Forecast,
  Override,
  ShipmentPlan,
  StockLevel,
  MonthlyPerformance,
  SeasonalityEntry,
  SafetyStockBreakdown,
  PerformanceInfo,
  WarningType,
  StatusColor,
} from "./types";

// ---------------------------------------------------------------------------
// Sell-through tier classification
// ---------------------------------------------------------------------------
function classifySellThroughTiers(
  articles: Article[],
  forecasts: Forecast[]
): Map<string, { multiplier: number; tier: "fast" | "medium" | "slow" }> {
  // Calculate average monthly sales velocity per article from forecasts
  const velocityMap = new Map<string, number[]>();
  for (const f of forecasts) {
    if (!velocityMap.has(f.article_id)) velocityMap.set(f.article_id, []);
    velocityMap.get(f.article_id)!.push(f.target_units);
  }

  const avgVelocities: { article_id: string; avg: number }[] = [];
  for (const [articleId, values] of velocityMap) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    avgVelocities.push({ article_id: articleId, avg });
  }

  // Sort descending by velocity
  avgVelocities.sort((a, b) => b.avg - a.avg);

  const total = avgVelocities.length;
  const topThreshold = Math.ceil(total / 3);
  const midThreshold = Math.ceil((total * 2) / 3);

  const result = new Map<string, { multiplier: number; tier: "fast" | "medium" | "slow" }>();
  avgVelocities.forEach((item, idx) => {
    if (idx < topThreshold) {
      result.set(item.article_id, { multiplier: 1.3, tier: "fast" });
    } else if (idx < midThreshold) {
      result.set(item.article_id, { multiplier: 1.0, tier: "medium" });
    } else {
      result.set(item.article_id, { multiplier: 0.8, tier: "slow" });
    }
  });

  // Articles with no forecast data default to medium
  for (const a of articles) {
    if (!result.has(a.article_id)) {
      result.set(a.article_id, { multiplier: 1.0, tier: "medium" });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Uncertainty factor from historical forecast error
// ---------------------------------------------------------------------------
function computeUncertaintyFactor(
  articleId: string,
  forecasts: Forecast[],
  performance: MonthlyPerformance[],
  referenceDate: Date
): { factor: number; deviation: number; monthsUsed: number } {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;

  // Get last 6 months of data (use 3-6 months)
  const relevantMonths: { year: number; month: number }[] = [];
  for (let i = 1; i <= 6; i++) {
    let m = refMonth - i;
    let y = refYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    relevantMonths.push({ year: y, month: m });
  }

  const forecastMap = new Map<string, number>();
  for (const f of forecasts) {
    if (f.article_id === articleId) {
      forecastMap.set(`${f.year}-${f.month}`, f.target_units);
    }
  }

  const perfMap = new Map<string, number>();
  for (const p of performance) {
    if (p.article_id === articleId) {
      perfMap.set(`${p.year}-${p.month}`, p.actual_units_sold);
    }
  }

  const deviations: number[] = [];
  for (const rm of relevantMonths) {
    const key = `${rm.year}-${rm.month}`;
    const fc = forecastMap.get(key);
    const actual = perfMap.get(key);
    if (fc !== undefined && actual !== undefined && fc > 0) {
      deviations.push(Math.abs(actual - fc) / fc);
    }
  }

  if (deviations.length < 1) {
    // No history - use moderate uncertainty
    return { factor: 1.15, deviation: 0.15, monthsUsed: 0 };
  }

  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  return {
    factor: 1 + avgDeviation,
    deviation: avgDeviation,
    monthsUsed: deviations.length,
  };
}

// ---------------------------------------------------------------------------
// Performance info for current month
// ---------------------------------------------------------------------------
function getPerformanceInfo(
  articleId: string,
  year: number,
  month: number,
  forecasts: Forecast[],
  performance: MonthlyPerformance[],
  referenceDate: Date
): PerformanceInfo | null {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;

  // Only compute for current month
  if (year !== refYear || month !== refMonth) return null;

  const forecast = forecasts.find(
    (f) => f.article_id === articleId && f.year === year && f.month === month
  );
  const actual = performance.find(
    (p) => p.article_id === articleId && p.year === year && p.month === month
  );

  if (!forecast || !actual || forecast.target_units === 0) return null;

  const variancePct =
    ((actual.actual_units_sold - forecast.target_units) / forecast.target_units) * 100;

  let flag: PerformanceInfo["flag"] = "on_track";
  if (variancePct > 5) flag = "accelerate";
  else if (variancePct < -5) flag = "delay";

  return {
    actual_units_sold: actual.actual_units_sold,
    forecast_target: forecast.target_units,
    variance_pct: Math.round(variancePct * 10) / 10,
    flag,
  };
}

// ---------------------------------------------------------------------------
// Main planning algorithm
// ---------------------------------------------------------------------------
export interface PlannerInput {
  articles: Article[];
  forecasts: Forecast[];
  overrides: Override[];
  stockLevels: StockLevel[];
  performance: MonthlyPerformance[];
  seasonality: SeasonalityEntry[];
  referenceDate?: Date;
}

export function computeShipmentPlans(
  articlesOrInput: Article[] | PlannerInput,
  forecastsArg?: Forecast[],
  overridesArg?: Override[],
  referenceDateArg?: Date
): ShipmentPlan[] {
  // Support both old (backward-compatible) and new calling conventions
  let articles: Article[];
  let forecasts: Forecast[];
  let overrides: Override[];
  let stockLevels: StockLevel[];
  let performance: MonthlyPerformance[];
  let seasonality: SeasonalityEntry[];
  let referenceDate: Date;

  if (Array.isArray(articlesOrInput)) {
    // Legacy call: computeShipmentPlans(articles, forecasts, overrides, refDate?)
    articles = articlesOrInput;
    forecasts = forecastsArg || [];
    overrides = overridesArg || [];
    stockLevels = [];
    performance = [];
    seasonality = [];
    referenceDate = referenceDateArg || new Date();
  } else {
    // New call: computeShipmentPlans({ articles, forecasts, ... })
    articles = articlesOrInput.articles;
    forecasts = articlesOrInput.forecasts;
    overrides = articlesOrInput.overrides;
    stockLevels = articlesOrInput.stockLevels;
    performance = articlesOrInput.performance;
    seasonality = articlesOrInput.seasonality;
    referenceDate = articlesOrInput.referenceDate || new Date();
  }

  const articleMap = new Map(articles.map((a) => [a.article_id, a]));

  // Stock levels map
  const stockMap = new Map(stockLevels.map((s) => [s.article_id, s.current_stock_units]));

  // Seasonality map: articleId-month -> coefficient
  const seasonalityMap = new Map<string, number>();
  for (const s of seasonality) {
    seasonalityMap.set(`${s.article_id}-${s.month}`, s.seasonality_coefficient);
  }

  // Sell-through tiers
  const sellThroughTiers = classifySellThroughTiers(articles, forecasts);

  // Override map
  const overrideMap = new Map<string, Override[]>();
  for (const o of overrides) {
    const key = `${o.article_id}-${o.year}-${o.month}`;
    if (!overrideMap.has(key)) overrideMap.set(key, []);
    overrideMap.get(key)!.push(o);
  }

  const plans: ShipmentPlan[] = [];

  for (const forecast of forecasts) {
    const article = articleMap.get(forecast.article_id);
    if (!article) continue;

    // Arrival date = 1st of the target month
    const arrivalDate = new Date(forecast.year, forecast.month - 1, 1);

    // --- Stock buffer ---
    const currentStock = stockMap.get(forecast.article_id) || 0;
    const unitsNeededAfterStock = Math.max(0, forecast.target_units - currentStock);

    // --- Safety stock calculation ---
    const avgDailySales = forecast.target_units / 30;
    const transitDays = article.transit_lead_time_days;

    const uncertaintyResult = computeUncertaintyFactor(
      forecast.article_id,
      forecasts,
      performance,
      referenceDate
    );

    const tierInfo = sellThroughTiers.get(forecast.article_id) || {
      multiplier: 1.0,
      tier: "medium" as const,
    };

    const seasonCoeff =
      seasonalityMap.get(`${forecast.article_id}-${forecast.month}`) || 1.0;

    const safetyStockUnits = Math.ceil(
      avgDailySales *
        transitDays *
        uncertaintyResult.factor *
        tierInfo.multiplier *
        seasonCoeff
    );

    const safetyBreakdown: SafetyStockBreakdown = {
      safety_stock_units: safetyStockUnits,
      avg_daily_sales: Math.round(avgDailySales * 100) / 100,
      transit_days: transitDays,
      uncertainty_factor: Math.round(uncertaintyResult.factor * 1000) / 1000,
      sell_through_multiplier: tierInfo.multiplier,
      sell_through_tier: tierInfo.tier,
      seasonality_coefficient: seasonCoeff,
      historical_deviation: Math.round(uncertaintyResult.deviation * 1000) / 1000,
      months_of_history: uncertaintyResult.monthsUsed,
    };

    // --- Total units needed ---
    const totalUnitsNeeded = unitsNeededAfterStock + safetyStockUnits;

    // --- Base calculations ---
    let targetUnits = forecast.target_units;
    const unitsPerContainer = Math.max(1, article.units_per_container);
    let containersNeeded =
      totalUnitsNeeded <= 0
        ? 0
        : Math.ceil(totalUnitsNeeded / unitsPerContainer);
    let shipDate = subDays(arrivalDate, article.transit_lead_time_days);
    let productionStart = subDays(shipDate, article.production_lead_time_days);

    // --- Performance adjustment ---
    const perfInfo = getPerformanceInfo(
      forecast.article_id,
      forecast.year,
      forecast.month,
      forecasts,
      performance,
      referenceDate
    );

    // If selling faster, pull ship date 7 days earlier; if slower, push 7 days later
    if (perfInfo) {
      if (perfInfo.flag === "accelerate") {
        shipDate = subDays(shipDate, 7);
        productionStart = subDays(productionStart, 7);
      } else if (perfInfo.flag === "delay") {
        shipDate = subDays(shipDate, -7); // add 7 days
        productionStart = subDays(productionStart, -7);
      }
    }

    // --- Stock coverage months ---
    const avgMonthlyForecast =
      forecasts
        .filter((f) => f.article_id === forecast.article_id)
        .reduce((sum, f) => sum + f.target_units, 0) /
        Math.max(
          1,
          forecasts.filter((f) => f.article_id === forecast.article_id).length
        ) || 1;
    const stockCoverageMonths =
      Math.round((currentStock / avgMonthlyForecast) * 10) / 10;

    // --- Apply overrides ---
    const key = `${forecast.article_id}-${forecast.year}-${forecast.month}`;
    const applicableOverrides = overrideMap.get(key) || [];
    const isOverridden = applicableOverrides.length > 0;

    for (const override of applicableOverrides) {
      switch (override.field) {
        case "target_units":
          targetUnits = parseInt(override.override_value, 10);
          containersNeeded = Math.ceil(
            Math.max(0, targetUnits - currentStock + safetyStockUnits) /
              unitsPerContainer
          );
          break;
        case "containers_needed":
          containersNeeded = parseInt(override.override_value, 10);
          break;
        case "ship_date":
          shipDate = new Date(override.override_value);
          break;
        case "production_start":
          productionStart = new Date(override.override_value);
          break;
      }
    }

    // --- Generate warnings & status color ---
    let warningType: WarningType | null = null;
    let warningMessage: string | null = null;
    let statusColor: StatusColor = "green";

    if (isBefore(productionStart, referenceDate)) {
      const daysLate = differenceInDays(referenceDate, productionStart);
      warningType = "production_start_in_past";
      warningMessage = `Production must start by ${format(productionStart, "dd.MM.yyyy")} but that is ${daysLate} days in the past`;
      statusColor = "red";
    } else if (isBefore(shipDate, referenceDate)) {
      const daysLate = differenceInDays(referenceDate, shipDate);
      warningType = "ship_date_in_past";
      warningMessage = `Ship date ${format(shipDate, "dd.MM.yyyy")} has already passed by ${daysLate} days`;
      statusColor = "red";
    } else if (containersNeeded > 10) {
      warningType = "high_container_count";
      warningMessage = `${containersNeeded} containers needed - verify with logistics`;
      statusColor = "yellow";
    }

    // Performance-based status adjustments
    if (perfInfo && statusColor === "green") {
      const absVariance = Math.abs(perfInfo.variance_pct);
      if (absVariance > 25) {
        statusColor = "red";
        if (!warningType) {
          warningType = "urgent_reorder";
          warningMessage = `Performance deviation ${perfInfo.variance_pct > 0 ? "+" : ""}${perfInfo.variance_pct}% - urgent attention needed`;
        }
      } else if (absVariance > 10) {
        statusColor = "yellow";
        if (!warningType) {
          warningType = "stock_running_low";
          warningMessage = `Performance deviation ${perfInfo.variance_pct > 0 ? "+" : ""}${perfInfo.variance_pct}% - monitor closely`;
        }
      }
    }

    // Stock coverage warnings
    if (stockCoverageMonths < 1 && containersNeeded > 0 && statusColor === "green") {
      statusColor = "yellow";
      if (!warningType) {
        warningType = "stock_running_low";
        warningMessage = `Only ${stockCoverageMonths} months of stock coverage remaining`;
      }
    }

    plans.push({
      article_id: forecast.article_id,
      article_name: article.article_name,
      year: forecast.year,
      month: forecast.month,
      target_units: targetUnits,
      containers_needed: containersNeeded,
      arrival_date: format(arrivalDate, "yyyy-MM-dd"),
      ship_date: format(shipDate, "yyyy-MM-dd"),
      production_start: format(productionStart, "yyyy-MM-dd"),
      warning_type: warningType,
      warning_message: warningMessage,
      is_overridden: isOverridden,
      computed_at: new Date().toISOString(),
      current_stock_units: currentStock,
      units_needed_after_stock: unitsNeededAfterStock,
      safety_stock_units: safetyStockUnits,
      total_units_needed: totalUnitsNeeded,
      stock_coverage_months: stockCoverageMonths,
      status_color: statusColor,
      safety_stock_breakdown: JSON.stringify(safetyBreakdown),
      performance_info: perfInfo ? JSON.stringify(perfInfo) : null,
    });
  }

  // Sort by production start (earliest first)
  plans.sort((a, b) => a.production_start.localeCompare(b.production_start));

  return plans;
}
