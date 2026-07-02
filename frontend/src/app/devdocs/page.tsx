"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const logs = [
  "Starting ingestion nodes...",
  "Initializing secure gateway (OIDC-v4)...",
  "Connecting ChromaDB vector storage...",
  "Clustering nodes via RAFT protocol...",
  "Allocating NVIDIA vGPU resources...",
  "Ingestion pipeline READY.",
  "Handshake verified with Edge_Node_Alpha.",
  "Health check: OK. Memory load: 42%.",
  "Broadcasting node manifest to Orchestrator...",
  "Listening on port 8080..."
];

export default function DevDocsPage() {
  const [displayedLogs, setDisplayedLogs] = useState<{ text: string; time: string; id: number }[]>([]);
  const logIndexRef = useRef(0);
  const logIdRef = useRef(0);
  const [apiOutputs, setApiOutputs] = useState<React.ReactNode[]>([
    <div key="init" className="flex items-center gap-2 mb-2">
      <span className="text-on-surface-variant">[SYSTEM]</span>
      <span>Awaiting command execution...</span>
    </div>
  ]);
  const outputRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const responseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const addLog = () => {
      const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
      const newLog = {
        text: logs[logIndexRef.current],
        time,
        id: logIdRef.current++
      };
      
      setDisplayedLogs(prev => {
        const next = [...prev, newLog];
        if (next.length > 50) return next.slice(next.length - 50);
        return next;
      });
      
      logIndexRef.current = (logIndexRef.current + 1) % logs.length;
    };

    const intervalId = setInterval(addLog, 2500);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [apiOutputs]);

  useEffect(() => {
    const responseTimers = responseTimersRef.current;

    return () => {
      responseTimers.forEach(clearTimeout);
    };
  }, []);

  const simulateAPI = async (endpoint: string) => {
    setApiOutputs(prev => [
      ...prev,
      <div key={`client-${Date.now()}`} className="flex items-center gap-2 mb-2">
        <span className="text-on-surface-variant">[CLIENT]</span> 
        <span>Executing {endpoint}...</span>
      </div>
    ]);
    
    try {
      let response: string;
      if (endpoint === '/risk/analyze') {
        const res = await api.analyzeRisk({
          supplier_name: "test_supplier",
          headline: "Live API test from DevDocs",
          risk_score: 0.65,
        });
        response = JSON.stringify(res, null, 2);
      } else {
        const res = await api.health();
        response = JSON.stringify(res, null, 2);
      }
      
      setApiOutputs(prev => [
        ...prev,
        <div key={`server-${Date.now()}`} className="flex items-center gap-2 mb-2">
          <span className="text-primary">[SERVER]</span> 
          <span className="devdocs-terminal-cursor whitespace-pre">{response}</span>
        </div>
      ]);
    } catch (err) {
      setApiOutputs(prev => [
        ...prev,
        <div key={`error-${Date.now()}`} className="flex items-center gap-2 mb-2">
          <span className="text-error">[ERROR]</span> 
          <span className="text-error">{(err as Error).message}</span>
        </div>
      ]);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <div className="devdocs-grid-bg min-h-screen">
        <div className="devdocs-scanlines"></div>
        {/* TopNavBar */}
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-lg z-50 bg-surface/80 backdrop-blur-md dark:bg-surface/80 border border-outline-variant flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/intelligence" className="font-headline-sm text-headline-sm font-bold tracking-tighter text-primary">TOC_OS</Link>
            <div className="hidden md:flex gap-6">
              <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/intelligence">Intelligence</Link>
              <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/ecosystem">Ecosystem</Link>
              <Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="/architecture">Architecture</Link>
              <Link className="font-label-sm text-label-sm text-primary border-b border-primary pb-1" href="/devdocs">DevDocs</Link>
            </div>
          </div>
          <Link href="/console" className="bg-primary text-on-primary font-label-sm text-label-sm px-4 py-1.5 rounded active:scale-95 transition-all duration-100 uppercase font-bold inline-block">Launch Console</Link>
        </nav>
        
        <div className="flex pt-24 min-h-screen">
          {/* SideNavBar */}
          <aside className="docked left-0 h-[calc(100vh-6rem)] w-64 bg-surface-container border-r border-outline-variant flex-col py-4 hidden md:flex sticky top-24">
            <div className="px-6 mb-8">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(107,251,154,0.6)]"></div>
                <span className="font-headline-sm text-headline-sm text-primary">ROOT_USER</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Level 4 Clearance</span>
            </div>
            <nav className="flex-1 space-y-1">
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all group" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                <span className="font-label-sm text-label-sm">Installation</span>
              </Link>
              <Link className="bg-secondary-container text-primary border-l-2 border-primary px-4 py-2 flex items-center gap-3 transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span className="font-label-sm text-label-sm">Services</span>
              </Link>
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">shield</span>
                <span className="font-label-sm text-label-sm">APIs</span>
              </Link>
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">database</span>
                <span className="font-label-sm text-label-sm">Agents</span>
              </Link>
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span className="font-label-sm text-label-sm">CLI Commands</span>
              </Link>
            </nav>
            <div className="mt-auto px-4 pt-4 border-t border-outline-variant space-y-1">
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">description</span>
                <span className="font-label-sm text-label-sm">Docs</span>
              </Link>
              <Link className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high transition-all" href="/devdocs">
                <span className="material-symbols-outlined text-[18px]">help</span>
                <span className="font-label-sm text-label-sm">Support</span>
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 px-4 md:px-8 pb-12">
            <div className="max-w-5xl mx-auto space-y-12">
              {/* Section Header */}
              <header className="border-b border-outline-variant pb-6">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-label-sm text-label-sm text-primary bg-primary/10 px-2 py-0.5 border border-primary/30">[ CLASSIFIED: ENGINEER_EYES_ONLY ]</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Neural Ingestion Architecture</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">Implementation documentation for the TOC multi-agent orchestration layer. Use these protocols to initialize secure ingestion nodes and memory vector clusters.</p>
              </header>

              {/* Code Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">data_object</span>
                    Service Configuration (YAML)
                  </h2>
                  <div className="flex gap-2">
                    <span className="font-label-sm text-label-sm px-2 py-1 border border-outline-variant text-on-surface-variant">v4.2.1-stable</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden">
                  <div className="bg-surface-container-high border-b border-outline-variant px-4 py-2 flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">config/ingestion_service.yaml</span>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-outline-variant"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-outline-variant"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-outline-variant"></div>
                    </div>
                  </div>
                  <pre className="p-6 font-code-md text-code-md overflow-x-auto"><code className="text-on-surface"><span className="text-primary">version:</span> {'"3.9"'}
<span className="text-primary">services:</span>
  <span className="text-tertiary">toc-ingest-node:</span>
    <span className="text-primary">image:</span> toc-registry:5000/ingestion:latest
    <span className="text-primary">environment:</span>
      - <span className="text-secondary">CHROMA_DB_URL=http://chroma:8000</span>
      - <span className="text-secondary">AUTH_PROTOCOL=v4_OIDC</span>
    <span className="text-primary">deploy:</span>
      <span className="text-primary">resources:</span>
        <span className="text-primary">reservations:</span>
          <span className="text-primary">devices:</span>
            - <span className="text-primary">driver:</span> nvidia
              <span className="text-primary">count:</span> 1
              <span className="text-primary">capabilities:</span> [gpu]</code></pre>
                </div>
              </section>

              {/* API Playground */}
              <section className="space-y-6">
                <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">play_circle</span>
                  API Interaction Lab
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Endpoint Card 1 */}
                  <div className="border border-outline-variant bg-surface-container-low p-6 space-y-4 hover:border-primary transition-colors cursor-pointer group" onClick={() => simulateAPI('/risk/analyze')}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-label-sm text-label-sm text-primary font-bold">POST</span>
                        <h3 className="font-headline-sm text-headline-sm mt-1">/risk/analyze</h3>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">send</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">Runs a heuristic threat assessment against a provided log payload using the Neural-X engine.</p>
                  </div>
                  
                  {/* Endpoint Card 2 */}
                  <div className="border border-outline-variant bg-surface-container-low p-6 space-y-4 hover:border-primary transition-colors cursor-pointer group" onClick={() => simulateAPI('/memory/query')}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-label-sm text-label-sm text-tertiary font-bold">GET</span>
                        <h3 className="font-headline-sm text-headline-sm mt-1">/memory/query</h3>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">send</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">Retrieves contextual embeddings from the persistent vector store based on semantic similarity.</p>
                  </div>
                </div>

                {/* API Output Window */}
                <div className="bg-black border border-outline-variant overflow-hidden devdocs-crt-flicker">
                  <div className="bg-surface-container-highest px-4 py-2 border-b border-outline-variant flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                      <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">terminal_output_v4.log</span>
                  </div>
                  <div className="p-6 font-code-md text-code-md h-48 overflow-y-auto text-primary opacity-80 leading-relaxed" ref={outputRef}>
                    {apiOutputs}
                  </div>
                </div>
              </section>

              {/* Live Deployment */}
              <section className="space-y-6">
                <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">cloud_sync</span>
                  Cluster Deployment Status
                </h2>
                <div className="border border-outline-variant bg-surface-container-lowest p-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 border-b border-outline-variant">
                    <div className="p-4 border-r border-outline-variant">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">Status</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(107,251,154,0.6)]"></span>
                        <span className="font-label-sm text-label-sm font-bold text-primary">NOMINAL</span>
                      </div>
                    </div>
                    <div className="p-4 border-r border-outline-variant">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">Uptime</span>
                      <span className="font-label-sm text-label-sm text-on-surface">142:12:09</span>
                    </div>
                    <div className="p-4 border-r border-outline-variant">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">Nodes</span>
                      <span className="font-label-sm text-label-sm text-on-surface">12 / 12 ACTIVE</span>
                    </div>
                    <div className="p-4">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">Traffic</span>
                      <span className="font-label-sm text-label-sm text-on-surface">4.2 GB/s</span>
                    </div>
                  </div>
                  <div className="p-6 font-code-md text-code-md bg-surface-container-low/50 max-h-64 overflow-y-auto" ref={logContainerRef}>
                    {displayedLogs.map(log => (
                      <div key={log.id} className="flex gap-4 mb-1 transition-opacity duration-300">
                        <span className="text-on-surface-variant shrink-0">[{log.time}]</span>
                        <span className="text-on-surface">{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-surface-container-lowest border-t border-outline-variant w-full relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-4 gap-4">
            <span className="font-label-sm text-label-sm text-primary">TOC_OS // v4.2.0-LTS</span>
            <div className="flex gap-6">
              <Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity underline" href="/devdocs">SysLog</Link>
              <Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity underline" href="/devdocs">Legal_Nodes</Link>
              <Link className="font-code-md text-code-md text-on-surface-variant hover:text-primary transition-opacity underline" href="/devdocs">Protocol_v4</Link>
            </div>
            <span className="font-code-md text-code-md text-on-surface-variant">(c) 2026 TOC_INFRASTRUCTURE_GROUP [STATUS: NOMINAL]</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
