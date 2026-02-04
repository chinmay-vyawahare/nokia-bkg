// Example usage of SchemaGraph component
// This file demonstrates how to use the clean schema graph template

import SchemaGraph from './nokia_bkg_part_3';

// ============================================
// EXAMPLE 1: Basic Usage (Empty - User adds via UI)
// ============================================

function BasicExample() {
  return (
    <SchemaGraph />
  );
}

// ============================================
// EXAMPLE 2: Pre-populated with E-commerce Schema
// ============================================

const ecommerceNodes = {
  Users: {
    id: 'Users',
    module: 'core',
    nodeType: 'core',
    definition: 'User accounts and authentication data',
    businessMeaning: 'Represents customers and staff who interact with the platform',
    color: '#dc2626',
    attributes: ['id', 'email', 'name', 'password_hash', 'created_at', 'updated_at'],
    dataSources: [
      { source: 'PostgreSQL', table: 'users', description: 'Primary user table' }
    ],
    columnLineage: [
      { attribute: 'id', meaning: 'Primary key', derivedFrom: 'auto-generated UUID' },
      { attribute: 'email', meaning: 'User email address', derivedFrom: 'user input' }
    ]
  },
  Products: {
    id: 'Products',
    module: 'core',
    nodeType: 'core',
    definition: 'Product catalog items',
    businessMeaning: 'All sellable items in the store inventory',
    color: '#16a34a',
    attributes: ['id', 'name', 'description', 'price', 'sku', 'category_id'],
    dataSources: [
      { source: 'PostgreSQL', table: 'products', description: 'Product master data' }
    ]
  },
  Orders: {
    id: 'Orders',
    module: 'transaction',
    nodeType: 'core',
    definition: 'Customer purchase orders',
    businessMeaning: 'Records of customer purchases including status and totals',
    color: '#7c3aed',
    attributes: ['id', 'user_id', 'status', 'total', 'created_at', 'shipped_at']
  },
  OrderItems: {
    id: 'OrderItems',
    module: 'transaction',
    nodeType: 'core',
    definition: 'Line items within orders',
    businessMeaning: 'Individual products within an order with quantities and prices',
    color: '#7c3aed',
    attributes: ['id', 'order_id', 'product_id', 'quantity', 'unit_price']
  },
  Categories: {
    id: 'Categories',
    module: 'reference',
    nodeType: 'core',
    definition: 'Product categories',
    businessMeaning: 'Hierarchical product categorization',
    color: '#d97706',
    attributes: ['id', 'name', 'parent_id', 'slug']
  },
  Revenue: {
    id: 'Revenue',
    module: 'analytics',
    nodeType: 'kpi',
    definition: 'Daily revenue aggregation',
    businessMeaning: 'KPI: Total revenue calculated from completed orders',
    color: '#0ea5e9',
    attributes: ['date', 'total_revenue', 'order_count', 'avg_order_value']
  }
};

const ecommerceRelationships = [
  {
    id: 1,
    from: 'Orders',
    to: 'Users',
    label: 'BELONGS_TO',
    type: 'many-to-1',
    description: 'Each order belongs to one user',
    joinCondition: { logic: 'orders.user_id = users.id' }
  },
  {
    id: 2,
    from: 'OrderItems',
    to: 'Orders',
    label: 'PART_OF',
    type: 'many-to-1',
    description: 'Order items belong to an order'
  },
  {
    id: 3,
    from: 'OrderItems',
    to: 'Products',
    label: 'REFERENCES',
    type: 'many-to-1',
    description: 'Each order item references a product'
  },
  {
    id: 4,
    from: 'Products',
    to: 'Categories',
    label: 'CATEGORIZED_IN',
    type: 'many-to-1',
    description: 'Products belong to categories'
  },
  {
    id: 5,
    from: 'Revenue',
    to: 'Orders',
    label: 'DERIVED_FROM',
    type: 'many-to-many',
    description: 'Revenue is calculated from orders'
  }
];

const ecommercePositions = {
  Users: { x: 400, y: 300 },
  Products: { x: 800, y: 300 },
  Orders: { x: 600, y: 500 },
  OrderItems: { x: 800, y: 500 },
  Categories: { x: 1000, y: 300 },
  Revenue: { x: 600, y: 700 }
};

function EcommerceExample() {
  return (
    <SchemaGraph
      initialNodes={ecommerceNodes}
      initialRelationships={ecommerceRelationships}
      initialPositions={ecommercePositions}
    />
  );
}

// ============================================
// EXAMPLE 3: Custom Modules Configuration
// ============================================

const customModules = {
  all: {
    name: 'All Tables',
    color: '#6b7280',
    description: 'Show everything'
  },
  user_management: {
    name: 'User Management',
    color: '#ef4444',
    description: 'Authentication and authorization'
  },
  product_catalog: {
    name: 'Product Catalog',
    color: '#22c55e',
    description: 'Product and inventory'
  },
  order_processing: {
    name: 'Order Processing',
    color: '#8b5cf6',
    description: 'Orders and fulfillment'
  },
  reporting: {
    name: 'Reporting',
    color: '#f59e0b',
    description: 'Analytics and KPIs'
  }
};

function CustomModulesExample() {
  return (
    <SchemaGraph
      modules={customModules}
      initialNodes={{}}
      initialRelationships={[]}
    />
  );
}

// ============================================
// EXAMPLE 4: With Change Callbacks
// ============================================

function WithCallbacksExample() {
  const handleNodesChange = (nodes) => {
    console.log('Nodes updated:', nodes);
    // Save to your backend/state management
  };

  const handleRelationshipsChange = (relationships) => {
    console.log('Relationships updated:', relationships);
  };

  const handlePositionsChange = (positions) => {
    console.log('Positions updated:', positions);
  };

  return (
    <SchemaGraph
      onNodesChange={handleNodesChange}
      onRelationshipsChange={handleRelationshipsChange}
      onPositionsChange={handlePositionsChange}
    />
  );
}

// ============================================
// EXAMPLE 5: JSON Format for Import
// ============================================

/*
The component accepts JSON in this format for import:

{
  "nodes": {
    "TableName": {
      "id": "TableName",
      "module": "core",           // matches module key
      "nodeType": "core",         // "core" = circle, "kpi" = diamond
      "definition": "Description",
      "businessMeaning": "Business context",
      "color": "#hex",
      "attributes": ["col1", "col2"],
      "dataSources": [
        { "source": "DB", "table": "table", "description": "..." }
      ],
      "columnLineage": [
        { "attribute": "col", "meaning": "...", "derivedFrom": "source.col" }
      ]
    }
  },
  "relationships": [
    {
      "id": 1,
      "from": "SourceTable",
      "to": "TargetTable",
      "label": "RELATIONSHIP_NAME",
      "type": "many-to-1",        // "1-to-1", "1-to-many", "many-to-1", "many-to-many"
      "description": "Description",
      "businessMeaning": "Business context",
      "joinCondition": {
        "source": "database",
        "logic": "table1.id = table2.fk_id",
        "tables": ["table1", "table2"]
      },
      "dataLineage": {
        "fromKey": "table1.column",
        "toKey": "table2.column"
      }
    }
  ],
  "positions": {
    "TableName": { "x": 400, "y": 300 }
  }
}
*/

// ============================================
// MAIN APP - Choose which example to render
// ============================================

export default function App() {
  // Render the e-commerce example by default
  return <EcommerceExample />;

  // Or use other examples:
  // return <BasicExample />;
  // return <CustomModulesExample />;
  // return <WithCallbacksExample />;
}
