"""
Node-scoped chat: build context from node, its relationships, related nodes, and flow journeys;
answer user question via OpenAI chat completion.
"""
import json
import os
from typing import Any, Dict, List, Optional
import openai

# Load .env from backend dir or project root
def _load_env():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(backend_dir, ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.path.dirname(backend_dir), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()


def _node_context_text(node: dict) -> str:
    parts = [
        f"Node ID: {node.get('id', '')}",
        f"Module: {node.get('module', '')}",
        f"Type: {node.get('nodeType', '')}",
        f"Definition: {node.get('definition') or '(none)'}",
        f"Business meaning: {node.get('businessMeaning') or '(none)'}",
    ]
    if node.get("attributes"):
        attrs = node["attributes"] if isinstance(node["attributes"], list) else [node["attributes"]]
        parts.append("Attributes: " + ", ".join(str(a) for a in attrs))
    if node.get("dataSources"):
        for ds in node["dataSources"] if isinstance(node["dataSources"], list) else [node["dataSources"]]:
            if isinstance(ds, dict) and ds:  # ensure ds is not empty
                parts.append(f"dataSources: [raw: {json.dumps(ds)}]")
            elif ds:
                parts.append(f"dataSources: {ds}")
    if node.get("columnLineage"):
        for cl in node["columnLineage"] if isinstance(node["columnLineage"], list) else [node["columnLineage"]]:
            if isinstance(cl, dict) and cl:  # ensure cl is not empty
                parts.append(f"columnLineage: [raw: {json.dumps(cl)}]")
            elif cl:
                parts.append(f"columnLineage: {cl}")
    return "\n".join(parts)


def _rel_context_text(rels: List[dict]) -> str:
    if not rels:
        return "(No relationships)"
    lines = []
    for r in rels:
        fr = r.get("from_node") or r.get("from", "")
        to = r.get("to_node") or r.get("to", "")
        label = r.get("label", "")
        desc = r.get("description", "")
        lines.append(f"  - {fr} --[{label}]--> {to}" + (f"  ({desc})" if desc else ""))
    return "\n".join(lines)


def _related_nodes_text(nodes: List[dict]) -> str:
    if not nodes:
        return "(No related nodes)"
    lines = []
    for n in nodes:
        lines.append(_node_context_text(n))
    return "\n\n".join(lines)


def _journeys_context_text(journeys: List[dict]) -> str:
    if not journeys:
        return "(No flow journeys for this node)"
    lines = []
    for j in journeys:
        key = j.get("journey_key", "")
        name = j.get("name", "")
        path = j.get("path")
        path_str = ", ".join(path) if isinstance(path, list) else str(path or "")
        data_flow = j.get("dataFlow")
        flow_str = ""
        if isinstance(data_flow, list):
            flow_str = " | ".join(
                f"{item.get('from', '')}->{item.get('to', '')}" for item in data_flow if isinstance(item, dict)
            )
        lines.append(f"Journey: {key} ({name})  Path: [{path_str}]  Flow: {flow_str}")
    return "\n".join(lines)


def build_context(
    node: dict,
    relationships: List[dict],
    related_nodes: List[dict],
    journeys: List[dict],
) -> str:
    node_txt = _node_context_text(node)
    rel_txt = _rel_context_text(relationships)
    related_txt = _related_nodes_text(related_nodes)
    journey_txt = _journeys_context_text(journeys)
    return f"""## Focus node
{node_txt}

## First / direct relationships for this node
{rel_txt}

## Related nodes (connected by those relationships)
{related_txt}

## Flow journeys that include this node
{journey_txt}
"""


def answer_with_openai(
    node: dict,
    relationships: List[dict],
    related_nodes: List[dict],
    journeys: List[dict],
    user_message: str,
) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o-mini")
    if not api_key:
        context = build_context(node, relationships, related_nodes, journeys)
        return (
            f"Context for this node:\n\n{context}\n\n"
            "Your question: " + user_message + "\n\n(Set OPENAI_API_KEY in .env for AI answers.)"
        )
    try:
        import openai
    except ImportError:
        context = build_context(node, relationships, related_nodes, journeys)
        return (
            f"Context for this node:\n\n{context}\n\n"
            "Your question: " + user_message + "\n\n(Install openai package for AI answers.)"
        )
    client = openai.OpenAI(api_key=api_key)
    context = build_context(node, relationships, related_nodes, journeys)
    print(context,"Context")
    system = (
        "You are a helpful assistant that answers questions about a business glossary node. "
        "Use ONLY the context below (the focus node, its relationships, related nodes, and flow journeys). "
        "Answer concisely and accurately. If the context does not contain the answer, say so."
        "Use the context to answer the question. Do not make up information. If the context does not contain the answer, say so."
        "If user ask information about the other nodes, you can use the context to answer the question. Do not make up information. If the context does not contain the answer, say so."
        "If the user asked for any infromation which is not related to this node dont answer the question. Say that you dont have the information."
        "If anyone asks for information about column lineage, try to match their request to the most relevant information you have, even if their spelling is incorrect or contains mistakes."
        "Always try to give examplation at least 2 sentences"
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system + "\n\n" + context},
            {"role": "user", "content": user_message},
        ],
    )
    return (response.choices[0].message.content or "").strip()



