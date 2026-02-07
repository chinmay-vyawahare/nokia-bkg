#!/usr/bin/env python3
"""
Nokia Business Graph Backend
- Creates database schema on startup
- Parses JSX files and uploads data automatically
- Provides FastAPI REST API for all operations
"""

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ==============================================================================
# CONFIGURATION
# ==============================================================================

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_SCRIPT_DIR, "graph.db")

JSON_COLUMNS = {
    "attributes",
    "dataSources",
    "columnLineage",
    "derivedConcepts",
    "groupByOptions",
    "storeTypeValues",
    "usedInDecisions",
}

# Relationship fields stored as JSON
# joinCondition: { source, logic, tables }  (user-defined)
# dataLineage: { fromKey, toKey }  (user-defined)
REL_JSON_COLUMNS = {"joinCondition", "dataLineage", "usedInDecisions"}

# Journey fields stored as JSON
JOURNEY_JSON_COLUMNS = {
    "path",
    "dataFlow",
    "kpisAffected",
    "triggers",
    "usedInDecisions",
    "lifecycleRegimes",
    "questions",
}


# ==============================================================================
# DATABASE HELPERS
# ==============================================================================


@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _get_table_columns():
    """Column names for nodes table"""
    return {
        "id",
        "module",
        "nodeType",
        "definition",
        "businessMeaning",
        "attributes",
        "grain",
        "color",
        "dataSources",
        "columnLineage",
        "derivedConcepts",
        "groupByOptions",
        "storeTypeValues",
        "usedInDecisions",
        "businessRule",
    }


def _serialize_node(row_dict: dict) -> Optional[dict]:
    """Convert DB row to node dict; parse JSON columns"""
    if not row_dict:
        return None
    out = dict(row_dict)
    for col in JSON_COLUMNS:
        if col in out and out[col] is not None:
            try:
                out[col] = json.loads(out[col])
            except (TypeError, json.JSONDecodeError):
                pass
    return out


def _node_to_row(node: dict) -> dict:
    """Convert node dict to DB row; serialize JSON columns"""
    table_cols = _get_table_columns()
    row = {}
    for k, v in node.items():
        if k not in table_cols:
            continue
        if k in JSON_COLUMNS and v is not None:
            row[k] = json.dumps(v) if not isinstance(v, str) else v
        else:
            row[k] = v
    return row


def _serialize_rel(row_dict: dict) -> Optional[dict]:
    """Convert DB row to relationship dict; parse JSON columns"""
    if not row_dict:
        return None
    out = dict(row_dict)
    for col in REL_JSON_COLUMNS:
        if col in out and out[col] is not None:
            try:
                out[col] = json.loads(out[col])
            except (TypeError, json.JSONDecodeError):
                pass
    return out


def _rel_to_row(rel: dict) -> dict:
    """Convert relationship dict to DB row"""
    row = {
        "from_node": rel.get("from"),
        "to_node": rel.get("to"),
        "label": rel.get("label"),
    }
    for k in (
        "type",
        "description",
        "businessMeaning",
        "joinCondition",
        "dataLineage",
        "derivationLogic",
        "usedInDecisions",
    ):
        v = rel.get(k)
        if v is None:
            continue
        row[k] = (
            json.dumps(v) if k in REL_JSON_COLUMNS and not isinstance(v, str) else v
        )
    return row


def _serialize_journey(row_dict: dict) -> Optional[dict]:
    """Convert DB row to journey dict; parse JSON columns"""
    if not row_dict:
        return None
    out = dict(row_dict)
    for col in JOURNEY_JSON_COLUMNS:
        if col in out and out[col] is not None:
            try:
                out[col] = json.loads(out[col])
            except (TypeError, json.JSONDecodeError):
                pass
    return out


def _journey_to_row(journey_key: str, journey: dict) -> dict:
    """Convert journey dict to DB row"""
    row = {"journey_key": journey_key}
    for k in (
        "name",
        "shortName",
        "description",
        "color",
        "category",
        "path",
        "dataFlow",
        "decisionNode",
        "formula",
        "kpisAffected",
        "triggers",
        "targetChannel",
        "usedInDecisions",
        "differenceFromCore",
        "triggerCondition",
        "rule",
        "lifecycleRegimes",
        "questions",
    ):
        v = journey.get(k)
        if v is None:
            continue
        row[k] = (
            json.dumps(v) if k in JOURNEY_JSON_COLUMNS and not isinstance(v, str) else v
        )
    return row


# ==============================================================================
# DATABASE SCHEMA CREATION
# ==============================================================================


