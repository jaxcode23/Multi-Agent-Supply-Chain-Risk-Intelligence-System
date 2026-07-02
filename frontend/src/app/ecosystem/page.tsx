"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type SupplierResponse } from "@/lib/api";

const iconPaths = {
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  database: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  description: <path d="M7 3h7l5 5v13H7V3Zm7 0v5h5M9 13h6M9 17h6" />,
  dynamic_feed: (
    <>
      <path d="M5 5h10v5H5V5ZM9 14h10v5H9v-5Z" />
      <path d="M15 7h4v5M5 16H3v-5h4" />
    </>
  ),
  grid_view: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.3 1-1.3 2v.4M12 17h.01" />
    </>
  ),
  hub: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  local_shipping: (
    <>
      <path d="M3 7h10v9H3V7Zm10 3h4l4 4v2h-8v-6Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  memory: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4v-4Z" />
    </>
  ),
  psychology: (
    <>
      <path d="M9 18a5 5 0 0 1-4-4.9 4 4 0 0 1 3.1-3.9A4.5 4.5 0 0 1 16.8 8 4 4 0 0 1 19 15.4" />
      <path d="M9 18v3M15 17v4M9 13h6M12 10v7" />
    </>
  ),
  rss_feed: (
    <>
      <circle cx="6" cy="18" r="1.5" />
      <path d="M4.5 10.5A9 9 0 0 1 13.5 19M4.5 5A14.5 14.5 0 0 1 19 19.5" />
    </>
  ),
  security: <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Zm-3 9 2 2 4-5" />,
  smart_toy: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 8V4M8 12h.01M16 12h.01M9 16h6" />
    </>
  ),
  terminal: <path d="m4 7 5 5-5 5M11 17h9" />,
  warning: <path d="M12 3 2.8 20h18.4L12 3Zm0 6v5M12 17h.01" />,
  waves: <path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 13c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 18c3 0 3-2 6-2s3 2 6 2 3-2 6-2" />,
} as const;

type SystemIconName = keyof typeof iconPaths;

function SystemIcon({ name, className = "h-5 w-5" }: { name: SystemIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  );
}