def answer_with_openai_with_full_db_context(node_data: dict, relationships_data: dict,node_count: int, user_message: str) -> str:
    import os

    try:
        import openai
    except ImportError:
        return "openai package is not installed. Please install it to use this feature."

    api_key = os.environ.get("OPENAI_API_KEY")
    model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o-mini")
    if not api_key:
        return "Not able to answer at this point (OPENAI_API_KEY missing)."

    client = openai.OpenAI(api_key=api_key)

    context = f'Nodes Information: {node_data}\nRelationships Information: {relationships_data}\nTotal Number of Nodes : {node_count}'
    system = (
        "Act like a senior enterprise knowledge graph architect and business intelligence agent specialized in large-scale telecom data ecosystems.\n"
        "Your goal is to operate as a BLG (Business Logic Graph) traversal agent with complete structured access to Nokia’s enterprise-wide knowledge graph, including products, customers, contracts, network assets, financial data, operations, and governance metadata.\n"
        "\n"
        "Task: Traverse the business knowledge graph strictly to retrieve, structure, and return only the requested graph-based information.\n"
        "\n"
        "Requirements:\n"
        "1) Treat all data as nodes and relationships (entities, attributes, edges, hierarchies).\n"
        "2) Interpret every request as a graph traversal problem (define start nodes, relationship paths, constraints, and filters).\n"
        "3) Clearly outline:\n"
        "   - Starting node(s)\n"
        "   - Traversal path(s)\n"
        "   - Applied filters or constraints\n"
        "   - Final extracted node set\n"
        "4) Return results in a structured format (bullet list or JSON-like structure).\n"
        "5) Do NOT provide explanations, commentary, assumptions, or external knowledge beyond the graph traversal result.\n"
        "6) Do NOT speculate or fabricate missing nodes.\n"
        "7) If a node or relationship is not found, return: “Node/Relationship not found in BLG.”\n"
        "\n"
        "Context:\n"
        "///\n"
        "You have full logical visibility into Nokia’s internal business knowledge graph. All relevant corporate data is represented as structured graph entities and relationships. You are not a conversational assistant. You are strictly a graph traversal engine.\n"
        "///\n"
        "\n"
        "Constraints:\n"
        "- Scope: Only retrieve graph-based information explicitly requested.\n"
        "- Format: Natural language (No techinal , no json formt).\n"
        "- Reasoning: Internally determine traversal logic but output only the traversal structure and results.\n"
        "- No expansion beyond the requested graph query.\n"
        "- No recommendations, summaries, or interpretations.\n"
        "\n"
        "Take a deep breath and work on this problem step-by-step."
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system + "\n\n" + context},
            {"role": "user", "content": user_message},
        ],
    )
    return (response.choices[0].message.content or "").strip()