def create_tables():
    """Create nodes, relationships, and journeys tables"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Nodes table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                module TEXT,
                nodeType TEXT,
                definition TEXT,
                businessMeaning TEXT,
                attributes TEXT,
                grain TEXT,
                color TEXT,
                dataSources TEXT,
                columnLineage TEXT,
                derivedConcepts TEXT,
                groupByOptions TEXT,
                storeTypeValues TEXT,
                usedInDecisions TEXT,
                businessRule TEXT
            )
        """
        )

        # Relationships table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_node TEXT NOT NULL,
                to_node TEXT NOT NULL,
                label TEXT NOT NULL,
                type TEXT,
                description TEXT,
                businessMeaning TEXT,
                joinCondition TEXT,
                dataLineage TEXT,
                derivationLogic TEXT,
                usedInDecisions TEXT,
                UNIQUE(from_node, to_node, label)
            )
        """
        )

        # Positions table (node_id -> x, y for graph layout)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS positions (
                node_id TEXT PRIMARY KEY,
                x REAL NOT NULL,
                y REAL NOT NULL
            )
        """
        )

        # Journeys table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS journeys (
                journey_key TEXT PRIMARY KEY,
                name TEXT,
                shortName TEXT,
                description TEXT,
                color TEXT,
                category TEXT,
                path TEXT,
                dataFlow TEXT,
                decisionNode TEXT,
                formula TEXT,
                kpisAffected TEXT,
                triggers TEXT,
                targetChannel TEXT,
                usedInDecisions TEXT,
                differenceFromCore TEXT,
                triggerCondition TEXT,
                rule TEXT,
                lifecycleRegimes TEXT,
                questions TEXT
            )
        """
        )

        conn.commit()
    print("✓ Database tables created/verified")


# ==============================================================================
# JSX PARSING UTILITIES
# ==============================================================================


def clean_js_to_json(js_str: str) -> str:
    """Clean JavaScript object/array string to valid JSON"""
    cleaned = js_str

    # Step 1: Remove comments (handle // not inside strings)
    lines = cleaned.split("\n")
    result_lines = []
    for line in lines:
        in_string = False
        string_char = None
        i = 0
        cut_pos = None
        while i < len(line):
            char = line[i]
            if char in "\"'`" and (i == 0 or line[i - 1] != "\\"):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
            elif not in_string and i < len(line) - 1 and line[i : i + 2] == "//":
                cut_pos = i
                break
            i += 1
        if cut_pos is not None:
            result_lines.append(line[:cut_pos].rstrip())
        else:
            result_lines.append(line)
    cleaned = "\n".join(result_lines)

    # Remove multi-line comments
    cleaned = re.sub(r"/\*[\s\S]*?\*/", "", cleaned)

    # Step 2: Handle template literals (backticks)
    cleaned = re.sub(r"`([^`]*)`", r'"\1"', cleaned)

    # Step 3: Quote unquoted string keys (alphanumeric starting with letter)
    cleaned = re.sub(r"([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)", r'\1"\2"\3', cleaned)
    cleaned = re.sub(
        r"(^\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)",
        r'\1"\2"\3',
        cleaned,
        flags=re.MULTILINE,
    )

    # Step 4: Quote unquoted numeric keys (like 1: 'value')
    cleaned = re.sub(r"([{,]\s*)(\d+)(\s*:)", r'\1"\2"\3', cleaned)
    cleaned = re.sub(r"(^\s*)(\d+)(\s*:)", r'\1"\2"\3', cleaned, flags=re.MULTILINE)

    # Step 5: Handle double-quoted strings with single quotes inside
    # First, escape any single quotes inside double-quoted strings (they'll stay as is in JSON)
    # Then convert single-quoted strings to double-quoted

    def replace_single_quote_value(match):
        """Replace single-quoted string value with double-quoted"""
        prefix = match.group(1)  # : or [, etc
        content = match.group(2)  # string content
        suffix = match.group(3)  # , or } or ] etc
        # Escape any double quotes inside
        content = content.replace('"', '\\"')
        return f'{prefix}"{content}"{suffix}'

    # Handle single-quoted values after colon
    cleaned = re.sub(
        r"(:\s*)'((?:[^'\\]|\\.)*)'(\s*[,}\]\n])", replace_single_quote_value, cleaned
    )

    # Handle single-quoted values in arrays
    cleaned = re.sub(
        r"([\[,]\s*)'((?:[^'\\]|\\.)*)'(\s*[,\]\n])",
        replace_single_quote_value,
        cleaned,
    )

    # Handle remaining single-quoted strings (but be careful not to break double-quoted strings)
    # Only replace single quotes that are NOT inside double-quoted strings
    def replace_remaining_single_quotes(text):
        result = []
        i = 0
        while i < len(text):
            if text[i] == '"':
                # Skip entire double-quoted string
                result.append('"')
                i += 1
                while i < len(text) and text[i] != '"':
                    if text[i] == "\\" and i + 1 < len(text):
                        result.append(text[i : i + 2])
                        i += 2
                    else:
                        result.append(text[i])
                        i += 1
                if i < len(text):
                    result.append('"')
                    i += 1
            elif text[i] == "'":
                # This is a single-quoted string - convert to double
                result.append('"')
                i += 1
                while i < len(text) and text[i] != "'":
                    if text[i] == '"':
                        result.append('\\"')
                    elif text[i] == "\\" and i + 1 < len(text):
                        result.append(text[i : i + 2])
                        i += 1
                    else:
                        result.append(text[i])
                    i += 1
                if i < len(text):
                    result.append('"')
                    i += 1
            else:
                result.append(text[i])
                i += 1
        return "".join(result)

    cleaned = replace_remaining_single_quotes(cleaned)

    # Step 6: Remove trailing commas before } or ]
    cleaned = re.sub(r",(\s*[}\]])", r"\1", cleaned)

    # Step 7: Fix empty arrays/objects
    cleaned = re.sub(r"\[\s*\]", "[]", cleaned)
    cleaned = re.sub(r"\{\s*\}", "{}", cleaned)

    # Step 8: Handle JavaScript undefined -> null
    cleaned = re.sub(r":\s*undefined\b", ": null", cleaned)

    # Step 9: Ensure true/false/null are lowercase
    cleaned = re.sub(r"\bTrue\b", "true", cleaned)
    cleaned = re.sub(r"\bFalse\b", "false", cleaned)
    cleaned = re.sub(r"\bNone\b", "null", cleaned)

    return cleaned.strip()


def find_matching_brace(
    content: str, start_idx: int, open_char: str = "{", close_char: str = "}"
) -> int:
    """Find the matching closing brace/bracket"""
    count = 0
    in_string = False
    string_char = None
    i = start_idx

    while i < len(content):
        char = content[i]

        if char in "\"'`" and (i == 0 or content[i - 1] != "\\"):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if char == open_char:
                count += 1
            elif char == close_char:
                count -= 1
                if count == 0:
                    return i + 1
        i += 1

    return len(content)


def extract_object_from_jsx(content: str, var_name: str) -> Optional[str]:
    """Extract an object from JSX content by variable name"""
    pattern = rf"const\s+{var_name}\s*=\s*{{"
    match = re.search(pattern, content)
    if not match:
        return None
    start_idx = match.end() - 1
    end_idx = find_matching_brace(content, start_idx, "{", "}")
    return content[start_idx:end_idx]


def extract_array_from_jsx(content: str, var_name: str) -> Optional[str]:
    """Extract an array from JSX content by variable name"""
    pattern = rf"const\s+{var_name}\s*=\s*\["
    match = re.search(pattern, content)
    if not match:
        return None
    start_idx = match.end() - 1
    end_idx = find_matching_brace(content, start_idx, "[", "]")
    return content[start_idx:end_idx]


def extract_nodes_from_jsx(file_path: str) -> List[dict]:
    """Extract INITIAL_NODES object from JSX file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        obj_str = extract_object_from_jsx(content, "INITIAL_NODES")
        if not obj_str:
            print(f"  ⚠ Could not find INITIAL_NODES object in {file_path}")
            return []

        cleaned = clean_js_to_json(obj_str)
        nodes_dict = json.loads(cleaned)
        return list(nodes_dict.values())
    except json.JSONDecodeError as e:
        print(f"  ✗ Error parsing nodes: {e}")
        return []
    except Exception as e:
        print(f"  ✗ Error reading {file_path}: {e}")
        return []


