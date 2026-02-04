const DEFAULT_MODULES = {
    all: { name: 'All Modules', color: '#6b7280', description: 'Display all nodes' },
    planning: { name: 'Planning & Scoping', color: '#3b82f6', description: 'Site planning, surveys, and scoping activities' },
    construction: { name: 'Construction', color: '#f59e0b', description: 'Civil and tower construction activities' },
    integration: { name: 'Integration & On-Air', color: '#10b981', description: 'Integration, testing, and go-live activities' },
    quality: { name: 'Quality & Safety', color: '#ef4444', description: 'HSE compliance, quality checks, and audits' },
    resources: { name: 'Resources & Vendors', color: '#8b5cf6', description: 'GC vendors, crews, and capacity management' },
    materials: { name: 'Materials & Logistics', color: '#ec4899', description: 'Material ordering, delivery, and tracking' },
    kpi: { name: 'KPIs & Metrics', color: '#06b6d4', description: 'Key performance indicators and derived metrics' },
    decision: { name: 'Decisions', color: '#f97316', description: 'Decision points using multiple inputs' }
};

export default DEFAULT_MODULES;