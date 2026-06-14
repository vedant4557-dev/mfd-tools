"use client";

export function useSubscription() {
  return { plan: "FREE" as const, decksUsed: 0, limit: 3, isLoading: false };
}