def extract_relationships_from_jsx(file_path: str) -> List[dict]:
    """Extract INITIAL_RELATIONSHIPS array from JSX file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        array_str = extract_array_from_jsx(content, "INITIAL_RELATIONSHIPS")
        if not array_str:
            print(f"  ⚠ Could not find INITIAL_RELATIONSHIPS array in {file_path}")
            return []

        cleaned = clean_js_to_json(array_str)
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  ✗ Error parsing relationships: {e}")
        return []
    except Exception as e:
        print(f"  ✗ Error reading {file_path}: {e}")
        return []


def extract_journeys_from_jsx(file_path: str) -> dict:
    """Extract SCENARIO_JOURNEYS object from JSX file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        obj_str = extract_object_from_jsx(content, "SCENARIO_JOURNEYS")
        if not obj_str:
            print(f"  ⚠ Could not find SCENARIO_JOURNEYS object in {file_path}")
            return {}

        cleaned = clean_js_to_json(obj_str)
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  ✗ Error parsing journeys: {e}")
        return {}
    except Exception as e:
        print(f"  ✗ Error reading {file_path}: {e}")
        return {}


def extract_positions_from_jsx(file_path: str) -> Dict[str, Dict[str, float]]:
    """Extract INITIAL_POSITIONS object from JSX file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        obj_str = extract_object_from_jsx(content, "INITIAL_POSITIONS")
        if not obj_str:
            print(f"  ⚠ Could not find INITIAL_POSITIONS object in {file_path}")
            return {}

        cleaned = clean_js_to_json(obj_str)
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  ✗ Error parsing positions: {e}")
        return {}
    except Exception as e:
        print(f"  ✗ Error reading {file_path}: {e}")
        return {}


# ==============================================================================
# DATABASE OPERATIONS
# ==============================================================================


def get_node(node_id: str) -> Optional[dict]:
    """Get a single node by id"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        return _serialize_node(dict(row)) if row else None


