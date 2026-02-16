"use client";

import { useRouter } from "next/navigation";
import { CreateForm } from "@/components/create-form";
import { useCredits } from "@/hooks/use-credits";
import { ROUTES } from "@/lib/constants";

interface HomeContentProps {
  isAuthenticated: boolean;
  credits: number;
}

export function HomeContent({ isAuthenticated, credits: initialCredits }: HomeContentProps) {
  const router = useRouter();
  const { credits, refetch } = useCredits(isAuthenticated);

  function handleNeedLogin() {
    router.push(ROUTES.LOGIN);
  }

  return (
    <CreateForm
      isAuthenticated={isAuthenticated}
      credits={isAuthenticated ? credits : initialCredits}
      onNeedLogin={handleNeedLogin}
      onCreditsChange={refetch}
    />
  );
}
