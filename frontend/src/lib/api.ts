const BASE = "/api"

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} returned ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} returned ${res.status}`)
  return res.json()
}

export interface DashboardSummary {
  total_documents: number
  escalated_count: number
  processed_count: number
  high_priority_count: number
  risk_score_avg: number
}

export interface RecentRiskItem {
  title: string
  risk_score: number
  priority: string
  source_url: string | null
  published_at: string | null
}

export interface SupplierResponse {
  id: string
  name: string
  region: string | null
  status: string | null
  reliability_score: number | null
}

export interface AlternativesResponse {
  supplier_name: string
  alternatives: Array<Record<string, unknown>>
}

export interface MitigationResponse {
  supplier_name: string
  risk_score: number
  vector_context: string
  graph_context: string[]
  final_plan: string
}

export interface AgentTriggerResponse {
  status: string
  supplier_name: string
  message: string
}

export interface HealthResponse {
  status: string
  service: string
}

export const api = {
  health: () => get<HealthResponse>("/health"),

  dashboardSummary: () => get<DashboardSummary>("/dashboard/summary"),

  dashboardRecent: (limit = 20) =>
    get<RecentRiskItem[]>(`/dashboard/recent?limit=${limit}`),

  suppliersByName: (name: string) =>
    get<SupplierResponse>(`/suppliers/${encodeURIComponent(name)}`),

  supplierAlternatives: (name: string, limit = 5) =>
    get<AlternativesResponse>(
      `/suppliers/${encodeURIComponent(name)}/alternatives?limit=${limit}`
    ),

  analyzeRisk: (event: {
    supplier_name: string
    headline: string
    risk_score: number
    supplier_id?: string
    source_url?: string
  }) => post<MitigationResponse>("/risks/analyze", event),

  triggerAgent: (req: {
    supplier_name: string
    headline: string
    risk_score: number
    supplier_id?: string
    source_url?: string
  }) => post<AgentTriggerResponse>("/agents/trigger", req),
}