def get_all_nodes() -> List[dict]:
    """Get all nodes"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM nodes ORDER BY module, id")
        rows = cursor.fetchall()
        return [_serialize_node(dict(r)) for r in rows]


def insert_node(node: dict) -> Optional[dict]:
    """Insert a node"""
    row = _node_to_row(node)
    cols = [k for k in row if k in _get_table_columns()]
    placeholders = ", ".join(["?" for _ in cols])
    names = ", ".join(cols)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"INSERT INTO nodes ({names}) VALUES ({placeholders})",
            [row.get(c) for c in cols],
        )
        conn.commit()
    return get_node(node["id"])


def update_node(node_id: str, **kwargs) -> Optional[dict]:
    """Update any fields of a node by id"""
    if not kwargs:
        return get_node(node_id)

    table_cols = _get_table_columns()
    row = _node_to_row(dict(kwargs))
    updates = {k: row[k] for k in row if k in table_cols and k != "id"}

    if not updates:
        return get_node(node_id)

    set_clause = ", ".join([f'"{k}" = ?' for k in updates])
    values = list(updates.values()) + [node_id]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE nodes SET {set_clause} WHERE id = ?", values)
        conn.commit()
    return get_node(node_id)


def upsert_node(node: dict) -> Optional[dict]:
    """Insert or update a node"""
    existing = get_node(node["id"])
    if existing:
        updates = {k: v for k, v in node.items() if k != "id"}
        return update_node(node["id"], **updates)
    return insert_node(node)


def delete_node(node_id: str) -> bool:
    """Delete a node by id (and its positions and associated relationships)"""
    with get_db() as conn:
        cursor = conn.cursor()
        # Delete from positions
        cursor.execute("DELETE FROM positions WHERE node_id = ?", (node_id,))
        # Delete relationships connected to this node
        cursor.execute(
            "DELETE FROM relationships WHERE from_node = ? OR to_node = ?",
            (node_id, node_id),
        )
        # Delete the node itself
        cursor.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
        conn.commit()
        return cursor.rowcount > 0


# ==============================================================================
# POSITIONS
# ==============================================================================


def get_positions() -> Dict[str, Dict[str, float]]:
    """Get all node positions as { node_id: { x, y } }"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT node_id, x, y FROM positions")
        rows = cursor.fetchall()
        return {r["node_id"]: {"x": float(r["x"]), "y": float(r["y"])} for r in rows}


def upsert_position(node_id: str, x: float, y: float) -> None:
    """Insert or update a node's position"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO positions (node_id, x, y) VALUES (?, ?, ?) ON CONFLICT(node_id) DO UPDATE SET x=excluded.x, y=excluded.y",
            (node_id, x, y),
        )
        conn.commit()


def insert_positions(positions: Dict[str, Dict[str, float]]) -> int:
    """Bulk insert/update positions. positions: { node_id: { x, y } }"""
    for node_id, pos in positions.items():
        x = pos.get("x", 0)
        y = pos.get("y", 0)
        upsert_position(node_id, float(x), float(y))
    return len(positions)


def get_relationships() -> List[dict]:
    """Get all relationships"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM relationships ORDER BY from_node, to_node, label")
        rows = cursor.fetchall()
        return [_serialize_rel(dict(r)) for r in rows]


def insert_relationship(rel: dict) -> int:
    """Insert one relationship"""
    row = _rel_to_row(rel)
    cols = [k for k in row if row[k] is not None]
    placeholders = ", ".join(["?" for _ in cols])
    names = ", ".join(cols)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"INSERT OR REPLACE INTO relationships ({names}) VALUES ({placeholders})",
            [row[c] for c in cols],
        )
        conn.commit()
        return cursor.lastrowid


def get_relationship_by_id(rel_id: int) -> Optional[dict]:
    """Get a single relationship by id"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM relationships WHERE id = ?", (rel_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return _serialize_rel(dict(row))


def update_relationship(rel_id: int, updates: dict) -> bool:
    """Update an existing relationship by id. Returns True if updated."""
    allowed = {
        "from_node",
        "to_node",
        "label",
        "type",
        "description",
        "businessMeaning",
        "joinCondition",
        "dataLineage",
        "derivationLogic",
        "usedInDecisions",
    }
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM relationships WHERE id = ?", (rel_id,))
        if not cursor.fetchone():
            return False
        # Map from/to to from_node/to_node
        row = dict(updates)
        if "from" in row and "from_node" not in row:
            row["from_node"] = row.pop("from")
        if "to" in row and "to_node" not in row:
            row["to_node"] = row.pop("to")
        cols = []
        vals = []
        for k, v in row.items():
            if k in allowed and v is not None:
                cols.append(k)
                if k in REL_JSON_COLUMNS and isinstance(v, (dict, list)):
                    vals.append(json.dumps(v))
                else:
                    vals.append(v)
        if not cols:
            return True
        vals.append(rel_id)
        set_clause = ", ".join(f"{c} = ?" for c in cols)
        cursor.execute(f"UPDATE relationships SET {set_clause} WHERE id = ?", vals)
        conn.commit()
        return True


def delete_relationship(rel_id: int) -> bool:
    """Delete a relationship by id. Returns True if deleted."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM relationships WHERE id = ?", (rel_id,))
        conn.commit()
        return cursor.rowcount > 0


