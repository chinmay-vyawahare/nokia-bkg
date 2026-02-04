import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================
// CONFIGURATION - Customize these for your schema
// ============================================

const DEFAULT_CENTER = { x: 800, y: 500 };

// Default modules/categories for nodes - customize as needed
const DEFAULT_MODULES = {
  all: {
    name: 'All Modules',
    color: '#6b7280',
    description: 'Display all nodes'
  },
  core: {
    name: 'Core Entities',
    color: '#dc2626',
    description: 'Primary business entities'
  },
  reference: {
    name: 'Reference Data',
    color: '#16a34a',
    description: 'Lookup and reference tables'
  },
  transaction: {
    name: 'Transactions',
    color: '#7c3aed',
    description: 'Transactional data'
  },
  analytics: {
    name: 'Analytics',
    color: '#d97706',
    description: 'Derived/analytical entities'
  },
};

// Relationship type colors
const RELATIONSHIP_COLORS = {
  'many-to-1': '#2563eb',
  '1-to-many': '#16a34a',
  'many-to-many': '#d97706',
  '1-to-1': '#7c3aed',
  'default': '#6b7280'
};

// Styling constants
const inputBase = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow";
const inputDisabled = "bg-gray-100 text-gray-500 cursor-not-allowed";
const labelBase = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

// ============================================
// HELPER FUNCTIONS
// ============================================

const getRelationshipColor = (type) => RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.default;

// ============================================
// MODAL COMPONENTS
// ============================================

