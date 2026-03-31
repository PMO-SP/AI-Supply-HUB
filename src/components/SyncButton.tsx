"use client";

import { useSync } from "@/hooks/useSync";

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const { sync, isSyncing, lastResult } = useSync();

  const handleSync = async () => {
    const success = await sync();
    if (success && onSyncComplete) {
      onSyncComplete();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {lastResult && (
        <span
          className={`text-[11px] max-w-[200px] truncate ${
            lastResult.success ? "text-status-green" : "text-brand-red"
          }`}
        >
          {lastResult.success ? "Sync OK" : lastResult.message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="text-[11px] px-3 py-[5px] rounded-md border border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
      >
        {isSyncing ? (
          <>
            <svg
              className="animate-spin h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <span className="text-[13px]">&#8635;</span>
            Google Sheets sync
          </>
        )}
      </button>
    </div>
  );
}