def insert_relationships(relationships: List[dict]) -> int:
    """Insert relationships (single array)"""
    count = 0
    for r in relationships:
        insert_relationship(r)
        count += 1
    return count


def get_journeys() -> List[dict]:
    """Get all journeys"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM journeys ORDER BY journey_key")
        rows = cursor.fetchall()
        return [_serialize_journey(dict(r)) for r in rows]


def get_journeys_dict() -> Dict[str, dict]:
    """Return journeys as a dictionary keyed by journey_key"""
    journeys = get_journeys()
    return {j.pop("journey_key"): j for j in journeys}


def insert_journey(journey_key: str, journey: dict):
    """Insert or replace one journey"""
    row = _journey_to_row(journey_key, journey)
    cols = [k for k in row if row[k] is not None]
    placeholders = ", ".join(["?" for _ in cols])
    names = ", ".join(cols)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"INSERT OR REPLACE INTO journeys ({names}) VALUES ({placeholders})",
            [row[c] for c in cols],
        )
        conn.commit()


def insert_journeys(journeys: dict) -> int:
    """Insert journeys (single object)"""
    count = 0
    if not isinstance(journeys, dict):
        return count
    for key, obj in journeys.items():
        if obj and isinstance(obj, dict):
            insert_journey(key, obj)
            count += 1
    return count


# ==============================================================================
# DATA INITIALIZATION
# ==============================================================================


def init_from_jsx_files():
    """
    Initialize database by parsing JSX files from components/data/ directory.
    Looks for:
    - nodes.jsx (INITIAL_NODES)
    - relationships.jsx (INITIAL_RELATIONSHIPS)
    - flow_journey.jsx (SCENARIO_JOURNEYS)
    - positions.jsx (INITIAL_POSITIONS)
    """
    print("\n📂 Loading data from JSX files...")

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Data files are in ../components/data/ relative to backend/
    data_dir = os.path.join(BASE_DIR, "..", "components", "data")

    nodes_path = os.path.join(data_dir, "nodes.jsx")
    relationships_path = os.path.join(data_dir, "relationships.jsx")
    journey_path = os.path.join(data_dir, "flow_journey.jsx")
    positions_path = os.path.join(data_dir, "positions.jsx")

    nodes_count = 0
    rels_count = 0
    journeys_count = 0
    positions_count = 0

    # Extract and insert nodes
    if os.path.isfile(nodes_path):
        print(f"  → Parsing nodes from {nodes_path}")
        nodes = extract_nodes_from_jsx(nodes_path)
        for node in nodes:
            if isinstance(node, dict) and node.get("id"):
                upsert_node(node)
                nodes_count += 1
        print(f"  ✓ Loaded {nodes_count} nodes")
    else:
        print(f"  ⚠ Nodes file not found: {nodes_path}")

    # Extract and insert relationships (single array)
    if os.path.isfile(relationships_path):
        print(f"  → Parsing relationships from {relationships_path}")
        relationships = extract_relationships_from_jsx(relationships_path)
        rels_count = insert_relationships(relationships)
        print(f"  ✓ Loaded {rels_count} relationships")
    else:
        print(f"  ⚠ Relationships file not found: {relationships_path}")

    # Extract and insert journeys (single object)
    if os.path.isfile(journey_path):
        print(f"  → Parsing journeys from {journey_path}")
        journeys = extract_journeys_from_jsx(journey_path)
        journeys_count = insert_journeys(journeys)
        print(f"  ✓ Loaded {journeys_count} journeys")
    else:
        print(f"  ⚠ Journeys file not found: {journey_path}")

    # Load positions from JSX file
    if os.path.isfile(positions_path):
        print(f"  → Loading positions from {positions_path}")
        positions = extract_positions_from_jsx(positions_path)
        positions_count = insert_positions(positions)
        print(f"  ✓ Loaded {positions_count} positions")
    else:
        print(f"  ⚠ Positions file not found: {positions_path}")

    print(
        f"\n✅ Database initialized with {nodes_count} nodes, {rels_count} relationships, {journeys_count} journeys, {positions_count} positions\n"
    )
    return {
        "nodes": nodes_count,
        "relationships": rels_count,
        "journeys": journeys_count,
        "positions": positions_count,
    }


def init_from_json_files(data_dir: str = None):
    """Initialize database from JSON files if they exist. data_dir: path to data folder (default: backend/data)."""
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    print("\n📂 Loading data from JSON files...")

    nodes_path = os.path.join(data_dir, "nodes.json")
    rel_path = os.path.join(data_dir, "relationships.json")
    journeys_path = os.path.join(data_dir, "journeys.json")
    positions_path = os.path.join(data_dir, "positions.json")

    nodes_count = 0
    rels_count = 0
    journeys_count = 0
    positions_count = 0

    if os.path.isfile(nodes_path):
        with open(nodes_path, "r", encoding="utf-8") as f:
            nodes_list = json.load(f)
        if isinstance(nodes_list, list):
            for node in nodes_list:
                if isinstance(node, dict) and node.get("id"):
                    upsert_node(node)
                    nodes_count += 1
        print(f"  ✓ Loaded {nodes_count} nodes from JSON")

    if os.path.isfile(rel_path):
        with open(rel_path, "r", encoding="utf-8") as f:
            relationships = json.load(f)
        if isinstance(relationships, list):
            rels_count = insert_relationships(relationships)
        elif isinstance(relationships, dict):
            # Support old format with channels - flatten all channels
            all_rels = []
            for channel_rels in relationships.values():
                if isinstance(channel_rels, list):
                    all_rels.extend(channel_rels)
            rels_count = insert_relationships(all_rels)
        print(f"  ✓ Loaded {rels_count} relationships from JSON")

    if os.path.isfile(journeys_path):
        with open(journeys_path, "r", encoding="utf-8") as f:
            journeys = json.load(f)
        if isinstance(journeys, dict):
            # Support old format with channels - flatten all channels
            all_journeys = {}
            for channel_journeys in journeys.values():
                if isinstance(channel_journeys, dict):
                    all_journeys.update(channel_journeys)
            journeys_count = insert_journeys(all_journeys)
        print(f"  ✓ Loaded {journeys_count} journeys from JSON")

    if os.path.isfile(positions_path):
        with open(positions_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        nodes_pos = (
            data.get("nodes", data)
            if isinstance(data, dict) and "nodes" in data
            else (data if isinstance(data, dict) else {})
        )
        positions_count = insert_positions(nodes_pos)
        print(f"  ✓ Loaded {positions_count} positions from JSON")

    return {
        "nodes": nodes_count,
        "relationships": rels_count,
        "journeys": journeys_count,
        "positions": positions_count,
    }


# ==============================================================================
# FASTAPI APPLICATION
# ==============================================================================

app = FastAPI(
    title="Nokia Business Graph API",
    description="API for managing business knowledge graph nodes, relationships, and journeys",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class PositionUpdate(BaseModel):
    x: float
    y: float


class NodeBase(BaseModel):
    id: str
    position: Optional[Dict[str, float]] = None  # { x, y } for create
    module: Optional[str] = None
    nodeType: Optional[str] = None
    definition: Optional[str] = None
    businessMeaning: Optional[str] = None
    attributes: Optional[Any] = None
    grain: Optional[str] = None
    color: Optional[str] = None
    dataSources: Optional[Any] = None
    columnLineage: Optional[Any] = None
    derivedConcepts: Optional[Any] = None
    groupByOptions: Optional[Any] = None
    storeTypeValues: Optional[Any] = None
    usedInDecisions: Optional[Any] = None
    businessRule: Optional[str] = None


class NodeUpdate(BaseModel):
    module: Optional[str] = None
    nodeType: Optional[str] = None
    definition: Optional[str] = None
    businessMeaning: Optional[str] = None
    attributes: Optional[Any] = None
    grain: Optional[str] = None
    color: Optional[str] = None
    dataSources: Optional[Any] = None
    columnLineage: Optional[Any] = None
    derivedConcepts: Optional[Any] = None
    groupByOptions: Optional[Any] = None
    storeTypeValues: Optional[Any] = None
    usedInDecisions: Optional[Any] = None
    businessRule: Optional[str] = None


class RelationshipBase(BaseModel):
    from_node: str = None
    to_node: str = None
    label: str
    type: Optional[str] = None
    description: Optional[str] = None
    businessMeaning: Optional[str] = None
    joinCondition: Optional[Any] = None
    dataLineage: Optional[Any] = None
    derivationLogic: Optional[str] = None
    usedInDecisions: Optional[Any] = None

    class Config:
        # Support 'from' and 'to' as field names
        populate_by_name = True


class RelationshipUpdate(BaseModel):
    """Partial update for relationship - all fields optional"""

    from_node: Optional[str] = None
    to_node: Optional[str] = None
    label: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    businessMeaning: Optional[str] = None
    joinCondition: Optional[Any] = None
    dataLineage: Optional[Any] = None
    derivationLogic: Optional[str] = None
    usedInDecisions: Optional[Any] = None

    class Config:
        populate_by_name = True


class JourneyBase(BaseModel):
    journey_key: str
    name: Optional[str] = None
    shortName: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    path: Optional[Any] = None
    dataFlow: Optional[Any] = None
    decisionNode: Optional[str] = None
    formula: Optional[str] = None
    kpisAffected: Optional[Any] = None
    triggers: Optional[Any] = None
    targetChannel: Optional[str] = None
    usedInDecisions: Optional[Any] = None
    differenceFromCore: Optional[str] = None
    triggerCondition: Optional[str] = None
    rule: Optional[str] = None
    lifecycleRegimes: Optional[Any] = None
    questions: Optional[Any] = None


# ==============================================================================
# API ENDPOINTS
# ==============================================================================


@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Nokia Business Graph API is running"}


@app.get("/api/db/download")
def api_download_db():
    """Download the full SQLite database file"""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(
        DB_PATH,
        media_type="application/x-sqlite3",
        filename="Nokia_graph.db",
    )


@app.get("/api/stats")
def get_stats():
    """Get database statistics"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM nodes")
        nodes_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM relationships")
        rels_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM journeys")
        journeys_count = cursor.fetchone()[0]

    return {
        "nodes": nodes_count,
        "relationships": rels_count,
        "journeys": journeys_count,
    }


