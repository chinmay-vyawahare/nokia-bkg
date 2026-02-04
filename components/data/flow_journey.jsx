const SCENARIO_JOURNEYS = {
    weekly_plan_chicago: {
        id: 'weekly_plan_chicago',
        name: 'Weekly Planning - Chicago Market',
        shortName: 'Weekly Plan (Chicago)',
        description: 'Plan for 100 sites in 3 weeks with dependency status and action plan',
        color: '#10b981',
        category: 'Planning',
        path: ['Market', 'Site','Site_Readiness_Rate','Site', 'Project', 'NTP_Document', 'Survey', 'Scoping_Package', 'BOM', 'Purchase_Order', 'Material', 'Material_Availability_Rate'],
        dataFlow: [
            { step: 1, from: 'Market', to: 'Site', action: 'Filter sites located in Chicago market (LOCATED_IN)' },
            { step: 2, from: 'Site', to: 'Site_Readiness_Rate', action: 'Get projects per site - Completed/WIP/Pending (HAS_PROJECTS)' },
            { step: 3, from: 'Site', to: 'Project', action: 'Get projects per site - Completed/WIP/Pending (HAS_PROJECTS)' },
            { step: 4, from: 'Site_Readiness_Rate', to: 'Project', action: 'Get projects per site - Completed/WIP/Pending (HAS_PROJECTS)' },
            { step: 5, from: 'Project', to: 'NTP_Document', action: 'Check NTP prerequisite status (REQUIRES)' },
            { step: 6, from: 'NTP_Document', to: 'Survey', action: 'Verify survey enabled by NTP (ENABLES)' },
            { step: 7, from: 'Survey', to: 'Scoping_Package', action: 'Validate scoping package produced (PRODUCES)' },
            { step: 8, from: 'Scoping_Package', to: 'BOM', action: 'Check BOM generated from scope (GENERATES)' },
            { step: 9, from: 'BOM', to: 'Purchase_Order', action: 'Verify PO triggered for materials (TRIGGERS)' },
            { step: 10, from: 'Purchase_Order', to: 'Material', action: 'Track material procurement status (PROCURES)' },
            { step: 11, from: 'Material', to: 'Material_Availability_Rate', action: 'Calculate material availability KPI (FEEDS)' }
        ],
        questions: [
            'What is the total number of sites, completed sites and WIP for Chicago market?',
            'What are the Ready Sites (all prerequisites met)?',
            'What is the Mean/Median time taken for each prerequisite?',
            'What is the Vendor capacity for Chicago market?'
        ]
    },

    five_g_upgrade_tracking: {
        id: 'five_g_upgrade_tracking',
        name: '5G Upgrade Management',
        shortName: '5G Upgrade Tracking',
        description: 'Track telecom site upgrades across markets for 5G readiness including equipment and vendor coordination',
        color: '#8b5cf6',
        category: 'Planning',
        path: ['Market', 'Site', 'Project', 'NTP_Document', 'Survey', 'Scoping_Package', 'BOM', 'Purchase_Order','Material', 'Material_Availability_Rate','Material', 'Warehouse',],
        dataFlow: [
            { step: 1, from: 'Market', to: 'Site', action: 'Get total sites by market and region (LOCATED_IN)' },
            { step: 2, from: 'Site', to: 'Project', action: 'Filter by upgrade type/program name (HAS_PROJECTS)' },
            { step: 3, from: 'Project', to: 'NTP_Document', action: 'Check NTP authorization status (REQUIRES)' },
            { step: 4, from: 'NTP_Document', to: 'Survey', action: 'Verify survey completion - Drone/Manual (ENABLES)' },
            { step: 5, from: 'Survey', to: 'Scoping_Package', action: 'Validate scope with material/labor estimates (PRODUCES)' },
            { step: 6, from: 'Scoping_Package', to: 'BOM', action: 'Generate Bill of Materials for 5G equipment (GENERATES)' },
            { step: 7, from: 'BOM', to: 'Purchase_Order', action: 'Create PO for RRU/BBU/antenna procurement (TRIGGERS)' },
            { step: 8, from: 'Purchase_Order', to: 'Material', action: 'Track equipment delivery status (PROCURES)' },
            { step: 9, from: 'Material', to: 'Material_Availability_Rate', action: 'Calculate 5G equipment availability rate (FEEDS)' },
            { step: 10, from: 'Material', to: 'Warehouse', action: 'Verify materials stored at distribution center (STORED_IN)' },
        ],
        questions: [
            'How many sites do we have in each market and upgrade type?',
            'Which sites are ready for upgrade and which are blocked, and why?',
            'How long does each prerequisite usually take (equipment, permissions)?',
            'What is the material availability rate for 5G equipment?'
        ]
    },
    delayed_rollout_recovery: {
        id: 'delayed_rollout_recovery',
        name: 'Delayed Rollout Recovery',
        shortName: 'Schedule Recovery',
        description: 'Recover delayed telecom rollout with realistic week-by-week plan by optimizing crews, clearing blockers, and prioritizing ready sites',
        color: '#ef4444',
        category: 'Planning',
        path: ['Market', 'Site', 'Project', 'Milestone_Status', 'Plan_vs_Actual', 'Schedule_Recovery_Decision', 'Integration_Backlog', 'Integration', 'Integration_Readiness_Decision', 'Backhaul'],
        dataFlow: [
            { step: 1, from: 'Market', to: 'Site', action: 'Get total sites in market - Completed/In-Progress/Not Started (LOCATED_IN)' },
            { step: 2, from: 'Site', to: 'Project', action: 'Classify projects by status and identify blockers (HAS_PROJECTS)' },
            { step: 3, from: 'Project', to: 'Milestone_Status', action: 'Track 200+ milestones per project (TRACKED_BY)' },
            { step: 4, from: 'Milestone_Status', to: 'Plan_vs_Actual', action: 'Calculate variance between planned vs actual dates (FEEDS)' },
            { step: 5, from: 'Plan_vs_Actual', to: 'Schedule_Recovery_Decision', action: 'Trigger recovery when variance exceeds threshold (TRIGGERS)' },
            { step: 6, from: 'Integration_Backlog', to: 'Schedule_Recovery_Decision', action: 'High backlog also triggers recovery action (TRIGGERS)' },
            { step: 7, from: 'Integration', to: 'Integration_Backlog', action: 'Track sites awaiting integration (FEEDS)' },
            { step: 8, from: 'Integration_Readiness_Decision', to: 'Integration', action: 'Readiness check enables integration start (ENABLES)' },
            { step: 9, from: 'Backhaul', to: 'Integration_Readiness_Decision', action: 'Backhaul status feeds readiness decision (FEEDS)' }
        ],
        questions: [
            'How many sites are completed, in progress, and still pending?',
            'How many sites are blocked and what is blocking them?',
            'What is the plan vs actual variance for key milestones?',
            'Can the current plan meet the target date with recovery actions?'
        ]
    },
    gc_crew_reduction_impact: {
        id: 'gc_crew_reduction_impact',
        name: 'GC Crew Reduction Impact',
        shortName: 'Vendor Crew Loss (50%)',
        description: 'CX completion plan when leading vendor loses 50% of crews - reassignment and reallocation simulation',
        color: '#f97316',
        category: 'Resource Management',
        path: ['Market', 'General_Contractor', 'Crew', 'Site', 'HSE_Compliance', 'HSE_Compliance_Rate', 'Vendor_Performance_Score', 'Vendor_Selection_Decision'],
        dataFlow: [
            { step: 1, from: 'Market', to: 'General_Contractor', action: 'Identify GCs operating in target market (OPERATES_IN)' },
            { step: 2, from: 'General_Contractor', to: 'Crew', action: 'Get crew counts per GC - identify top vendor (MANAGES)' },
            { step: 3, from: 'Crew', to: 'Site', action: 'Map current crew-to-site assignments (ASSIGNED_TO)' },
            { step: 4, from: 'Crew', to: 'HSE_Compliance', action: 'Verify remaining crews have HSE compliance (MUST_HAVE)' },
            { step: 5, from: 'HSE_Compliance', to: 'HSE_Compliance_Rate', action: 'Calculate safety compliance rate per GC (FEEDS)' },
            { step: 6, from: 'HSE_Compliance_Rate', to: 'Vendor_Performance_Score', action: 'Safety score contributes to vendor rating (CONTRIBUTES_TO)' },
            { step: 7, from: 'Vendor_Performance_Score', to: 'Vendor_Selection_Decision', action: 'Use performance scores for workload reallocation (INPUTS_TO)' }
        ],
        questions: [
            'How many sites are pending CX start?',
            'How many crews are working and who is the top vendor?',
            'Which vendors have capacity to absorb reassigned sites?',
            'After reassigning sites to reduced crews, what is the revised plan?'
        ]
    },
    
};

export default SCENARIO_JOURNEYS;