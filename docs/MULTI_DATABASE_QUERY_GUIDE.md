# Multi-Database Query System - Testing Guide

## Overview
The system now supports automatic database and table detection across all connected databases. Users no longer need to select a specific database - the system intelligently finds the right table based on the natural language query.

## Key Features Implemented

### 1. Schema Aggregation Service (`backend/src/services/schemaAggregationService.js`)
- **Purpose**: Aggregates schema information from all connected databases in an organization
- **Capabilities**:
  - Builds unified schema index across MongoDB, PostgreSQL, and MySQL databases
  - Caches schema data for 1 hour to reduce introspection overhead
  - Scores and ranks tables based on query relevance
  - Provides match reasoning for transparency

### 2. Intelligent Table Matching
The system scores tables using multiple factors:
- **Direct table name match** (score: 20)
- **Partial table name match** (score: 10 per word)
- **Field name matches** (score: 8 per exact match, 4 per partial)
- **Keyword relevance** (score: 5 for table, 3 for columns)
- **Context hints** (score: 15 for preferred connection, 10 for recent tables)

### 3. Enhanced Chat Service (`backend/src/services/chatService.js`)
- **Auto-detection**: When no `connectionId` is provided, searches all databases
- **Fallback**: Falls back to schema-aware collection name normalization
- **Metadata**: Includes detection information in translation results:
  ```json
  {
    "autoDetected": true,
    "detectedFrom": {
      "connectionName": "Production MongoDB",
      "database": "ecommerce",
      "table": "orders",
      "matchReasons": [
        "Has matching fields: order, customer, total",
        "Contains relevant keywords: order"
      ]
    }
  }
  ```

### 4. UI Improvements (`frontend/src/components/QuerySyntaxToggle.jsx`)
- **Collapsible Query View**: Arrow toggle to show/hide generated query syntax
- **Auto-detection Badge**: Visual indicator when table is auto-detected
- **Match Reasoning**: Shows why a specific table was chosen
- **Target Path**: Displays full path: Connection → Database → Table
- **Query Preview**: Syntax-highlighted query with copy button
- **Metadata Display**: Safety level, estimated cost, suggested indexes

### 5. ChatNew Page Updates (`frontend/src/pages/ChatNew.jsx`)
- **Database Selector**: Changed to "Auto-detect from all databases" by default
- **No Manual Selection Required**: Users can ask questions without selecting a database
- **Direct Output**: Results shown immediately after execution
- **Syntax Toggle**: Generated query collapsed by default, expandable with arrow

## Testing Scenarios

### Scenario 1: Basic Auto-Detection
**Setup**: Connect multiple databases (e.g., orders DB, customers DB, analytics DB)

**Test**:
```
Query: "Show me all orders from last week"
Expected: Auto-detects "orders" table from orders database
Result: Query executed successfully with detection info shown
```

### Scenario 2: Ambiguous Query
**Setup**: Multiple databases with similar tables (e.g., "users" in auth DB and "users" in analytics DB)

**Test**:
```
Query: "Count active users"
Expected: Chooses table with "active" or "status" field
Result: Shows match reasoning explaining the choice
```

### Scenario 3: Cross-Database Fields
**Setup**: Databases with overlapping field names

**Test**:
```
Query: "Find transactions with amount > 1000"
Expected: Auto-detects table with "amount" field
Result: Correctly identifies financial transactions table
```

### Scenario 4: Manual Override
**Setup**: User selects specific database from dropdown

**Test**:
```
Query: "Show all records"
Expected: Uses selected database, not auto-detection
Result: autoDetected = false in response
```

### Scenario 5: No Match Found
**Setup**: Query for non-existent table

**Test**:
```
Query: "Show me all spaceships"
Expected: Error message indicating no matching tables
Result: "No matching tables found across your databases"
```

## API Changes

