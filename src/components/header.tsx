"use client";

import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/mode-toggle";

export function Header() {
    return (
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4">
                {/* Breadcrumbs or Page Title could go here */}
                <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
                <ModeToggle />
                <UserButton afterSignOutUrl="/" />
            </div>
        </header>
    );
}
