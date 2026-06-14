"use client";

export function useJobStatus(_jobId: string | null) {
  return {
    status: null as string | null,
    deck: null,
    error: null as string | null,
    isPolling: false,
  };
}
