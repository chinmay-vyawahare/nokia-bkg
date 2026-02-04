const INITIAL_NODES = {
    'Site': {
        id: 'Site', module: 'planning', nodeType: 'core',
        definition: 'A cell tower location that needs radio equipment upgrade/installation',
        businessMeaning: 'Primary work unit - each site has unique characteristics (market, region, area) and requirements',
        color: '#3b82f6',
        attributes: ['site_id', 'site_code', 'market', 'region', 'area', 'structure_type', 'structure_height', 'landlord_name', 'latitude', 'longitude'],
        dataSources:[],
        columnLineage: []
    },
    'Project': {
        id: 'Project', module: 'planning', nodeType: 'core',
        definition: 'A specific work order/scope for a site - one site can have multiple projects',
        businessMeaning: 'Unique work package tracked by project_id - primary key for milestone tracking',
        color: '#3b82f6',
        attributes: ['project_id', 'project_name', 'program_name', 'project_status', 'project_type', 'scope_type'],
        dataSources:[],
        columnLineage: []
    },
    'Survey': {
        id: 'Survey', module: 'planning', nodeType: 'core',
        definition: 'Site assessment to determine work requirements - can be Drone or Manual',
        businessMeaning: 'Critical prerequisite for scoping - determines material needs and effort estimates',
        color: '#3b82f6',
        attributes: ['survey_type', 'survey_date', 'survey_status', 'surveyor_id', 'MS_1316', 'MS_1321'],
        dataSources:[],
        columnLineage: []
    },
    'Scoping_Package': {
        id: 'Scoping_Package', module: 'planning', nodeType: 'core',
        definition: 'Detailed work specification document defining materials, labor, and timeline',
        businessMeaning: 'Foundation for construction planning - validated after survey completion',
        color: '#3b82f6',
        attributes: ['scope_id', 'scope_type', 'material_list', 'labor_estimate', 'timeline_estimate', 'approval_status'],
        dataSources:[],
        columnLineage: []
    },
    'NTP_Document': {
        id: 'NTP_Document', module: 'planning', nodeType: 'core',
        definition: 'Notice to Proceed - authorization document required before construction',
        businessMeaning: 'Gate document - no construction can start without approved NTP',
        color: '#3b82f6',
        attributes: ['ntp_id', 'ntp_date', 'ntp_status', 'approver', 'MS_310'],
        dataSources:[],
        columnLineage: []
    },
    'iNTP': {
        id: 'iNTP', module: 'planning', nodeType: 'core',
        definition: 'Internal Notice to Proceed - Nokia internal authorization for integration',
        businessMeaning: 'Pre-integration gate - requires ICOP, CIQ, and all prerequisites complete',
        color: '#3b82f6',
        attributes: ['intp_id', 'intp_status', 'intp_date', 'icop_status', 'ciq_status', 'riot_status'],
        dataSources:[],
        columnLineage: []
    },

    // Resources & Vendors Module
    'General_Contractor': {
        id: 'General_Contractor', module: 'resources', nodeType: 'core',
        definition: 'Third-party vendor company hired by Nokia to perform site work',
        businessMeaning: 'Primary workforce provider - manages crews and executes construction/installation',
        color: '#8b5cf6',
        attributes: ['gc_id', 'gc_name', 'gc_company', 'market_coverage', 'contract_type', 'performance_rating'],
        dataSources:[],
        columnLineage: []
    },
    'Crew': {
        id: 'Crew', module: 'resources', nodeType: 'core',
        definition: 'Work team assigned to a GC - typically one crew handles one site per day',
        businessMeaning: 'Execution unit - crew availability determines daily throughput capacity',
        color: '#8b5cf6',
        attributes: ['crew_id', 'crew_size', 'gc_id', 'skill_type', 'availability_status', 'current_assignment'],
        dataSources:[],
        columnLineage: []
    },
    'Market': {
        id: 'Market', module: 'resources', nodeType: 'core',
        definition: 'Geographic business unit - collection of sites in a region',
        businessMeaning: 'Planning and reporting unit - GC assignment is market-specific',
        color: '#8b5cf6',
        attributes: ['market_id', 'market_name', 'region', 'site_count', 'gc_assignments'],
        dataSources:[],
        columnLineage: []
    },

    // Materials & Logistics Module
    'Material': {
        id: 'Material', module: 'materials', nodeType: 'core',
        definition: 'Physical equipment and components required for site work (radios, antennas, cables)',
        businessMeaning: 'Critical dependency - material availability gates construction start',
        color: '#ec4899',
        attributes: ['material_id', 'material_type', 'serial_number', 'quantity', 'warehouse_location', 'availability_status'],
        dataSources:[],
        columnLineage: []
    },
    'BOM': {
        id: 'BOM', module: 'materials', nodeType: 'core',
        definition: 'Bill of Materials - complete list of materials needed for a project',
        businessMeaning: 'Specification document - drives procurement and delivery planning',
        color: '#ec4899',
        attributes: ['bom_id', 'project_id', 'material_list', 'quantity_list', 'status', 'validation_date'],
        dataSources:[],
        columnLineage: []
    },
    'Purchase_Order': {
        id: 'Purchase_Order', module: 'materials', nodeType: 'core',
        definition: 'Order document for procuring materials from suppliers',
        businessMeaning: 'Financial commitment - triggers material procurement process',
        color: '#ec4899',
        attributes: ['po_number', 'vendor_id', 'material_list', 'order_date', 'delivery_date', 'status'],
        dataSources:[],
        columnLineage: []
    },
    'Warehouse': {
        id: 'Warehouse', module: 'materials', nodeType: 'core',
        definition: 'Material storage and distribution center',
        businessMeaning: 'Logistics hub - material pickup point for GC crews',
        color: '#ec4899',
        attributes: ['warehouse_id', 'location', 'capacity', 'inventory_level', 'market_coverage'],
        dataSources:[],
        columnLineage: []
    },

    // Construction Module
    'Civil_Construction': {
        id: 'Civil_Construction', module: 'construction', nodeType: 'core',
        definition: 'Ground-level construction work (foundations, shelters, power systems)',
        businessMeaning: 'First phase of physical construction - must complete before tower work',
        color: '#f59e0b',
        attributes: ['civil_id', 'start_date', 'complete_date', 'gc_id', 'status', 'MS_4225', 'MS_5049'],
        dataSources:[],
        columnLineage: []
    },
    'Tower_Construction': {
        id: 'Tower_Construction', module: 'construction', nodeType: 'core',
        definition: 'Tower/structure installation and modification work',
        businessMeaning: 'Second phase - tower readiness required for radio installation',
        color: '#f59e0b',
        attributes: ['tower_id', 'start_date', 'complete_date', 'crane_required', 'gc_id', 'status', 'MS_5051'],
        dataSources:[],
        columnLineage: []
    },
    'Radio_Installation': {
        id: 'Radio_Installation', module: 'construction', nodeType: 'core',
        definition: 'Installation of radio equipment (RRUs, BBUs, antennas) on tower',
        businessMeaning: 'Core deliverable - enables network connectivity when integrated',
        color: '#f59e0b',
        attributes: ['installation_id', 'radio_type', 'serial_numbers', 'install_date', 'gc_id', 'status'],
        dataSources:[],
        columnLineage: []
    },
    'Nesting': {
        id: 'Nesting', module: 'construction', nodeType: 'core',
        definition: 'Scheduled maintenance window when site goes offline for work (7-8 hours)',
        businessMeaning: 'Network coordination - prevents customer impact during construction',
        color: '#f59e0b',
        attributes: ['nesting_id', 'site_id', 'start_time', 'end_time', 'duration_hours', 'approved_by', 'status'],
        dataSources:[],
        columnLineage: []
    },

    // Quality & Safety Module
    'HSE_Compliance': {
        id: 'HSE_Compliance', module: 'quality', nodeType: 'core',
        definition: 'Health, Safety & Environment compliance verification for site visits',
        businessMeaning: 'Mandatory gate - no work can proceed without HSE clearance',
        color: '#ef4444',
        attributes: ['hse_id', 'ppe_status', 'jsa_status', 'l2w_status', 'checkin_status', 'compliance_score'],
        dataSources:[],
        columnLineage: []
    },
    'Quality_Checklist': {
        id: 'Quality_Checklist', module: 'quality', nodeType: 'core',
        definition: 'Detailed quality assessment questionnaire (500-1000+ questions)',
        businessMeaning: 'Quality gate - checklist approval required for milestone closure',
        color: '#ef4444',
        attributes: ['session_id', 'site_id', 'total_questions', 'answered', 'approved', 'rejected', 'approval_percentage'],
        dataSources:[],
        columnLineage: []
    },
    'Punch_List': {
        id: 'Punch_List', module: 'quality', nodeType: 'core',
        definition: 'List of deficiencies identified during quality inspection',
        businessMeaning: 'Rework driver - must clear all punch items before acceptance',
        color: '#ef4444',
        attributes: ['punch_id', 'site_id', 'issue_type', 'severity', 'status', 'resolution_date'],
        dataSources:[],
        columnLineage: []
    },

    // Integration & On-Air Module
    'Site_Configuration': {
        id: 'Site_Configuration', module: 'integration', nodeType: 'core',
        definition: 'SCAF file containing radio configuration parameters for integration',
        businessMeaning: 'Integration prerequisite - defines how radios connect to network',
        color: '#10b981',
        attributes: ['scaf_id', 'site_id', 'config_version', 'validation_status', 'upload_date'],
        dataSources:[],
        columnLineage: []
    },
    'Integration': {
        id: 'Integration', module: 'integration', nodeType: 'core',
        definition: 'Process of connecting installed equipment to the live network',
        businessMeaning: 'Critical milestone - transforms installed equipment into working network node',
        color: '#10b981',
        attributes: ['integration_id', 'site_id', 'start_date', 'complete_date', 'engineer_id', 'status', 'MS_1898'],
        dataSources:[],
        columnLineage: []
    },
    'Call_Test': {
        id: 'Call_Test', module: 'integration', nodeType: 'core',
        definition: 'Post-integration testing to verify network connectivity and call quality',
        businessMeaning: 'Quality verification - confirms site is functionally ready for service',
        color: '#10b981',
        attributes: ['test_id', 'site_id', 'test_date', 'pass_status', 'signal_quality', 'throughput'],
        dataSources:[],
        columnLineage: []
    },
    'Alarm_Monitoring': {
        id: 'Alarm_Monitoring', module: 'integration', nodeType: 'core',
        definition: '48-hour post-integration monitoring for alarm detection',
        businessMeaning: 'Stability check - identifies issues before final acceptance',
        color: '#10b981',
        attributes: ['monitoring_id', 'site_id', 'start_time', 'end_time', 'alarm_count', 'status'],
        dataSources:[],
        columnLineage: []
    },
    'On_Air': {
        id: 'On_Air', module: 'integration', nodeType: 'core',
        definition: 'Final milestone when site goes live and serves customer traffic',
        businessMeaning: 'Ultimate success metric - site contributing to network capacity',
        color: '#10b981',
        attributes: ['onair_id', 'site_id', 'onair_date', 'acceptance_status', 'gr_issued'],
        dataSources:[],
        columnLineage: []
    },
    'Backhaul': {
        id: 'Backhaul', module: 'integration', nodeType: 'core',
        definition: 'Network connection type (Fiber, Microwave, AAV) linking site to core network',
        businessMeaning: 'Integration dependency - backhaul readiness required for on-air',
        color: '#10b981',
        attributes: ['backhaul_id', 'site_id', 'backhaul_type', 'provider', 'readiness_status', 'bandwidth'],
        dataSources:[],
        columnLineage: []
    },

    // KPIs (Square Nodes)
    'Site_Readiness_Rate': {
        id: 'Site_Readiness_Rate', module: 'kpi', nodeType: 'kpi',
        definition: 'Percentage of sites with all prerequisites met for construction start',
        businessMeaning: 'Leading indicator of construction throughput potential',
        color: '#06b6d4',
        attributes: ['ready_sites', 'total_sites', 'readiness_percentage', 'trend'],
        dataSources:[],
        columnLineage: []
    },
    'Crew_Utilization': {
        id: 'Crew_Utilization', module: 'kpi', nodeType: 'kpi',
        definition: 'Percentage of available crews actively assigned to sites',
        businessMeaning: 'Resource efficiency metric - low utilization indicates readiness gap',
        color: '#06b6d4',
        attributes: ['active_crews', 'total_crews', 'utilization_percentage', 'market'],
        dataSources:[],
        columnLineage: []
    },
    'FTR_Rate': {
        id: 'FTR_Rate', module: 'kpi', nodeType: 'kpi',
        definition: 'First Time Right Rate - percentage of sites passing quality check on first attempt',
        businessMeaning: 'Quality indicator - low FTR indicates vendor quality issues',
        color: '#06b6d4',
        attributes: ['passed_first', 'total_inspected', 'ftr_percentage', 'gc_id'],
        dataSources:[],
        columnLineage: []
    },
    'CX_Lead_Time': {
        id: 'CX_Lead_Time', module: 'kpi', nodeType: 'kpi',
        definition: 'Average days from construction start to construction complete',
        businessMeaning: 'Process efficiency metric - target is typically 21 days',
        color: '#06b6d4',
        attributes: ['avg_days', 'min_days', 'max_days', 'target_days'],
        dataSources:[],
        columnLineage: []
    },
    'Integration_Backlog': {
        id: 'Integration_Backlog', module: 'kpi', nodeType: 'kpi',
        definition: 'Count of sites completed construction but awaiting integration',
        businessMeaning: 'Bottleneck indicator - high backlog suggests integration capacity issue',
        color: '#06b6d4',
        attributes: ['backlog_count', 'aging_days', 'market', 'trend'],
        dataSources:[],
        columnLineage: []
    },
    'Material_Availability_Rate': {
        id: 'Material_Availability_Rate', module: 'kpi', nodeType: 'kpi',
        definition: 'Percentage of required materials available in warehouse for planned sites',
        businessMeaning: 'Supply chain health - low rate blocks construction starts',
        color: '#06b6d4',
        attributes: ['available_materials', 'required_materials', 'availability_percentage'],
        dataSources:[],
        columnLineage: []
    },
    'HSE_Compliance_Rate': {
        id: 'HSE_Compliance_Rate', module: 'kpi', nodeType: 'kpi',
        definition: 'Percentage of site visits meeting all safety requirements',
        businessMeaning: 'Safety culture indicator - non-compliance triggers work stoppage',
        color: '#06b6d4',
        attributes: ['compliant_visits', 'total_visits', 'compliance_percentage', 'gc_id'],
        dataSources:[],
        columnLineage: []
    },
    'On_Air_Pending': {
        id: 'On_Air_Pending', module: 'kpi', nodeType: 'kpi',
        definition: 'Count of sites completed integration but not yet on-air',
        businessMeaning: 'Revenue impact indicator - pending sites represent unrealized capacity',
        color: '#06b6d4',
        attributes: ['pending_count', 'avg_pending_days', 'blocking_reasons'],
        dataSources:[],
        columnLineage: []
    },
    'Vendor_Performance_Score': {
        id: 'Vendor_Performance_Score', module: 'kpi', nodeType: 'kpi',
        definition: 'Composite score based on quality, timeliness, and safety metrics',
        businessMeaning: 'Vendor management tool - drives workload allocation decisions',
        color: '#06b6d4',
        attributes: ['overall_score', 'quality_score', 'timeliness_score', 'safety_score', 'gc_id'],
        dataSources:[],
        columnLineage: []
    },
    'Rework_Rate': {
        id: 'Rework_Rate', module: 'kpi', nodeType: 'kpi',
        definition: 'Percentage of sites requiring revisit due to quality issues',
        businessMeaning: 'Cost and schedule impact - high rework drives delays and cost overrun',
        color: '#06b6d4',
        attributes: ['rework_sites', 'total_sites', 'rework_percentage', 'common_reasons'],
        dataSources:[],
        columnLineage: []
    },
    'Plan_vs_Actual': {
        id: 'Plan_vs_Actual', module: 'kpi', nodeType: 'kpi',
        definition: 'Variance between planned and actual milestone completion',
        businessMeaning: 'Schedule health indicator - negative variance indicates delays',
        color: '#06b6d4',
        attributes: ['planned_date', 'actual_date', 'variance_days', 'milestone_type'],
        dataSources:[],
        columnLineage: []
    },
    'Weekly_Site_Forecast': {
        id: 'Weekly_Site_Forecast', module: 'kpi', nodeType: 'kpi',
        definition: 'Projected number of sites to be completed per week',
        businessMeaning: 'Planning metric - drives resource and material planning',
        color: '#06b6d4',
        attributes: ['forecast_week', 'forecasted_sites', 'market', 'confidence_level'],
        dataSources:[],
        columnLineage: []

    },
    'Milestone_Status': {
        id: 'Milestone_Status', module: 'kpi', nodeType: 'kpi',
        definition: 'Tracking status of 200+ milestones per project (MS_XXXX)',
        businessMeaning: 'Progress indicator - milestone completion drives workflow transitions',
        color: '#06b6d4',
        attributes: ['milestone_id', 'planned_date', 'actual_date', 'status', 'blocking_flag'],
        dataSources:[],
        columnLineage: []
    },
    'Alarm_Count': {
        id: 'Alarm_Count', module: 'kpi', nodeType: 'kpi',
        definition: 'Number of active alarms on a site during or after integration',
        businessMeaning: 'Health indicator - sites with alarms (P2) get priority attention',
        color: '#06b6d4',
        attributes: ['alarm_count', 'alarm_severity', 'site_id', 'alarm_types'],
        dataSources:[],
        columnLineage: []
    },

    // Decision Nodes (Diamond)
    'Survey_Type_Decision': {
        id: 'Survey_Type_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision to use Drone vs Manual survey based on site characteristics and market rules',
        businessMeaning: 'Determines survey approach - 90% drone, 10% manual based on conditions',
        color: '#f97316',
        attributes: ['decision_inputs', 'decision_criteria', 'outcome'],
        dataSources:[],
        columnLineage: []
    },
    'GC_Assignment_Decision': {
        id: 'GC_Assignment_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision to assign a site to a specific GC based on market, capacity, and performance',
        businessMeaning: 'Resource allocation - matches sites to capable GCs with available crews',
        color: '#f97316',
        attributes: ['decision_inputs', 'decision_criteria', 'assigned_gc'],
        dataSources:[],
        columnLineage: []
    },
    'Crane_Requirement_Decision': {
        id: 'Crane_Requirement_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision on whether site requires crane based on historical data and structure type',
        businessMeaning: 'Equipment planning - crane sites require special scheduling and cost',
        color: '#f97316',
        attributes: ['site_history', 'structure_height', 'crane_needed'],
        dataSources:[],
        columnLineage: []
    },
    'Site_Priority_Decision': {
        id: 'Site_Priority_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision to prioritize sites (P1/P2/P3) based on alarms, business value, and delays',
        businessMeaning: 'Work sequencing - determines which sites get attention first',
        color: '#f97316',
        attributes: ['alarm_status', 'business_priority', 'delay_days', 'priority_level'],
        dataSources:[],
        columnLineage: []
    },
    'Quality_Approval_Decision': {
        id: 'Quality_Approval_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision to accept or reject work based on checklist results and punch items',
        businessMeaning: 'Quality gate - rejected work requires GC remediation before proceeding',
        color: '#f97316',
        attributes: ['checklist_score', 'punch_items', 'approval_status'],
        dataSources:[],
        columnLineage: []
    },
    'Integration_Readiness_Decision': {
        id: 'Integration_Readiness_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision on whether site is ready for integration based on multiple prerequisites',
        businessMeaning: 'Integration gate - requires SCAF, ICOP, CIQ, construction complete',
        color: '#f97316',
        attributes: ['scaf_status', 'icop_status', 'ciq_status', 'construction_status', 'ready_flag'],
        dataSources:[],
        columnLineage: []
    },
    'Vendor_Selection_Decision': {
        id: 'Vendor_Selection_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision to shift workload between vendors based on performance and capacity',
        businessMeaning: 'Performance management - volume shifted to high-performing vendors',
        color: '#f97316',
        attributes: ['vendor_scores', 'capacity_available', 'workload_allocation'],
        dataSources:[],
        columnLineage: []
    },
    'Schedule_Recovery_Decision': {
        id: 'Schedule_Recovery_Decision', module: 'decision', nodeType: 'decision',
        definition: 'Decision on recovery actions when project falls behind schedule',
        businessMeaning: 'Risk mitigation - may trigger crew addition, expedited materials, or scope reduction',
        color: '#f97316',
        attributes: ['schedule_variance', 'recovery_options', 'selected_action'],
        dataSources:[],
        columnLineage: []
    }
};

export default INITIAL_NODES;