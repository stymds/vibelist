"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export function NavbarLogo() {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === ROUTES.HOME) {
      e.preventDefault();
      window.location.href = ROUTES.HOME;
    }
  }

  return (
    <Link
      href={ROUTES.HOME}
      onClick={handleClick}
      className="flex items-center"
    >
      <Image
        src="/logo/logo.png"
        alt="VibeList"
        width={40}
        height={40}
        className="drop-shadow-[0_0_8px_rgba(176,38,255,0.4)]"
      />
    </Link>
  );
}
