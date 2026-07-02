"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type HealthResponse } from "@/lib/api";

const iconPaths = {
  chevronDown: <path d="m6 9 6 6 6-6" />,
  hub: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  memory: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4v-4Z" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01M12 7h4M12 17h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  smartToy: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 8V4M8 12h.01M16 12h.01M9 16h6" />
    </>
  ),
  stream: (
    <>
      <path d="M4 7h10M4 12h16M10 17h10" />
      <path d="m14 4 3 3-3 3M10 14l-3 3 3 3" />
    </>
  ),
  warning: <path d="M12 3 2.8 20h18.4L12 3Zm0 6v5M12 17h.01" />,
} as const;

type SystemIconName = keyof typeof iconPaths;

function SystemIcon({ name, className = "h-5 w-5" }: { name: SystemIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 ${className}`}
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

const codeSamples = {
  go: `func main() {
  go handleStream(nodes)
  select {}
}`,
  rust: `match recover(node) {
  Ok(_) => log::info!("Safe"),
  Err(e) => panic!(e),
}`,
  python: `async def agent_task():
  result = await llm.infer()
  return format(result)`,
} as const;

export default function ArchitecturePage() {
  const [failoverState, setFailoverState] = useState<"nominal" | "failing" | "recovered">("nominal");
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  const runFailoverSimulation = () => {
    if (failoverState === "recovered") {
      setFailoverState("nominal");
      return;
    }

    if (failoverState === "failing") return;

    setFailoverState("failing");
    recoveryTimerRef.current = setTimeout(() => {
      setFailoverState("recovered");
      recoveryTimerRef.current = null;
    }, 1200);
  };

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden selection:bg-primary selection:text-on-primary">
<div className="fixed inset-0 architecture-grain-overlay z-50"></div>
<div className="architecture-scanline z-40"></div>
{/* Top Navigation */}
<nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-lg bg-surface/80 backdrop-blur-md dark:bg-surface/80 border border-outline-variant z-[60] flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
<Link href="/intelligence" className="font-headline-sm text-headline-sm font-bold tracking-tighter text-primary">TOC_OS</Link>
<div className="hidden md:flex items-center gap-8">
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors duration-100 active:scale-95" href="/intelligence">Intelligence</Link>
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors duration-100 active:scale-95" href="/ecosystem">Ecosystem</Link>
<Link className="font-headline-sm text-headline-sm text-primary border-b border-primary pb-1 transition-colors duration-100 active:scale-95" href="/architecture">Architecture</Link>
<Link className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-primary transition-colors duration-100 active:scale-95" href="/devdocs">DevDocs</Link>
</div>
<Link href="/console" className="bg-primary text-on-primary px-4 py-1.5 font-label-sm text-label-sm font-bold rounded-sm active:scale-95 transition-all inline-block">Launch Console</Link>
</nav>
<main className="pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-24">
{/* Header */}
<header className="mb-16 border-l-4 border-primary pl-6">
<div className="font-label-sm text-label-sm text-primary mb-2">
  [SYSTEM_VIEW: ARCHITECTURE_V4]
  {health && <span className="ml-4 text-on-surface-variant">| SERVICE: {health.service} — <span className={health.status === "healthy" ? "text-primary" : "text-error"}>{health.status.toUpperCase()}</span></span>}
</div>
<h1 className="font-headline-lg text-headline-lg uppercase mb-4">Advanced Infrastructure</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                A resilient, distributed orchestration layer designed for sub-millisecond AI inference and massive-scale data ingestion.
            </p>
</header>
{/* Section 1: Infrastructure Diagram (Bento Grid Style) */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
{/* Sidebar Telemetry */}
<div className="lg:col-span-3 space-y-4">
<div className="bg-surface-container border border-outline-variant p-6 h-full">
<div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-2">
<span className="font-label-sm text-label-sm text-primary">LIVE_METRICS</span>
<span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#6bfb9a]"></span>
</div>
<div className="space-y-6">
<div>
<div className="font-label-sm text-label-sm text-on-surface-variant mb-1">TOTAL_THROUGHPUT</div>
<div className="font-code-md text-code-md text-primary">42.8 GB/s</div>
<div className="w-full bg-outline-variant h-1 mt-2">
<div className="bg-primary h-full w-[78%]"></div>
</div>
</div>
<div>
<div className="font-label-sm text-label-sm text-on-surface-variant mb-1">CLUSTER_LOAD</div>
<div className="font-code-md text-code-md text-primary">0.42 L-AVG</div>
<div className="flex gap-1 mt-2">
<div className="h-4 w-1 bg-primary"></div>
<div className="h-4 w-1 bg-primary"></div>
<div className="h-4 w-1 bg-primary"></div>
<div className="h-4 w-1 bg-primary opacity-30"></div>
</div>
</div>
<div>
<div className="font-label-sm text-label-sm text-on-surface-variant mb-1">P99_LATENCY</div>
<div className="font-code-md text-code-md text-primary">12.4ms</div>
</div>
</div>
</div>
</div>
{/* Central Diagram */}
<div className="lg:col-span-9 bg-surface-container-low border border-outline-variant p-8 relative overflow-hidden">
<div className="absolute top-4 right-4 font-label-sm text-label-sm text-on-secondary-container bg-secondary-container px-2 py-1">REAL_TIME_ORCHESTRATION</div>
<div className="flex flex-col items-center gap-12 relative z-10 py-10">
{/* Layer 1 */}
<div className="w-64 p-4 border border-primary bg-surface-container-highest text-center relative group hover:bg-primary/5 transition-colors cursor-crosshair">
<SystemIcon name="server" className="mx-auto mb-2 h-6 w-6 text-primary" />
<div className="font-label-sm text-label-sm text-primary">GATEWAY_CLUSTER</div>
<div className="font-code-md text-code-md opacity-50">v4.2 - Load Balance</div>
<div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-primary/30"></div>
<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 architecture-request-pulse text-primary"><SystemIcon name="chevronDown" className="h-4 w-4" /></div>
</div>
{/* Layer 2 */}
<div className="w-64 p-4 border border-outline-variant bg-surface-container-highest text-center relative group hover:border-primary transition-colors cursor-crosshair">
<SystemIcon name="stream" className="mx-auto mb-2 h-6 w-6 text-on-surface-variant" />
<div className="font-label-sm text-label-sm text-on-surface">STREAMING_NODES</div>
<div className="font-code-md text-code-md opacity-50">Kafka + Flink</div>
<div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-primary/30"></div>
<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 architecture-request-pulse text-primary delay-700"><SystemIcon name="chevronDown" className="h-4 w-4" /></div>
</div>
{/* Layer 3 */}
<div className="w-64 p-4 border border-outline-variant bg-surface-container-highest text-center relative group hover:border-primary transition-colors cursor-crosshair">
<SystemIcon name="memory" className="mx-auto mb-2 h-6 w-6 text-on-surface-variant" />
<div className="font-label-sm text-label-sm text-on-surface">EMBEDDING_ENGINE</div>
<div className="font-code-md text-code-md opacity-50">Vector Ingestion</div>
<div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-primary/30"></div>
<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 architecture-request-pulse text-primary delay-300"><SystemIcon name="chevronDown" className="h-4 w-4" /></div>
</div>
{/* Layer 4 */}
<div className="w-80 p-6 border-2 border-primary bg-surface-container-highest text-center shadow-[0_0_30px_rgba(107,251,154,0.1)]">
<SystemIcon name="smartToy" className="mx-auto mb-2 h-8 w-8 text-primary" />
<div className="font-headline-sm text-headline-sm text-primary uppercase">AI_AGENT_MESH</div>
<div className="font-code-md text-code-md opacity-70">Distributed LLM Runtime</div>
</div>
</div>
{/* Background Grid */}
<div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:'linear-gradient(#6bfb9a 1px, transparent 1px), linear-gradient(90deg, #6bfb9a 1px, transparent 1px)',backgroundSize:'40px 40px'}}></div>
</div>
</section>
{/* Section 2: Polyglot Stack */}
<section className="mb-16">
<div className="flex items-end justify-between mb-8">
<div>
<h2 className="font-headline-md text-headline-md uppercase">Polyglot Infrastructure</h2>
<p className="text-on-surface-variant">Multi-language execution environments for specialized workloads.</p>
</div>
<div className="font-label-sm text-label-sm bg-outline-variant/20 px-3 py-1 border border-outline-variant">TOTAL_MODULES: 05</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{/* Go Node */}
<div className="bg-surface-container border border-outline-variant hover:border-primary transition-all duration-200">
<div className="bg-surface-container-highest px-4 py-2 flex justify-between border-b border-outline-variant">
<span className="font-label-sm text-label-sm text-primary">MODULE: GOLANG</span>
<span className="font-code-md text-[10px] text-on-surface-variant">UPTIME: 99.99%</span>
</div>
<div className="p-6">
<p className="font-body-md text-body-md text-on-surface mb-4">High-concurrency networking and gateway orchestration.</p>
<div className="bg-background/50 p-4 rounded-sm border border-outline-variant mb-4 overflow-hidden">
<pre className="font-code-md text-code-md text-on-surface-variant overflow-x-auto"><code>{codeSamples.go}</code></pre>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<div className="text-[10px] text-on-surface-variant">REQ/S</div>
<div className="font-code-md text-primary">1.2M</div>
</div>
<div>
<div className="text-[10px] text-on-surface-variant">LATENCY</div>
<div className="font-code-md text-primary">0.8ms</div>
</div>
</div>
</div>
</div>
{/* Rust Node */}
<div className="bg-surface-container border border-outline-variant hover:border-primary transition-all duration-200">
<div className="bg-surface-container-highest px-4 py-2 flex justify-between border-b border-outline-variant">
<span className="font-label-sm text-label-sm text-primary">MODULE: RUST</span>
<span className="font-code-md text-[10px] text-on-surface-variant">UPTIME: 100.00%</span>
</div>
<div className="p-6">
<p className="font-body-md text-body-md text-on-surface mb-4">Memory-safe data transformation and failure recovery.</p>
<div className="bg-background/50 p-4 rounded-sm border border-outline-variant mb-4 overflow-hidden">
<pre className="font-code-md text-code-md text-on-surface-variant overflow-x-auto"><code>{codeSamples.rust}</code></pre>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<div className="text-[10px] text-on-surface-variant">THROUGHPUT</div>
<div className="font-code-md text-primary">12GB/s</div>
</div>
<div>
<div className="text-[10px] text-on-surface-variant">CPU_EFF</div>
<div className="font-code-md text-primary">94%</div>
</div>
</div>
</div>
</div>
{/* Python Node */}
<div className="bg-surface-container border border-outline-variant hover:border-primary transition-all duration-200">
<div className="bg-surface-container-highest px-4 py-2 flex justify-between border-b border-outline-variant">
<span className="font-label-sm text-label-sm text-primary">MODULE: PYTHON</span>
<span className="font-code-md text-[10px] text-on-surface-variant">UPTIME: 99.82%</span>
</div>
<div className="p-6">
<p className="font-body-md text-body-md text-on-surface mb-4">AI agent logic and rapid prototyping of inference models.</p>
<div className="bg-background/50 p-4 rounded-sm border border-outline-variant mb-4 overflow-hidden">
<pre className="font-code-md text-code-md text-on-surface-variant overflow-x-auto"><code>{codeSamples.python}</code></pre>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<div className="text-[10px] text-on-surface-variant">GPU_UTIL</div>
<div className="font-code-md text-primary">88%</div>
</div>
<div>
<div className="text-[10px] text-on-surface-variant">VERSION</div>
<div className="font-code-md text-primary">3.12-OPT</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/* Section 3: Failure Recovery Animation & Logic */}
<section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
<div className="bg-surface-container border border-outline-variant p-6">
<div className="flex items-center gap-2 mb-6">
<SystemIcon name="warning" className="h-5 w-5 text-error" />
<h2 className="font-headline-sm text-headline-sm uppercase">Failure Recovery Simulation</h2>
</div>
<div className="space-y-6">
<div className="relative bg-background p-6 border border-outline-variant rounded-sm overflow-hidden min-h-[300px] flex items-center justify-center">
{/* Simplified Failover Visual */}
<div className="relative w-full h-full flex items-center justify-around" id="failover-viz">
<div className={`flex flex-col items-center gap-2 transition-all duration-500 ${failoverState !== "nominal" ? "opacity-35" : ""}`} id="node-a">
<div className={`w-16 h-16 border flex items-center justify-center transition-colors ${failoverState !== "nominal" ? "border-error bg-error/10" : "border-primary bg-primary/10"}`}>
<SystemIcon name="hub" className={`h-6 w-6 ${failoverState !== "nominal" ? "text-error" : "text-primary"}`} />
</div>
<span className="font-label-sm text-[10px]">INGESTION_A</span>
<div className={`absolute top-1/2 left-[20%] w-[25%] h-[2px] transition-colors ${failoverState !== "nominal" ? "bg-error/40" : "bg-primary/20"}`} id="link-ab"></div>
</div>
<div className="flex flex-col items-center gap-2" id="orchestrator">
<div className="w-20 h-20 border-2 border-primary flex items-center justify-center bg-primary/20 animate-pulse">
<SystemIcon name="settings" className="h-8 w-8 text-primary" />
</div>
<span className="font-label-sm text-[10px] text-primary">RUST_ORCHESTRATOR</span>
</div>
<div className="flex flex-col items-center gap-2 transition-all duration-500" id="node-b">
<div className={`w-16 h-16 border flex items-center justify-center transition-all ${failoverState === "recovered" ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(107,251,154,0.25)]" : "border-outline-variant bg-surface-variant"}`}>
<SystemIcon name="hub" className={`h-6 w-6 ${failoverState === "recovered" ? "text-primary" : "text-on-surface-variant"}`} />
</div>
<span className="font-label-sm text-[10px]">BACKUP_B</span>
<div className={`absolute top-1/2 right-[20%] w-[25%] h-[2px] transition-colors ${failoverState === "recovered" ? "bg-primary" : "bg-outline-variant"}`} id="link-bc"></div>
</div>
</div>
<div className={`absolute bottom-4 left-4 font-label-sm text-[10px] ${failoverState === "failing" ? "text-error" : "text-primary"}`} id="status-text">
{failoverState === "nominal" && "STATUS: NOMINAL_FLOW"}
{failoverState === "failing" && "STATUS: NODE_A_FAILURE_DETECTED"}
{failoverState === "recovered" && "STATUS: TRAFFIC_MIGRATED_TO_BACKUP_B"}
</div>
</div>
<button
  className="w-full py-3 border border-error text-error font-label-sm text-label-sm hover:bg-error hover:text-white transition-all uppercase tracking-widest disabled:cursor-wait disabled:opacity-60"
  disabled={failoverState === "failing"}
  id="trigger-fail"
  onClick={runFailoverSimulation}
  type="button"
>
  {failoverState === "recovered" ? "Reset Simulation" : failoverState === "failing" ? "Migrating State..." : "Inject System Failure (Node_A)"}
</button>
</div>
</div>
<div className="bg-surface-container border border-outline-variant p-6">
<h3 className="font-headline-sm text-headline-sm uppercase mb-4">Orchestration Protocol</h3>
<div className="space-y-4">
<div className="flex gap-4 p-4 border-l-2 border-primary bg-surface-container-high">
<div className="text-primary font-code-md">01</div>
<div>
<div className="font-label-sm text-label-sm text-on-surface font-bold">Health Polling</div>
<p className="text-on-surface-variant text-[13px]">Rust-based agents poll heartbeats every 10ms with zero memory overhead.</p>
</div>
</div>
<div className="flex gap-4 p-4 border-l-2 border-outline-variant bg-surface-container-low opacity-60">
<div className="text-on-surface-variant font-code-md">02</div>
<div>
<div className="font-label-sm text-label-sm text-on-surface font-bold">State Migration</div>
<p className="text-on-surface-variant text-[13px]">Upon failure, session states are hot-swapped to secondary peers via RDMA.</p>
</div>
</div>
<div className="flex gap-4 p-4 border-l-2 border-outline-variant bg-surface-container-low opacity-60">
<div className="text-on-surface-variant font-code-md">03</div>
<div>
<div className="font-label-sm text-label-sm text-on-surface font-bold">Dynamic Scaling</div>
<p className="text-on-surface-variant text-[13px]">Auto-provisioning of fresh nodes in K8s cluster to restore redundancy levels.</p>
</div>
</div>
</div>
<div className="mt-8 border-t border-outline-variant pt-4">
<div className="relative h-32 w-full overflow-hidden border border-outline-variant">
<Image
  alt="Server rack with green LED status indicators in a dark data center"
  className="object-cover grayscale brightness-50 contrast-125"
  fill
  sizes="(min-width: 1024px) 50vw, 100vw"
  src="/images/arch_img_0.png"
/>
</div>
</div>
</div>
</section>
{/* Section 4: Metrics Terminal */}
<section className="bg-surface-container border border-outline-variant">
<div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant bg-surface-container-highest">
<div className="flex items-center gap-4">
<div className="flex gap-1.5">
<div className="w-3 h-3 rounded-full bg-error/40"></div>
<div className="w-3 h-3 rounded-full bg-tertiary/40"></div>
<div className="w-3 h-3 rounded-full bg-primary/40"></div>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">SESSION_ID: 0x8842_METRIC_FEED</span>
</div>
<span className="font-code-md text-[10px] text-primary">STREAMING_READY</span>
</div>
<div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-8">
<div className="col-span-3">
<div className="h-48 w-full flex items-end gap-1 px-2 border-b border-outline-variant pb-1">
{/* Mock Chart bars */}
<div className="flex-1 bg-primary/20 border-t border-primary h-[40%]" style={{height:'67%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[45%]" style={{height:'72%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[60%]" style={{height:'87%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[55%]" style={{height:'41%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[80%]" style={{height:'74%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[75%]" style={{height:'67%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[90%]" style={{height:'30%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[85%]" style={{height:'47%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[70%]" style={{height:'43%'}}></div>
<div className="flex-1 bg-primary/20 border-t border-primary h-[65%]" style={{height:'70%'}}></div>
<div className="flex-1 bg-primary/40 border-t border-primary h-[95%] animate-pulse" style={{height:'42%'}}></div>
</div>
<div className="flex justify-between mt-2 font-code-md text-[10px] text-on-surface-variant">
<span className="">T-60M</span>
<span className="">INDEXING_SPEED_TPS</span>
<span className="">NOW</span>
</div>
</div>
<div className="space-y-4">
<div className="bg-background border border-outline-variant p-4">
<div className="font-label-sm text-label-sm text-on-surface-variant mb-1">UTILIZATION</div>
<div className="font-code-md text-headline-sm text-primary">84.2%</div>
</div>
<div className="bg-background border border-outline-variant p-4">
<div className="font-label-sm text-label-sm text-on-surface-variant mb-1">ERR_RATE</div>
<div className="font-code-md text-headline-sm text-error">0.0004%</div>
</div>
</div>
</div>
</section>
</main>
{/* Footer */}
<footer className="bg-surface-container-lowest border-t border-outline-variant w-full">
<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-4 md:px-8 py-8">
<div className="font-label-sm text-label-sm text-primary mb-4 md:mb-0">TOC_INFRASTRUCTURE</div>
<div className="font-code-md text-code-md text-on-surface-variant text-center md:text-left mb-4 md:mb-0">
                (c) 2026 TOC_INFRASTRUCTURE_GROUP [STATUS: NOMINAL]
            </div>
<div className="flex gap-8">
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary underline cursor-pointer transition-opacity" href="/devdocs">SysLog</Link>
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary underline cursor-pointer transition-opacity" href="/devdocs">Legal_Nodes</Link>
<Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary underline cursor-pointer transition-opacity" href="/devdocs">Protocol_v4</Link>
</div>
</div>
</footer>




    </div>
  );
}
