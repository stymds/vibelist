"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";
import { ROUTES } from "@/lib/constants";
import { LogOut, User, Coins } from "lucide-react";

interface NavbarClientProps {
  isAuthenticated: boolean;
  credits: number;
  maxCredits: number;
  displayName: string | null;
  avatarUrl: string | null;
}

export function NavbarClient({
  isAuthenticated,
  credits,
  maxCredits,
  displayName,
  avatarUrl,
}: NavbarClientProps) {
  if (!isAuthenticated) {
    return (
      <Link href={ROUTES.LOGIN}>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer outline-none">
          <Avatar className="h-9 w-9 border border-white/20">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={displayName || "User"}
            />
            <AvatarFallback className="bg-gradient-to-br from-[var(--neon-purple)] to-[#2979FF] text-white text-sm">
              {displayName
                ? displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled className="text-muted-foreground">
          {displayName || "User"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-muted-foreground">
          <Coins className="mr-2 h-4 w-4" />
          {credits}/{maxCredits} credits
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer text-red-400 focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
