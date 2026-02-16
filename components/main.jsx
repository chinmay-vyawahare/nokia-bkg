import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';
const HEADERS = { 'Content-Type': 'application/json' };

// Fallback defaults (used only if API hasn't loaded yet)
const FALLBACK_MODULES = { all: { name: 'All Modules', color: '#6b7280', description: '' } };
const FALLBACK_REL_COLORS = { default: '#6b7280' };

// ---- API helpers ----
async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...HEADERS, ...opts.headers } });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `API error ${res.status}`);
    }
    if (res.status === 204) return null;
    if (opts.method === 'DELETE') return res.json().catch(() => null);
    return res.json();
}

function toRel(r) {
    const { from_node, to_node, ...rest } = r;
    return { ...rest, from: from_node ?? r.from, to: to_node ?? r.to };
}

// ---- Modal Component ----
const Modal = ({ title, onClose, children, wide, variant }) => {
    const isChat = variant === 'chat';
    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isChat ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-black/50'}`} onClick={onClose}>
            <div className={`rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden ${wide ? 'w-[700px]' : 'w-[500px]'} ${isChat ? 'bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 shadow-indigo-200/20' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <div className={`flex items-center justify-between px-5 py-4 ${isChat ? 'bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border-b border-slate-200/80' : 'border-b border-gray-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                        {isChat && (
                            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </span>
                        )}
                        <h2 className={`text-lg font-bold truncate ${isChat ? 'text-slate-800' : 'text-gray-800'}`}>{title}</h2>
                    </div>
                    <button onClick={onClose} className={`flex-shrink-0 text-xl font-bold transition-colors ${isChat ? 'text-slate-400 hover:text-slate-600' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
                </div>
                <div className={`p-5 overflow-y-auto flex-1 ${isChat ? 'min-h-0' : ''}`}>{children}</div>
            </div>
        </div>
    );
};

// ---- Field Input Component ----
const Field = ({ label, value, onChange, type = 'text', placeholder, rows, options, required }) => (
    <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
        {type === 'textarea' ? (
            <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows || 3}
                placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        ) : type === 'select' ? (
            <select value={value || ''} onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        ) : (
            <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        )}
    </div>
);

// ---- Array-of-objects editor for dataSources / columnLineage ----
const ArrayObjectEditor = ({ label, items, onChange, fields }) => {
    const addRow = () => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))]);
    const removeRow = (idx) => onChange(items.filter((_, i) => i !== idx));
    const updateRow = (idx, key, val) => {
        const copy = items.map((item, i) => i === idx ? { ...item, [key]: val } : item);
        onChange(copy);
    };
    return (
        <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600">{label}</label>
                <button type="button" onClick={addRow} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">+ Add</button>
            </div>
            {items.length === 0 && <p className="text-[10px] text-gray-400 italic">No entries yet</p>}
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200 relative">
                        <button type="button" onClick={() => removeRow(idx)} className="absolute top-1 right-1 text-[10px] text-red-400 hover:text-red-600">x</button>
                        <div className="grid grid-cols-1 gap-1.5">
                            {fields.map(f => (
                                <div key={f.key}>
                                    <label className="text-[10px] text-gray-500">{f.label}</label>
                                    <input type="text" value={item[f.key] || ''} onChange={e => updateRow(idx, f.key, e.target.value)}
                                        placeholder={f.placeholder || ''} className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- Confirm Dialog ----
const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
        <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-5">{message}</p>
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
            </div>
        </div>
    </div>
);

// ---- Toast Notification ----
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-4 right-4 z-[70] px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {message}
        </div>
    );
};

// ---- Loading phrases (rotate while agent is thinking) ----
const LOADING_PHRASES = [
    'Thinking…',
    'Consulting the graph…',
    'Gathering context…',
    'Checking relationships & journeys…',
    'Almost there…',
    'One moment…',
    'Putting it together…',
];

// ---- Node Chat Panel (ask questions about selected node) ----
const NodeChatPanel = ({ nodeId, nodeName, onClose, onSend, inModal }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const listRef = useRef(null);

    useEffect(() => { setMessages([]); setInput(''); }, [nodeId]);
    useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, loading]);

    // Rotate loading phrase every 1.2s while loading
    useEffect(() => {
        if (!loading) return;
        const id = setInterval(() => setLoadingStep(s => (s + 1) % LOADING_PHRASES.length), 500);
        return () => clearInterval(id);
    }, [loading]);

    const handleSend = async () => {
        const text = (input || '').trim();
        if (!text || loading) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text }]);
        setLoading(true);
        setLoadingStep(0);
        try {
            const { reply } = await onSend(nodeId, text);
            setMessages(m => [...m, { role: 'assistant', text: reply }]);
        } catch (e) {
            setMessages(m => [...m, { role: 'assistant', text: `Error: ${e.message}`, error: true }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col rounded-xl overflow-hidden border border-gray-200/80 bg-gradient-to-b from-slate-50 to-white shadow-lg shadow-slate-200/50"
            style={{ minHeight: inModal ? 360 : 220, maxHeight: inModal ? 520 : 360 }}
        >
            {!inModal && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-white/80">
                    <span className="text-xs font-semibold text-slate-600">Ask about this node</span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors">×</button>
                </div>
            )}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {messages.length === 0 && (
                    <div className="text-center py-6 px-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 mb-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <p className="text-slate-600 font-medium">Ask anything about &quot;{nodeName}&quot;</p>
                        <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">Definitions, relationships, flow journeys, data sources — will be answered.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`rounded-xl px-3 py-2.5 shadow-sm ${
                            msg.role === 'user'
                                ? 'ml-6 mr-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                                : msg.error
                                    ? 'mr-6 ml-2 bg-red-50 border border-red-100 text-red-800'
                                    : 'mr-6 ml-2 bg-white border border-slate-100 text-slate-800 shadow-slate-200/50'
                        }`}
                    >
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    </div>
                ))}
                {loading && (
                    <div className="mr-6 ml-2 flex items-center gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-sm animate-pulse">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-slate-500 text-sm font-medium transition-opacity duration-300">
                            {LOADING_PHRASES[loadingStep]}
                        </span>
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-slate-200/80 bg-white/90 flex gap-2">
                <input
                    type="text"
                    value={input}
                    autoFocus
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ask anything…"
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300 transition-shadow placeholder:text-slate-400"
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg text-sm font-medium shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-200/60 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                    Send
                </button>
            </div>
           
        </div>
    );
};

// ======================================================
// NODE FORM MODAL
// ======================================================
const NodeFormModal = ({ node, nodes, modules, onSave, onClose, mode }) => {
    const ensureArray = (val) => Array.isArray(val) ? val : [];
    const [form, setForm] = useState(() => {
        if (node) return {
            ...node,
            attributes: Array.isArray(node.attributes) ? node.attributes.join(', ') : (node.attributes || ''),
            dataSources: ensureArray(node.dataSources),
            columnLineage: ensureArray(node.columnLineage),
        };
        return { id: '', module: 'planning', nodeType: 'core', definition: '', businessMeaning: '', attributes: '', color: '#3b82f6', dataSources: [], columnLineage: [] };
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const moduleOptions = Object.entries(modules).filter(([k]) => k !== 'all').map(([k, v]) => ({ value: k, label: v.name }));
    const nodeTypeOptions = [{ value: 'core', label: 'Core Concept' }, { value: 'kpi', label: 'KPI/Signal' }, { value: 'decision', label: 'Decision Point' }];

    const handleModuleChange = (mod) => {
        const moduleData = modules[mod];
        setForm(f => ({ ...f, module: mod, color: moduleData?.color || f.color }));
    };

    const handleSave = async () => {
        if (!form.id?.trim()) { setError('Node ID is required'); return; }
        if (mode === 'add' && nodes[form.id]) { setError('Node ID already exists'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                attributes: form.attributes ? form.attributes.split(',').map(s => s.trim()).filter(Boolean) : [],
                dataSources: form.dataSources.filter(ds => ds.source_name?.trim()),
                columnLineage: form.columnLineage.filter(cl => cl.column_name?.trim()),
            };
            await onSave(payload, mode);
            onClose();
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    return (
        <Modal title={mode === 'add' ? 'Add New Node' : `Edit Node: ${form.id}`} onClose={onClose} wide>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded">{error}</div>}
            <Field label="Node ID" value={form.id} onChange={v => setForm(f => ({ ...f, id: v.replace(/\s+/g, '_') }))} placeholder="e.g. My_Node" required disabled={mode === 'edit'} />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Module" type="select" value={form.module} onChange={handleModuleChange} options={moduleOptions} />
                <Field label="Node Type" type="select" value={form.nodeType} onChange={v => setForm(f => ({ ...f, nodeType: v }))} options={nodeTypeOptions} />
            </div>
            <Field label="Definition" type="textarea" value={form.definition} onChange={v => setForm(f => ({ ...f, definition: v }))} placeholder="What this node represents..." />
            <Field label="Business Meaning" type="textarea" value={form.businessMeaning} onChange={v => setForm(f => ({ ...f, businessMeaning: v }))} placeholder="Business context..." />
            <Field label="Attributes (comma-separated)" value={form.attributes} onChange={v => setForm(f => ({ ...f, attributes: v }))} placeholder="attr1, attr2, attr3" />
            <ArrayObjectEditor label="Data Sources" items={form.dataSources} onChange={v => setForm(f => ({ ...f, dataSources: v }))}
                fields={[
                    { key: 'source_name', label: 'Source Name', placeholder: 'e.g. SiteMaster DB' },
                    { key: 'meaning', label: 'Meaning', placeholder: 'What this source provides...' },
                ]} />
            <ArrayObjectEditor label="Column Lineage" items={form.columnLineage} onChange={v => setForm(f => ({ ...f, columnLineage: v }))}
                fields={[
                    { key: 'column_name', label: 'Column Name', placeholder: 'e.g. site_id' },
                    { key: 'join_relation', label: 'Join Relation', placeholder: 'e.g. LEFT JOIN sites ON ...' },
                    { key: 'description', label: 'Description', placeholder: 'What this column represents...' },
                ]} />
            <Field label="Color" type="color" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
            <div className="flex gap-3 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : mode === 'add' ? 'Create Node' : 'Update Node'}
                </button>
            </div>
        </Modal>
    );
};

// ======================================================
// RELATIONSHIP FORM MODAL
// ======================================================
const RelationshipFormModal = ({ rel, nodes, onSave, onClose, mode }) => {
    const [form, setForm] = useState(() => {
        if (rel) return { ...rel };
        return { from: '', to: '', label: '', type: '1-to-many', description: '' };
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const nodeOptions = [{ value: '', label: '-- Select Node --' }, ...Object.keys(nodes).sort().map(id => ({ value: id, label: id.replace(/_/g, ' ') }))];
    const typeOptions = [
        { value: '1-to-1', label: '1-to-1' }, { value: '1-to-many', label: '1-to-many' },
        { value: 'many-to-1', label: 'many-to-1' }, { value: 'many-to-many', label: 'many-to-many' }
    ];

    const handleSave = async () => {
        if (!form.from || !form.to || !form.label?.trim()) { setError('From, To, and Label are required'); return; }
        setSaving(true); setError('');
        try {
            await onSave(form, mode);
            onClose();
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    return (
        <Modal title={mode === 'add' ? 'Add New Relationship' : 'Edit Relationship'} onClose={onClose}>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded">{error}</div>}
            <Field label="From Node" type="select" value={form.from} onChange={v => setForm(f => ({ ...f, from: v }))} options={nodeOptions} required />
            <Field label="To Node" type="select" value={form.to} onChange={v => setForm(f => ({ ...f, to: v }))} options={nodeOptions} required />
            <Field label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v.toUpperCase().replace(/\s+/g, '_') }))} placeholder="e.g. HAS_PROJECTS" required />
            <Field label="Type" type="select" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={typeOptions} />
            <Field label="Description" type="textarea" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What this relationship means..." />
            <div className="flex gap-3 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : mode === 'add' ? 'Create Relationship' : 'Update Relationship'}
                </button>
            </div>
        </Modal>
    );
};

// ======================================================
// JOURNEY FORM MODAL
// ======================================================
const JourneyFormModal = ({ journey, journeyKey, nodes, onSave, onClose, mode }) => {
    const [form, setForm] = useState(() => {
        if (journey) return {
            ...journey,
            journey_key: journeyKey || '',
            path: Array.isArray(journey.path) ? journey.path.join(', ') : (journey.path || ''),
            questions: Array.isArray(journey.questions) ? journey.questions.join('\n') : (journey.questions || ''),
        };
        return { journey_key: '', name: '', shortName: '', description: '', color: '#10b981', category: 'Planning', path: '', questions: '', dataFlow: [] };
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!form.journey_key?.trim() || !form.name?.trim()) { setError('Journey key and name are required'); return; }
        setSaving(true); setError('');
        try {
            const pathArr = form.path ? form.path.split(',').map(s => s.trim()).filter(Boolean) : [];
            const questArr = form.questions ? form.questions.split('\n').map(s => s.trim()).filter(Boolean) : [];
            // Build dataFlow from path
            const dataFlow = [];
            for (let i = 0; i < pathArr.length - 1; i++) {
                dataFlow.push({ step: i + 1, from: pathArr[i], to: pathArr[i + 1], action: `Flow from ${pathArr[i].replace(/_/g, ' ')} to ${pathArr[i + 1].replace(/_/g, ' ')}` });
            }
            const payload = {
                ...form,
                path: pathArr,
                questions: questArr,
                dataFlow: form.dataFlow?.length > 0 && typeof form.dataFlow[0] === 'object' ? form.dataFlow : dataFlow,
            };
            const key = payload.journey_key;
            delete payload.journey_key;
            await onSave(key, payload, mode);
            onClose();
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    const availableNodes = Object.keys(nodes).sort();

    return (
        <Modal title={mode === 'add' ? 'Add New Journey' : `Edit Journey: ${form.journey_key}`} onClose={onClose} wide>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Journey Key" value={form.journey_key} onChange={v => setForm(f => ({ ...f, journey_key: v.toLowerCase().replace(/\s+/g, '_') }))} placeholder="e.g. my_journey" required />
                <Field label="Short Name" value={form.shortName} onChange={v => setForm(f => ({ ...f, shortName: v }))} placeholder="Brief name" />
            </div>
            <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Full journey name" required />
            <Field label="Description" type="textarea" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What this journey represents..." />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} placeholder="e.g. Planning" />
                <Field label="Color" type="color" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
            </div>
            <Field label="Path (comma-separated node IDs)" type="textarea" value={form.path} onChange={v => setForm(f => ({ ...f, path: v }))}
                placeholder="Market, Site, Project, ..." rows={2} />
            <div className="mb-2 flex flex-wrap gap-1">
                {availableNodes.map(id => (
                    <button key={id} type="button" onClick={() => setForm(f => ({ ...f, path: f.path ? f.path + ', ' + id : id }))}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-blue-100 rounded border">{id.replace(/_/g, ' ')}</button>
                ))}
            </div>
            <Field label="Questions (one per line)" type="textarea" value={form.questions} onChange={v => setForm(f => ({ ...f, questions: v }))}
                placeholder="Business questions answered by this journey..." rows={4} />
            <div className="flex gap-3 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : mode === 'add' ? 'Create Journey' : 'Update Journey'}
                </button>
            </div>
        </Modal>
    );
};

// ======================================================
// MODULES INLINE EDITOR
// ======================================================
const ModulesEditor = ({ modules, onSave, onDelete, onConfirm }) => {
    const [adding, setAdding] = useState(false);
    const [editKey, setEditKey] = useState(null);
    const [form, setForm] = useState({ key: '', name: '', color: '#6b7280', description: '' });

    const startEdit = (key, mod) => { setEditKey(key); setForm({ key, name: mod.name, color: mod.color || '#6b7280', description: mod.description || '' }); setAdding(false); };
    const startAdd = () => { setAdding(true); setEditKey(null); setForm({ key: '', name: '', color: '#6b7280', description: '' }); };
    const cancel = () => { setAdding(false); setEditKey(null); };
    const save = async () => {
        if (!form.key?.trim() || !form.name?.trim()) return;
        await onSave(form.key, form.name, form.color, form.description);
        cancel();
    };

    const renderForm = () => (
        <div className="p-2 bg-white rounded border border-blue-200 space-y-1.5 mt-1">
            {adding && <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="Module key" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />}
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Module name" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
            <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-6 border rounded cursor-pointer" />
                <span className="text-[10px] text-gray-400">{form.color}</span>
                <div className="flex-1" />
                <button onClick={cancel} className="px-2 py-0.5 text-[10px] border rounded hover:bg-gray-50">Cancel</button>
                <button onClick={save} className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modules ({Object.keys(modules).filter(k => k !== 'all').length})</h3>
                <button onClick={startAdd} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">+ Add</button>
            </div>
            {adding && renderForm()}
            <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(modules).filter(([k]) => k !== 'all').map(([key, mod]) => (
                    <div key={key}>
                        {editKey === key ? renderForm() : (
                            <div className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 group">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: mod.color }} />
                                    <div>
                                        <span className="text-xs text-gray-700 font-medium">{mod.name}</span>
                                        <span className="text-[10px] text-gray-400 ml-1">({key})</span>
                                    </div>
                                </div>
                                <div className="hidden group-hover:flex gap-1">
                                    <button onClick={() => startEdit(key, mod)} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">Edit</button>
                                    <button onClick={() => onConfirm('Delete Module', `Delete module "${mod.name}"?`, () => onDelete(key))}
                                        className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Del</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ======================================================
// RELATIONSHIP COLORS INLINE EDITOR
// ======================================================
const RelColorsEditor = ({ colors, onSave, onDelete, onConfirm }) => {
    const [adding, setAdding] = useState(false);
    const [editType, setEditType] = useState(null);
    const [form, setForm] = useState({ type: '', color: '#6b7280' });

    const startEdit = (type, color) => { setEditType(type); setForm({ type, color }); setAdding(false); };
    const startAdd = () => { setAdding(true); setEditType(null); setForm({ type: '', color: '#6b7280' }); };
    const cancel = () => { setAdding(false); setEditType(null); };
    const save = async () => {
        if (!form.type?.trim() || !form.color?.trim()) return;
        await onSave(form.type, form.color);
        cancel();
    };

    const renderForm = () => (
        <div className="p-2 bg-white rounded border border-blue-200 space-y-1.5 mt-1">
            {adding && <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                placeholder="Relationship type (e.g. 1-to-many)" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />}
            <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-6 border rounded cursor-pointer" />
                <span className="text-[10px] text-gray-400">{form.color}</span>
                <div className="flex-1" />
                <button onClick={cancel} className="px-2 py-0.5 text-[10px] border rounded hover:bg-gray-50">Cancel</button>
                <button onClick={save} className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rel Colors ({Object.keys(colors).length})</h3>
                <button onClick={startAdd} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">+ Add</button>
            </div>
            {adding && renderForm()}
            <div className="space-y-1 max-h-36 overflow-y-auto">
                {Object.entries(colors).map(([type, color]) => (
                    <div key={type}>
                        {editType === type ? renderForm() : (
                            <div className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 group">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded border" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-gray-700">{type}</span>
                                    <span className="text-[10px] text-gray-400">{color}</span>
                                </div>
                                <div className="hidden group-hover:flex gap-1">
                                    <button onClick={() => startEdit(type, color)} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">Edit</button>
                                    <button onClick={() => onConfirm('Delete Color', `Delete color for "${type}"?`, () => onDelete(type))}
                                        className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Del</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ======================================================
// MAIN COMPONENT
// ======================================================
const NokiaBusinessKnowledgeGraph = () => {
    // Data state - loaded from API
    const [nodes, setNodes] = useState({});
    const [relationships, setRelationships] = useState([]);
    const [positions, setPositions] = useState({});
    const [scenarioJourneys, setScenarioJourneys] = useState({});
    const [defaultModules, setDefaultModules] = useState(FALLBACK_MODULES);
    const [relColors, setRelColors] = useState(FALLBACK_REL_COLORS);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(null);

    // UI state
    const [selectedModule, setSelectedModule] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showRelationships, setShowRelationships] = useState(true);
    const [transform, setTransform] = useState({ x: 50, y: 50, scale: 0.45 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);
    const [activeScenario, setActiveScenario] = useState(null);
    const [animationStep, setAnimationStep] = useState(-1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('scenarios');
    const animationRef = useRef(null);

    // Modal state
    const [nodeModal, setNodeModal] = useState(null); // { mode: 'add'|'edit', node? }
    const [relModal, setRelModal] = useState(null);   // { mode: 'add'|'edit', rel? }
    const [journeyModal, setJourneyModal] = useState(null); // { mode: 'add'|'edit', journey?, journeyKey? }
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [toast, setToast] = useState(null);
    const [chatOpenForNode, setChatOpenForNode] = useState(null); // nodeId when node chat is open
    const [chatOpen, setChatOpen] = useState(null); // nodeId when node chat is open

    // Position editing state
    const [editingPositionNode, setEditingPositionNode] = useState(null); // nodeId being repositioned
    const [editingPositionOriginal, setEditingPositionOriginal] = useState(null); // original {x,y} to revert on cancel
    const [nodeDragStart, setNodeDragStart] = useState(null); // {x, y, nodeX, nodeY} for node drag tracking

    // ---- Load data from API ----
    const loadData = useCallback(async () => {
        setLoading(true);
        setApiError(null);
        try {
            const [nodesRes, relsRes, journeysRes, posRes, modulesRes, relColorsRes] = await Promise.all([
                apiFetch('/api/nodes'),
                apiFetch('/api/relationships'),
                apiFetch('/api/journeys/dict'),
                apiFetch('/api/positions'),
                apiFetch('/api/modules'),
                apiFetch('/api/rel-colors'),
            ]);
            const nodesList = nodesRes?.nodes ?? [];
            const nodesMap = {};
            nodesList.forEach(n => { if (n?.id) nodesMap[n.id] = n; });
            setNodes(nodesMap);
            setRelationships((relsRes?.relationships ?? []).map(toRel));
            setScenarioJourneys(journeysRes || {});
            setPositions(posRes || {});
            const mods = modulesRes && Object.keys(modulesRes).length > 0 ? modulesRes : FALLBACK_MODULES;
            if (!mods.all) mods.all = { name: 'All Modules', color: '#6b7280', description: 'Display all nodes' };
            setDefaultModules(mods);
            setRelColors(relColorsRes && Object.keys(relColorsRes).length > 0 ? relColorsRes : FALLBACK_REL_COLORS);
        } catch (e) {
            setApiError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ---- CRUD: Nodes ----
    const handleSaveNode = useCallback(async (payload, mode) => {
        if (mode === 'add') {
            const body = { ...payload };
            const pos = positions[payload.id] || { x: 400 + Math.random() * 800, y: 300 + Math.random() * 400 };
            body.position = pos;
            await apiFetch('/api/nodes', { method: 'POST', body: JSON.stringify(body) });
            if (!positions[payload.id]) {
                await apiFetch(`/api/positions/${encodeURIComponent(payload.id)}`, { method: 'PUT', body: JSON.stringify(pos) });
            }
        } else {
            const { id, ...updates } = payload;
            await apiFetch(`/api/nodes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
        }
        setToast({ message: `Node ${mode === 'add' ? 'created' : 'updated'} successfully`, type: 'success' });
        await loadData();
    }, [loadData, positions]);

    const handleDeleteNode = useCallback(async (nodeId) => {
        await apiFetch(`/api/nodes/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
        setSelectedNode(null);
        setToast({ message: `Node "${nodeId}" deleted`, type: 'success' });
        await loadData();
    }, [loadData]);

    // ---- CRUD: Relationships ----
    const handleSaveRelationship = useCallback(async (payload, mode) => {
        if (mode === 'add') {
            await apiFetch('/api/relationships', { method: 'POST', body: JSON.stringify({ from_node: payload.from, to_node: payload.to, label: payload.label, type: payload.type, description: payload.description }) });
        } else {
            await apiFetch(`/api/relationships/${payload.id}`, { method: 'PUT', body: JSON.stringify({ from_node: payload.from, to_node: payload.to, label: payload.label, type: payload.type, description: payload.description }) });
        }
        setToast({ message: `Relationship ${mode === 'add' ? 'created' : 'updated'} successfully`, type: 'success' });
        await loadData();
    }, [loadData]);

    const handleDeleteRelationship = useCallback(async (relId) => {
        await apiFetch(`/api/relationships/${relId}`, { method: 'DELETE' });
        setToast({ message: 'Relationship deleted', type: 'success' });
        await loadData();
    }, [loadData]);

    // ---- CRUD: Journeys ----
    const handleSaveJourney = useCallback(async (key, payload, mode) => {
        if (mode === 'add') {
            await apiFetch('/api/journeys', { method: 'POST', body: JSON.stringify({ journey_key: key, ...payload }) });
        } else {
            await apiFetch(`/api/journeys/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ journey_key: key, ...payload }) });
        }
        setToast({ message: `Journey ${mode === 'add' ? 'created' : 'updated'} successfully`, type: 'success' });
        await loadData();
    }, [loadData]);

    const handleDeleteJourney = useCallback(async (journeyKey) => {
        await apiFetch(`/api/journeys/${encodeURIComponent(journeyKey)}`, { method: 'DELETE' });
        setActiveScenario(null);
        setToast({ message: `Journey "${journeyKey}" deleted`, type: 'success' });
        await loadData();
    }, [loadData]);

    // ---- CRUD: Modules ----
    const handleSaveModule = useCallback(async (key, name, color, description) => {
        await apiFetch(`/api/modules/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ key, name, color, description }) });
        setToast({ message: `Module "${key}" saved`, type: 'success' });
        await loadData();
    }, [loadData]);

    const handleDeleteModule = useCallback(async (key) => {
        await apiFetch(`/api/modules/${encodeURIComponent(key)}`, { method: 'DELETE' });
        setToast({ message: `Module "${key}" deleted`, type: 'success' });
        await loadData();
    }, [loadData]);

    // ---- CRUD: Relationship Colors ----
    const handleSaveRelColor = useCallback(async (type, color) => {
        await apiFetch(`/api/rel-colors/${encodeURIComponent(type)}`, { method: 'PUT', body: JSON.stringify({ type, color }) });
        setToast({ message: `Color for "${type}" saved`, type: 'success' });
        await loadData();
    }, [loadData]);

    const handleDeleteRelColor = useCallback(async (type) => {
        await apiFetch(`/api/rel-colors/${encodeURIComponent(type)}`, { method: 'DELETE' });
        setToast({ message: `Color for "${type}" deleted`, type: 'success' });
        await loadData();
    }, [loadData]);

    // ---- Position Editing ----
    const startEditPosition = useCallback((nodeId) => {
        const pos = positions[nodeId];
        if (pos) {
            setEditingPositionOriginal({ ...pos });
        }
        setEditingPositionNode(nodeId);
        setNodeDragStart(null);
    }, [positions]);

    const cancelEditPosition = useCallback(() => {
        if (editingPositionNode && editingPositionOriginal) {
            setPositions(prev => ({ ...prev, [editingPositionNode]: { ...editingPositionOriginal } }));
        }
        setEditingPositionNode(null);
        setEditingPositionOriginal(null);
        setNodeDragStart(null);
    }, [editingPositionNode, editingPositionOriginal]);

    const saveEditPosition = useCallback(async () => {
        if (!editingPositionNode) return;
        const pos = positions[editingPositionNode];
        if (!pos) return;
        try {
            await apiFetch(`/api/positions/${encodeURIComponent(editingPositionNode)}`, {
                method: 'PUT',
                body: JSON.stringify({ x: pos.x, y: pos.y }),
            });
            setToast({ message: `Position for "${editingPositionNode}" saved`, type: 'success' });
        } catch (e) {
            setToast({ message: `Failed to save position: ${e.message}`, type: 'error' });
            // Revert on failure
            if (editingPositionOriginal) {
                setPositions(prev => ({ ...prev, [editingPositionNode]: { ...editingPositionOriginal } }));
            }
        }
        setEditingPositionNode(null);
        setEditingPositionOriginal(null);
        setNodeDragStart(null);
    }, [editingPositionNode, editingPositionOriginal, positions]);

    const handleNodeDragStart = useCallback((e, nodeId) => {
        if (editingPositionNode !== nodeId) return;
        e.stopPropagation();
        const pos = positions[nodeId];
        setNodeDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: pos.x,
            nodeY: pos.y,
        });
    }, [editingPositionNode, positions]);

    const handleNodeDragMove = useCallback((e) => {
        if (!nodeDragStart || !editingPositionNode) return;
        e.stopPropagation();
        const dx = (e.clientX - nodeDragStart.mouseX) / transform.scale;
        const dy = (e.clientY - nodeDragStart.mouseY) / transform.scale;
        setPositions(prev => ({
            ...prev,
            [editingPositionNode]: {
                x: nodeDragStart.nodeX + dx,
                y: nodeDragStart.nodeY + dy,
            }
        }));
    }, [nodeDragStart, editingPositionNode, transform.scale]);

    const handleNodeDragEnd = useCallback(() => {
        setNodeDragStart(null);
    }, []);

    // ---- Computed values ----
    const scenariosByCategory = useMemo(() => {
        const grouped = {};
        Object.entries(scenarioJourneys).forEach(([key, scenario]) => {
            const s = { ...scenario, id: key };
            if (!grouped[s.category || 'Other']) grouped[s.category || 'Other'] = [];
            grouped[s.category || 'Other'].push(s);
        });
        return grouped;
    }, [scenarioJourneys]);

    const filteredNodes = useMemo(() => {
        return Object.values(nodes).filter(node => {
            const matchesModule = selectedModule === 'all' || node.module === selectedModule;
            const matchesSearch = searchTerm === '' ||
                node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (node.definition && node.definition.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesModule && matchesSearch;
        });
    }, [nodes, selectedModule, searchTerm]);

    const filteredRelationships = useMemo(() => {
        if (!showRelationships) return [];
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        return relationships.filter(rel => nodeIds.has(rel.from) && nodeIds.has(rel.to));
    }, [filteredNodes, showRelationships, relationships]);

    // ---- Scenario animation ----
    const startAnimation = useCallback((scenario) => {
        setActiveScenario(scenario);
        setAnimationStep(0);
        setIsAnimating(true);
        setSelectedNode(null);
        const firstNode = scenario.path?.[0];
        const pos = positions[firstNode];
        if (pos) {
            setTransform(prev => ({ x: -pos.x * prev.scale + 500, y: -pos.y * prev.scale + 350, scale: prev.scale }));
        }
    }, [positions]);

    const stopAnimation = useCallback(() => {
        setIsAnimating(false);
        setAnimationStep(-1);
        if (animationRef.current) clearInterval(animationRef.current);
    }, []);

    const resetView = useCallback(() => {
        setActiveScenario(null);
        setAnimationStep(-1);
        setIsAnimating(false);
        setTransform({ x: 50, y: 50, scale: 0.45 });
        if (animationRef.current) clearInterval(animationRef.current);
    }, []);

    useEffect(() => {
        if (isAnimating && activeScenario) {
            animationRef.current = setInterval(() => {
                setAnimationStep(prev => {
                    if (prev >= (activeScenario.path?.length || 0) - 1) { setIsAnimating(false); return prev; }
                    const nextNode = activeScenario.path[prev + 1];
                    const pos = positions[nextNode];
                    if (pos) {
                        requestAnimationFrame(() => {
                            setTransform(t => ({ ...t, x: -pos.x * t.scale + 500, y: -pos.y * t.scale + 350 }));
                        });
                    }
                    return prev + 1;
                });
            }, 1500);
            return () => clearInterval(animationRef.current);
        }
    }, [isAnimating, activeScenario, positions]);

    const isNodeInPath = useCallback((nodeId) => activeScenario?.path?.includes(nodeId) || false, [activeScenario]);
    const isNodeCurrent = useCallback((nodeId) => activeScenario && animationStep >= 0 && activeScenario.path?.[animationStep] === nodeId, [activeScenario, animationStep]);
    const isNodeVisited = useCallback((nodeId) => {
        if (!activeScenario || animationStep < 0) return false;
        const idx = activeScenario.path?.indexOf(nodeId) ?? -1;
        return idx >= 0 && idx < animationStep;
    }, [activeScenario, animationStep]);

    const isEdgeInPath = useCallback((from, to) => {
        if (!activeScenario?.path) return false;
        const path = activeScenario.path;
        for (let i = 0; i < path.length - 1; i++) {
            if ((path[i] === from && path[i + 1] === to) || (path[i] === to && path[i + 1] === from)) return true;
        }
        return false;
    }, [activeScenario]);

    const isEdgeActive = useCallback((from, to) => {
        if (!activeScenario || animationStep < 0 || animationStep >= (activeScenario.path?.length || 0) - 1) return false;
        const current = activeScenario.path[animationStep];
        const next = activeScenario.path[animationStep + 1];
        return (from === current && to === next) || (to === current && from === next);
    }, [activeScenario, animationStep]);

    // ---- Mouse handlers ----
    const handleMouseDown = useCallback((e) => {
        if (nodeDragStart) return; // Don't start canvas drag if we're dragging a node
        if (e.target === svgRef.current || e.target.tagName === 'rect') {
            setIsDragging(true);
            setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        }
    }, [transform, nodeDragStart]);

    const handleMouseMove = useCallback((e) => {
        if (nodeDragStart && editingPositionNode) {
            handleNodeDragMove(e);
            return;
        }
        if (isDragging) setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    }, [isDragging, dragStart, nodeDragStart, editingPositionNode, handleNodeDragMove]);

    const handleMouseUp = useCallback(() => {
        if (nodeDragStart) { handleNodeDragEnd(); return; }
        setIsDragging(false);
    }, [nodeDragStart, handleNodeDragEnd]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.15, Math.min(2, transform.scale * delta));
        setTransform(prev => ({ ...prev, scale: newScale }));
    }, [transform.scale]);

    // ---- Render node shape ----
    const renderNodeShape = (node, isSelected, isHovered, isConnected) => {
        const inPath = isNodeInPath(node.id);
        const isCurrent = isNodeCurrent(node.id);
        const isVisited = isNodeVisited(node.id);

        let opacity = 1, strokeWidth = 2, fillColor = '#ffffff', strokeColor = node.color, glowEffect = false;

        if (activeScenario) {
            if (isCurrent) { fillColor = activeScenario.color; strokeColor = activeScenario.color; strokeWidth = 5; glowEffect = true; }
            else if (isVisited) { fillColor = activeScenario.color + '40'; strokeColor = activeScenario.color; strokeWidth = 3; }
            else if (inPath) { strokeColor = activeScenario.color; strokeWidth = 3; opacity = 0.8; }
            else { opacity = 0.2; }
        } else {
            opacity = selectedNode && !isSelected && !isConnected ? 0.25 : 1;
            fillColor = node.color;
            if (isSelected || isHovered) strokeWidth = 4;
        }

        const glow = glowEffect ? (
            <defs>
                <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
        ) : null;

        if (node.nodeType === 'decision') {
            const size = 32;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <polygon points={`0,${-size} ${size},0 0,${size} ${-size},0`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                    {isCurrent && <polygon points={`0,${-size - 8} ${size + 8},0 0,${size + 8} ${-size - 8},0`} fill="none" stroke={activeScenario.color} strokeWidth={2} opacity={0.5} className="animate-pulse" />}
                </g>
            );
        } else if (node.nodeType === 'kpi') {
            const size = 26;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <rect x={-size} y={-size} width={size * 2} height={size * 2} rx={5} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                    {isCurrent && <rect x={-size - 6} y={-size - 6} width={(size + 6) * 2} height={(size + 6) * 2} rx={8} fill="none" stroke={activeScenario.color} strokeWidth={2} opacity={0.5} className="animate-pulse" />}
                </g>
            );
        } else {
            const size = 30;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <circle r={size} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                    {isCurrent && <circle r={size + 8} fill="none" stroke={activeScenario.color} strokeWidth={2} opacity={0.5} className="animate-pulse" />}
                </g>
            );
        }
    };

    const currentDataFlow = useMemo(() => {
        if (!activeScenario || animationStep < 0) return null;
        return activeScenario.dataFlow?.find(df => df.step === animationStep + 1);
    }, [activeScenario, animationStep]);

    // ---- Loading / Error states ----
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading graph data from API...</p>
                </div>
            </div>
        );
    }

    if (apiError) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-4xl mb-4">!</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
                    <p className="text-sm text-gray-600 mb-4">{apiError}</p>
                    <p className="text-xs text-gray-400 mb-4">Make sure the backend is running at {API_BASE}</p>
                    <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Retry</button>
                </div>
            </div>
        );
    }

    // ---- Relationships for selected node ----
    const nodeRelationships = selectedNode ? relationships.filter(r => r.from === selectedNode || r.to === selectedNode) : [];

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-800 mb-1">Nokia Business Knowledge Graph</h1>
                    <p className="text-sm text-gray-500">T-Mobile Retrofit Project</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {['scenarios', 'explorer', 'manage'].map(tab => (
                        <button key={tab} onClick={() => setSidebarTab(tab)}
                            className={`flex-1 py-3 text-xs font-medium transition-colors ${sidebarTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                            {tab === 'scenarios' ? 'Journeys' : tab === 'explorer' ? 'Explorer' : 'Manage'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* =============== SCENARIOS TAB =============== */}
                    {sidebarTab === 'scenarios' && (
                        <div className="p-4 space-y-4">
                            <div className='flex flex-col-2 gap-2'>
                            <button onClick={() => setJourneyModal({ mode: 'add' })}
                                className="w-1/2 py-2 px-3 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                + Add New Journey
                            </button>
                            <button onClick={() => setChatOpen(true)}
                                className="w-1/2 py-2 px-3 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                Ask me anything
                            </button>
                            </div>

                            {activeScenario && (
                                <div className="p-4 rounded-lg border-2" style={{ borderColor: activeScenario.color, backgroundColor: activeScenario.color + '10' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold" style={{ color: activeScenario.color }}>{activeScenario.shortName || activeScenario.name}</h3>
                                        <div className="flex gap-1">
                                            <button onClick={() => setJourneyModal({ mode: 'edit', journey: activeScenario, journeyKey: activeScenario.id })}
                                                className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700">Edit</button>
                                            <button onClick={() => setConfirmDialog({ title: 'Delete Journey', message: `Delete journey "${activeScenario.shortName || activeScenario.name}"?`, onConfirm: () => { handleDeleteJourney(activeScenario.id); setConfirmDialog(null); } })}
                                                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700">Del</button>
                                            <button onClick={resetView} className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">x Close</button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-3">{activeScenario.description}</p>

                                    <div className="flex gap-2 mb-3">
                                        {!isAnimating ? (
                                            <button onClick={() => startAnimation(activeScenario)} className="flex-1 py-2 px-3 text-xs font-medium text-white rounded-lg" style={{ backgroundColor: activeScenario.color }}>
                                                Play Animation
                                            </button>
                                        ) : (
                                            <button onClick={stopAnimation} className="flex-1 py-2 px-3 text-xs font-medium text-white bg-red-500 rounded-lg">Pause</button>
                                        )}
                                        <button onClick={() => setAnimationStep(-1)} className="py-2 px-3 text-xs font-medium border rounded-lg hover:bg-gray-50">Reset</button>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{Math.max(0, animationStep + 1)} / {activeScenario.path?.length || 0}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full transition-all duration-300"
                                                style={{ width: `${((animationStep + 1) / (activeScenario.path?.length || 1)) * 100}%`, backgroundColor: activeScenario.color }} />
                                        </div>
                                    </div>

                                    {currentDataFlow && (
                                        <div className="p-3 bg-white rounded-lg border">
                                            <div className="text-xs font-semibold text-gray-500 mb-1">Step {currentDataFlow.step}</div>
                                            <div className="text-sm font-medium text-gray-800 mb-1">{currentDataFlow.from} &rarr; {currentDataFlow.to}</div>
                                            <div className="text-xs text-gray-600">{currentDataFlow.action}</div>
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-2">Journey Path</div>
                                        <div className="flex flex-wrap gap-1">
                                            {activeScenario.path?.map((nodeId, idx) => (
                                                <span key={`${nodeId}-${idx}`}
                                                    className={`text-xs px-2 py-1 rounded-full transition-all ${idx === animationStep ? 'text-white font-bold scale-110' : idx < animationStep ? 'text-white opacity-70' : 'bg-gray-100 text-gray-500'}`}
                                                    style={{ backgroundColor: idx <= animationStep ? activeScenario.color : undefined }}>
                                                    {nodeId.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {activeScenario.questions?.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-semibold text-gray-500 mb-2">Questions Answered</div>
                                            <div className="space-y-1">
                                                {activeScenario.questions.map((q, idx) => (
                                                    <div key={idx} className="text-xs p-2 bg-white rounded border text-gray-600">{q}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                {Object.entries(scenariosByCategory).map(([category, scenarios]) => (
                                    <div key={category}>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
                                        <div className="space-y-2">
                                            {scenarios.map(scenario => (
                                                <button key={scenario.id} onClick={() => { setActiveScenario(scenario); setAnimationStep(-1); setIsAnimating(false); }}
                                                    className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${activeScenario?.id === scenario.id ? 'border-opacity-100 bg-opacity-10' : 'border-gray-200 hover:border-gray-300'}`}
                                                    style={{ borderColor: activeScenario?.id === scenario.id ? scenario.color : undefined, backgroundColor: activeScenario?.id === scenario.id ? scenario.color + '10' : undefined }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scenario.color }} />
                                                        <span className="font-medium text-sm text-gray-800">{scenario.shortName || scenario.name}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{scenario.description}</p>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <span className="text-xs text-gray-400">{scenario.path?.length || 0} nodes</span>
                                                        <span className="text-xs text-gray-300">&bull;</span>
                                                        <span className="text-xs text-gray-400">{scenario.dataFlow?.length || 0} steps</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* =============== EXPLORER TAB =============== */}
                    {sidebarTab === 'explorer' && (
                        <div className="p-4 space-y-4">
                            <input type="text" placeholder="Search nodes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

                            <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                {Object.entries(defaultModules).map(([key, { name }]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" checked={showRelationships} onChange={e => setShowRelationships(e.target.checked)} className="w-4 h-4" />
                                Show Relationships
                            </label>

                            <div className="p-3 bg-gray-50 rounded-lg text-xs">
                                <h3 className="font-semibold mb-2">Node Types</h3>
                                <div className="space-y-1 mb-3">
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white"></div>Core Business Concept</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-cyan-500 bg-white"></div>KPI/Signal/Context</div>
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="-10 -10 20 20"><polygon points="0,-8 8,0 0,8 -8,0" fill="white" stroke="#f97316" strokeWidth="2" /></svg>
                                        Decision Point
                                    </div>
                                </div>
                                <h3 className="font-semibold mb-2">Modules</h3>
                                {Object.entries(defaultModules).filter(([k]) => k !== 'all').map(([key, { name, color }]) => (
                                    <div key={key} className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>{name}
                                    </div>
                                ))}
                            </div>

                            {/* Node detail panel */}
                            {selectedNode && nodes[selectedNode] && (
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                    <div className="flex flex-col mb-2">
                                        <div className="flex  grid grid-cols-1 items-center justify-between gap-1">
                                            <h2 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: nodes[selectedNode].color }}>
                                                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: nodes[selectedNode].color }} />
                                                {selectedNode.replace(/_/g, ' ')}
                                            </h2>
                                            <div className="flex gap-1 flex-wrap">
                                                <button
                                                    onClick={() => setChatOpenForNode(selectedNode)}
                                                    title="Ask about this node"
                                                    className="group flex items-center text-xs px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 transition"
                                                >
                                                    <svg className="w-4 h-4 mr-1 opacity-60 group-hover:opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                                    Ask AI
                                                </button>
                                                <button
                                                    onClick={() => setNodeModal({ mode: 'edit', node: nodes[selectedNode] })}
                                                    title="Edit node details"
                                                    className="flex items-center text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition"
                                                >
                                                    <svg className="w-4 h-4 mr-1 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-1.5a2.121 2.121 0 00-3 0L4 15v3h3l9.232-9.232a2.121 2.121 0 000-3z" /></svg>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => startEditPosition(selectedNode)}
                                                    title="Edit node position"
                                                    className={`flex items-center text-xs px-2 py-1 rounded transition ${editingPositionNode === selectedNode ? 'bg-orange-500 text-white' : 'bg-orange-100 hover:bg-orange-200 text-orange-700'}`}
                                                >
                                                    <svg className="w-4 h-4 mr-1 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 21h4M12 17v4m-6.364-2.364l2.121-2.122M6 12H3m1.636-4.364l2.122 2.121M14 3v3m4.364 1.636l-2.122 2.121M21 12h-3m-1.636 4.364l-2.121-2.122" /></svg>
                                                    {editingPositionNode === selectedNode ? 'Moving...' : 'Move Position'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmDialog({
                                                            title: 'Delete Node',
                                                            message: `Delete node "${selectedNode.replace(/_/g, ' ')}"? This will also remove related relationships.`,
                                                            onConfirm: () => {
                                                                handleDeleteNode(selectedNode);
                                                                setConfirmDialog(null);
                                                            }
                                                        })
                                                    }
                                                    title="Delete node"
                                                    className="flex items-center text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition"
                                                >
                                                    <svg className="w-4 h-4 mr-1 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mb-2">
                                        {nodes[selectedNode].nodeType === 'decision' ? 'Decision Point' : nodes[selectedNode].nodeType === 'kpi' ? 'KPI/Signal' : 'Core Concept'}
                                    </span>
                                    <p className="text-sm text-gray-600 mb-2">{nodes[selectedNode].definition}</p>
                                    {nodes[selectedNode].businessMeaning && (
                                        <div className="p-2 bg-blue-50 rounded text-xs text-blue-700 mb-2">
                                            <strong>Business Meaning:</strong> {nodes[selectedNode].businessMeaning}
                                        </div>
                                    )}
                                    {nodes[selectedNode].attributes?.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-semibold mb-1">Attributes:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {nodes[selectedNode].attributes.map((attr, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{attr}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Array.isArray(nodes[selectedNode].dataSources) && nodes[selectedNode].dataSources.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-semibold mb-1">Data Sources:</h4>
                                            <div className="space-y-1">
                                                {nodes[selectedNode].dataSources.map((ds, i) => (
                                                    <div key={i} className="p-1.5 bg-green-50 rounded text-xs">
                                                        <span className="font-medium text-green-800">{ds.source_name || ds}</span>
                                                        {ds.meaning && <span className="text-green-600"> &mdash; {ds.meaning}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Array.isArray(nodes[selectedNode].columnLineage) && nodes[selectedNode].columnLineage.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-semibold mb-1">Column Lineage:</h4>
                                            <div className="space-y-1">
                                                {nodes[selectedNode].columnLineage.map((cl, i) => (
                                                    <div key={i} className="p-1.5 bg-purple-50 rounded text-xs">
                                                        <span className="font-medium text-purple-800">{cl.column_name || cl}</span>
                                                        {cl.join_relation && <span className="text-purple-600"> | {cl.join_relation}</span>}
                                                        {cl.description && <div className="text-purple-500 mt-0.5">{cl.description}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-semibold">Relationships:</h4>
                                            <button onClick={() => setRelModal({ mode: 'add', rel: { from: selectedNode, to: '', label: '', type: '1-to-many', description: '' } })}
                                                className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">+ Add Relation</button>
                                        </div>
                                        <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
                                            {nodeRelationships.map((rel, i) => (
                                                <div key={i} className="p-1.5 bg-gray-50 rounded flex items-center justify-between group">
                                                    <span>{rel.from === selectedNode ? '\u2192' : '\u2190'} {rel.label} {rel.from === selectedNode ? rel.to : rel.from}</span>
                                                    <div className="hidden group-hover:flex gap-1">
                                                        <button onClick={() => setRelModal({ mode: 'edit', rel })} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">Edit</button>
                                                        <button onClick={() => setConfirmDialog({ title: 'Delete Relationship', message: `Delete "${rel.label}" between ${rel.from} and ${rel.to}?`, onConfirm: () => { handleDeleteRelationship(rel.id); setConfirmDialog(null); } })}
                                                            className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Del</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-gray-500">
                                Nodes: {Object.keys(nodes).length} | Links: {relationships.length}<br />
                                Filtered: {filteredNodes.length} nodes, {filteredRelationships.length} links
                            </div>
                        </div>
                    )}

                    {/* =============== MANAGE TAB =============== */}
                    {sidebarTab === 'manage' && (
                        <div className="p-4 space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <h3 className="text-sm font-bold text-blue-800 mb-3">Quick Actions</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => setNodeModal({ mode: 'add' })} className="w-full py-2.5 px-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                        + Add Node
                                    </button>
                                    <button onClick={() => setRelModal({ mode: 'add' })} className="w-full py-2.5 px-3 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                        + Add Relationship
                                    </button>
                                    <button onClick={() => setJourneyModal({ mode: 'add' })} className="w-full py-2.5 px-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        + Add Journey
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h3 className="text-sm font-bold text-gray-700 mb-2">Stats</h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-lg font-bold text-blue-600">{Object.keys(nodes).length}</div>
                                        <div className="text-[10px] text-gray-500">Nodes</div>
                                    </div>
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-lg font-bold text-purple-600">{relationships.length}</div>
                                        <div className="text-[10px] text-gray-500">Relations</div>
                                    </div>
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-lg font-bold text-green-600">{Object.keys(scenarioJourneys).length}</div>
                                        <div className="text-[10px] text-gray-500">Journeys</div>
                                    </div>
                                </div>
                            </div>

                            {/* All Nodes List */}
                            <div>
                                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                                    All Nodes <span className="bg-blue-100 text-blue-700 px-2 rounded-full text-[10px] ml-1">{Object.keys(nodes).length}</span>
                                </h3>
                                <div className="space-y-2 max-h-52 overflow-y-auto">
                                    {Object.values(nodes).length === 0 ? (
                                        <div className="text-center text-xs text-gray-400 py-4 italic">No nodes available.</div>
                                    ) : Object.values(nodes).map(node => (
                                        <div 
                                            key={node.id} 
                                            className="flex items-center justify-between p-2 pl-3 bg-gradient-to-r from-indigo-50 via-white to-blue-50 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md hover:border-blue-200 transition group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: node.color }} />
                                                <span className="text-xs text-gray-800 font-medium">{node.id.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 transition">
                                                <button 
                                                    title="View"
                                                    onClick={() => { setSelectedNode(node.id); setSidebarTab('explorer'); }}
                                                    className="flex items-center gap-1 bg-gray-100 text-gray-600 rounded px-2 py-1 text-[11px] hover:bg-gray-200 font-semibold transition"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 01-6 0"/></svg>
                                                    View
                                                </button>
                                                <button 
                                                    title="Ask"
                                                    onClick={() => { setSelectedNode(node.id); setSidebarTab('explorer'); setChatOpenForNode(node.id); }}
                                                    className="flex items-center gap-1 bg-green-100 text-green-700 rounded px-2 py-1 text-[11px] hover:bg-green-200 font-semibold transition"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 6-9 11-9 11S3 18 3 12a9 9 0 1118 0z"/></svg>
                                                    Ask
                                                </button>
                                                <button 
                                                    title="Edit"
                                                    onClick={() => setNodeModal({ mode: 'edit', node })}
                                                    className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded px-2 py-1 text-[11px] hover:bg-blue-200 font-semibold transition"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5h2M12 7v10m1 4H6a2 2 0 01-2-2V7.83a2 2 0 01.59-1.42l6-6A2 2 0 0113.41 0H18a2 2 0 012 2v8"/></svg>
                                                    Edit
                                                </button>
                                                <button 
                                                    title="Delete"
                                                    onClick={() => setConfirmDialog({ title: 'Delete Node', message: `Delete "${node.id}"?`, onConfirm: () => { handleDeleteNode(node.id); setConfirmDialog(null); } })}
                                                    className="flex items-center gap-1 bg-red-50 text-red-600 rounded px-2 py-1 text-[11px] hover:bg-red-100 font-semibold transition"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                    Del
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* All Relationships List */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">All Relationships ({relationships.length})</h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {relationships.map((rel, i) => (
                                        <div key={rel.id || i} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 group">
                                            <span className="text-xs text-gray-700 truncate">{rel.from} &rarr; {rel.label} &rarr; {rel.to}</span>
                                            <div className="hidden group-hover:flex gap-1 shrink-0">
                                                <button onClick={() => setRelModal({ mode: 'edit', rel })} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">Edit</button>
                                                <button onClick={() => setConfirmDialog({ title: 'Delete Relationship', message: `Delete "${rel.label}"?`, onConfirm: () => { handleDeleteRelationship(rel.id); setConfirmDialog(null); } })}
                                                    className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Del</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* All Journeys List */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">All Journeys ({Object.keys(scenarioJourneys).length})</h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {Object.entries(scenarioJourneys).map(([key, j]) => (
                                        <div key={key} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: j.color }} />
                                                <span className="text-xs text-gray-700">{j.shortName || j.name || key}</span>
                                            </div>
                                            <div className="hidden group-hover:flex gap-1">
                                                <button onClick={() => setJourneyModal({ mode: 'edit', journey: { ...j, id: key }, journeyKey: key })} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">Edit</button>
                                                <button onClick={() => setConfirmDialog({ title: 'Delete Journey', message: `Delete "${j.shortName || j.name}"?`, onConfirm: () => { handleDeleteJourney(key); setConfirmDialog(null); } })}
                                                    className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Del</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modules Editor */}
                            <ModulesEditor modules={defaultModules} onSave={handleSaveModule} onDelete={handleDeleteModule}
                                onConfirm={(title, msg, fn) => setConfirmDialog({ title, message: msg, onConfirm: () => { fn(); setConfirmDialog(null); } })} />

                            {/* Relationship Colors Editor */}
                            <RelColorsEditor colors={relColors} onSave={handleSaveRelColor} onDelete={handleDeleteRelColor}
                                onConfirm={(title, msg, fn) => setConfirmDialog({ title, message: msg, onConfirm: () => { fn(); setConfirmDialog(null); } })} />

                            <button onClick={loadData} className="w-full py-2 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                                Refresh Data from API
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* =============== SVG GRAPH =============== */}
            <svg ref={svgRef} className="flex-1 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
                onClick={() => setSelectedNode(null)}>
                <defs>
                    {Object.entries(relColors).map(([type, color]) => (
                        <marker key={type} id={`arrow-${type}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                        </marker>
                    ))}
                    {activeScenario && (
                        <marker id="arrow-active" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto">
                            <polygon points="0 0, 12 4.5, 0 9" fill={activeScenario.color} />
                        </marker>
                    )}
                </defs>
                <rect width="100%" height="100%" fill="#f8fafc" />
                <g style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transition: isAnimating ? 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.3s ease-out',
                    transformOrigin: '0 0'
                }}>
                    {filteredRelationships.map((rel, idx) => {
                        const fromPos = positions[rel.from];
                        const toPos = positions[rel.to];
                        if (!fromPos || !toPos) return null;

                        const dx = toPos.x - fromPos.x;
                        const dy = toPos.y - fromPos.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const fromNode = nodes[rel.from];
                        const toNode = nodes[rel.to];
                        const fromOffset = fromNode?.nodeType === 'decision' ? 38 : fromNode?.nodeType === 'kpi' ? 30 : 35;
                        const toOffset = toNode?.nodeType === 'decision' ? 38 : toNode?.nodeType === 'kpi' ? 30 : 35;

                        const startX = fromPos.x + (dx / len) * fromOffset;
                        const startY = fromPos.y + (dy / len) * fromOffset;
                        const endX = toPos.x - (dx / len) * toOffset;
                        const endY = toPos.y - (dy / len) * toOffset;

                        const inPath = isEdgeInPath(rel.from, rel.to);
                        const isActive = isEdgeActive(rel.from, rel.to);
                        const isHighlighted = selectedNode === rel.from || selectedNode === rel.to;

                        let strokeColor = '#cbd5e1', strokeWidth = 1.5, opacity = 0.5;
                        let markerEnd = `url(#arrow-${rel.type || 'default'})`;

                        if (activeScenario) {
                            if (isActive) { strokeColor = activeScenario.color; strokeWidth = 5; opacity = 1; markerEnd = 'url(#arrow-active)'; }
                            else if (inPath) { strokeColor = activeScenario.color; strokeWidth = 3; opacity = 0.7; }
                            else { opacity = 0.15; }
                        } else if (isHighlighted) { strokeColor = relColors[rel.type] || relColors.default || '#6b7280'; strokeWidth = 3; opacity = 1; }
                        else if (selectedNode) { opacity = 0.2; }

                        return (
                            <g key={idx}>
                                <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity}
                                    markerEnd={markerEnd} className={isActive ? 'animate-pulse' : ''} />
                                <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} textAnchor="middle" fill={opacity >= 0.9 ? strokeColor : '#000000'}
                                    fontSize="10" fontWeight="600" opacity={opacity}>{rel.label}</text>
                            </g>
                        );
                    })}

                    {filteredNodes.map(node => {
                        const pos = positions[node.id];
                        if (!pos) return null;

                        const isSelected = selectedNode === node.id;
                        const isHovered = hoveredNode === node.id;
                        const isConnected = selectedNode && relationships.some(
                            r => (r.from === selectedNode && r.to === node.id) || (r.to === selectedNode && r.from === node.id)
                        );
                        const inPath = isNodeInPath(node.id);
                        const isCurrent = isNodeCurrent(node.id);
                        const isEditingPos = editingPositionNode === node.id;

                        return (
                            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}
                                onClick={e => { e.stopPropagation(); if (!isEditingPos) { setSelectedNode(node.id); setSidebarTab('explorer'); } }}
                                onMouseDown={e => { if (isEditingPos) handleNodeDragStart(e, node.id); }}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className={isEditingPos ? 'cursor-move' : 'cursor-pointer'}>
                                {renderNodeShape(node, isSelected, isHovered, isConnected)}
                                {/* Dashed ring to indicate node is in position-edit mode */}
                                {isEditingPos && (
                                    <circle r={40} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" className="animate-pulse" />
                                )}
                                <text textAnchor="middle" dy={node.nodeType === 'decision' ? 50 : node.nodeType === 'kpi' ? 45 : 48}
                                    fill={activeScenario ? (inPath ? (isCurrent ? activeScenario.color : '#374151') : '#9ca3af') : node.color}
                                    fontSize="11" fontWeight={isCurrent ? '700' : '600'} opacity={1}>
                                    {node.id.replace(/_/g, ' ').length > 16 ? node.id.replace(/_/g, ' ').slice(0, 80) : node.id.replace(/_/g, ' ')}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(2, p.scale * 1.2) }))}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-xl font-bold hover:bg-gray-50">+</button>
                <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.15, p.scale / 1.2) }))}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-xl font-bold hover:bg-gray-50">-</button>
                <button onClick={() => setTransform({ x: 50, y: 50, scale: 0.45 })}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-sm hover:bg-gray-50">H</button>
            </div>

            {/* Position editing save/cancel bar */}
            {editingPositionNode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-50 border-2 border-orange-400 px-5 py-3 rounded-xl shadow-lg flex items-center gap-4 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold text-orange-800">
                            Editing position: <span className="font-bold">{editingPositionNode.replace(/_/g, ' ')}</span>
                        </span>
                    </div>
                    <span className="text-xs text-orange-600">Drag the node to move it</span>
                    <div className="flex gap-2">
                        <button onClick={cancelEditPosition}
                            className="px-4 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={saveEditPosition}
                            className="px-4 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                            Save Position
                        </button>
                    </div>
                </div>
            )}

            {/* Top bar when scenario active */}
            {activeScenario && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 px-5 py-4 rounded-xl border border-gray-300 shadow-lg flex items-center gap-5 min-w-[350px] z-10">
                    <div className="flex flex-col flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block w-3 h-3 rounded-full border" style={{ backgroundColor: activeScenario.color, borderColor: activeScenario.color }} />
                            <span className="font-semibold text-gray-800 text-base">{activeScenario.name}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{activeScenario.description}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <div className="bg-gray-200 text-gray-800 text-[11px] px-2 py-0.5 rounded font-medium">
                                Flow Steps: <span className="font-bold">{activeScenario.path?.length || 0}</span>
                            </div>
                            <div className="bg-gray-200 text-gray-800 text-[11px] px-2 py-0.5 rounded font-medium">
                                Category: <span className="font-bold">{activeScenario.category}</span>
                            </div>
                        </div>
                    </div>
                    <button title="Exit Flow" onClick={resetView}
                        className="ml-3 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-semibold shadow border border-red-400 transition">
                        Exit Flow
                    </button>
                </div>
            )}

            {/* Animation indicator */}
            {activeScenario && isAnimating && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white font-medium"
                    style={{ backgroundColor: activeScenario.color }}>
                    <div className="flex items-center gap-3">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Traversing: {activeScenario.path?.[animationStep]?.replace(/_/g, ' ')}</span>
                    </div>
                </div>
            )}

            {/* =============== MODALS =============== */}
            {nodeModal && (
                <NodeFormModal
                    node={nodeModal.node}
                    nodes={nodes}
                    modules={defaultModules}
                    onSave={handleSaveNode}
                    onClose={() => setNodeModal(null)}
                    mode={nodeModal.mode}
                />
            )}
            {relModal && (
                <RelationshipFormModal
                    rel={relModal.rel}
                    nodes={nodes}
                    onSave={handleSaveRelationship}
                    onClose={() => setRelModal(null)}
                    mode={relModal.mode}
                />
            )}
            {journeyModal && (
                <JourneyFormModal
                    journey={journeyModal.journey}
                    journeyKey={journeyModal.journeyKey}
                    nodes={nodes}
                    onSave={handleSaveJourney}
                    onClose={() => setJourneyModal(null)}
                    mode={journeyModal.mode}
                />
            )}
            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {chatOpenForNode && nodes[chatOpenForNode] && (
                <Modal
                    title={`Ask about: ${(nodes[chatOpenForNode].id || '').replace(/_/g, ' ')}`}
                    onClose={() => setChatOpenForNode(null)}
                    wide
                    variant="chat"
                >
                    <NodeChatPanel
                        nodeId={chatOpenForNode}
                        nodeName={(nodes[chatOpenForNode].id || '').replace(/_/g, ' ')}
                        onClose={() => setChatOpenForNode(null)}
                        onSend={async (node_id, message) => apiFetch('/api/chat/node', { method: 'POST', body: JSON.stringify({ node_id, message }) })}
                        inModal
                    />
                </Modal>
            )}
            {chatOpen && (
                <Modal
                    title={`Ask about: ${('Anything' || '').replace(/_/g, ' ')}`}
                    onClose={() => setChatOpen(null)}
                    wide
                    variant="chat"
                >
                    <NodeChatPanel
                        nodeId={chatOpenForNode}
                        nodeName={('Business knowledge graph' || '').replace(/_/g, ' ')}
                        onClose={() => setChatOpen(null)}
                        onSend={async (node_id,message) => apiFetch('/api/chat/fulldb', { method: 'POST', body: JSON.stringify({ node_id:"None",message }) })}
                        inModal
                    />
                </Modal>
            )}
        </div>
    );
};

export default NokiaBusinessKnowledgeGraph;