### POST `/api/chat/translate`
**Request**:
```json
{
  "query": "How many orders last month?",
  "connectionId": null  // Optional - omit for auto-detection
}
```

**Response** (with auto-detection):
```json
{
  "translationId": "uuid",
  "query": [...],
  "dbType": "mongodb",
  "collection": "orders",
  "autoDetected": true,
  "detectedFrom": {
    "connectionName": "Production MongoDB",
    "database": "ecommerce",
    "table": "orders",
    "matchReasons": [
      "Table name 'orders' matches query",
      "Has matching fields: created_at, status"
    ]
  },
  "explain": "Counts orders from last month",
  "safety": "safe",
  "estimatedCost": 0.3
}
```

## User Experience Flow

1. **User lands on Chat page**
   - No database selection required
   - Dropdown defaults to "Auto-detect from all databases"
   - Example queries visible

2. **User types natural language query**
   ```
   "How many transactions are in the database?"
   ```

3. **System processes query**
   - Searches all connected databases
   - Scores and ranks tables by relevance
   - Selects best match (e.g., "transactions" table)

4. **Translation shown with collapsed syntax**
   - Green badge: "Auto-detected"
   - Arrow icon to expand query syntax
   - Execute button ready

5. **User expands syntax (optional)**
   - Shows detected connection/database/table path
   - Displays match reasoning
   - Shows formatted MongoDB/SQL query
   - Metadata: safety, cost, indexes

6. **User executes query**
   - Results appear immediately
   - Row count, execution time shown
   - Full results in formatted JSON

## Performance Considerations

### Caching Strategy
- Schema index cached for 1 hour per organization
- Translation results cached with connectionId in key
- Result cache expires after 30 minutes

### Optimization Tips
1. **Regular Schema Refresh**: Schedule periodic schema introspection for accuracy
2. **Index Management**: Follow suggested index recommendations
3. **Query Limits**: System automatically applies safety limits
4. **Connection Pooling**: Reuses database connections efficiently

## Troubleshooting

### Issue: "No matching tables found"
**Causes**:
- No databases connected
- Schema not introspected yet
- Query too ambiguous

**Solutions**:
- Ensure databases are connected and active
- Manually trigger schema refresh
- Add specific table/field names to query

### Issue: Wrong table selected
**Causes**:
- Multiple similar tables
- Insufficient context in query

**Solutions**:
- Be more specific in query (mention unique fields)
- Manually select database from dropdown
- Check match reasoning to understand why table was chosen

### Issue: Auto-detection slow
**Causes**:
- Many connected databases
- Schema cache expired
- First query after system restart

**Solutions**:
- Schema caching should speed up subsequent queries
- Consider pre-warming cache on startup
- Limit number of active connections

## Future Enhancements

1. **Learning from Feedback**
   - Track which auto-detections users override
   - Adjust scoring algorithm based on usage patterns

2. **Query History Context**
   - Use previous queries to refine table selection
   - Remember user's typical query patterns

3. **Multi-Table Queries**
   - Support JOINs across tables in same database
   - Eventually support cross-database queries

4. **Confidence Score Display**
   - Show match confidence percentage
   - Suggest alternative tables if confidence is low

5. **Schema Change Detection**
   - Automatically refresh schema when changes detected
   - Notify users of schema updates affecting their queries

## Security Notes

- Auto-detection respects RBAC permissions
- Only searches databases user has access to
- Maintains audit trail of detected vs manual selections
- All safety checks still apply (no destructive operations)

## Monitoring

Key metrics to track:
- Auto-detection success rate
- Average match score
- User override frequency
- Query execution time with auto-detection
- Schema cache hit rate

## Summary

The system now provides a seamless experience where users can:
1. Ask questions in natural language **without selecting a database**
2. See **which table was chosen and why**
3. **Toggle query syntax visibility** with an arrow
4. Get **immediate results** after execution

This makes the system accessible to non-technical users while maintaining transparency for power users.
