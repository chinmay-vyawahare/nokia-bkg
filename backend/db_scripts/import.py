import json
import os
import re
import sqlite3
import sys


def parse_jsx_file(filepath):
    """Parse a JSX dump file and extract the exported data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'export\s+const\s+(\w+)\s*=\s*(\[[\s\S]*\]);'
    match = re.search(pattern, content)
    
    if not match:
        raise ValueError(f"Could not parse JSX export in {filepath}")
    
    var_name = match.group(1)
    json_data = match.group(2)
    
    try:
        data = json.loads(json_data)
        return var_name, data
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {filepath}: {e}")


def stringify_json_values(row):
    """Convert dict/list values back to JSON strings for storage."""
    result = {}
    for key, value in row.items():
        if isinstance(value, (dict, list)):
            result[key] = json.dumps(value, ensure_ascii=False)
        else:
            result[key] = value
    return result


def get_table_columns(conn, table_name):
    """Get column names for a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]


def import_table_data(conn, table_name, data):
    """Import data into a specific table."""
    if not data:
        print(f"  ⚠ {table_name}: no data to import, skipping")
        return
    
    cursor = conn.cursor()
    
    columns = get_table_columns(conn, table_name)
    
    if not columns:
        print(f"  ❌ {table_name}: table not found in database")
        return
    
    cursor.execute(f"DELETE FROM {table_name}")
    
    imported_count = 0
    for row in data:
        processed_row = stringify_json_values(row)
        
        filtered_row = {k: v for k, v in processed_row.items() if k in columns}
        
        if not filtered_row:
            continue
        cols = ', '.join(filtered_row.keys())
        placeholders = ', '.join(['?' for _ in filtered_row])
        values = list(filtered_row.values())
        
        query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"
        cursor.execute(query, values)
        imported_count += 1
    
    conn.commit()
    print(f"  ✓ {table_name}: imported {imported_count} rows")


def find_jsx_files(data_dir):
    """Find all JSX dump files in the data directory."""
    jsx_files = {}
    
    if not os.path.exists(data_dir):
        return jsx_files
    
    for filename in os.listdir(data_dir):
        if filename.endswith('_dump.jsx'):
            table_name = filename.replace('_dump.jsx', '')
            filepath = os.path.join(data_dir, filename)
            jsx_files[table_name] = filepath
    
    return jsx_files


def main():
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        path = os.path.dirname(os.path.abspath(__file__))
        graph_db_path = os.path.join(path, "..", "graph.db")
        db_path = os.path.abspath(graph_db_path)
    
    if len(sys.argv) > 2:
        data_dir = sys.argv[2]
    else:
        data_dir = os.path.join(path, "data")
    
    if not os.path.exists(db_path):
        print(f"❌ Error: Database not found: {db_path}")
        sys.exit(1)
    
    if not os.path.exists(data_dir):
        print(f"❌ Error: Data directory not found: {data_dir}")
        sys.exit(1)
    
    print(f"📊 Importing to database: {db_path}")
    print(f"📁 From directory: {data_dir}")
    print()
    
    jsx_files = find_jsx_files(data_dir)
    
    if not jsx_files:
        print("⚠ No *_dump.jsx files found in data directory")
        return
    
    print(f"Found {len(jsx_files)} JSX dump file(s):")
    print()
    
    conn = sqlite3.connect(db_path)
    
    try:
        for table_name, filepath in sorted(jsx_files.items()):
            try:
                var_name, data = parse_jsx_file(filepath)
                import_table_data(conn, table_name, data)
            except Exception as e:
                print(f"  ❌ {table_name}: {str(e)}")
        
        print()
        print(f"✅ Successfully imported {len(jsx_files)} table(s) from JSX dumps")
        
    finally:
        conn.close()


if __name__ == "__main__":
    main()