export default function EcosystemPage() {
  const [supplier, setSupplier] = useState<SupplierResponse | null>(null);

  useEffect(() => {
    api.suppliersByName("supplier_a").then(setSupplier).catch(() => {});
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden selection:bg-primary selection:text-on-primary">
<div className="fixed inset-0 ecosystem-noise-overlay z-[100] pointer-events-none"></div>
<div className="fixed inset-0 ecosystem-scanlines z-[101] pointer-events-none opacity-20"></div>
{/* TopNavBar */}
<nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-lg border border-outline-variant bg-surface/80 backdrop-blur-md z-50 flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
<div className="flex items-center gap-8">
<Link href="/intelligence" className="font-headline-sm text-headline-sm font-bold tracking-tighter text-primary">TOC_OS</Link>
<div className="hidden md:flex items-center gap-6">
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors active:scale-95 duration-100" href="/intelligence">Intelligence</Link>
<Link className="font-headline-sm text-headline-sm text-primary border-b border-primary pb-1" href="/ecosystem">Ecosystem</Link>
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors active:scale-95 duration-100" href="/architecture">Architecture</Link>
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors active:scale-95 duration-100" href="/devdocs">DevDocs</Link>
</div>
</div>
<div className="flex items-center gap-4">
<Link href="/console" className="px-4 py-1.5 border border-primary text-primary font-label-sm uppercase tracking-wider hover:bg-primary/10 transition-all active:scale-95 inline-block">Launch Console</Link>
</div>
</nav>
{/* SideNavBar (Hidden on small screens) */}
<aside className="hidden lg:flex fixed left-0 top-20 h-[calc(100%-5rem)] w-64 bg-surface-container border-r border-outline-variant flex-col py-4 z-40">
<div className="px-6 py-8 flex flex-col gap-1">
<div className="text-primary font-headline-sm text-headline-sm"><Link href="/intelligence">ROOT_USER</Link></div>
<div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">Level 4 Clearance</div>
</div>
<nav className="flex-1 flex flex-col gap-1">
<Link href="/console" className="text-on-surface-variant px-4 py-2 flex items-center gap-3 font-label-sm text-label-sm hover:bg-surface-container-high transition-all cursor-pointer group"><SystemIcon name="terminal" className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> Terminal</Link>
<div className="bg-secondary-container text-primary border-l-2 border-primary px-4 py-2 flex items-center gap-3 font-label-sm text-label-sm">
<SystemIcon name="hub" className="h-5 w-5" /> Nodes
            </div>
<div className="text-on-surface-variant px-4 py-2 flex items-center gap-3 font-label-sm text-label-sm hover:bg-surface-container-high transition-all cursor-pointer group">
<SystemIcon name="shield" className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> Security
            </div>
<div className="text-on-surface-variant px-4 py-2 flex items-center gap-3 font-label-sm text-label-sm hover:bg-surface-container-high transition-all cursor-pointer group">
<SystemIcon name="database" className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> Logs
            </div>
<div className="text-on-surface-variant px-4 py-2 flex items-center gap-3 font-label-sm text-label-sm hover:bg-surface-container-high transition-all cursor-pointer group">
<SystemIcon name="settings" className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> Settings
            </div>
</nav>
<div className="px-4 py-4 mt-auto">
<Link href="/console" className="w-full py-3 border border-primary text-primary font-label-sm hover:bg-primary hover:text-on-primary transition-all text-center inline-block">NEW_SESSION</Link>
</div>
<footer className="border-t border-outline-variant p-4 flex flex-col gap-2">
<div className="text-on-surface-variant flex items-center gap-3 font-label-sm text-label-sm cursor-pointer hover:text-primary">
<SystemIcon name="description" className="h-4 w-4" /> Docs
            </div>
<div className="text-on-surface-variant flex items-center gap-3 font-label-sm text-label-sm cursor-pointer hover:text-primary">
<SystemIcon name="help" className="h-4 w-4" /> Support
            </div>
</footer>
</aside>
<main className="lg:ml-64 pt-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
{/* Hero Section */}
<header className="mb-16">
<div className="inline-block px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-label-sm mb-4">
                [STATUS: ECOSYSTEM_ACTIVE]
            </div>
<h1 className="font-headline-lg text-headline-lg mb-4 text-white uppercase tracking-tight">The Nervous System of Intelligence</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Global orchestration of autonomous agents, distributed consensus protocols, and real-time inference streams powering the TOC global architecture.
            </p>
</header>
{/* Agent Topology Graph */}
<section className="mb-8 border border-outline-variant bg-surface-container-low overflow-hidden relative min-h-[600px]">
<div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container">
<div className="flex items-center gap-2">
<div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Topology: agent_mesh_v2.log</span>
</div>
<div className="flex gap-4">
<span className="font-label-sm text-label-sm text-on-surface-variant">NODES: 3,421</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">LATENCY: 12ms</span>
</div>
</div>
<div className="relative w-full h-[540px] flex items-center justify-center overflow-hidden">
<svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500">
<defs>
<linearGradient id="beamGradient" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" stopColor="#6bfb9a" stopOpacity="0"></stop>
<stop offset="50%" stopColor="#6bfb9a" stopOpacity="0.8"></stop>
<stop offset="100%" stopColor="#6bfb9a" stopOpacity="0"></stop>
</linearGradient>
</defs>
{/* Connection Beams */}
<path className="opacity-20" d="M 200 250 Q 500 100 800 250" fill="none" stroke="#6bfb9a" strokeWidth="0.5"></path>
<path className="opacity-20" d="M 200 250 Q 500 400 800 250" fill="none" stroke="#6bfb9a" strokeWidth="0.5"></path>
<path className="opacity-20" d="M 500 100 L 500 400" fill="none" stroke="#6bfb9a" strokeWidth="0.5"></path>
{/* Flowing Signals */}
<path className="ecosystem-tracing-beam" d="M 200 250 Q 500 100 800 250" fill="none" stroke="url(#beamGradient)" strokeWidth="2"></path>
<path className="ecosystem-tracing-beam" d="M 800 250 Q 500 400 200 250" fill="none" stroke="url(#beamGradient)" strokeWidth="2" style={{ animationDelay: '-2.5s' }}></path>
</svg>
{/* Centered Main Node */}
<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group">
<div className="w-32 h-32 border border-primary/50 flex items-center justify-center relative bg-surface/50 backdrop-blur">
<div className="absolute inset-0 border border-primary ecosystem-pulse-glow opacity-30"></div>
<div className="text-center">
<SystemIcon name="psychology" className="h-12 w-12 text-primary" />
<div className="font-label-sm text-[10px] text-primary mt-1">CORE_ORCH</div>
</div>
</div>
</div>
{/* Satellite Nodes */}
<div className="absolute left-[20%] top-[45%] flex flex-col items-center group cursor-pointer">
<div className="w-16 h-16 border border-outline-variant bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
<SystemIcon name="security" className="h-8 w-8 text-on-surface-variant group-hover:text-primary" />
</div>
<div className="mt-2 font-label-sm text-[10px] text-on-surface-variant group-hover:text-primary">RISK_SENTINEL</div>
</div>
<div className="absolute right-[20%] top-[45%] flex flex-col items-center group cursor-pointer">
<div className="w-16 h-16 border border-outline-variant bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
<SystemIcon name="local_shipping" className="h-8 w-8 text-on-surface-variant group-hover:text-primary" />
</div>
<div className="mt-2 font-label-sm text-[10px] text-on-surface-variant group-hover:text-primary">LOGISTICS_AGENT</div>
</div>
<div className="absolute left-[50%] top-[15%] -translate-x-1/2 flex flex-col items-center group cursor-pointer">
<div className="w-16 h-16 border border-outline-variant bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
<SystemIcon name="memory" className="h-8 w-8 text-on-surface-variant group-hover:text-primary" />
</div>
<div className="mt-2 font-label-sm text-[10px] text-on-surface-variant group-hover:text-primary">MEMORY_AGENT</div>
</div>
</div>
<div className="absolute bottom-4 left-4 p-4 bg-surface/80 border border-outline-variant backdrop-blur-sm max-w-xs">
<div className="font-label-sm text-primary mb-2">ACTIVE_SIGNALS</div>
<div className="space-y-1 font-code-md text-[11px] text-on-surface-variant">
<div className="flex justify-between"><span className="">TX_772: SYNC_REQ</span><span className="text-primary">PENDING</span></div>
<div className="flex justify-between"><span className="">TX_812: LOG_VAL</span><span className="text-primary">SUCCESS</span></div>
<div className="flex justify-between"><span className="">TX_901: INF_STR</span><span className="text-primary">STREAMING</span></div>
</div>
</div>
</section>
{/* World Intelligence Map */}
<section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
<div className="lg:col-span-2 border border-outline-variant bg-surface-container-low relative min-h-[500px] overflow-hidden group">
<div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
<h3 className="font-headline-sm text-headline-sm text-white uppercase">World Intelligence Map</h3>
<p className="font-label-sm text-label-sm text-primary opacity-70">GLOBAL_TELEMETRY_FEED_01</p>
</div>
{/* Placeholder for World Map */}
<div className="w-full h-full bg-[#050816] flex items-center justify-center relative overflow-hidden">
<div className="absolute inset-0 opacity-20 flex items-center justify-center">
<Image
  alt="Dark global intelligence map with connected telemetry nodes"
  className="object-cover grayscale brightness-50"
  fill
  priority
  sizes="(min-width: 1024px) 66vw, 100vw"
  src="/images/ecosystem_img_0.png"
/>
</div>
{/* Animated Radar Sweeps */}
<div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] border border-primary/20 rounded-full animate-ping opacity-20"></div>
{/* Disruption Markers */}
<div className="absolute top-[40%] left-[25%] flex flex-col items-center">
<SystemIcon name="warning" className="h-6 w-6 text-error animate-pulse" />
<div className="bg-error/10 border border-error text-error text-[10px] font-label-sm px-2 py-0.5 mt-1 backdrop-blur-md">ANOMALY_04</div>
</div>
<div className="absolute bottom-[30%] right-[35%] flex flex-col items-center">
<div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
<div className="bg-primary/10 border border-primary text-primary text-[10px] font-label-sm px-2 py-0.5 mt-1 backdrop-blur-md">NODE_SYNCHED</div>
</div>
</div>
<div className="absolute bottom-4 right-4 flex gap-4">
<div className="p-3 bg-surface/90 border border-outline-variant backdrop-blur-md">
<div className="font-label-sm text-[10px] text-on-surface-variant uppercase">Shipping Intensity</div>
<div className="h-1.5 w-32 bg-surface-container-highest mt-2 relative overflow-hidden">
<div className="absolute inset-y-0 left-0 bg-primary w-[75%]"></div>
</div>
</div>
</div>
</div>
{/* Stats Panel */}
<div className="flex flex-col gap-8">
<div className="flex-1 border border-outline-variant bg-surface-container p-6 relative">
<div className="absolute top-0 right-0 p-2 opacity-20">
<SystemIcon name="waves" className="h-10 w-10" />
</div>
<div className="font-label-sm text-primary mb-4">[SYSTEM_THROUGHPUT]</div>
<div className="space-y-6">
<div>
<div className="flex justify-between font-label-sm mb-2">
<span className="">INGEST_RATE</span>
<span className="text-white">4.2 TB/s</span>
</div>
<div className="h-1 bg-surface-container-highest">
<div className="h-full bg-primary w-[85%] animate-[pulse_2s_infinite]"></div>
</div>
</div>
<div>
<div className="flex justify-between font-label-sm mb-2">
<span className="">INFERENCE_LOAD</span>
<span className="text-white">62%</span>
</div>
<div className="h-1 bg-surface-container-highest">
<div className="h-full bg-primary w-[62%]"></div>
</div>
</div>
</div>
</div>
<div className="flex-1 border border-outline-variant bg-surface-container p-6">
<div className="font-label-sm text-primary mb-4">[ACTIVE_THREATS]</div>
<div className="space-y-3 font-code-md text-sm">
<div className="p-2 bg-error/5 border-l-2 border-error flex items-center justify-between">
<span className="text-on-surface-variant">DDOS_NORTH_SEA</span>
<span className="text-error font-bold uppercase">Critical</span>
</div>
<div className={`p-2 border-l-2 flex items-center justify-between ${supplier ? 'bg-primary/5 border-primary' : 'bg-surface-container-higher border-outline-variant'}`}>
<span className="text-on-surface-variant">{supplier ? supplier.name.toUpperCase() : 'GEO_DRIFT_SEA'}</span>
<span className={supplier ? 'text-primary font-bold uppercase' : 'text-on-surface-variant'}>{supplier?.status ?? 'Nominal'}</span>
</div>
<div className="p-2 bg-surface-container-highest border-l-2 border-outline-variant flex items-center justify-between">
<span className="text-on-surface-variant">ROUTE_LATENCY_SG</span>
<span className="text-on-surface-variant">Nominal</span>
</div>
</div>
</div>
</div>
</section>
{/* Data Pipeline Story (Sticky Scroll Simulation) */}
<section className="py-20 border-t border-outline-variant">
<div className="mb-12">
<h2 className="font-headline-md text-headline-md text-white mb-2 uppercase">Lifecycle of a Data Packet</h2>
<p className="font-body-lg text-body-lg text-on-surface-variant">How intelligence flows from raw signals to operational decisions.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
{/* Step 1 */}
<div className="p-6 border border-outline-variant bg-surface-container-low group hover:border-primary transition-all duration-300 relative">
<div className="absolute -top-3 -left-3 w-6 h-6 border border-outline-variant bg-surface flex items-center justify-center font-label-sm text-[10px] text-primary">01</div>
<div className="font-label-sm text-primary mb-4 uppercase tracking-tighter">News APIs</div>
<div className="h-40 flex items-center justify-center mb-6 overflow-hidden bg-surface-container-highest/30">
<SystemIcon name="rss_feed" className="h-14 w-14 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
</div>
<p className="font-code-md text-xs text-on-surface-variant">Harvesting unstructured global signals via REST/Websockets.</p>
</div>
{/* Step 2 */}
<div className="p-6 border border-outline-variant bg-surface-container-low group hover:border-primary transition-all duration-300 relative">
<div className="absolute -top-3 -left-3 w-6 h-6 border border-outline-variant bg-surface flex items-center justify-center font-label-sm text-[10px] text-primary">02</div>
<div className="font-label-sm text-primary mb-4 uppercase tracking-tighter">Go Scrapers</div>
<div className="h-40 flex items-center justify-center mb-6 overflow-hidden bg-surface-container-highest/30">
<SystemIcon name="terminal" className="h-14 w-14 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
</div>
<p className="font-code-md text-xs text-on-surface-variant">High-concurrency extraction and normalization at scale.</p>
</div>
{/* Step 3 */}
<div className="p-6 border border-outline-variant bg-surface-container-low group hover:border-primary transition-all duration-300 relative">
<div className="absolute -top-3 -left-3 w-6 h-6 border border-outline-variant bg-surface flex items-center justify-center font-label-sm text-[10px] text-primary">03</div>
<div className="font-label-sm text-primary mb-4 uppercase tracking-tighter">Scala Streams</div>
<div className="h-40 flex items-center justify-center mb-6 overflow-hidden bg-surface-container-highest/30">
<SystemIcon name="dynamic_feed" className="h-14 w-14 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
</div>
<p className="font-code-md text-xs text-on-surface-variant">Real-time stateful processing and semantic enrichment.</p>
</div>
{/* Step 4 */}
<div className="p-6 border border-outline-variant bg-surface-container-low group hover:border-primary transition-all duration-300 relative">
<div className="absolute -top-3 -left-3 w-6 h-6 border border-outline-variant bg-surface flex items-center justify-center font-label-sm text-[10px] text-primary">04</div>
<div className="font-label-sm text-primary mb-4 uppercase tracking-tighter">Python Agents</div>
<div className="h-40 flex items-center justify-center mb-6 overflow-hidden bg-surface-container-highest/30">
<SystemIcon name="smart_toy" className="h-14 w-14 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
</div>
<p className="font-code-md text-xs text-on-surface-variant">Final inference, agentic analysis, and tactical output.</p>
</div>
</div>
</section>
{/* Infrastructure Memory Layer */}
<section className="mb-16">
<div className="flex items-end justify-between mb-8 border-b border-outline-variant pb-4">
<div>
<h2 className="font-headline-md text-headline-md text-white uppercase">Infrastructure Memory Layer</h2>
<p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Persistence nodes and semantic vectors.</p>
</div>
<div className="text-right">
<div className="font-label-sm text-primary">STORAGE_POOL: 14.8 PB</div>
<div className="font-label-sm text-on-surface-variant">REDUNDANCY: 3X</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
{/* ChromaDB */}
<div className="border border-outline-variant bg-surface-container p-6 flex flex-col gap-4 group">
<div className="flex justify-between items-start">
<div className="p-3 bg-primary/10 border border-primary/20 text-primary">
<SystemIcon name="grid_view" className="h-6 w-6" />
</div>
<div className="text-right">
<div className="text-white font-headline-sm text-headline-sm">ChromaDB</div>
<div className="text-on-surface-variant font-label-sm text-label-sm uppercase">Vector Engine</div>
</div>
</div>
<div className="h-12 flex gap-1 items-end overflow-hidden">
<div className="flex-1 bg-primary/20 h-[30%] animate-[bounce_1.5s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[60%] animate-[bounce_1.8s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[40%] animate-[bounce_1.2s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[90%] animate-[bounce_2s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[50%] animate-[bounce_1.4s_infinite]"></div>
</div>
<div className="font-code-md text-xs text-on-surface-variant bg-background p-3 border border-outline-variant">
                        QUERY_LATENCY: 4.2ms<br/>
                        VEC_DIM: 1536<br/>
                        COLL_SIZE: 1.2B
                    </div>
</div>
{/* Neo4j */}
<div className="border border-outline-variant bg-surface-container p-6 flex flex-col gap-4 group">
<div className="flex justify-between items-start">
<div className="p-3 bg-primary/10 border border-primary/20 text-primary">
<SystemIcon name="share" className="h-6 w-6" />
</div>
<div className="text-right">
<div className="text-white font-headline-sm text-headline-sm">Neo4j</div>
<div className="text-on-surface-variant font-label-sm text-label-sm uppercase">Graph Store</div>
</div>
</div>
<div className="h-12 flex gap-1 items-end overflow-hidden">
<div className="flex-1 bg-primary/20 h-[70%] animate-[bounce_2.1s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[40%] animate-[bounce_1.3s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[80%] animate-[bounce_1.7s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[20%] animate-[bounce_1.9s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[60%] animate-[bounce_1.1s_infinite]"></div>
</div>
<div className="font-code-md text-xs text-on-surface-variant bg-background p-3 border border-outline-variant">
                        EDGES: 14.8B<br/>
                        HOPS: 3<br/>
                        TRAVERSAL: 12ms
                    </div>
</div>
{/* Redis */}
<div className="border border-outline-variant bg-surface-container p-6 flex flex-col gap-4 group">
<div className="flex justify-between items-start">
<div className="p-3 bg-primary/10 border border-primary/20 text-primary">
<SystemIcon name="bolt" className="h-6 w-6" />
</div>
<div className="text-right">
<div className="text-white font-headline-sm text-headline-sm">Redis</div>
<div className="text-on-surface-variant font-label-sm text-label-sm uppercase">Hot Cache</div>
</div>
</div>
<div className="h-12 flex gap-1 items-end overflow-hidden">
<div className="flex-1 bg-primary/20 h-[90%] animate-[bounce_1.2s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[85%] animate-[bounce_1.5s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[95%] animate-[bounce_1.1s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[88%] animate-[bounce_1.4s_infinite]"></div>
<div className="flex-1 bg-primary/20 h-[92%] animate-[bounce_1.3s_infinite]"></div>
</div>
<div className="font-code-md text-xs text-on-surface-variant bg-background p-3 border border-outline-variant">
                        HIT_RATE: 99.4%<br/>
                        EVICTIONS: 0<br/>
                        UPTIME: 365D
                    </div>
</div>
</div>
</section>
</main>
{/* Footer */}
<footer className="bg-surface-container-lowest border-t border-outline-variant w-full mt-20">
<div className="flex justify-between items-center px-8 py-4 max-w-[1600px] mx-auto lg:ml-64">
<div className="font-code-md text-code-md text-on-surface-variant uppercase tracking-tighter">
                (c) 2026 TOC_INFRASTRUCTURE_GROUP [STATUS: NOMINAL]
            </div>
<div className="flex gap-8 items-center">
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity cursor-pointer" href="/devdocs">SysLog</Link>
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity cursor-pointer" href="/devdocs">Legal_Nodes</Link>
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity cursor-pointer" href="/devdocs">Protocol_v4</Link>
<div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20">
<span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
<span className="font-label-sm text-[10px] text-primary">ENCRYPTED</span>
</div>
</div>
</div>
</footer>




    </div>
  );
}