function NodeModal({ mode, nodeId, node, modules, positions = {}, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({
    id: node?.id || '',
    module: node?.module || 'core',
    nodeType: node?.nodeType || 'core',
    definition: node?.definition || '',
    businessMeaning: node?.businessMeaning || '',
    color: node?.color || '#dc2626',
    attributes: node?.attributes || [],
    dataSources: node?.dataSources || [],
    columnLineage: node?.columnLineage || [],
  });
  const [positionMode, setPositionMode] = useState('default');
  const [copyFromNode, setCopyFromNode] = useState('');
  const [customPos, setCustomPos] = useState({ x: DEFAULT_CENTER.x, y: DEFAULT_CENTER.y });

  useEffect(() => {
    if (node) {
      setForm({
        id: node.id,
        module: node.module || 'core',
        nodeType: node.nodeType || 'core',
        definition: node.definition || '',
        businessMeaning: node.businessMeaning || '',
        color: node.color || '#dc2626',
        attributes: Array.isArray(node.attributes) ? node.attributes : [],
        dataSources: Array.isArray(node.dataSources) ? node.dataSources : [],
        columnLineage: Array.isArray(node.columnLineage) ? node.columnLineage : [],
      });
    }
  }, [node]);

  const addAttribute = () => setForm(f => ({ ...f, attributes: [...f.attributes, ''] }));
  const updateAttribute = (idx, val) => setForm(f => ({
    ...f,
    attributes: f.attributes.map((a, i) => i === idx ? val : a)
  }));
  const removeAttribute = (idx) => setForm(f => ({
    ...f,
    attributes: f.attributes.filter((_, i) => i !== idx)
  }));

  const addDataSource = () => setForm(f => ({
    ...f,
    dataSources: [...f.dataSources, { source: '', table: '', description: '' }]
  }));
  const updateDataSource = (idx, field, val) => setForm(f => ({
    ...f,
    dataSources: f.dataSources.map((ds, i) => i === idx ? { ...ds, [field]: val } : ds)
  }));
  const removeDataSource = (idx) => setForm(f => ({
    ...f,
    dataSources: f.dataSources.filter((_, i) => i !== idx)
  }));

  const addColumnLineage = () => setForm(f => ({
    ...f,
    columnLineage: [...f.columnLineage, { attribute: '', meaning: '', derivedFrom: '' }]
  }));
  const updateColumnLineage = (idx, field, val) => setForm(f => ({
    ...f,
    columnLineage: f.columnLineage.map((cl, i) => i === idx ? { ...cl, [field]: val } : cl)
  }));
  const removeColumnLineage = (idx) => setForm(f => ({
    ...f,
    columnLineage: f.columnLineage.filter((_, i) => i !== idx)
  }));

  const getSelectedPosition = () => {
    if (positionMode === 'copy' && copyFromNode && positions[copyFromNode]) return positions[copyFromNode];
    if (positionMode === 'custom') return customPos;
    return DEFAULT_CENTER;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">●</span>
              {mode === 'create' ? 'Add Node' : 'Edit Node'}
            </h3>
            <button onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors">✕</button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠</span>
              <p className="text-red-700 text-sm flex-1">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className={labelBase}>Node ID / Table Name</label>
              <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} disabled={mode === 'edit'}
                className={`${inputBase} ${mode === 'edit' ? inputDisabled : ''}`} placeholder="e.g. Users, Orders, Products" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Module</label>
                <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} className={inputBase}>
                  {Object.entries(modules).filter(([k]) => k !== 'all').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelBase}>Type</label>
                <select value={form.nodeType} onChange={e => setForm(f => ({ ...f, nodeType: e.target.value }))} className={inputBase}>
                  <option value="core">Core Entity (Circle)</option>
                  <option value="kpi">KPI / Derived (Diamond)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelBase}>Definition</label>
              <textarea value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))} rows={2}
                className={`${inputBase} resize-none`} placeholder="Brief description of the table/entity" />
            </div>
            <div>
              <label className={labelBase}>Business Meaning</label>
              <textarea value={form.businessMeaning} onChange={e => setForm(f => ({ ...f, businessMeaning: e.target.value }))} rows={2}
                className={`${inputBase} resize-none`} placeholder="Business context and usage" />
            </div>
            <div>
              <label className={labelBase}>Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-14 h-10 border-2 border-gray-200 rounded-lg cursor-pointer overflow-hidden" />
                <span className="text-sm font-mono text-gray-500">{form.color}</span>
              </div>
            </div>

            {/* Attributes */}
            <div className="border-t border-gray-200 pt-4">
              <label className={labelBase}>Attributes / Columns</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {form.attributes.map((attr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input value={attr} onChange={e => updateAttribute(idx, e.target.value)}
                      placeholder="Column name" className={`${inputBase} flex-1`} />
                    <button type="button" onClick={() => removeAttribute(idx)} className="px-3 text-red-600 hover:bg-red-50 rounded">×</button>
                  </div>
                ))}
                <button type="button" onClick={addAttribute} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
                  + Add Attribute
                </button>
              </div>
            </div>

            {/* Data Sources */}
            <div className="border-t border-gray-200 pt-4">
              <label className={labelBase}>Data Sources</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {form.dataSources.map((ds, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200 space-y-1.5">
                    <input value={ds.source} onChange={e => updateDataSource(idx, 'source', e.target.value)}
                      placeholder="Source (e.g. PostgreSQL, MySQL)" className={`${inputBase} text-xs py-1.5`} />
                    <input value={ds.table} onChange={e => updateDataSource(idx, 'table', e.target.value)}
                      placeholder="Table name" className={`${inputBase} text-xs py-1.5`} />
                    <input value={ds.description} onChange={e => updateDataSource(idx, 'description', e.target.value)}
                      placeholder="Description" className={`${inputBase} text-xs py-1.5`} />
                    <button type="button" onClick={() => removeDataSource(idx)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addDataSource} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
                  + Add Data Source
                </button>
              </div>
            </div>

            {/* Column Lineage */}
            <div className="border-t border-gray-200 pt-4">
              <label className={labelBase}>Column Lineage</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {form.columnLineage.map((cl, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200 space-y-1.5">
                    <input value={cl.attribute} onChange={e => updateColumnLineage(idx, 'attribute', e.target.value)}
                      placeholder="Attribute name" className={`${inputBase} text-xs py-1.5`} />
                    <input value={cl.meaning} onChange={e => updateColumnLineage(idx, 'meaning', e.target.value)}
                      placeholder="Meaning / Description" className={`${inputBase} text-xs py-1.5`} />
                    <input value={cl.derivedFrom} onChange={e => updateColumnLineage(idx, 'derivedFrom', e.target.value)}
                      placeholder="Derived from (source.column)" className={`${inputBase} text-xs py-1.5`} />
                    <button type="button" onClick={() => removeColumnLineage(idx)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addColumnLineage} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
                  + Add Column Lineage
                </button>
              </div>
            </div>

            {mode === 'create' && (
              <div className="border-t border-gray-200 pt-4">
                <label className={labelBase}>Position on Graph</label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="posMode" checked={positionMode === 'default'} onChange={() => setPositionMode('default')} className="rounded" />
                      <span className="text-sm">Default center</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="posMode" checked={positionMode === 'copy'} onChange={() => setPositionMode('copy')} className="rounded" />
                      <span className="text-sm">Copy from node</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="posMode" checked={positionMode === 'custom'} onChange={() => setPositionMode('custom')} className="rounded" />
                      <span className="text-sm">Custom x, y</span>
                    </label>
                  </div>
                  {positionMode === 'copy' && (
                    <select value={copyFromNode} onChange={e => setCopyFromNode(e.target.value)} className={inputBase}>
                      <option value="">Select a node...</option>
                      {Object.entries(positions).map(([id, pos]) => (
                        <option key={id} value={id}>{id} ({pos.x}, {pos.y})</option>
                      ))}
                    </select>
                  )}
                  {positionMode === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">X</label>
                        <input type="number" value={customPos.x} onChange={e => setCustomPos(p => ({ ...p, x: +e.target.value || 0 }))} className={inputBase} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Y</label>
                        <input type="number" value={customPos.y} onChange={e => setCustomPos(p => ({ ...p, y: +e.target.value || 0 }))} className={inputBase} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(form, mode === 'create' ? getSelectedPosition() : null)} disabled={saving || !form.id}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all">
            {saving ? 'Saving...' : 'Save Node'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ itemName, itemType = 'Node', onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl">⚠</span>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Delete {itemType}</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete <span className="font-semibold text-gray-900">&quot;{itemName}&quot;</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RelationshipModal({ nodeIds, mode = 'create', initialRel, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({
    from: '',
    to: '',
    label: '',
    type: '',
    description: '',
    businessMeaning: '',
    joinCondition: { source: '', logic: '', tables: '' },
    dataLineage: { fromKey: '', toKey: '' },
  });

  useEffect(() => {
    if (mode === 'edit' && initialRel) {
      const jc = initialRel.joinCondition || {};
      const dl = initialRel.dataLineage || {};
      setForm({
        from: initialRel.from || '',
        to: initialRel.to || '',
        label: initialRel.label || '',
        type: initialRel.type || '',
        description: initialRel.description || '',
        businessMeaning: initialRel.businessMeaning || '',
        joinCondition: {
          source: jc.source ?? '',
          logic: jc.logic ?? '',
          tables: Array.isArray(jc.tables) ? jc.tables.join(', ') : (jc.tables ?? ''),
        },
        dataLineage: { fromKey: dl.fromKey ?? '', toKey: dl.toKey ?? '' },
      });
    } else if (mode === 'create') {
      setForm({
        from: '',
        to: '',
        label: '',
        type: '',
        description: '',
        businessMeaning: '',
        joinCondition: { source: '', logic: '', tables: '' },
        dataLineage: { fromKey: '', toKey: '' },
      });
    }
  }, [mode, initialRel]);

  const updateJoin = (field, val) => setForm(f => ({ ...f, joinCondition: { ...(f.joinCondition || {}), [field]: val } }));
  const updateDataLineage = (field, val) => setForm(f => ({ ...f, dataLineage: { ...(f.dataLineage || {}), [field]: val } }));

  const buildPayload = () => {
    const payload = { from: form.from, to: form.to, label: form.label };
    if (form.type) payload.type = form.type;
    if (form.description) payload.description = form.description;
    if (form.businessMeaning) payload.businessMeaning = form.businessMeaning;
    const jc = form.joinCondition;
    if (jc && (jc.source || jc.logic || jc.tables)) {
      payload.joinCondition = {
        ...(jc.source && { source: jc.source }),
        ...(jc.logic && { logic: jc.logic }),
        ...(jc.tables && { tables: typeof jc.tables === 'string' ? jc.tables.split(',').map(s => s.trim()).filter(Boolean) : jc.tables }),
      };
    }
    const dl = form.dataLineage;
    if (dl && (dl.fromKey || dl.toKey)) {
      payload.dataLineage = { ...(dl.fromKey && { fromKey: dl.fromKey }), ...(dl.toKey && { toKey: dl.toKey }) };
    }
    return payload;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">↔</span>
              {mode === 'edit' ? 'Edit Relationship' : 'Add Relationship'}
            </h3>
            <button onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors">✕</button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠</span>
              <p className="text-red-700 text-sm flex-1">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>From Node</label>
                <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} className={inputBase}>
                  <option value="">Select source...</option>
                  {nodeIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
              <div>
                <label className={labelBase}>To Node</label>
                <select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} className={inputBase}>
                  <option value="">Select target...</option>
                  {nodeIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelBase}>Relationship Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. HAS_MANY, BELONGS_TO, REFERENCES" className={inputBase} />
            </div>
            <div>
              <label className={labelBase}>Cardinality Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputBase}>
                <option value="">Select type...</option>
                <option value="1-to-1">1-to-1</option>
                <option value="1-to-many">1-to-many</option>
                <option value="many-to-1">many-to-1</option>
                <option value="many-to-many">many-to-many</option>
              </select>
            </div>
            <div>
              <label className={labelBase}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the relationship" className={inputBase} />
            </div>
            <div>
              <label className={labelBase}>Business Meaning</label>
              <textarea value={form.businessMeaning} onChange={e => setForm(f => ({ ...f, businessMeaning: e.target.value }))}
                rows={2} placeholder="Business context" className={`${inputBase} resize-none`} />
            </div>

            {/* Join Condition */}
            <div className="border-t border-gray-200 pt-4">
              <label className={labelBase}>Join Condition (Optional)</label>
              <div className="space-y-2">
                <input value={form.joinCondition?.source ?? ''} onChange={e => updateJoin('source', e.target.value)}
                  placeholder="Source database" className={inputBase} />
                <input value={form.joinCondition?.logic ?? ''} onChange={e => updateJoin('logic', e.target.value)}
                  placeholder="Join logic (e.g. table1.id = table2.foreign_id)" className={inputBase} />
                <input value={typeof form.joinCondition?.tables === 'string' ? form.joinCondition.tables : (Array.isArray(form.joinCondition?.tables) ? form.joinCondition.tables.join(', ') : '')} 
                  onChange={e => updateJoin('tables', e.target.value)}
                  placeholder="Tables involved (comma-separated)" className={inputBase} />
              </div>
            </div>

            {/* Data Lineage */}
            <div className="border-t border-gray-200 pt-4">
              <label className={labelBase}>Data Lineage (Optional)</label>
              <div className="space-y-2">
                <input value={form.dataLineage?.fromKey ?? ''} onChange={e => updateDataLineage('fromKey', e.target.value)}
                  placeholder="From key (e.g. table.column)" className={inputBase} />
                <input value={form.dataLineage?.toKey ?? ''} onChange={e => updateDataLineage('toKey', e.target.value)}
                  placeholder="To key (e.g. table.foreign_column)" className={inputBase} />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(buildPayload(), initialRel?.id)} disabled={saving || !form.from || !form.to || !form.label}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all">
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Relationship' : 'Save Relationship'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport, importing, error }) {
  const [jsonInput, setJsonInput] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setJsonInput(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(jsonInput);
      onImport(data);
    } catch (e) {
      alert('Invalid JSON format');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">📥</span>
              Import Schema
            </h3>
            <button onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors">✕</button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <div className="mb-4">
            <label className={labelBase}>Upload JSON File</label>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="mb-4">
            <label className={labelBase}>Or Paste JSON</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className={`${inputBase} resize-none font-mono text-xs`}
              placeholder={`{
  "nodes": {
    "Users": {
      "id": "Users",
      "module": "core",
      "nodeType": "core",
      "definition": "User accounts",
      "color": "#dc2626",
      "attributes": ["id", "email", "name"]
    }
  },
  "relationships": [
    {
      "from": "Orders",
      "to": "Users",
      "label": "BELONGS_TO",
      "type": "many-to-1"
    }
  ],
  "positions": {
    "Users": { "x": 400, "y": 300 }
  }
}`}
            />
          </div>
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold mb-1">Expected JSON Structure:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>nodes</code>: Object with node IDs as keys</li>
              <li><code>relationships</code>: Array of relationship objects</li>
              <li><code>positions</code>: Object with node positions (optional)</li>
            </ul>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleImport} disabled={importing || !jsonInput.trim()}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all">
            {importing ? 'Importing...' : 'Import Schema'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const SchemaGraph = ({ 
  initialNodes = {}, 
  initialRelationships = [], 
  initialPositions = {},
  modules = DEFAULT_MODULES,
  onNodesChange,
  onRelationshipsChange,
  onPositionsChange,
}) => {
  // State
  const [nodes, setNodes] = useState(initialNodes);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [positions, setPositions] = useState(initialPositions);
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedModule, setSelectedModule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRelationships, setShowRelationships] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.7 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Modals
  const [nodeModal, setNodeModal] = useState({ open: false, mode: 'create', nodeId: null });
  const [relModal, setRelModal] = useState({ open: false, mode: 'create', rel: null });
  const [importModal, setImportModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, nodeId: null, nodeName: null });
  
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Update parent when state changes
  useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onRelationshipsChange?.(relationships);
  }, [relationships, onRelationshipsChange]);

  useEffect(() => {
    onPositionsChange?.(positions);
  }, [positions, onPositionsChange]);

  // Compute node positions with fallback
  const nodePositions = useMemo(() => {
    const computed = { ...positions };
    let nextX = DEFAULT_CENTER.x;
    let nextY = DEFAULT_CENTER.y;
    
    Object.keys(nodes).forEach((nodeId) => {
      if (!computed[nodeId]) {
        computed[nodeId] = { x: nextX, y: nextY };
        nextX += 150;
        if (nextX > 1800) {
          nextX = DEFAULT_CENTER.x;
          nextY += 120;
        }
      }
    });
    
    return computed;
  }, [nodes, positions]);

  // Filtered data
  const filteredNodes = useMemo(() => {
    return Object.values(nodes).filter(node => {
      const matchesModule = selectedModule === 'all' || node.module === selectedModule;
      const matchesSearch = searchTerm === '' ||
        (node.id && node.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (node.definition && node.definition.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesModule && matchesSearch;
    });
  }, [nodes, selectedModule, searchTerm]);

  const filteredRelationships = useMemo(() => {
    if (!showRelationships) return [];
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return relationships.filter((rel) => nodeIds.has(rel.from) && nodeIds.has(rel.to));
  }, [filteredNodes, showRelationships, relationships]);

  // Event handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSvgClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.2, Math.min(2, transform.scale * delta));
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ratio = newScale / transform.scale;
      setTransform({
        x: mouseX - (mouseX - transform.x) * ratio,
        y: mouseY - (mouseY - transform.y) * ratio,
        scale: newScale
      });
    } else {
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [transform]);

  // Sidebar resizing
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      setSidebarWidth(Math.min(Math.max(280, e.clientX), 700));
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // CRUD operations
  const handleSaveNode = (data, position) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (nodeModal.mode === 'create') {
        setNodes(prev => ({ ...prev, [data.id]: data }));
        if (position) {
          setPositions(prev => ({ ...prev, [data.id]: position }));
        }
      } else {
        setNodes(prev => ({ ...prev, [data.id]: data }));
      }
      setNodeModal({ open: false, mode: 'create', nodeId: null });
    } catch (e) {
      setSaveError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = () => {
    if (!deleteModal.nodeId) return;
    setDeleting(true);
    try {
      setNodes(prev => {
        const { [deleteModal.nodeId]: _, ...rest } = prev;
        return rest;
      });
      setPositions(prev => {
        const { [deleteModal.nodeId]: _, ...rest } = prev;
        return rest;
      });
      setRelationships(prev => prev.filter(r => r.from !== deleteModal.nodeId && r.to !== deleteModal.nodeId));
      setSelectedNode(null);
      setDeleteModal({ open: false, nodeId: null, nodeName: null });
    } catch (e) {
      setSaveError(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveRelationship = (data, relId) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (relId != null) {
        setRelationships(prev => prev.map(r => r.id === relId ? { ...r, ...data } : r));
      } else {
        const newRel = { ...data, id: Date.now() };
        setRelationships(prev => [...prev, newRel]);
      }
      setRelModal({ open: false, mode: 'create', rel: null });
    } catch (e) {
      setSaveError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelationship = (relId) => {
    if (window.confirm('Delete this relationship?')) {
      setRelationships(prev => prev.filter(r => r.id !== relId));
    }
  };

  const handleImport = (data) => {
    try {
      if (data.nodes) {
        setNodes(data.nodes);
      }
      if (data.relationships) {
        const rels = data.relationships.map((r, i) => ({ ...r, id: r.id ?? i }));
        setRelationships(rels);
      }
      if (data.positions) {
        setPositions(data.positions);
      }
      setImportModal(false);
    } catch (e) {
      setSaveError(e?.message || 'Import failed');
    }
  };

  const handleExport = () => {
    const data = { nodes, relationships, positions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render node shape
  const renderNodeShape = (node, isSelected, isHovered, isConnected) => {
    const size = node.nodeType === 'core' ? 28 : 24;
    const opacity = selectedNode && !isSelected && !isConnected ? 0.4 : 1;

    if (node.nodeType === 'kpi') {
      const points = `0,${-size} ${size},0 0,${size} ${-size},0`;
      return (
        <polygon
          points={points}
          fill={isSelected ? node.color : '#ffffff'}
          stroke={node.color}
          strokeWidth={isSelected || isHovered ? 3 : 2}
          opacity={opacity}
        />
      );
    } else {
      return (
        <circle
          r={size}
          fill={isSelected ? node.color : '#ffffff'}
          stroke={node.color}
          strokeWidth={isSelected || isHovered ? 3 : 2}
          opacity={opacity}
        />
      );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      {/* Left Sidebar */}
      <div
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className="bg-gray-50 p-3 overflow-y-auto border-r border-gray-200 shadow-lg relative h-full"
      >
        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-50 transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
          onMouseDown={startResizing}
        />
        
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Schema Graph
        </h1>
        <p className="text-xs text-gray-500 mb-4">Interactive Schema Visualization</p>

        {saveError && !nodeModal.open && !relModal?.open && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <span className="text-red-500 text-xl shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-red-800 text-sm font-medium">{saveError}</p>
              <button onClick={() => setSaveError(null)} className="text-red-600 hover:text-red-800 text-xs mt-1 font-medium">Dismiss</button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setNodeModal({ open: true, mode: 'create', nodeId: null })}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all"
            >
              <span>●</span> Add Node
            </button>
            <button
              onClick={() => setRelModal({ open: true, mode: 'create', rel: null })}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-sm transition-all"
            >
              <span>↔</span> Add Relationship
            </button>
            <button
              onClick={() => setImportModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg hover:from-purple-600 hover:to-pink-700 shadow-sm transition-all"
            >
              <span>📥</span> Import
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
            >
              <span>📤</span> Export
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Module Filter */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">Filter by Module</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {Object.entries(modules).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        {/* Toggle Relationships */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRelationships}
              onChange={(e) => setShowRelationships(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Show Relationships</span>
          </label>
        </div>

        {/* Stats */}
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Nodes: <span className="font-semibold text-gray-800">{filteredNodes.length}</span></p>
          <p className="text-sm text-gray-600">Relationships: <span className="font-semibold text-gray-800">{filteredRelationships.length}</span></p>
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Relationship Types</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-600 rounded"></div>
              <span className="text-xs text-gray-600">many-to-1 (FK)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-600 rounded"></div>
              <span className="text-xs text-gray-600">1-to-many</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-amber-600 rounded"></div>
              <span className="text-xs text-gray-600">many-to-many</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-600 rounded"></div>
              <span className="text-xs text-gray-600">1-to-1</span>
            </div>
          </div>
          <h3 className="text-sm font-semibold mb-2 mt-3 text-gray-700">Modules</h3>
          {Object.entries(modules).filter(([k]) => k !== 'all').map(([key, { name, color }]) => (
            <div key={key} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs text-gray-600">{name}</span>
            </div>
          ))}
        </div>

        {/* Selected Node Details */}
        {selectedNode && nodes[selectedNode] && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {nodes[selectedNode].nodeType === 'kpi' ? (
                  <svg width="16" height="16"><polygon points="8,1 15,8 8,15 1,8" fill={nodes[selectedNode].color} /></svg>
                ) : (
                  <svg width="16" height="16"><circle cx="8" cy="8" r="7" fill={nodes[selectedNode].color} /></svg>
                )}
                <h2 className="text-lg font-bold" style={{ color: nodes[selectedNode].color }}>
                  {selectedNode}
                </h2>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setNodeModal({ open: true, mode: 'edit', nodeId: selectedNode })}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, nodeId: selectedNode, nodeName: selectedNode })}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mb-2">
              {nodes[selectedNode].nodeType === 'kpi' ? 'KPI / Derived' : 'Core Entity'}
            </span>
            <p className="text-sm text-gray-600 mb-3">{nodes[selectedNode].definition}</p>

            {nodes[selectedNode].businessMeaning && (
              <div className="mb-3 p-2 bg-blue-50 rounded">
                <span className="text-xs font-semibold text-blue-700">Business Meaning: </span>
                <span className="text-xs text-blue-600">{nodes[selectedNode].businessMeaning}</span>
              </div>
            )}

            {/* Attributes */}
            {nodes[selectedNode].attributes?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Attributes</h4>
                <div className="flex flex-wrap gap-1">
                  {nodes[selectedNode].attributes.map((attr, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{attr}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Data Sources */}
            {nodes[selectedNode].dataSources?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Data Sources</h4>
                <div className="space-y-1">
                  {nodes[selectedNode].dataSources.map((ds, i) => (
                    <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                      <span className="font-semibold text-gray-800">{ds.source}</span>
                      {ds.table && <span className="text-gray-600"> — {ds.table}</span>}
                      {ds.description && <p className="text-gray-500 mt-1">{ds.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Column Lineage */}
            {nodes[selectedNode].columnLineage?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Column Lineage</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {nodes[selectedNode].columnLineage.map((col, i) => (
                    <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                      <span className="font-semibold text-gray-800">{col.attribute}</span>
                      <span className="text-gray-500"> - {col.meaning}</span>
                      {col.derivedFrom && (
                        <div className="mt-1">
                          <span className="text-gray-400">From: </span>
                          <span className="font-mono text-blue-600">{col.derivedFrom}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relationships */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-700">Relationships</h4>
                <button
                  onClick={() => setRelModal({ open: true, mode: 'create', rel: null })}
                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-medium transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {relationships
                  .filter(r => r.from === selectedNode || r.to === selectedNode)
                  .map((rel, i) => (
                    <div key={rel.id ?? i} className="text-xs p-2 bg-gray-50 border border-gray-100 rounded group flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={rel.from === selectedNode ? 'font-semibold text-gray-800' : 'text-gray-500'}>
                            {rel.from}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium" style={{ color: getRelationshipColor(rel.type) }}>{rel.label}</span>
                          <span className="text-gray-400">→</span>
                          <span className={rel.to === selectedNode ? 'font-semibold text-gray-800' : 'text-gray-500'}>
                            {rel.to}
                          </span>
                        </div>
                        {rel.description && <div className="text-gray-500 mt-1">{rel.description}</div>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => setRelModal({ open: true, mode: 'edit', rel })}
                          className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded font-medium opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRelationship(rel.id)}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded font-medium opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Hovered Node Quick Info */}
        {hoveredNode && hoveredNode !== selectedNode && nodes[hoveredNode] && (
          <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-sm font-bold" style={{ color: nodes[hoveredNode].color }}>
              {hoveredNode}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{nodes[hoveredNode].definition}</p>
          </div>
        )}
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleSvgClick}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
            </marker>
            {['many-to-1', '1-to-many', 'many-to-many', '1-to-1'].map(type => (
              <marker
                key={type}
                id={`arrowhead-${type}`}
                markerWidth="6"
                markerHeight="4"
                refX="6"
                refY="2"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 6 2, 0 4" fill={getRelationshipColor(type)} />
              </marker>
            ))}
            {['many-to-1', '1-to-many', 'many-to-many', '1-to-1'].map(type => (
              <marker
                key={`${type}-highlighted`}
                id={`arrowhead-${type}-highlighted`}
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 8 3, 0 6" fill={getRelationshipColor(type)} />
              </marker>
            ))}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="white" data-background />
          <rect width="100%" height="100%" fill="url(#grid)" data-background />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Relationships */}
            {filteredRelationships.map((rel, index) => {
              const fromPos = nodePositions[rel.from];
              const toPos = nodePositions[rel.to];
              if (!fromPos || !toPos) return null;

              const parallelEdges = filteredRelationships.filter(
                r => (r.from === rel.from && r.to === rel.to) || (r.from === rel.to && r.to === rel.from)
              );
              const edgeIndex = parallelEdges.indexOf(rel);
              const offset = (edgeIndex - (parallelEdges.length - 1) / 2) * 20;

              const dx = toPos.x - fromPos.x;
              const dy = toPos.y - fromPos.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const nx = -dy / len;
              const ny = dx / len;

              const ctrlX = (fromPos.x + toPos.x) / 2 + nx * offset;
              const ctrlY = (fromPos.y + toPos.y) / 2 + ny * offset;

              const fromDist = Math.sqrt(dx * dx + dy * dy);
              const fromNx = dx / fromDist;
              const fromNy = dy / fromDist;
              const fromNode = nodes[rel.from];
              let fromOffset = 28;
              if (fromNode?.nodeType === 'kpi') {
                fromOffset = 24 / (Math.abs(fromNx) + Math.abs(fromNy));
              }
              const startPoint = { x: fromPos.x + fromNx * fromOffset, y: fromPos.y + fromNy * fromOffset };

              const toDx = fromPos.x - toPos.x;
              const toDy = fromPos.y - toPos.y;
              const toDist = Math.sqrt(toDx * toDx + toDy * toDy);
              const toNx = toDx / toDist;
              const toNy = toDy / toDist;
              const toNode = nodes[rel.to];
              let toOffset = 28;
              if (toNode?.nodeType === 'kpi') {
                toOffset = 24 / (Math.abs(toNx) + Math.abs(toNy));
              }
              const endPoint = { x: toPos.x + toNx * toOffset, y: toPos.y + toNy * toOffset };

              const isHighlighted = selectedNode === rel.from || selectedNode === rel.to;
              const color = getRelationshipColor(rel.type);

              return (
                <g key={index}>
                  <path
                    d={`M ${startPoint.x} ${startPoint.y} Q ${ctrlX} ${ctrlY} ${endPoint.x} ${endPoint.y}`}
                    fill="none"
                    stroke={isHighlighted ? color : '#cbd5e1'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    opacity={isHighlighted ? 1 : 0.4}
                    markerEnd={isHighlighted ? `url(#arrowhead-${rel.type}-highlighted)` : `url(#arrowhead-${rel.type})`}
                  />
                  {isHighlighted && (
                    <text
                      x={ctrlX}
                      y={ctrlY - 10}
                      textAnchor="middle"
                      fill={color}
                      fontSize="9"
                      fontWeight="600"
                      className="select-none"
                      style={{ textShadow: '1px 1px 2px white, -1px -1px 2px white' }}
                    >
                      {rel.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const isConnected = selectedNode && relationships.some(
                r => (r.from === selectedNode && r.to === node.id) ||
                  (r.to === selectedNode && r.from === node.id)
              );

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {renderNodeShape(node, isSelected, isHovered, isConnected)}
                  <text
                    textAnchor="middle"
                    dy={node.nodeType === 'core' ? 45 : 40}
                    fill={isSelected ? node.color : '#374151'}
                    fontSize="10"
                    fontWeight="600"
                    className="select-none"
                  >
                    {node.id.length > 18 ? node.id.slice(0, 16) + '...' : node.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(2, prev.scale * 1.2) }))}
            className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center shadow-sm text-gray-700 font-bold"
          >
            +
          </button>
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) }))}
            className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center shadow-sm text-gray-700 font-bold"
          >
            -
          </button>
          <button
            onClick={() => setTransform({ x: 0, y: 0, scale: 0.7 })}
            className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center shadow-sm text-gray-700 text-xs"
          >
            ⌂
          </button>
        </div>

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-95 p-3 rounded-lg text-xs text-gray-500 border border-gray-200 shadow-sm">
          <p>• Click node for details</p>
          <p>• Drag to pan</p>
          <p>• Scroll to zoom</p>
          <p>• Import JSON to load schema</p>
        </div>

        {/* Modals */}
        {deleteModal.open && (
          <DeleteConfirmModal
            itemName={deleteModal.nodeName || 'Node'}
            itemType="Node"
            onConfirm={handleDeleteNode}
            onCancel={() => setDeleteModal({ open: false, nodeId: null, nodeName: null })}
            deleting={deleting}
          />
        )}

        {nodeModal.open && (
          <NodeModal
            mode={nodeModal.mode}
            nodeId={nodeModal.nodeId}
            node={nodeModal.nodeId ? nodes[nodeModal.nodeId] : null}
            modules={modules}
            positions={nodePositions}
            onClose={() => { setNodeModal({ open: false, mode: 'create', nodeId: null }); setSaveError(null); }}
            onSave={handleSaveNode}
            saving={saving}
            error={saveError}
          />
        )}

        {relModal?.open && (
          <RelationshipModal
            nodeIds={Object.keys(nodes)}
            mode={relModal.mode}
            initialRel={relModal.rel}
            onClose={() => { setRelModal({ open: false, mode: 'create', rel: null }); setSaveError(null); }}
            onSave={handleSaveRelationship}
            saving={saving}
            error={saveError}
          />
        )}

        {importModal && (
          <ImportModal
            onClose={() => setImportModal(false)}
            onImport={handleImport}
            importing={saving}
            error={saveError}
          />
        )}
      </div>
    </div>
  );
};

export default SchemaGraph;