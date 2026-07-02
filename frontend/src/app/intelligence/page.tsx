"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, type DashboardSummary } from "@/lib/api";

// Custom premium SVG Icons for offline resilience and absolute positioning control
const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
  </svg>
);

const TerminalIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
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

const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const DatabaseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
  </svg>
);

const SettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const DescriptionIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const HelpIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

const WarningIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const KeyboardIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5h15m-15 3h15m-15-6h15M4.5 16.5h15M3.75 3h16.5c.414 0 .75.336.75.75v16.5c0 .414-.336.75-.75.75H3.75a.75.75 0 0 1-.75-.75V3.75c0-.414.336-.75.75-.75Z" />
  </svg>
);

interface TerminalLog {
  type: "input" | "output";
  text: string;
}

const COMMAND_PHRASES = [
  "Analyze supplier instability...",
  "Scan for maritime anomalies...",
  "Run predictive maintenance audit...",
  "Decrypt incoming telemetry...",
];

export default function TacticalOperationsConsole() {
  // Boot sequence simulation state
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [bootComplete, setBootComplete] = useState(false);
  const [bootVisible, setBootVisible] = useState(true);

  // Live telemetry fluctuating state
  const [agentsOnline, setAgentsOnline] = useState(1402);
  const [latency, setLatency] = useState(12);
  const [ingestion, setIngestion] = useState(4.2);

  // Fetched dashboard data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Interactive input console state
  const [terminalInputValue, setTerminalInputValue] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { type: "output", text: "AGENT_SQUAD_09 ASSIGNED TO SECTOR-7G." },
    { type: "output", text: "RETRIEVING HISTORICAL TELEMETRY..." },
    { type: "output", text: "NO ANOMALIES FOUND IN LAST 120s." },
  ]);

  // Command auto-typing phrases for placeholder cycling
  const [phraseIndex, setPhraseIndex] = useState(0);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate Boot Sequence Logs
  useEffect(() => {
    const logs = [
      "INITIALIZING TOC_OS KERNEL v4.11.0-INFRA...",
      "MOUNTING ENCRYPTED VOLUMES (AES-256)... DONE",
      "CHECKING NETWORK TOPOLOGY... STABLE",
      "SPAWNING AI AGENTS...",
      "AUTHENTICATING ROOT_USER ACCESS...",
      "DECODING VECTOR EMBEDDINGS...",
      "INITIALIZING NEURAL INTERFACE...",
      "BOOT COMPLETE. LAUNCHING CONSOLE.",
    ];

    let logIndex = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (callback: () => void, delay: number) => {
      const timerId = setTimeout(callback, delay);
      timers.push(timerId);
    };

    const addNextLog = () => {
      if (cancelled) return;

      if (logIndex < logs.length) {
        const timestamp = new Date().toLocaleTimeString();
        setBootLogs((prev) => [...prev, `[${timestamp}] ${logs[logIndex]}`]);
        logIndex++;
        schedule(addNextLog, Math.random() * 200 + 80);
      } else {
        schedule(() => {
          setBootComplete(true);
          schedule(() => setBootVisible(false), 1500);
        }, 8000);
      }
    };

    schedule(addNextLog, 100);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Fluctuating Dashboard Metrics for hyper-realism
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentsOnline((prev) => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
      setLatency((prev) => {
        const nextVal = prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);
        return Math.max(8, Math.min(18, nextVal));
      });
      setIngestion((prev) => {
        const nextVal = prev + (Math.random() > 0.5 ? 0.05 : -0.05);
        return parseFloat(Math.max(3.8, Math.min(4.7, nextVal)).toFixed(2));
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard summary data
  useEffect(() => {
    api.dashboardSummary().then(setSummary).catch(() => {});
  }, []);

  // Placeholder phrase cycling
  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % COMMAND_PHRASES.length);
    }, 6000);

    return () => clearInterval(phraseInterval);
  }, []);

  // Auto-scroll terminal logs to bottom
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Terminal submission handler
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = terminalInputValue.trim();
    if (!command) return;

    // Log typed command
    const newLogs: TerminalLog[] = [
      ...terminalLogs,
      { type: "input", text: command },
    ];

    const lowerCmd = command.toLowerCase();
    if (lowerCmd === "clear") {
      setTerminalLogs([]);
      setTerminalInputValue("");
      return;
    }

    if (lowerCmd === "help") {
      newLogs.push({
        type: "output",
        text: "AVAILABLE COMMANDS: 'scan', 'decrypt', 'agents', 'threats', 'clear', 'help'",
      });
    } else if (lowerCmd.startsWith("scan")) {
      newLogs.push({ type: "output", text: "INITIALIZING SECTOR RISK SCAN..." });
      setTerminalLogs(newLogs);
      setTerminalInputValue("");
      const res = await api.triggerAgent({
        supplier_name: command.slice(5).trim() || "unknown",
        headline: "Terminal scan command",
        risk_score: 0.5,
      }).catch(() => null);
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: res ? `AGENT RESPONSE: ${res.status} — ${res.message}` : "SCAN COMPLETE (backend unreachable)" },
      ]);
      return;
    } else if (lowerCmd.startsWith("decrypt")) {
      newLogs.push({ type: "output", text: "DECRYPTING SECTOR-7G SECURE PROTOCOLS..." });
      newLogs.push({ type: "output", text: "PARSING ENCRYPTED VECTOR DATA TRACES... [SUCCESS]" });
      newLogs.push({
        type: "output",
        text: 'Decrypted Payload: "CRITICAL SYSTEM RE-ROUTE CONFIRMED AT 23:00 UTC VIA NODE-A9"',
      });
    } else if (lowerCmd.startsWith("agents")) {
      newLogs.push({
        type: "output",
        text: "ACTIVE AGENTS: SQUAD_09 (Status: ACTIVE, Sector: 7G) | SQUAD_12 (Status: STANDBY, Sector: 4B)",
      });
    } else if (lowerCmd.startsWith("threats")) {
      newLogs.push({
        type: "output",
        text: "CURRENT ACTIVE THREATS: GEO_BLOCK_04 (STATIONED COGNITIVE DEVIATIONS DETECTED)",
      });
    } else {
      newLogs.push({
        type: "output",
        text: `Command '${command}' not recognized. Type 'help' to show active neural network protocols.`,
      });
    }

    setTerminalLogs(newLogs);
    setTerminalInputValue("");
  };

  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary selection:text-on-primary overflow-hidden h-screen flex flex-col relative">
      {/* CRT Visual Effects */}
      <div className="crt-overlay" />
      <div className="scanline" />

      {/* BOOT SEQUENCE OVERLAY */}
      {bootVisible && (
        <div
          className={`boot-screen fixed inset-0 z-[200] flex items-center justify-center p-12 transition-opacity duration-[1500ms] ${
            bootComplete ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="max-w-2xl w-full font-label-sm text-primary">
            <div className="space-y-1.5" id="boot-text">
              {bootLogs.map((log, index) => (
                <p key={index} className="font-code-md text-xs">
                  {log}
                </p>
              ))}
              {!bootComplete && (
                <div className="inline-block block-cursor text-xs opacity-80 mt-2">
                  System bootloader processing...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-lg z-50 bg-surface/80 backdrop-blur-md border border-outline-variant flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/intelligence" className="font-headline-sm text-headline-sm font-bold tracking-tighter text-primary">
            TOC_OS
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/intelligence" className="font-label-sm text-label-sm text-primary border-b border-primary pb-1">
              Intelligence
            </Link>
            <Link href="/ecosystem" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Ecosystem
            </Link>
            <Link href="/architecture" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Architecture
            </Link>
            <Link href="/devdocs" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              DevDocs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 border border-outline-variant rounded bg-surface-container-low px-3 py-1">
            <SearchIcon className="text-sm text-primary w-4 h-4" />
            <span className="font-label-sm text-label-sm text-on-surface-variant select-none">NODE_QUERY...</span>
          </div>
          <Link href="/console" className="font-label-sm text-label-sm bg-primary text-on-primary px-4 py-1.5 rounded uppercase tracking-wider font-bold active:scale-95 duration-100 cursor-pointer">
            Launch Console
          </Link>
        </div>
      </header>

      {/* MAIN CONSOLE LAYOUT */}
      <main className="flex-1 flex pt-20 h-full overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden md:flex h-full w-64 border-r border-outline-variant flex-col bg-surface-container">
          <div className="p-4 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 border border-primary p-0.5 bg-surface-container-high overflow-hidden">
                <Image
                  alt="User Avatar"
                  className="object-cover"
                  fill
                  sizes="40px"
                  src="/images/user_avatar.png"
                />
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-primary font-bold">ROOT_USER</p>
                <p className="text-[10px] text-on-surface-variant font-code-md">Level 4 Clearance</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-4 flex flex-col gap-1">
            <Link
              href="/intelligence"
              className="bg-secondary-container text-primary border-l-2 border-primary px-4 py-2 flex items-center gap-3 transition-all duration-200"
            >
              <TerminalIcon className="text-md w-5 h-5 text-primary" />
              <span className="font-label-sm text-label-sm uppercase">Terminal</span>
            </Link>
            <Link
              href="/ecosystem"
              className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all duration-200"
            >
              <HubIcon className="text-md w-5 h-5" />
              <span className="font-label-sm text-label-sm uppercase">Nodes</span>
            </Link>
            <Link
              href="/architecture"
              className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all duration-200"
            >
              <ShieldIcon className="text-md w-5 h-5" />
              <span className="font-label-sm text-label-sm uppercase">Security</span>
            </Link>
            <Link
              href="/devdocs"
              className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all duration-200"
            >
              <DatabaseIcon className="text-md w-5 h-5" />
              <span className="font-label-sm text-label-sm uppercase">Logs</span>
            </Link>
            <Link
              href="/intelligence"
              className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all duration-200"
            >
              <SettingsIcon className="text-md w-5 h-5" />
              <span className="font-label-sm text-label-sm uppercase">Settings</span>
            </Link>
            <div className="mt-8 px-4">
              <button
                onClick={() => {
                  setTerminalLogs([
                    { type: "output", text: "NEW SECURE NEURAL SESSION ESTABLISHED." },
                    { type: "output", text: "INITIALIZING RISK LOGS..." },
                  ]);
                }}
                className="w-full py-2 border border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-primary/10 transition-colors cursor-pointer"
              >
                NEW_SESSION
              </button>
            </div>
          </nav>
          <div className="p-4 border-t border-outline-variant bg-surface-container-low">
            <Link className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm py-1 hover:text-primary" href="/devdocs">
              <DescriptionIcon className="text-sm w-4 h-4" /> Docs
            </Link>
            <Link className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm py-1 hover:text-primary" href="/devdocs">
              <HelpIcon className="text-sm w-4 h-4" /> Support
            </Link>
          </div>
        </aside>

        {/* CENTER: MAIN CONSOLE */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-outline-variant h-full overflow-hidden">
          {/* METRICS BAR */}
          <div className="h-12 border-b border-outline-variant flex items-center px-4 gap-8 bg-surface-container-low flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#6bfb9a]" />
              <span className="font-label-sm text-label-sm text-on-surface-variant select-none">
                AGENTS_ONLINE: <span className="text-primary font-bold">{agentsOnline.toLocaleString()}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant select-none">
                LATENCY: <span className="text-primary font-bold">{latency}ms</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant select-none">
                INGESTION: <span className="text-primary font-bold">{ingestion} GB/s</span>
              </span>
            </div>
            <div className="ml-auto">
              <span className="font-label-sm text-label-sm text-error uppercase border border-error/50 px-2 py-0.5 select-none animate-pulse">
                {summary && summary.escalated_count > 0
                  ? `[ESCALATED: ${summary.escalated_count}]`
                  : "[STATUS: THREAT_DETECTED]"}
              </span>
            </div>
          </div>

          {/* LIVE INTELLIGENCE STREAM */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-primary uppercase tracking-tight terminal-glow">
                Intelligence Stream
              </h2>
              <span className="font-code-md text-on-surface-variant text-xs select-none">REFRESH_RATE: 0.5s</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tactical Card 1 */}
              <div className="border border-outline-variant bg-surface-container-high p-4 flex flex-col gap-3 relative group overflow-hidden transition-all duration-300 hover:border-primary/45">
                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <WarningIcon className="text-error w-5 h-5" />
                </div>
                <div className="font-label-sm text-label-sm text-error border-b border-error/30 pb-1">
                  ALERT: GEO_BLOCK_04
                </div>
                <h3 className="font-headline-sm text-sm text-on-surface font-bold uppercase">Strait of Hormuz Congestion</h3>
                <p className="font-code-md text-xs text-on-surface-variant leading-relaxed">
                  System identified 14% increase in deviation patterns for class-A vessels. Probable supply chain disruption window: 48-72h.
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-code-md text-[10px] text-on-surface-variant opacity-60">ID: 0x9AF21</span>
                  <button
                    onClick={async () => {
                      setTerminalLogs((prev) => [
                        ...prev,
                        { type: "output", text: "> SPANNING COGNITIVE MITIGATION AGENT TO GEO_BLOCK_04..." },
                      ]);
                      const res = await api.triggerAgent({
                        supplier_name: "geo_block_04",
                        headline: "Strait of Hormuz congestion alert",
                        risk_score: 0.75,
                      }).catch(() => null);
                      setTerminalLogs((prev) => [
                        ...prev,
                        { type: "output", text: res ? `> ${res.status}: ${res.message}` : "> AGENT DEPLOYED (backend unreachable)" },
                      ]);
                    }}
                    className="text-primary font-label-sm text-[10px] uppercase underline hover:no-underline cursor-pointer"
                  >
                    DEPLOY_AGENT
                  </button>
                </div>
              </div>

              {/* Tactical Card 2 */}
              <div className="border border-outline-variant bg-surface-container-high p-4 flex flex-col gap-3 relative group overflow-hidden transition-all duration-300 hover:border-primary/45">
                <div className="font-label-sm text-label-sm text-primary border-b border-primary/30 pb-1">
                  INFO: LOGISTICS_SYNC
                </div>
                <h3 className="font-headline-sm text-sm text-on-surface font-bold uppercase">Pan-Euro Node Expansion</h3>
                <p className="font-code-md text-xs text-on-surface-variant leading-relaxed">
                  Autonomous routing cluster successfully deployed in Frankfurt-North node. Latency reduced by 22% across DACH region.
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-code-md text-[10px] text-on-surface-variant opacity-60">ID: 0x44B12</span>
                  <span className="font-label-sm text-[10px] text-primary uppercase select-none font-bold">[NOMINAL]</span>
                </div>
              </div>

              {/* Map/Visual Section */}
              <div className="md:col-span-2 border border-outline-variant bg-surface-container-lowest h-64 relative overflow-hidden flex items-center justify-center group transition-all duration-300 hover:border-primary/30">
                <Image
                  alt="Tactical Map"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen group-hover:scale-105 transition-transform duration-[10000ms] ease-out"
                  fill
                  sizes="(min-width: 768px) 70vw, 100vw"
                  src="/images/tactical_map.png"
                />
                <div className="relative z-10 font-label-sm text-primary text-center px-8 select-none pointer-events-none">
                  <div className="terminal-glow text-xl font-bold uppercase tracking-[0.2em] mb-2">Global Risk Overlay</div>
                  <div className="font-code-md text-xs text-on-surface-variant">ACTIVE_SCAN: 98.4% COMPLETE</div>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE TERMINAL */}
          <div className="h-56 border-t border-outline-variant bg-surface-container-lowest flex flex-col flex-shrink-0">
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-outline-variant bg-surface-container-low select-none">
              <KeyboardIcon className="text-sm text-primary w-4 h-4" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                Input Console
              </span>
            </div>
            <div className="flex-1 p-4 font-code-md text-primary overflow-y-auto space-y-1 bg-[#090d1a] custom-scrollbar">
              {terminalLogs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  {log.type === "input" ? (
                    <>
                      <span className="text-on-surface-variant flex-shrink-0">root@toc-os:~$</span>
                      <span className="text-white font-bold">{log.text}</span>
                    </>
                  ) : (
                    <span className="text-primary-fixed">{log.text}</span>
                  )}
                </div>
              ))}
              <form onSubmit={handleTerminalSubmit} className="flex gap-2 items-center">
                <span className="text-on-surface-variant flex-shrink-0">root@toc-os:~$</span>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={terminalInputValue}
                    onChange={(e) => setTerminalInputValue(e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-primary caret-primary font-code-md p-0 block-cursor"
                    placeholder={COMMAND_PHRASES[phraseIndex]}
                    autoFocus
                  />
                </div>
              </form>
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </section>

        {/* RIGHT: AI REASONING PANEL */}
        <aside className="hidden lg:flex w-80 flex-col bg-surface-container-low overflow-y-auto">
          <div className="p-4 border-b border-outline-variant bg-surface-container select-none">
            <h2 className="font-label-sm text-label-sm text-primary font-bold uppercase">AI Reasoning Cluster</h2>
          </div>
          <div className="p-6 space-y-8">
            {/* Confidence Score */}
            <div className="space-y-3">
              <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant uppercase select-none">
                <span>Confidence Level</span>
                <span className="text-primary font-bold">94.8%</span>
              </div>
              <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[94.8%] shadow-[0_0_8px_#6bfb9a]" />
              </div>
            </div>
            {/* RAG Traces */}
            <div className="space-y-4">
              <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase border-l-2 border-primary pl-2 select-none">
                Vector Retrieval Traces
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-surface-container-high border border-outline-variant text-[11px] font-code-md">
                  <div className="text-primary mb-1 font-bold">Doc_ID: 0x882A (Weight: 0.89)</div>
                  <p className="text-on-surface-variant leading-tight">
                    Supply chain elasticity analysis for maritime choke points.
                  </p>
                </div>
                <div className="p-3 bg-surface-container-high border border-outline-variant text-[11px] font-code-md">
                  <div className="text-primary mb-1 font-bold">Doc_ID: 0xCF19 (Weight: 0.72)</div>
                  <p className="text-on-surface-variant leading-tight">
                    Geopolitical risk factors in the Persian Gulf v4.2.
                  </p>
                </div>
              </div>
            </div>
            {/* Mitigation Plan */}
            <div className="space-y-4">
              <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase border-l-2 border-error pl-2 select-none">
                Mitigation Plan
              </h3>
              <ul className="space-y-2 font-code-md text-[11px]">
                <li className="flex gap-2">
                  <span className="text-error font-bold flex-shrink-0">[!]</span>
                  <span className="text-on-surface-variant">Reroute Group-B carriers via Node-A9.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold flex-shrink-0">[+]</span>
                  <span className="text-on-surface-variant">Increase edge-cache redundancy by 15%.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold flex-shrink-0">[+]</span>
                  <span className="text-on-surface-variant">Trigger autonomous audit on supplier node.</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {/* FOOTER */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center px-6 py-4 w-full z-50 flex-shrink-0">
        <span className="font-label-sm text-[10px] text-primary uppercase select-none">
          (c) 2026 TOC_INFRASTRUCTURE_GROUP [STATUS: NOMINAL]
        </span>
        <div className="flex gap-6">
          <Link className="font-code-md text-xs text-on-surface-variant hover:text-primary underline transition-opacity" href="/devdocs">
            SysLog
          </Link>
          <Link className="font-code-md text-xs text-on-surface-variant hover:text-primary underline transition-opacity" href="/devdocs">
            Legal_Nodes
          </Link>
          <Link className="font-code-md text-xs text-on-surface-variant hover:text-primary underline transition-opacity" href="/devdocs">
            Protocol_v4
          </Link>
        </div>
      </footer>
    </div>
  );
}
