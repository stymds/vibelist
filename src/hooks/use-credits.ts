"use client";

import { useEffect, useState, useCallback } from "react";
import { CREDITS, ROUTES } from "@/lib/constants";

interface CreditsData {
  credits: number;
  maxCredits: number;
}

export function useCredits(isAuthenticated: boolean) {
  const [credits, setCredits] = useState<number>(CREDITS.INITIAL_CREDITS);
  const [maxCredits, setMaxCredits] = useState<number>(CREDITS.MAX_CREDITS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(ROUTES.API_USER_CREDITS);
      if (response.ok) {
        const data: CreditsData = await response.json();
        setCredits(data.credits);
        setMaxCredits(data.maxCredits);
      }
    } catch {
      // Silently fail — credits will show defaults
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    maxCredits,
    isLoading,
    refetch: fetchCredits,
  };
}
