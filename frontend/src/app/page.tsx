"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, type DashboardSummary, type RecentRiskItem } from "@/lib/api";

// Custom offline-resilient high-fidelity SVG Icons
const TerminalIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
  </svg>
);

const PublicIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a15.91 15.91 0 0 0 3-9 15.91 15.91 0 0 0-3-9m-3 9a15.91 15.91 0 0 0 3 9m-3-9a15.91 15.91 0 0 1 3-9M3.75 9h16.5m-16.5 6h16.5" />
  </svg>
);

const LocalShippingIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM19.5 18.75a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM2.25 15h16.5m-16.5 0a1.5 1.5 0 0 1 1.5-1.5h10.5m-12 1.5a1.5 1.5 0 0 0 1.5 1.5M19.5 15h2.25v-3.75a1.5 1.5 0 0 0-1.5-1.5h-4.5V15m3 3.75a1.5 1.5 0 0 0 1.5-1.5M16.5 9.75V4.5a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 4.5v10.5m14.25-5.25H21" />
  </svg>
);

const FactoryIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3.75-6H15m-1.5 3H15m-1.5 3H15M9 16.5h1.5m3.75 0H15" />
  </svg>
);

const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const WarningIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const GavelIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5m4.5 0h4.5M9 9v4.5M18 17.25c0-.621-.504-1.125-1.125-1.125H12m6 1.125c0 .621-.504 1.125-1.125 1.125H12M18 17.25v2.25m0-2.25c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v2.25m-3-2.25V15m-1.875-.75-3.75 3.75m0 0L9.375 21" />
  </svg>
);

const AnalyticsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.375v-5.25ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-9.75ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const SailingIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13.5m0-13.5L5.25 12h6.75m0-9 6.75 9H12m-9.75 6h19.5a1.5 1.5 0 0 0 1.5-1.5V15h-22.5v1.5a1.5 1.5 0 0 0 1.5 1.5Z" />
  </svg>
);

const HubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 14.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5 8.25 12l7.5 4.5" />
  </svg>
);

