"use client";

import React from "react";
import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary selection:text-on-primary overflow-hidden h-screen flex flex-col relative">
      <div className="crt-overlay" />
      <div className="scanline" />

      {/* TOP NAVIGATION */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-lg z-50 bg-surface/80 backdrop-blur-md border border-outline-variant flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/intelligence" className="font-headline-sm text-headline-sm font-bold tracking-tighter text-primary">
            TOC_OS
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/intelligence" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Intelligence
            </Link>
            <Link href="/ecosystem" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Ecosystem
            </Link>
            <Link href="/architecture" className="font-label-sm text-label-sm text-primary border-b border-primary pb-1">
              Architecture
            </Link>
            <Link href="/devdocs" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              DevDocs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/console" className="font-label-sm text-label-sm bg-primary text-on-primary px-4 py-1.5 rounded uppercase tracking-wider font-bold active:scale-95 duration-100">
            Launch Console
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-6 text-center select-none pt-20">
        <div className="max-w-xl border border-outline-variant bg-surface-container p-8 space-y-6">
          <h1 className="font-headline-md text-headline-md text-primary uppercase tracking-wider terminal-glow">
            Neural Infrastructure Architecture
          </h1>
          <div className="grid grid-cols-3 gap-2 py-4">
            <div className="h-2 bg-primary/40 rounded animate-pulse" />
            <div className="h-2 bg-primary/20 rounded animate-pulse" />
            <div className="h-2 bg-primary/80 rounded animate-pulse" />
          </div>
          <p className="font-code-md text-xs text-on-surface-variant leading-relaxed">
            Multi-Agent autonomous cognitive loop trace successfully compiled. Secure channel status: [ENCRYPTED]. Architecture visualizations loading.
          </p>
          <Link href="/intelligence" className="inline-block py-2 px-6 border border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-primary/10 transition-colors">
            Return to Console
          </Link>
        </div>
      </main>
    </div>
  );
}
