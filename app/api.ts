const API_BASE = 'http://localhost:8000';
// const API_BASE = 'https://0017b5e64424.ngrok-free.app';

const NGROK_HEADERS = {
  'ngrok-skip-browser-warning': 'true'
};

// Type definitions matching backend schema
export interface Node {
  id: string;
  module?: string;
  nodeType?: string;
  definition?: string;
  businessMeaning?: string;
  attributes?: string[] | unknown;
  grain?: string;
  color?: string;
  dataSources?: unknown;
  columnLineage?: unknown;
  derivedConcepts?: unknown;
  groupByOptions?: unknown;
  usedInDecisions?: unknown;
  businessRule?: string;
}

export interface Relationship {
  id?: number;
  from: string;
  to: string;
  label: string;
  type?: string;
  description?: string;
  businessMeaning?: string;
  joinCondition?: unknown;
  dataLineage?: unknown;
  derivationLogic?: string;
  usedInDecisions?: unknown;
}

export interface Journey {
  name?: string;
  shortName?: string;
  description?: string;
  color?: string;
  category?: string;
  path?: unknown;
  dataFlow?: unknown;
  decisionNode?: string;
  formula?: string;
  kpisAffected?: unknown;
  triggers?: unknown;
  targetChannel?: string;
  usedInDecisions?: unknown;
  differenceFromCore?: string;
  triggerCondition?: string;
  rule?: string;
  lifecycleRegimes?: unknown;
  questions?: unknown;
}

export interface Stats {
  nodes: number;
  relationships: number;
  journeys: number;
}

export async function downloadDb(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/db/download`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hoad_graph.db';
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

/** Normalize API relationship (from_node/to_node) to frontend shape (from/to) */
function toRel(r: Record<string, unknown>) {
  const { from_node, to_node, ...rest } = r;
  return { ...rest, from: (from_node ?? r.from) as string, to: (to_node ?? r.to) as string };
}

export async function fetchNodes(module?: string, nodeType?: string): Promise<Record<string, Node>> {
  const params = new URLSearchParams();
  if (module) params.append('module', module);
  if (nodeType) params.append('nodeType', nodeType);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/api/nodes${query}`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch nodes: ${res.status}`);
  const data = await res.json();
  const list = data?.nodes ?? [];
  return Object.fromEntries(list.filter((n: Node) => n?.id).map((n: Node) => [n.id as string, n]));
}

export async function fetchRelationships(): Promise<Array<{ from: string; to: string;[k: string]: unknown }>> {
  const res = await fetch(`${API_BASE}/api/relationships`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch relationships: ${res.status}`);
  const data = await res.json();
  return (data.relationships ?? []).map(toRel);
}

export async function fetchJourneys(): Promise<Array<Journey & { journey_key: string }>> {
  const res = await fetch(`${API_BASE}/api/journeys`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch journeys: ${res.status}`);
  const data = await res.json();
  return data.journeys ?? [];
}

export async function fetchJourneysDict(): Promise<Record<string, Journey>> {
  const res = await fetch(`${API_BASE}/api/journeys/dict`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch journeys: ${res.status}`);
  return await res.json();
}

export async function fetchPositions(): Promise<Record<string, { x: number; y: number }>> {
  const res = await fetch(`${API_BASE}/api/positions`, {
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error(`Failed to fetch positions: ${res.status}`);
  return await res.json();
}

export async function updatePosition(nodeId: string, x: number, y: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/positions/${encodeURIComponent(nodeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify({ x, y }),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Update position failed: ${res.status}`);
}

export async function fetchGraphData(): Promise<{
  nodes: Record<string, Node>;
  relationships: Array<{ from: string; to: string;[k: string]: unknown }>;
  journeys: Record<string, Journey>;
  positions: Record<string, { x: number; y: number }>;
}> {
  const [nodes, relationships, journeys, positions] = await Promise.all([
    fetchNodes(),
    fetchRelationships(),
    fetchJourneysDict(),
    fetchPositions(),
  ]);
  return { nodes, relationships, journeys, positions };
}

// ---- CRUD: Nodes ----
export async function createNode(node: Partial<Node>, position?: { x: number; y: number }): Promise<Node> {
  if (!node.id) throw new Error('Node id is required');
  const body: Partial<Node> & { position?: { x: number; y: number } } = { ...node };
  if (position) body.position = position;
  const res = await fetch(`${API_BASE}/api/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Create failed: ${res.status}`);
  return res.json();
}

export async function updateNode(nodeId: string, updates: Partial<Node>): Promise<Node> {
  const res = await fetch(`${API_BASE}/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Update failed: ${res.status}`);
  return res.json();
}

export async function deleteNode(nodeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Delete failed: ${res.status}`);
}

// ---- CRUD: Relationships ----
export async function createRelationship(rel: Partial<Relationship> & { from: string; to: string; label: string }): Promise<{ id: number; message: string }> {
  const body = { ...rel, from_node: rel.from, to_node: rel.to };
  const res = await fetch(`${API_BASE}/api/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Create failed: ${res.status}`);
  return res.json();
}

export async function updateRelationship(relId: number, updates: Partial<Relationship>): Promise<{ id: number; message: string }> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'from') body.from_node = v;
    else if (k === 'to') body.to_node = v;
    else body[k] = v;
  }
  const res = await fetch(`${API_BASE}/api/relationships/${relId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Update failed: ${res.status}`);
  return res.json();
}

export async function deleteRelationship(relId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/relationships/${relId}`, {
    method: 'DELETE',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Delete relationship failed: ${res.status}`);
}

// ---- CRUD: Journeys ----
export async function createJourney(journeyKey: string, journey: Partial<Journey>): Promise<{ journey_key: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/journeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify({ journey_key: journeyKey, ...journey }),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Create failed: ${res.status}`);
  return res.json();
}

export async function updateJourney(journeyKey: string, journey: Partial<Journey>): Promise<{ journey_key: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/journeys/${encodeURIComponent(journeyKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify({ journey_key: journeyKey, ...journey }),
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Update failed: ${res.status}`);
  return res.json();
}

export async function deleteJourney(journeyKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/journeys/${encodeURIComponent(journeyKey)}`, {
    method: 'DELETE',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Delete journey failed: ${res.status}`);
}

// ---- Admin Operations ----
export async function reloadFromJsx(): Promise<{ message: string; nodes: number; relationships: number; journeys: number; positions: number }> {
  const res = await fetch(`${API_BASE}/api/admin/reload`, {
    method: 'POST',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Reload failed: ${res.status}`);
  return res.json();
}

export async function clearDatabase(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/clear`, {
    method: 'POST',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Clear failed: ${res.status}`);
  return res.json();
}

export async function sendMessage(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/chat/fulldb`, {
    method: 'POST',
    headers: { ...NGROK_HEADERS }
  });
  if (!res.ok) throw new Error((await res.json())?.detail || `Clear failed: ${res.status}`);
  return res.json();
}
