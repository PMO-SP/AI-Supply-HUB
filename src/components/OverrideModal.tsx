"use client";

import { useState } from "react";
import type { ShipmentPlan } from "@/lib/types";

interface OverrideModalProps {
  plan: ShipmentPlan;
  onClose: () => void;
  onSave: () => void;
}

type OverrideField = "containers_needed" | "ship_date" | "production_start" | "target_units";

export default function OverrideModal({
  plan,
  onClose,
  onSave,
}: OverrideModalProps) {
  const [field, setField] = useState<OverrideField>("containers_needed");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fieldOptions: { value: OverrideField; label: string; current: string }[] = [
    { value: "containers_needed", label: "Container Anzahl", current: String(plan.containers_needed) },
    { value: "target_units", label: "Ziel-Einheiten", current: String(plan.target_units) },
    { value: "ship_date", label: "Versanddatum", current: plan.ship_date },
    { value: "production_start", label: "Produktionsstart", current: plan.production_start },
  ];

  const currentValue = fieldOptions.find((f) => f.value === field)?.current || "";

  const handleSave = async () => {
    if (!value.trim()) {
      setError("Bitte einen Wert eingeben");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: plan.article_id,
          year: plan.year,
          month: plan.month,
          field,
          override_value: value,
          reason,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Speichern fehlgeschlagen");
        return;
      }

      onSave();
      onClose();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header with brand accent */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[15px] font-medium text-gray-900">Versandplan überschreiben</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {plan.article_name} &mdash;{" "}
            {new Date(plan.year, plan.month - 1).toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-[0.3px] mb-1">
              Feld zum Überschreiben
            </label>
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value as OverrideField);
                setValue("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
            >
              {fieldOptions.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 px-3 py-2 rounded-md text-[12px] text-gray-600">
            Aktueller Wert: <span className="font-mono font-medium text-gray-900">{currentValue}</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-[0.3px] mb-1">
              Neuer Wert
            </label>
            <input
              type={field.includes("date") || field.includes("start") ? "date" : "number"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              placeholder={field.includes("date") || field.includes("start") ? "YYYY-MM-DD" : "Zahl eingeben"}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-[0.3px] mb-1">
              Begründung (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              placeholder="Warum wird überschrieben?"
            />
          </div>

          {error && (
            <p className="text-[12px] text-brand-red">{error}</p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-3 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-brand-red text-white rounded-md text-[12px] font-medium hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
