import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import SCENARIO_JOURNEYS from '@/components/data/flow_journey.jsx';
import INITIAL_NODES from '@/components/data/nodes.jsx';
import INITIAL_RELATIONSHIPS from '@/components/data/relationships.jsx';
import INITIAL_POSITIONS from '@/components/data/positions.jsx';
import DEFAULT_MODULES from '@/components/data/default_nodes.jsx';
import RELATIONSHIP_COLORS from '@/components/data/color_selections.jsx';

const getRelationshipColor = (type) => RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.default;

const NokiaBusinessKnowledgeGraph = () => {
    const [nodes] = useState(INITIAL_NODES);
    const [relationships] = useState(INITIAL_RELATIONSHIPS);
    const [positions] = useState(INITIAL_POSITIONS);
    const [scenarioJourneys] = useState(SCENARIO_JOURNEYS);
    const [defaultModules] = useState(DEFAULT_MODULES);
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

    const scenariosByCategory = useMemo(() => {
        const grouped = {};
        Object.values(scenarioJourneys).forEach(scenario => {
            if (!grouped[scenario.category]) {
                grouped[scenario.category] = [];
            }
            grouped[scenario.category].push(scenario);
        });
        return grouped;
    }, []);

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

    const startAnimation = useCallback((scenario) => {
        setActiveScenario(scenario);
        setAnimationStep(0);
        setIsAnimating(true);
        setSelectedNode(null);

        const firstNode = scenario.path[0];
        const pos = positions[firstNode];
        if (pos) {
            setTransform(prev => ({
                x: -pos.x * prev.scale + 500,
                y: -pos.y * prev.scale + 350,
                scale: prev.scale
            }));
        }
    }, [positions]);

    const stopAnimation = useCallback(() => {
        setIsAnimating(false);
        setAnimationStep(-1);
        if (animationRef.current) {
            clearInterval(animationRef.current);
        }
    }, []);

    const resetView = useCallback(() => {
        setActiveScenario(null);
        setAnimationStep(-1);
        setIsAnimating(false);
        setTransform({ x: 50, y: 50, scale: 0.45 });
        if (animationRef.current) {
            clearInterval(animationRef.current);
        }
    }, []);

    useEffect(() => {
        if (isAnimating && activeScenario) {
            animationRef.current = setInterval(() => {
                setAnimationStep(prev => {
                    if (prev >= activeScenario.path.length - 1) {
                        setIsAnimating(false);
                        return prev;
                    }

                    const nextNode = activeScenario.path[prev + 1];
                    const pos = positions[nextNode];
                    if (pos) {
                        requestAnimationFrame(() => {
                            setTransform(t => ({
                                ...t,
                                x: -pos.x * t.scale + 500,
                                y: -pos.y * t.scale + 350
                            }));
                        });
                    }

                    return prev + 1;
                });
            }, 1500);

            return () => clearInterval(animationRef.current);
        }
    }, [isAnimating, activeScenario, positions]);

    const isNodeInPath = useCallback((nodeId) => {
        if (!activeScenario) return false;
        return activeScenario.path.includes(nodeId);
    }, [activeScenario]);

    const isNodeCurrent = useCallback((nodeId) => {
        if (!activeScenario || animationStep < 0) return false;
        return activeScenario.path[animationStep] === nodeId;
    }, [activeScenario, animationStep]);

    const isNodeVisited = useCallback((nodeId) => {
        if (!activeScenario || animationStep < 0) return false;
        const nodeIndex = activeScenario.path.indexOf(nodeId);
        return nodeIndex >= 0 && nodeIndex < animationStep;
    }, [activeScenario, animationStep]);

    const isEdgeInPath = useCallback((from, to) => {
        if (!activeScenario) return false;
        const path = activeScenario.path;
        for (let i = 0; i < path.length - 1; i++) {
            if ((path[i] === from && path[i + 1] === to) || (path[i] === to && path[i + 1] === from)) {
                return true;
            }
        }
        return false;
    }, [activeScenario]);

    const isEdgeActive = useCallback((from, to) => {
        if (!activeScenario || animationStep < 0) return false;
        const path = activeScenario.path;
        if (animationStep >= path.length - 1) return false;
        const current = path[animationStep];
        const next = path[animationStep + 1];
        return (from === current && to === next) || (to === current && from === next);
    }, [activeScenario, animationStep]);

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

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.15, Math.min(2, transform.scale * delta));
        setTransform(prev => ({ ...prev, scale: newScale }));
    }, [transform.scale]);

    const renderNodeShape = (node, isSelected, isHovered, isConnected) => {
        const inPath = isNodeInPath(node.id);
        const isCurrent = isNodeCurrent(node.id);
        const isVisited = isNodeVisited(node.id);

        let opacity = 1;
        let strokeWidth = 2;
        let fillColor = '#ffffff';
        let strokeColor = node.color;
        let glowEffect = false;

        if (activeScenario) {
            if (isCurrent) {
                fillColor = activeScenario.color;
                strokeColor = activeScenario.color;
                strokeWidth = 5;
                glowEffect = true;
            } else if (isVisited) {
                fillColor = activeScenario.color + '40';
                strokeColor = activeScenario.color;
                strokeWidth = 3;
            } else if (inPath) {
                strokeColor = activeScenario.color;
                strokeWidth = 3;
                opacity = 0.8;
            } else {
                opacity = 0.2;
            }
        } else {
            opacity = selectedNode && !isSelected && !isConnected ? 0.25 : 1;
            fillColor = node.color;
            if (isSelected || isHovered) strokeWidth = 4;
        }

        const glow = glowEffect ? (
            <defs>
                <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        ) : null;

        if (node.nodeType === 'decision') {
            const size = 32;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <polygon
                        points={`0,${-size} ${size},0 0,${size} ${-size},0`}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                    />
                    {isCurrent && (
                        <polygon
                            points={`0,${-size - 8} ${size + 8},0 0,${size + 8} ${-size - 8},0`}
                            fill="none"
                            stroke={activeScenario.color}
                            strokeWidth={2}
                            opacity={0.5}
                            className="animate-pulse"
                        />
                    )}
                </g>
            );
        } else if (node.nodeType === 'kpi') {
            const size = 26;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <rect
                        x={-size} y={-size} width={size * 2} height={size * 2} rx={5}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                    />
                    {isCurrent && (
                        <rect
                            x={-size - 6} y={-size - 6} width={(size + 6) * 2} height={(size + 6) * 2} rx={8}
                            fill="none"
                            stroke={activeScenario.color}
                            strokeWidth={2}
                            opacity={0.5}
                            className="animate-pulse"
                        />
                    )}
                </g>
            );
        } else {
            const size = 30;
            return (
                <g filter={glowEffect ? `url(#glow-${node.id})` : undefined}>
                    {glow}
                    <circle
                        r={size}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                    />
                    {isCurrent && (
                        <circle
                            r={size + 8}
                            fill="none"
                            stroke={activeScenario.color}
                            strokeWidth={2}
                            opacity={0.5}
                            className="animate-pulse"
                        />
                    )}
                </g>
            );
        }
    };

    const currentDataFlow = useMemo(() => {
        if (!activeScenario || animationStep < 0) return null;
        return activeScenario.dataFlow.find(df => df.step === animationStep + 1);
    }, [activeScenario, animationStep]);

    return (
        <div className="flex h-screen bg-slate-50">
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-800 mb-1">Nokia Business Knowledge Graph</h1>
                    <p className="text-sm text-gray-500">T-Mobile Retrofit Project</p>
                </div>

                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setSidebarTab('scenarios')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${sidebarTab === 'scenarios'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        📊 Scenario Journeys
                    </button>
                    <button
                        onClick={() => setSidebarTab('explorer')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${sidebarTab === 'explorer'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        🔍 Graph Explorer
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {sidebarTab === 'scenarios' ? (
                        <div className="p-4 space-y-4">
                            {activeScenario && (
                                <div className="p-4 rounded-lg border-2" style={{ borderColor: activeScenario.color, backgroundColor: activeScenario.color + '10' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold" style={{ color: activeScenario.color }}>{activeScenario.shortName}</h3>
                                        <button
                                            onClick={resetView}
                                            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                        >
                                            ✕ Close
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-3">{activeScenario.description}</p>

                                    <div className="flex gap-2 mb-3">
                                        {!isAnimating ? (
                                            <button
                                                onClick={() => startAnimation(activeScenario)}
                                                className="flex-1 py-2 px-3 text-xs font-medium text-white rounded-lg transition-colors"
                                                style={{ backgroundColor: activeScenario.color }}
                                            >
                                                ▶ Play Animation
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopAnimation}
                                                className="flex-1 py-2 px-3 text-xs font-medium text-white bg-red-500 rounded-lg"
                                            >
                                                ⏸ Pause
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setAnimationStep(-1)}
                                            className="py-2 px-3 text-xs font-medium border rounded-lg hover:bg-gray-50"
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{Math.max(0, animationStep + 1)} / {activeScenario.path.length}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-300"
                                                style={{
                                                    width: `${((animationStep + 1) / activeScenario.path.length) * 100}%`,
                                                    backgroundColor: activeScenario.color
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {currentDataFlow && (
                                        <div className="p-3 bg-white rounded-lg border">
                                            <div className="text-xs font-semibold text-gray-500 mb-1">Step {currentDataFlow.step}</div>
                                            <div className="text-sm font-medium text-gray-800 mb-1">
                                                {currentDataFlow.from} → {currentDataFlow.to}
                                            </div>
                                            <div className="text-xs text-gray-600">{currentDataFlow.action}</div>
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-2">Journey Path</div>
                                        <div className="flex flex-wrap gap-1">
                                            {activeScenario?.path?.map((nodeId, idx) => (
                                                <span
                                                    key={`${nodeId}-${idx}`}
                                                    className={`text-xs px-2 py-1 rounded-full transition-all ${idx === animationStep
                                                        ? 'text-white font-bold scale-110'
                                                        : idx < animationStep
                                                            ? 'text-white opacity-70'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                    style={{
                                                        backgroundColor: idx <= animationStep ? activeScenario.color : undefined
                                                    }}
                                                >
                                                    {nodeId.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-2">Questions Answered</div>
                                        <div className="space-y-1">
                                            {activeScenario.questions.map((q, idx) => (
                                                <div key={idx} className="text-xs p-2 bg-white rounded border text-gray-600">
                                                    • {q}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {Object.entries(scenariosByCategory).map(([category, scenarios]) => (
                                    <div key={category}>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
                                        <div className="space-y-2">
                                            {scenarios.map(scenario => (
                                                <button
                                                    key={scenario.id}
                                                    onClick={() => {
                                                        setActiveScenario(scenario);
                                                        setAnimationStep(-1);
                                                        setIsAnimating(false);
                                                    }}
                                                    className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${activeScenario?.id === scenario.id
                                                        ? 'border-opacity-100 bg-opacity-10'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    style={{
                                                        borderColor: activeScenario?.id === scenario.id ? scenario.color : undefined,
                                                        backgroundColor: activeScenario?.id === scenario.id ? scenario.color + '10' : undefined
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: scenario.color }}
                                                        />
                                                        <span className="font-medium text-sm text-gray-800">{scenario.shortName}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{scenario.description}</p>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <span className="text-xs text-gray-400">{scenario.path.length} nodes</span>
                                                        <span className="text-xs text-gray-300">•</span>
                                                        <span className="text-xs text-gray-400">{scenario.dataFlow.length} steps</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <input
                                type="text" placeholder="Search nodes..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            <select
                                value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
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

                            {selectedNode && nodes[selectedNode] && (
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                    <h2 className="text-lg font-bold mb-1" style={{ color: nodes[selectedNode].color }}>
                                        {selectedNode.replace(/_/g, ' ')}
                                    </h2>
                                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mb-2">
                                        {nodes[selectedNode].nodeType === 'decision' ? 'Decision Point' : nodes[selectedNode].nodeType === 'kpi' ? 'KPI/Signal' : 'Core Concept'}
                                    </span>
                                    <p className="text-sm text-gray-600 mb-2">{nodes[selectedNode].definition}</p>
                                    {nodes[selectedNode].businessMeaning && (
                                        <div className="p-2 bg-blue-50 rounded text-xs text-blue-700 mb-2">
                                            <strong>Business Meaning:</strong> {nodes[selectedNode].businessMeaning}
                                        </div>
                                    )}

                                    {nodes[selectedNode].dataSources && (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-semibold mb-1">Data Sources:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {nodes[selectedNode].dataSources.map((ds, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded"></span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {nodes[selectedNode].columnLineage && (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-semibold mb-1">Column Lineage:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {nodes[selectedNode].columnLineage.map((cl, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded"> </span>
                                                ))}
                                            </div>
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
                                    <div>
                                        <h4 className="text-xs font-semibold mb-1">Relationships:</h4>
                                        <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                            {relationships.filter(r => r.from === selectedNode || r.to === selectedNode).map((rel, i) => (
                                                <div key={i} className="p-1 bg-gray-50 rounded">
                                                    {rel.from === selectedNode ? '→' : '←'} {rel.label} {rel.from === selectedNode ? rel.to : rel.from}
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
                </div>
            </div>

            <svg
                ref={svgRef}
                className="flex-1 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onClick={() => setSelectedNode(null)}
            >
                <defs>
                    {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
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
                <g
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transition: isAnimating ? 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.3s ease-out',
                        transformOrigin: '0 0'
                    }}
                >
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

                        let strokeColor = '#cbd5e1';
                        let strokeWidth = 1.5;
                        let opacity = 0.5;
                        let markerEnd = `url(#arrow-${rel.type || 'default'})`;

                        if (activeScenario) {
                            if (isActive) {
                                strokeColor = activeScenario.color;
                                strokeWidth = 5;
                                opacity = 1;
                                markerEnd = 'url(#arrow-active)';
                            } else if (inPath) {
                                strokeColor = activeScenario.color;
                                strokeWidth = 3;
                                opacity = 0.7;
                            } else {
                                opacity = 0.15;
                            }
                        } else if (isHighlighted) {
                            strokeColor = getRelationshipColor(rel.type);
                            strokeWidth = 3;
                            opacity = 1;
                        } else if (selectedNode) {
                            opacity = 0.2;
                        }

                        return (
                            <g key={idx}>
                                <line
                                    x1={startX} y1={startY} x2={endX} y2={endY}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    opacity={opacity}
                                    markerEnd={markerEnd}
                                    className={isActive ? 'animate-pulse' : ''}
                                />
                                <text
                                    x={(startX + endX) / 2} y={(startY + endY) / 2 - 8}
                                    textAnchor="middle" fill={opacity >= 0.9 ? strokeColor : '#000000'} fontSize="10" fontWeight="600"
                                    opacity={opacity}
                                >
                                    {rel.label}
                                </text>
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

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${pos.x}, ${pos.y})`}
                                onClick={e => { e.stopPropagation(); setSelectedNode(node.id); }}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className="cursor-pointer"
                            >
                                {renderNodeShape(node, isSelected, isHovered, isConnected)}
                                <text
                                    textAnchor="middle"
                                    dy={node.nodeType === 'decision' ? 50 : node.nodeType === 'kpi' ? 45 : 48}
                                    fill={activeScenario ? (inPath ? (isCurrent ? activeScenario.color : '#374151') : '#9ca3af') : node.color}
                                    fontSize="11"
                                    fontWeight={isCurrent ? '700' : '600'}
                                    opacity={1}
                                >
                                    {node.id.replace(/_/g, ' ').length > 16 ? node.id.replace(/_/g, ' ').slice(0, 80) + '' : node.id.replace(/_/g, ' ')}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(2, p.scale * 1.2) }))}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-xl font-bold hover:bg-gray-50">+</button>
                <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.15, p.scale / 1.2) }))}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-xl font-bold hover:bg-gray-50">-</button>
                <button onClick={() => setTransform({ x: 50, y: 50, scale: 0.45 })}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm text-sm hover:bg-gray-50">⌂</button>
            </div>

            {activeScenario && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 px-5 py-4 rounded-xl border border-gray-300 shadow-lg flex items-center gap-5 min-w-[350px] z-10">
                    <div className="flex flex-col flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="inline-block w-3 h-3 rounded-full border"
                                style={{ backgroundColor: activeScenario.color, borderColor: activeScenario.color }}
                            />
                            <span className="font-semibold text-gray-800 text-base">{activeScenario.name}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{activeScenario.description}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <div className="bg-gray-200 text-gray-800 text-[11px] px-2 py-0.5 rounded font-medium">
                                Flow Steps: <span className="font-bold">{activeScenario.path.length}</span>
                            </div>
                            <div className="bg-gray-200 text-gray-800 text-[11px] px-2 py-0.5 rounded font-medium">
                                Category: <span className="font-bold">{activeScenario.category}</span>
                            </div>
                        </div>
                        {activeScenario.questions && activeScenario.questions.length > 0 && (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-blue-600 underline">Show sample business questions</summary>
                                <ul className="text-xs text-gray-700 list-disc ml-5 mt-1">
                                    {activeScenario.questions.map((q, i) => (
                                        <li key={i}>{q}</li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                    <button
                        title="Exit Flow Animation and Reset View"
                        onClick={resetView}
                        className="ml-3 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-semibold shadow border border-red-400 transition"
                    >
                        Exit Flow
                    </button>
                </div>
            )}

            {activeScenario && isAnimating && (
                <div
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white font-medium"
                    style={{ backgroundColor: activeScenario.color }}
                >
                    <div className="flex items-center gap-3">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Traversing: {activeScenario.path[animationStep]?.replace(/_/g, ' ')}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NokiaBusinessKnowledgeGraph;