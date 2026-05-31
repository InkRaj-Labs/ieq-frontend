// IEQ API Client
// All calls go through the IEQ backend — never directly to LM Studio or SwarmUI.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModelResource {
  key: string;
  display_name: string;
  loaded: boolean;
  capabilities: string[];
}

export interface LoRAResource {
  key: string;
  display_name: string;
}

export interface ServiceStatus {
  service_id: string;
  display_name: string;
  status: "online" | "offline" | "degraded";
  models: ModelResource[];
  loras: LoRAResource[];
  capabilities: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  services: Record<string, string>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export const getHealth = () => get<HealthResponse>("/ieq/health");
export const getServices = () => get<{ services: ServiceStatus[] }>("/ieq/services");
export const getCapabilities = () => get<{ services: ServiceStatus[] }>("/ieq/capabilities");
export const getActivity = () => get<{ events: any[] }>("/ieq/activity");

// ─── Services ─────────────────────────────────────────────────────────────────

export const rediscover = (serviceId: string) =>
  post<{ status: string }>(`/ieq/services/${serviceId}/rediscover`);

// ─── Conversations ────────────────────────────────────────────────────────────

export const listConversations = () =>
  get<{ conversations: any[] }>("/ieq/conversations");

export const createConversation = (title: string, connectorId: string, modelKey: string) =>
  post<any>("/ieq/conversations", { title, connector_id: connectorId, model_key: modelKey });

export const getConversation = (id: number) =>
  get<any>(`/ieq/conversations/${id}`);

// ─── Streaming chat ───────────────────────────────────────────────────────────

export interface ChatRequest {
  model_key: string;
  message: string;
  conversation_id?: number;
  temperature?: number;
  stream?: boolean;
}

export async function* streamChat(req: ChatRequest): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/ieq/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // Parse SSE lines
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const obj = JSON.parse(data);
          const token =
            obj.choices?.[0]?.delta?.content ??
            obj.token ??
            obj.text ??
            "";
          if (token) yield token;
        } catch {
          // Plain text chunk
          if (data) yield data;
        }
      }
    }
  }
}

// ─── Image Generation ─────────────────────────────────────────────────────────

export interface GenerateRequest {
  model_key: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  loras?: string;
}

export const generate = (req: GenerateRequest) =>
  post<{ generation_id: number }>("/ieq/generate", req);

export const getGeneration = (id: number) =>
  get<any>(`/ieq/generate/${id}`);

export const cancelGeneration = (id: number) =>
  post<any>(`/ieq/generate/${id}/cancel`);

export const imageUrl = (id: number) => `${BASE}/ieq/images/${id}`;

// ─── Documents ────────────────────────────────────────────────────────────────

export const listDocuments = () =>
  get<{ documents: any[] }>("/ieq/documents");

export const getDocument = (id: number) =>
  get<any>(`/ieq/documents/${id}`);

export const deleteDocument = (id: number) =>
  fetch(`${BASE}/ieq/documents/${id}`, { method: "DELETE" });

// ─── RAG ──────────────────────────────────────────────────────────────────────

export const ragSearch = (query: string, limit = 5) =>
  get<{ results: any[] }>(`/ieq/rag/search?query=${encodeURIComponent(query)}&limit=${limit}`);

export const ragChat = (query: string, conversationId?: number) =>
  post<any>("/ieq/rag/chat", { query, conversation_id: conversationId });

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const getJob = (id: string) => get<any>(`/ieq/jobs/${id}`);
export const getJobResult = (id: string) => get<any>(`/ieq/jobs/${id}/result`);
export const cancelJob = (id: string) => post<any>(`/ieq/jobs/${id}/cancel`);

// ─── Agents ───────────────────────────────────────────────────────────────────

export const runResearchAgent = (query: string, documentIds?: number[]) =>
  post<{ job_id: string }>("/ieq/agents/research", { query, document_ids: documentIds });

export const runDocumentAnalysis = (documentId: number) =>
  post<{ job_id: string }>("/ieq/agents/analyze-document", { document_id: documentId });

export const getAgentTask = (jobId: string) =>
  get<any>(`/ieq/agents/task/${jobId}`);

// ─── Model Routing ────────────────────────────────────────────────────────────

export const selectModel = (task: string) =>
  post<{ model: ModelResource; score: number }>("/ieq/models/select", { task });

export const listModels = () =>
  get<{ models: ModelResource[] }>("/ieq/models");