# ----- Nodes Endpoints -----


@app.get("/api/nodes")
def api_get_all_nodes(module: Optional[str] = None, nodeType: Optional[str] = None):
    """Get all nodes with optional filtering"""
    nodes = get_all_nodes()
    if module:
        nodes = [n for n in nodes if n.get("module") == module]
    if nodeType:
        nodes = [n for n in nodes if n.get("nodeType") == nodeType]
    return {"nodes": nodes, "count": len(nodes)}


@app.get("/api/nodes/{node_id}")
def api_get_node(node_id: str):
    """Get a single node by ID"""
    node = get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return node


@app.post("/api/nodes")
def api_create_node(node: NodeBase):
    """Create a new node. Optionally include position: { x, y } in request body."""
    node_dict = node.model_dump(exclude_none=True)
    pos = node_dict.pop("position", None)
    existing = get_node(node.id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Node '{node.id}' already exists")
    result = insert_node(node_dict)
    if pos and isinstance(pos, dict) and "x" in pos and "y" in pos:
        upsert_position(node.id, float(pos["x"]), float(pos["y"]))
    return result


@app.put("/api/nodes/{node_id}")
def api_update_node(node_id: str, node: NodeUpdate):
    """Update an existing node"""
    existing = get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    updates = {k: v for k, v in node.model_dump().items() if v is not None}
    result = update_node(node_id, **updates)
    return result


@app.delete("/api/nodes/{node_id}")
def api_delete_node(node_id: str):
    """Delete a node"""
    if not delete_node(node_id):
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return {"message": f"Node '{node_id}' deleted"}


# ----- Positions Endpoints -----


@app.get("/api/positions")
def api_get_positions():
    """Get all node positions { node_id: { x, y } }"""
    return get_positions()


@app.put("/api/positions/{node_id}")
def api_update_position(node_id: str, pos: PositionUpdate):
    """Update a node's position"""
    upsert_position(node_id, pos.x, pos.y)
    return {"node_id": node_id, "x": pos.x, "y": pos.y}


# ----- Relationships Endpoints -----


@app.get("/api/relationships")
def api_get_relationships():
    """Get all relationships"""
    rels = get_relationships()
    return {"relationships": rels, "count": len(rels)}


@app.post("/api/relationships")
def api_create_relationship(rel: RelationshipBase):
    """Create a new relationship"""
    rel_dict = rel.model_dump(exclude_none=True)
    # Map from_node/to_node to from/to for internal use
    if "from_node" in rel_dict:
        rel_dict["from"] = rel_dict.pop("from_node")
    if "to_node" in rel_dict:
        rel_dict["to"] = rel_dict.pop("to_node")
    rid = insert_relationship(rel_dict)
    return {"id": rid, "message": "Relationship created"}


@app.get("/api/relationships/{rel_id}")
def api_get_relationship(rel_id: int):
    """Get a single relationship by id"""
    rel = get_relationship_by_id(rel_id)
    if not rel:
        raise HTTPException(
            status_code=404, detail=f"Relationship id {rel_id} not found"
        )
    return rel


@app.put("/api/relationships/{rel_id}")
def api_update_relationship(rel_id: int, rel: RelationshipUpdate):
    """Update an existing relationship"""
    existing = get_relationship_by_id(rel_id)
    if not existing:
        raise HTTPException(
            status_code=404, detail=f"Relationship id {rel_id} not found"
        )
    updates = rel.model_dump(exclude_none=True)
    # Map from_node/to_node
    if "from_node" in updates:
        updates["from"] = updates.pop("from_node")
    if "to_node" in updates:
        updates["to"] = updates.pop("to_node")
    if not update_relationship(rel_id, updates):
        raise HTTPException(
            status_code=404, detail=f"Relationship id {rel_id} not found"
        )
    return {"id": rel_id, "message": "Relationship updated"}


@app.delete("/api/relationships/{rel_id}")
def api_delete_relationship(rel_id: int):
    """Delete an existing relationship"""
    if not delete_relationship(rel_id):
        raise HTTPException(
            status_code=404, detail=f"Relationship id {rel_id} not found"
        )
    return {"message": f"Relationship id {rel_id} deleted"}


# ----- Journeys Endpoints -----


@app.get("/api/journeys")
def api_get_journeys():
    """Get all journeys"""
    journeys = get_journeys()
    return {"journeys": journeys, "count": len(journeys)}


@app.get("/api/journeys/dict")
def api_get_journeys_dict():
    """Get journeys as a dictionary keyed by journey_key"""
    return get_journeys_dict()


@app.post("/api/journeys")
def api_create_journey(journey: JourneyBase):
    """Create a new journey"""
    journey_dict = journey.model_dump(exclude_none=True)
    journey_key = journey_dict.pop("journey_key")
    insert_journey(journey_key, journey_dict)
    return {
        "journey_key": journey_key,
        "message": "Journey created",
    }


# ----- Bulk Operations -----


@app.post("/api/bulk/nodes")
def api_bulk_upsert_nodes(nodes: List[NodeBase]):
    """Bulk upsert nodes"""
    count = 0
    for node in nodes:
        upsert_node(node.model_dump(exclude_none=True))
        count += 1
    return {"message": f"Upserted {count} nodes"}


@app.post("/api/bulk/relationships")
def api_bulk_insert_relationships(data: List[dict]):
    """Bulk insert relationships"""
    count = insert_relationships(data)
    return {"message": f"Inserted {count} relationships"}


@app.post("/api/bulk/journeys")
def api_bulk_insert_journeys(data: dict):
    """Bulk insert journeys"""
    count = insert_journeys(data)
    return {"message": f"Inserted {count} journeys"}


# ----- Admin Endpoints -----


@app.post("/api/admin/reload")
def api_reload_from_jsx():
    """Reload data from JSX files"""
    result = init_from_jsx_files()
    return {"message": "Data reloaded from JSX files", **result}


@app.post("/api/admin/clear")
def api_clear_database():
    """Clear all data from database"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM positions")
        cursor.execute("DELETE FROM nodes")
        cursor.execute("DELETE FROM relationships")
        cursor.execute("DELETE FROM journeys")
        conn.commit()
    return {"message": "Database cleared"}


# ==============================================================================
# STARTUP
# ==============================================================================


@app.on_event("startup")
def startup_event():
    """Initialize database and load data on startup"""
    print("\n" + "=" * 60)
    print("🚀 Starting Nokia Business Graph API")
    print("=" * 60)

    # Create tables
    create_tables()

    # Check if database is empty
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM nodes")
        nodes_count = cursor.fetchone()[0]

    if nodes_count == 0:
        # Try to load from JSX files first, then JSON
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(BASE_DIR, "..", "components", "data")
        nodes_path = os.path.join(data_dir, "nodes.jsx")
        json_data_dir = os.path.join(BASE_DIR, "data")

        if os.path.exists(nodes_path):
            init_from_jsx_files()
        elif os.path.exists(os.path.join(json_data_dir, "nodes.json")):
            init_from_json_files(json_data_dir)
        else:
            print("\n⚠ No data files found. Database is empty.")
            print(
                "  Place JSX files in components/data/ directory or JSON files in backend/data/ directory"
            )
    else:
        print(f"\n✓ Database already contains {nodes_count} nodes")

    print("\n" + "=" * 60)
    print("✅ API ready at http://localhost:8000")
    print("📚 API docs at http://localhost:8000/docs")
    print("=" * 60 + "\n")


# ==============================================================================
# MAIN
# ==============================================================================

if __name__ == "__main__":
    import uvicorn

    # Initialize database and load data
    print("\n" + "=" * 60)
    print("🚀 Nokia Business Graph Backend")
    print("=" * 60)

    create_tables()

    # Check if database is empty
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM nodes")
        nodes_count = cursor.fetchone()[0]

    if nodes_count == 0:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(BASE_DIR, "..", "components", "data")
        nodes_path = os.path.join(data_dir, "nodes.jsx")
        json_data_dir = os.path.join(BASE_DIR, "data")

        if os.path.exists(nodes_path):
            init_from_jsx_files()
        elif os.path.exists(os.path.join(json_data_dir, "nodes.json")):
            init_from_json_files(json_data_dir)
        else:
            print("\n⚠ No data files found. Starting with empty database.")
    else:
        print(f"\n✓ Database already contains {nodes_count} nodes (skipping data load)")

    # Run server
    print("\n" + "=" * 60)
    print("🌐 Starting FastAPI server...")
    print("=" * 60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