export default function LandingPage() {
  // Agent News Feed Log Injection
  const [newsFeedLogs, setNewsFeedLogs] = useState<string[]>([
    "ANALYZING GEOPOLITICAL FEEDS...",
    "DETECTED STRIKE: ROTTERDAM PORT",
    "CALCULATING DOWNSTREAM IMPACT...",
    "SEVERITY: HIGH (0.84)",
    "UPDATING DATABASE...",
  ]);

  // Telemetry metric fluctuations
  const [uptimePercent, setUptimePercent] = useState(99.998);
  const [throughputRate, setThroughputRate] = useState(4.2);

  // Fetched dashboard data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentRisks, setRecentRisks] = useState<RecentRiskItem[]>([]);

  // References for data packet simulation
  const heroVizRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Scroll Reveal triggers
  const [revealStates, setRevealStates] = useState<Record<string, boolean>>({});

  // Dynamic log injection for News Intel A
  useEffect(() => {
    const logsPool = [
      "ANALYZING LATENCY NODES...",
      "VERIFYING CARGO MANIFESTS...",
      "AI_AGENT_B HEARTBEAT: OK",
      "NEW DATA INGESTED FROM HK_HUB",
      "BUFFER OPTIMIZATION COMPLETE",
      "ANOMALY DETECTED IN SECTOR 7G",
      "RE-ROUTING AGENT ASSIGNMENT...",
      "SCANNED PORT REDUNDANCY LOGS",
      "GEO_BLOCK_04 RESILIENCY: NOMINAL",
    ];

    const logInterval = setInterval(() => {
      const randomLog = logsPool[Math.floor(Math.random() * logsPool.length)];
      setNewsFeedLogs((prev) => {
        const next = [randomLog, ...prev];
        if (next.length > 7) {
          next.pop();
        }
        return next;
      });
    }, 2800);

    return () => clearInterval(logInterval);
  }, []);

  // Telemetry fluctuation loop
  useEffect(() => {
    const teleInterval = setInterval(() => {
      setUptimePercent((prev) => {
        const delta = (Math.random() > 0.8 ? (Math.random() > 0.5 ? 0.001 : -0.001) : 0);
        return parseFloat(Math.min(100, Math.max(99.99, prev + delta)).toFixed(3));
      });
      setThroughputRate((prev) => {
        const delta = (Math.random() > 0.5 ? 0.05 : -0.05);
        return parseFloat(Math.min(4.8, Math.max(3.8, prev + delta)).toFixed(2));
      });
    }, 4500);

    return () => clearInterval(teleInterval);
  }, []);

  // Fetch dashboard data from backend
  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryData, risks] = await Promise.all([
          api.dashboardSummary(),
          api.dashboardRecent(),
        ]);
        setSummary(summaryData);
        setRecentRisks(risks);
      } catch {
        // silently fall back to mock data if backend is down
      }
    }
    fetchData();
  }, []);

  // Scroll reveal with IntersectionObserver
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("data-reveal-id");
          if (id) {
            setRevealStates((prev) => ({ ...prev, [id]: true }));
          }
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll("[data-reveal-id]");
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Parallax grid offset effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      const grids = document.querySelectorAll(".grid-bg") as NodeListOf<HTMLElement>;
      grids.forEach((grid) => {
        grid.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Client-side simulation of flying data packets between nodes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const parent = heroVizRef.current;
    if (!parent) return;

    const createPacket = (startNodeId: string, endNodeId: string) => {
      const startNode = document.getElementById(startNodeId);
      const endNode = document.getElementById(endNodeId);
      if (!startNode || !endNode || !parent) return;

      const packet = document.createElement("div");
      packet.className = "packet";
      parent.appendChild(packet);

      const startRect = startNode.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const endRect = endNode.getBoundingClientRect();

      const startX = startRect.left - parentRect.left + startRect.width / 2;
      const startY = startRect.top - parentRect.top + startRect.height / 2;
      const endX = endRect.left - parentRect.left + endRect.width / 2;
      const endY = endRect.top - parentRect.top + endRect.height / 2;

      packet.style.left = `${startX}px`;
      packet.style.top = `${startY}px`;

      const duration = 1600 + Math.random() * 800;
      const animation = packet.animate(
        [
          { left: `${startX}px`, top: `${startY}px`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { opacity: 1, offset: 0.8 },
          { left: `${endX}px`, top: `${endY}px`, opacity: 0 },
        ],
        {
          duration: duration,
          easing: "linear",
        }
      );

      animation.onfinish = () => packet.remove();
    };

    const nodes = ["node-1", "node-2", "node-3", "node-4"];
    const packetInterval = setInterval(() => {
      const start = nodes[Math.floor(Math.random() * nodes.length)];
      const end = nodes[Math.floor(Math.random() * nodes.length)];
      if (start !== end) {
        createPacket(start, end);
      }
    }, 1000);

    return () => clearInterval(packetInterval);
  }, []);

  // Client-side pipeline sequential packet flow
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    const createPipelinePacket = (startCard: HTMLElement, endCard: HTMLElement) => {
      if (!pipeline) return;

      const packet = document.createElement("div");
      packet.className = "packet";
      pipeline.appendChild(packet);

      const startRect = startCard.getBoundingClientRect();
      const parentRect = pipeline.getBoundingClientRect();
      const endRect = endCard.getBoundingClientRect();

      const startX = startRect.left - parentRect.left + startRect.width / 2;
      const startY = startRect.top - parentRect.top + startRect.height / 2;
      const endX = endRect.left - parentRect.left + endRect.width / 2;
      const endY = endRect.top - parentRect.top + endRect.height / 2;

      packet.style.left = `${startX}px`;
      packet.style.top = `${startY}px`;

      const duration = 1200 + Math.random() * 400;
      const animation = packet.animate(
        [
          { left: `${startX}px`, top: `${startY}px`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { opacity: 1, offset: 0.8 },
          { left: `${endX}px`, top: `${endY}px`, opacity: 0 },
        ],
        {
          duration: duration,
          easing: "linear",
        }
      );

      animation.onfinish = () => packet.remove();
    };

    const cards = Array.from(pipeline.children) as HTMLElement[];
    const pipeInterval = setInterval(() => {
      for (let i = 0; i < cards.length - 1; i++) {
        if (Math.random() > 0.6) {
          createPipelinePacket(cards[i], cards[i + 1]);
        }
      }
    }, 2200);

    return () => clearInterval(pipeInterval);
  }, []);

  return (
    <div className="bg-surface text-on-surface selection:bg-primary selection:text-surface overflow-x-hidden min-h-screen relative font-body-md">
      {/* Noise Grain and Scanline Visual Polish */}
      <div className="grain" />
      <div className="scanline opacity-10 pointer-events-none" />

      {/* TOP NAVIGATION */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl border border-outline-variant rounded-lg bg-surface/80 backdrop-blur-xl z-[100] flex justify-between items-center px-6 h-12">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-code-md text-code-md font-bold tracking-tighter text-primary flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full node-pulse" />
            RISK_INTEL_SYSTEM_V1.0
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/intelligence">
              Intelligence
            </Link>
            <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/ecosystem">
              Ecosystem
            </Link>
            <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/architecture">
              Architecture
            </Link>
            <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/devdocs">
              DevDocs
            </Link>
          </div>
        </div>
        <Link href="/console" className="bg-primary text-on-primary-fixed font-label-sm text-label-sm px-4 py-1.5 rounded active:scale-95 transition-transform shimmer-hover flex items-center justify-center font-bold">
          Launch Console
        </Link>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden px-12 md:px-24">
        <div className="grid-bg absolute inset-0 opacity-10 pointer-events-none transition-transform duration-300 ease-out" />
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          <div
            data-reveal-id="hero-content"
            className={`lg:col-span-7 flex flex-col justify-center transition-all duration-1000 ${
              revealStates["hero-content"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-code-md text-label-sm uppercase self-start rounded">
              <TerminalIcon className="text-[14px] w-3.5 h-3.5" />
              [SYSTEM_READY_STABLE_BUILD]
            </div>
            <h1 className="font-headline-lg text-headline-lg mb-6 leading-[1.05] tracking-tighter uppercase text-white">
              Operational Intelligence <br />
              <span className="text-primary italic">For Global Supply Chains</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-8">
              An autonomous multi-agent ecosystem leveraging Retrieval-Augmented Generation (RAG) and high-fidelity sensor telemetry to preempt disruption before it ripples through your architecture.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/console" className="bg-primary text-on-primary-fixed font-label-sm text-label-sm px-8 py-4 uppercase font-bold border border-primary hover:bg-transparent hover:text-primary transition-all duration-300 shimmer-hover hover:scale-[1.02] flex items-center justify-center">
                Initialize Node
              </Link>
              <Link href="/devdocs" className="border border-outline text-on-surface font-label-sm text-label-sm px-8 py-4 uppercase font-bold hover:bg-white/5 transition-all duration-300 shimmer-hover hover:scale-[1.02] flex items-center justify-center">
                View Documentation
              </Link>
            </div>
          </div>
          <div
            data-reveal-id="hero-visual"
            className={`lg:col-span-5 relative hidden lg:flex items-center justify-center transition-all duration-1000 delay-200 ${
              revealStates["hero-visual"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Architecture Visualization Mockup */}
            <div
              ref={heroVizRef}
              className="relative w-full aspect-square border border-outline-variant bg-surface-container-lowest/50 p-8 rounded-lg overflow-hidden backdrop-blur-sm"
              id="hero-viz"
            >
              <div className="scanline" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border border-dashed border-primary/30 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-80 h-80 border border-dashed border-primary/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
              </div>
              {/* Pulsing Nodes */}
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary rounded-sm node-pulse" id="node-1" />
              <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-primary rounded-sm node-pulse" id="node-2" style={{ animationDelay: "0.5s" }} />
              <div className="absolute top-1/2 right-10 w-4 h-4 bg-primary rounded-sm node-pulse" id="node-3" style={{ animationDelay: "1.2s" }} />
              <div className="absolute bottom-1/2 left-10 w-4 h-4 bg-primary rounded-sm node-pulse" id="node-4" style={{ animationDelay: "0.8s" }} />

              <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                <div className="font-code-md text-label-sm text-primary uppercase mb-2 select-none tracking-widest font-bold">
                  Core_Orchestrator
                </div>
                <div className="h-[1px] w-32 bg-primary/40 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-left border-l-2 border-primary pl-2 select-none">
                    <div className="text-[10px] text-on-surface-variant font-bold">UPTIME</div>
                    <div className="font-code-md text-label-sm text-white font-bold">{uptimePercent}%</div>
                  </div>
                  <div className="text-left border-l-2 border-primary pl-2 select-none">
                    <div className="text-[10px] text-on-surface-variant font-bold">THROUGHPUT</div>
                    <div className="font-code-md text-label-sm text-white font-bold">{throughputRate}GB/s</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE PIPELINE */}
      <section className="py-24 bg-surface-container-low border-y border-outline-variant px-12 md:px-24">
        <div className="container mx-auto">
          <div
            data-reveal-id="pipeline-header"
            className={`flex flex-col md:flex-row justify-between items-end mb-12 gap-8 transition-all duration-1000 ${
              revealStates["pipeline-header"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div>
              <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-2">
                [0x01] Polyglot Intelligence Pipeline
              </h2>
              <p className="font-headline-md text-headline-md max-w-xl text-white">
                Multi-Language Infrastructure for Unmatched Resiliency
              </p>
            </div>
            <div className="font-code-md text-label-sm text-on-surface-variant border border-outline-variant p-2 rounded bg-surface select-none">
              REASONING_LATENCY: <span className="text-primary font-bold terminal-glow">&lt;14ms</span>
            </div>
          </div>

          <div ref={pipelineRef} className="grid grid-cols-1 md:grid-cols-5 gap-4 relative" id="pipeline-nodes">
            {/* Go Ingestion */}
            <div
              data-reveal-id="pipe-card-1"
              className={`border border-outline-variant bg-surface p-6 rounded hover:border-primary transition-all group shimmer-hover hover:scale-[1.02] flex flex-col justify-between h-64 cursor-pointer ${
                revealStates["pipe-card-1"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div>
                <div className="font-code-md text-[10px] text-on-surface-variant mb-4 flex justify-between select-none">
                  <span>01_INGESTION</span>
                  <span className="text-primary node-pulse">●</span>
                </div>
                <div className="font-headline-sm text-headline-sm mb-2 text-white">Go</div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  High-concurrency sensor data ingestion from 4.2M global logistics nodes.
                </p>
              </div>
              <div className="h-1 bg-surface-container-high overflow-hidden mt-4 rounded-full">
                <div className="h-full bg-primary w-full" />
              </div>
            </div>

            {/* Scala Stream */}
            <div
              data-reveal-id="pipe-card-2"
              className={`border border-outline-variant bg-surface p-6 rounded hover:border-primary transition-all group shimmer-hover hover:scale-[1.02] flex flex-col justify-between h-64 cursor-pointer ${
                revealStates["pipe-card-2"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <div>
                <div className="font-code-md text-[10px] text-on-surface-variant mb-4 flex justify-between select-none">
                  <span>02_PROCESSING</span>
                  <span className="text-primary node-pulse" style={{ animationDelay: "0.3s" }}>●</span>
                </div>
                <div className="font-headline-sm text-headline-sm mb-2 text-white">Scala</div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Real-time stream processing using Akka clusters for stateful analysis.
                </p>
              </div>
              <div className="h-1 bg-surface-container-high overflow-hidden mt-4 rounded-full">
                <div className="h-full bg-primary w-3/4" />
              </div>
            </div>

            {/* Python AI */}
            <div
              data-reveal-id="pipe-card-3"
              className={`border border-outline-variant bg-surface p-6 rounded hover:border-primary transition-all group shimmer-hover hover:scale-[1.02] flex flex-col justify-between h-64 cursor-pointer ${
                revealStates["pipe-card-3"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <div>
                <div className="font-code-md text-[10px] text-on-surface-variant mb-4 flex justify-between select-none">
                  <span>03_REASONING</span>
                  <span className="text-primary node-pulse" style={{ animationDelay: "0.6s" }}>●</span>
                </div>
                <div className="font-headline-sm text-headline-sm mb-2 text-white">Python</div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Distributed LLM inference for semantic risk extraction and RAG.
                </p>
              </div>
              <div className="h-1 bg-surface-container-high overflow-hidden mt-4 rounded-full">
                <div className="h-full bg-primary w-5/6" />
              </div>
            </div>

            {/* Rust Orchestration */}
            <div
              data-reveal-id="pipe-card-4"
              className={`border border-outline-variant bg-surface p-6 rounded hover:border-primary transition-all group shimmer-hover hover:scale-[1.02] flex flex-col justify-between h-64 cursor-pointer ${
                revealStates["pipe-card-4"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              <div>
                <div className="font-code-md text-[10px] text-on-surface-variant mb-4 flex justify-between select-none">
                  <span>04_SYSTEM</span>
                  <span className="text-primary node-pulse" style={{ animationDelay: "0.9s" }}>●</span>
                </div>
                <div className="font-headline-sm text-headline-sm mb-2 text-white">Rust</div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Memory-safe control plane for agent health and tactical allocation.
                </p>
              </div>
              <div className="h-1 bg-surface-container-high overflow-hidden mt-4 rounded-full">
                <div className="h-full bg-primary w-full" />
              </div>
            </div>

            {/* Next.js Dashboard */}
            <div
              data-reveal-id="pipe-card-5"
              className={`border border-outline-variant bg-surface p-6 rounded hover:border-primary transition-all group shimmer-hover hover:scale-[1.02] flex flex-col justify-between h-64 cursor-pointer ${
                revealStates["pipe-card-5"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "500ms" }}
            >
              <div>
                <div className="font-code-md text-[10px] text-on-surface-variant mb-4 flex justify-between select-none">
                  <span>05_EXHIBIT</span>
                  <span className="text-primary node-pulse" style={{ animationDelay: "1.2s" }}>●</span>
                </div>
                <div className="font-headline-sm text-headline-sm mb-2 text-white">Next.js</div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Low-latency tactical dashboard with sub-millisecond UI updates.
                </p>
              </div>
              <div className="h-1 bg-surface-container-high overflow-hidden mt-4 rounded-full">
                <div className="h-full bg-primary w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUTONOMOUS ECOSYSTEM */}
      <section className="py-24 px-12 md:px-24 relative">
        <div className="container mx-auto">
          <div
            data-reveal-id="ecosystem-header"
            className={`mb-12 transition-all duration-1000 ${
              revealStates["ecosystem-header"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h2 className="font-headline-md text-headline-md uppercase mb-4 text-white">Autonomous Ecosystem</h2>
            <div className="h-[2px] w-24 bg-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* News Agent */}
            <div
              data-reveal-id="agent-card-1"
              className={`border border-outline-variant bg-surface-container-lowest p-6 rounded flex flex-col gap-4 group hover:border-primary/50 transition-all ${
                revealStates["agent-card-1"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PublicIcon className="text-primary w-5 h-5" />
                  <span className="font-code-md text-label-sm font-bold text-white">NEWS_INTEL_A</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                  <span className="w-1 h-1 bg-primary rounded-full node-pulse" />
                  ACTIVE
                </span>
              </div>
              <div className="bg-surface-dim p-4 border border-outline-variant font-code-md text-[12px] leading-tight text-on-surface-variant h-36 overflow-hidden relative rounded">
                <div className="space-y-1.5">
                  {newsFeedLogs.map((log, index) => (
                    <div key={index}>&gt; {log}</div>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dim via-transparent to-transparent opacity-60 pointer-events-none" />
              </div>
              <div className="flex justify-between items-center text-[10px] font-code-md opacity-70 mt-auto select-none">
                <span>UPTIME: 324h</span>
                <span>REQ/S: 1.2k</span>
              </div>
            </div>

            {/* Logistics Agent */}
            <div
              data-reveal-id="agent-card-2"
              className={`border border-outline-variant bg-surface-container-lowest p-6 rounded flex flex-col gap-4 group hover:border-primary/50 transition-all ${
                revealStates["agent-card-2"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LocalShippingIcon className="text-primary w-5 h-5" />
                  <span className="font-code-md text-label-sm font-bold text-white">LOGISTICS_STRAT</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                  <span className="w-1 h-1 bg-primary rounded-full node-pulse" />
                  ACTIVE
                </span>
              </div>
              <div className="bg-surface-dim p-4 border border-outline-variant font-code-md text-[12px] leading-tight text-on-surface-variant h-36 overflow-hidden rounded select-none">
                <div className="space-y-1.5">
                  <div>&gt; TRACKING 14,000 FREIGHTS</div>
                  <div>&gt; REROUTING SHIPMENT 0X8A22...</div>
                  <div>&gt; FUEL OPTIMIZATION: +12%</div>
                  <div>&gt; DELAY MITIGATION: SUCCESS</div>
                  <div>&gt; NETWORK NODE FEED STABLE</div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-code-md opacity-70 mt-auto select-none">
                <span>UPTIME: 840h</span>
                <span>REQ/S: 4.8k</span>
              </div>
            </div>

            {/* Supplier Risk Agent */}
            <div
              data-reveal-id="agent-card-3"
              className={`border border-outline-variant bg-surface-container-lowest p-6 rounded flex flex-col gap-4 group hover:border-primary/50 transition-all ${
                revealStates["agent-card-3"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FactoryIcon className="text-primary w-5 h-5" />
                  <span className="font-code-md text-label-sm font-bold text-white">SUPPLIER_RISK</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                  <span className="w-1 h-1 bg-primary rounded-full node-pulse" />
                  ACTIVE
                </span>
              </div>
              <div className="bg-surface-dim p-4 border border-outline-variant font-code-md text-[12px] leading-tight text-on-surface-variant h-36 overflow-hidden rounded select-none">
                <div className="space-y-1.5">
                  <div>&gt; MONITORING TIER-3 VENDORS</div>
                  <div>&gt; WARNING: FISCAL INSTABILITY</div>
                  <div>&gt; ORIGIN: SOUTH-EAST REGION</div>
                  <div>&gt; TRIGGERING ALT SOURCE LOOKUP</div>
                  <div>&gt; VENDOR CREDITS VERIFIED</div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-code-md opacity-70 mt-auto select-none">
                <span>UPTIME: 1,120h</span>
                <span>REQ/S: 0.9k</span>
              </div>
            </div>

            {/* Mitigation Agent */}
            <div
              data-reveal-id="agent-card-4"
              className={`border border-outline-variant bg-surface-container-lowest p-6 rounded flex flex-col gap-4 group hover:border-primary/50 transition-all ${
                revealStates["agent-card-4"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldIcon className="text-primary w-5 h-5" />
                  <span className="font-code-md text-label-sm font-bold text-white">MITIGATION_EXE</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                  <span className="w-1 h-1 bg-primary rounded-full node-pulse" />
                  ACTIVE
                </span>
              </div>
              <div className="bg-surface-dim p-4 border border-outline-variant font-code-md text-[12px] leading-tight text-on-surface-variant h-36 overflow-hidden rounded select-none">
                <div className="space-y-1.5">
                  <div>&gt; AUTO CONTINGENCY DEPLOY</div>
                  <div>&gt; CONTRACT VERIFIED: V_0012</div>
                  <div>&gt; BUFFER STOCK RELEASE: 15%</div>
                  <div>&gt; ALL CONTROL PATHS OPTIMIZED</div>
                  <div>&gt; RE-ROUTING COMPLETED</div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-code-md opacity-70 mt-auto select-none">
                <span>UPTIME: 2,490h</span>
                <span>REQ/S: 0.4k</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE TACTICAL RISK FEED */}
      <section className="py-24 px-12 md:px-24 bg-surface-container-lowest border-y border-outline-variant">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div
            data-reveal-id="feed-sidebar"
            className={`lg:col-span-4 transition-all duration-1000 ${
              revealStates["feed-sidebar"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h3 className="font-headline-sm text-headline-sm mb-4 text-white uppercase tracking-tight">
              Live Tactical Feed
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Real-time global event stream parsed and verified by our multi-agent reasoning layers.
            </p>
            <div className="p-4 border border-primary/20 bg-primary/5 relative overflow-hidden group rounded">
              <div className="scanline opacity-30 pointer-events-none" />
              <div className="font-code-md text-label-sm text-primary mb-1 uppercase tracking-tighter font-bold">
                Current Threat Level
              </div>
              <div className="font-headline-md text-headline-md terminal-glow text-primary font-bold">
                {summary ? `MODERATE_${summary.risk_score_avg.toFixed(2)}` : "MODERATE_0.44"}
              </div>
            </div>
          </div>

          <div
            data-reveal-id="feed-track-container"
            className={`lg:col-span-8 transition-all duration-1000 delay-200 ${
              revealStates["feed-track-container"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="border border-outline-variant h-[380px] overflow-hidden relative bg-surface-dim rounded-lg">
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-surface-dim to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-dim to-transparent z-10 pointer-events-none" />
              
              {/* Marquee vertical scroll using simple Tailwind styling */}
              <div className="absolute inset-0 flex flex-col justify-start overflow-y-auto overflow-x-hidden no-scrollbar py-6">
                <div className="flex flex-col gap-6 px-6">
                  {recentRisks.length > 0 ? (
                    recentRisks.map((risk, idx) => (
                      <div key={idx} className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                        <div className="flex items-center gap-4">
                          {risk.priority === "high" ? (
                            <GavelIcon className="text-error w-5 h-5 flex-shrink-0" />
                          ) : (
                            <WarningIcon className="text-primary node-pulse w-5 h-5 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-code-md text-label-sm font-bold uppercase text-white">
                              {risk.title}
                            </div>
                            <div className="text-[11px] text-on-surface-variant">
                              Risk Score: {risk.risk_score} | Priority: {risk.priority}
                            </div>
                          </div>
                        </div>
                        <span className="font-code-md text-label-sm text-primary font-bold text-xs">{risk.published_at ?? ""}</span>
                      </div>
                    ))
                  ) : (
                    /* Fallback mock feed when backend is unreachable */
                    [1, 2].map((loopIdx) => (
                      <div key={loopIdx} className="flex flex-col gap-6">
                        <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-4">
                            <WarningIcon className="text-primary node-pulse w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-code-md text-label-sm font-bold uppercase text-white">
                                Ports Delayed: Singapore
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Estimated disruption: 14.5 hours | Impact Score: 0.62
                              </div>
                            </div>
                          </div>
                          <span className="font-code-md text-label-sm text-primary font-bold text-xs">JUST NOW</span>
                        </div>

                        <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-4">
                            <GavelIcon className="text-error w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-code-md text-label-sm font-bold uppercase text-white">
                                Sanctions: Route-X Extended
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Legal node update: Jurisdiction 04-A | Affecting 12 carriers
                              </div>
                            </div>
                          </div>
                          <span className="font-code-md text-label-sm opacity-50 text-xs">4m AGO</span>
                        </div>

                        <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-4">
                            <AnalyticsIcon className="text-primary w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-code-md text-label-sm font-bold uppercase text-white">
                                Supplier Instability: North-West Node
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Liquidity warning detected via News_Intel_B agent
                              </div>
                            </div>
                          </div>
                          <span className="font-code-md text-label-sm opacity-50 text-xs">12m AGO</span>
                        </div>

                        <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-4">
                            <SailingIcon className="text-primary w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-code-md text-label-sm font-bold uppercase text-white">
                                Suez Transit: Congestion Detected
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Visual intelligence confirming 18 vessel backlog
                              </div>
                            </div>
                          </div>
                          <span className="font-code-md text-label-sm opacity-50 text-xs">21m AGO</span>
                        </div>

                        <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-4">
                            <HubIcon className="text-primary w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-code-md text-label-sm font-bold uppercase text-white">
                                Inventory Re-balance: EU-WEST-1
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Mitigation agent auto-executing stock relocation
                              </div>
                            </div>
                          </div>
                          <span className="font-code-md text-label-sm opacity-50 text-xs">45m AGO</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVELOPER EXPERIENCE & OBSERVABILITY */}
      <section className="py-24 px-12 md:px-24">
        <div className="container mx-auto">
          <div
            data-reveal-id="dev-header"
            className={`text-center mb-16 transition-all duration-1000 ${
              revealStates["dev-header"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h2 className="font-headline-md text-headline-md uppercase text-white mb-2">
              Engineer Focused Architecture
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Deploy in seconds with gRPC streaming and Docker-optimized containers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editor UI */}
            <div
              data-reveal-id="editor-ui"
              className={`bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-2xl group hover:border-primary/40 transition-all ${
                revealStates["editor-ui"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between border-b border-outline-variant select-none">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-on-tertiary-container" />
                  <div className="w-3 h-3 rounded-full bg-primary/40" />
                </div>
                <div className="font-code-md text-[12px] text-on-surface-variant">risk_stream.go</div>
                <div className="w-12" />
              </div>
              <div className="p-6 font-code-md text-code-md overflow-x-auto relative">
                <div className="scanline opacity-10 pointer-events-none" />
                <pre className="text-[#89ddff] leading-relaxed">
                  <span className="text-[#c792ea]">package</span> main
                  {"\n\n"}
                  <span className="text-[#c792ea]">import</span> ({"\n"}
                  {"    "}<span className="text-[#c3e88d]">&quot;context&quot;</span>{"\n"}
                  {"    "}<span className="text-[#c3e88d]">&quot;github.com/risk_intel/sdk-go&quot;</span>{"\n"}
                  ){"\n\n"}
                  <span className="text-[#c792ea]">func</span>{" "}
                  <span className="text-[#82aaff]">initStream</span>() {"{"}
                  {"\n"}
                  {"    "}client := sdk.<span className="text-[#82aaff]">NewClient</span>(api_key){"\n"}
                  {"    "}stream, _ := client.
                  <span className="text-[#82aaff]">RiskEvents</span>(context.
                  <span className="text-[#82aaff]">Background</span>()){"\n"}
                  {"    "}{"\n"}
                  {"    "}
                  <span className="text-[#c792ea]">for</span> {"{"}
                  {"\n"}
                  {"        "}event, _ := stream.
                  <span className="text-[#82aaff]">Recv</span>()
                  {"\n"}
                  {"        "}
                  <span className="text-[#676e95]">{"// Process tactical data in real-time"}</span>
                  {"\n"}
                  {"        "}fmt.<span className="text-[#82aaff]">Printf</span>(
                  <span className="text-[#c3e88d]">&quot;Received Risk: %s\n&quot;</span>, event.ID){"\n"}
                  {"    "}{"}"}
                  {"\n"}
                  {"}"}
                </pre>
              </div>
            </div>

            {/* Terminal & Observability */}
            <div
              data-reveal-id="observability-ui"
              className={`flex flex-col gap-6 transition-all duration-1000 ${
                revealStates["observability-ui"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <div className="bg-surface-container-lowest border border-outline-variant p-6 h-full flex flex-col justify-between rounded-lg group hover:border-primary/40 transition-all">
                <div>
                  <div className="font-code-md text-label-sm text-on-surface-variant mb-4 flex justify-between items-center select-none">
                    DEPLOYMENT_CONFIG
                    <span className="w-2 h-2 bg-primary rounded-full node-pulse" />
                  </div>
                  <div className="bg-black/40 p-4 font-code-md text-[13px] text-on-surface relative rounded border border-outline-variant/30 select-none">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-primary font-bold">services:</span>
                    <br />
                    &nbsp;&nbsp;<span className="text-primary font-bold">risk-node:</span>
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-on-surface-variant">image:</span>{" "}
                    risk_intel/node:v1.0
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-on-surface-variant">environment:</span>
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- CLUSTER_ID=EU_NORTH
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- AGENT_COUNT=4
                  </div>
                </div>

                <div className="mt-8 select-none">
                  <div className="font-code-md text-label-sm text-on-surface-variant mb-4 font-bold">
                    OBSERVABILITY_STREAM
                  </div>
                  <div className="flex items-end gap-1.5 h-16">
                    <div className="w-full bg-primary/20 h-6 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary/20 h-10 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary h-8 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary/40 h-12 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary h-16 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary/20 h-7 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary h-11 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary/60 h-6 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary/20 h-9 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                    <div className="w-full bg-primary h-14 hover:bg-primary transition-all duration-300 rounded-sm cursor-pointer" />
                  </div>
                  <div className="flex justify-between mt-2 font-code-md text-[10px] text-on-surface-variant">
                    <span>-15 MINS</span>
                    <span className="text-primary font-bold">SYSTEM_STABLE</span>
                    <span>NOW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        data-reveal-id="cta-section"
        className={`py-28 px-12 md:px-24 relative overflow-hidden transition-all duration-1000 ${
          revealStates["cta-section"] ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="font-headline-lg text-headline-lg mb-8 uppercase max-w-4xl mx-auto text-white leading-tight">
            Deploy Operational Intelligence Today
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12">
            Join the global infrastructure backbone. Secure your supply chain with autonomous reasoning.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/console" className="bg-primary text-on-primary-fixed font-label-sm text-label-sm px-10 py-5 uppercase font-bold border border-primary hover:shadow-[0_0_20px_rgba(107,251,154,0.4)] transition-all shimmer-hover hover:scale-[1.02] flex items-center justify-center">
              Initialize Core Node
            </Link>
            <Link href="/devdocs" className="border border-outline text-on-surface font-label-sm text-label-sm px-10 py-5 uppercase font-bold hover:bg-white/5 transition-all shimmer-hover hover:scale-[1.02] flex items-center justify-center">
              Talk To Architect
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-code-md text-code-md text-on-surface-variant flex items-center gap-2 select-none">
          <span className="w-1.5 h-1.5 bg-primary rounded-full node-pulse" />
          RISK_INTEL_CORE. ALL SYSTEMS OPERATIONAL.
        </div>
        <div className="flex flex-wrap justify-center gap-8 select-none">
          <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/devdocs">
            gRPC_Specs
          </Link>
          <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/devdocs">
            System_Logs
          </Link>
          <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/devdocs">
            Security_Protocol
          </Link>
          <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/devdocs">
            Legal_Node
          </Link>
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant select-none">
          &copy; 2026 RISK_INTEL_CORE
        </div>
      </footer>
    </div>
  );
}
