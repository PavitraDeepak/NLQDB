# Chat System - Natural Language Query Interface

## Overview

A production-grade, multi-tenant secure natural language query interface that translates English questions into SQL/MongoDB queries with comprehensive safety validation, execution control, and Supabase-style white-themed UI.

## Architecture

### Backend Components

#### 1. Chat Service (`/backend/src/services/chatService.js`)
**Core Features:**
- **Multi-LLM Support**: Works with both OpenAI GPT-4 and Google Gemini
- **Schema-Aware Translation**: Generates queries based on actual database schema
- **Deterministic Output**: Temperature 0 for consistent translations
- **Safety Pipeline**: Validates queries before execution
- **Result Caching**: In-memory cache for translations and results
- **Usage Metering**: Tracks tokens and executions for billing
- **Audit Logging**: Complete trail of all translations and executions

**Key Methods:**
```javascript
translateQuery(naturalLanguageQuery, connectionId, orgId, userId, context)
executeQuery(translationId, translation, connectionId, orgId, userId, options)
getHistory(organizationId, userId, options)
cancelQuery(executionId, organizationId, userId)
generateClarifyingQuestions(query, connectionId, organizationId)
```

**Safety Features:**
- Destructive SQL keyword detection (DROP, DELETE, TRUNCATE, etc.)
- Blacklisted MongoDB stages ($out, $merge, etc.)
- Max row limit: 10,000
- Max execution time: 30 seconds
- Column masking for sensitive data
- RBAC enforcement
- Signature verification

#### 2. Chat Controller (`/backend/src/controllers/chatController.js`)
**Endpoints:**
- `POST /api/chat/translate` - Translate natural language
- `POST /api/chat/execute` - Execute translated query
- `GET /api/chat/result/:id` - Retrieve execution result
- `GET /api/chat/history` - Query history
- `POST /api/chat/clarify` - Get clarifying questions
- `POST /api/chat/cancel` - Cancel running query
- `POST /api/chat/explain` - Explain without executing
- `POST /api/chat/preview` - Preview with 10 rows
- `POST /api/chat/replay` - Replay previous query
- `POST /api/chat/estimate` - Get cost estimate

#### 3. Chat Routes (`/backend/src/routes/chatRoutes.js`)
**Authentication:**
- Supports both JWT tokens and API keys
- Tenant resolver middleware for organization isolation
- Rate limiting: 30 translations/min, 20 executions/min

**Security:**
- All routes require authentication
- Tenant context enforced
- Rate limiting per user and organization
- Input validation

### Frontend Components

#### 1. Chat Page (`/frontend/src/pages/Chat.jsx`)
**Main Component - Full Features:**
- Real-time message interface
- Database connection selector
- Multi-turn conversation context
- Query inspector with expand/collapse
- Results table with pagination
- History sidebar
- Expensive query warnings
- Cost estimates
- Error handling

**Supabase-Style Design:**
- White background (#FFFFFF)
- Soft gray panels (#F9FAFB, #F3F4F6)
- Minimal borders (#E5E7EB)
- Professional spacing (px-4, py-3, gap-3)
- Clean typography
- Subtle shadows

**Sub-Components:**

**QueryInspector:**
- Shows generated SQL/MongoDB query
- Displays safety status (safe/warning/unsafe)
- Cost estimation
- Index recommendations
- Preview and Execute buttons

**ResultsTable:**
- Clean table layout
- Row count and execution time
- Null value handling
- Truncation warnings
- Responsive overflow

**HistorySidebar:**
- Recent query history
- Quick replay functionality
- Timestamp display
- Compact card design

**ExpensiveWarningModal:**
- Yellow warning theme
- Cost percentage display
- Confirm/Cancel actions
- Performance tips

#### 2. API Service (`/frontend/src/services/apiService.js`)
**Chat Methods:**
```javascript
translateQuery(data)      // Translate natural language
executeQuery(data)        // Execute translated query
getQueryResult(execId)    // Get result by ID
getChatHistory(params)    // Get history with pagination
clarifyQuery(data)        // Get clarifying questions
cancelQuery(execId)       // Cancel running query
explainQuery(data)        // Explain without executing
previewQuery(data)        // Preview with limited rows
replayQuery(data)         // Replay previous query
getCostEstimate(data)     // Get cost estimate
```

## System Prompt

The LLM uses a comprehensive system prompt with:

**Context:**
- Database type (PostgreSQL, MySQL, MongoDB)
- Table/collection name
- Complete schema with types, nullable, primary keys

**Rules:**
1. Only SELECT queries (SQL) or safe read operations (MongoDB)
2. No destructive operations
3. MongoDB: Only $match, $project, $sort, $limit, $skip, $count, $group
4. Parameterized queries for injection prevention
5. ISO 8601 dates
6. Structured JSON output

**Output Format:**
```json
{
  "sqlQuery": "SELECT * FROM users WHERE status = 'active' LIMIT 100",
  "explain": "Retrieves all active users, limited to 100 rows for safety",
  "requiresIndexes": ["status"],
  "estimatedCost": 0.3,
  "safety": "safe",
  "warningMessage": null
}
```

**Few-Shot Examples:**
- Active users query → Safe SELECT with LIMIT
- Monthly order aggregation → MongoDB $group and $sort
- Delete operation → Rejected as unsafe

## Safety Validation Pipeline

### Stage 1: Translation Validation
```javascript
✓ Check required fields (query, explain)
✓ SQL: No destructive keywords (DROP, DELETE, etc.)
✓ SQL: Must start with SELECT
✓ MongoDB: No blacklisted stages ($out, $merge)
✓ MongoDB: Only allowed aggregation stages
```

### Stage 2: Signature Verification
```javascript
✓ Verify query signature (prevents tampering)
✓ Check if marked unsafe
✓ Validate organizationId match
```

### Stage 3: RBAC Checks
```javascript
✓ Verify user belongs to organization
✓ Check user role (owner/admin/member)
✓ Enforce connection access rights
```

### Stage 4: Execution Limits
```javascript
✓ Max rows: 10,000
✓ Max execution time: 30 seconds
✓ Timeout protection with Promise.race
```

### Stage 5: Result Processing
```javascript
✓ Truncate if exceeds max rows
✓ Mask sensitive columns (password, ssn, etc.)
✓ Apply column visibility based on role
```

## Multi-Tenant Security

### Organization Isolation
- All queries filtered by `organizationId`
- Tenant resolver middleware enforces context
- Database connections scoped to organization
- Results cached per organization

### User Permissions
- **Owner**: Full access, all columns visible
- **Admin**: Execute queries, sensitive data masked
- **Member**: Limited access, extensive masking

### Encrypted Credentials
- Database connection strings encrypted with AES-256-CBC
- Encryption key from environment variable
- Keys never exposed to frontend
- Automatic decryption for execution only

## Caching Strategy

### Translation Cache
- **Key**: MD5(query + connectionId + context)
- **Duration**: 1 hour
- **Benefit**: Instant response for repeated queries

### Result Cache
- **Key**: MD5(query + connectionId)
- **Duration**: 30 minutes
- **Benefit**: Fast replay of recent executions

### Cache Invalidation
- Automatic expiration with setTimeout
- Manual clearing via `chatService.clearCaches()`
- Per-organization cache namespacing

## Usage Metering

### Translation Metrics
```javascript
{
  queries: 1,           // Increment by 1
  tokens: tokensUsed    // From LLM response
}
```

### Execution Metrics
```javascript
{
  queries: 1,           // Increment by 1
  rowCount: results.length
}
```

### Billing Integration
- Real-time usage tracking
- Plan limit enforcement
- Quota warnings at 80%
- Soft/hard limits based on plan

## Audit Logging

### Translation Log
```javascript
{
  organizationId,
  userId,
  type: 'translation',
  naturalLanguageQuery,
  translatedQuery,
  explain,
  safety,
  estimatedCost,
  tokensUsed,
  metadata: { translationId, dbType, connectionId }
}
```

### Execution Log
```javascript
{
  organizationId,
  userId,
  type: 'execution',
  translatedQuery,
  explain,
  rowCount,
  executionTime,
  status: 'success|failed',
  error: errorMessage,
  metadata: { executionId, translationId, connectionId }
}
```

## API Reference

### POST /api/chat/translate
**Request:**
```json
{
  "query": "Show me all active users",
  "connectionId": "65abc123...",
  "context": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translationId": "uuid",
    "query": "SELECT * FROM users WHERE status = 'active' LIMIT 100",
    "explain": "Retrieves all active users",
    "requiresIndexes": ["status"],
    "estimatedCost": 0.3,
    "safety": "safe",
    "tokensUsed": 150,
    "llmResponseTime": 1200,
    "cached": false
  }
}
```

### POST /api/chat/execute
**Request:**
```json
{
  "translation": { /* translation object */ },
  "connectionId": "65abc123...",
  "options": {
    "confirmed": true,
    "limit": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "results": [ /* array of objects */ ],
    "rowCount": 42,
    "executionTime": 234,
    "truncated": false,
    "cached": false
  }
}
```

### GET /api/chat/history
**Query Params:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `connectionId`: Filter by connection (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [ /* array of executions */ ],
    "total": 123,
    "limit": 50,
    "offset": 0
  }
}
```

## Rate Limiting

### Translation Endpoint
- **Window**: 1 minute
- **Limit**: 30 requests
- **Scope**: Per user per organization
- **Headers**: `X-RateLimit-*` standard headers

### Execution Endpoint
- **Window**: 1 minute
- **Limit**: 20 requests
- **Scope**: Per user per organization
- **Bypass**: API keys with elevated permissions

## Cost Estimation

### Factors
1. **Token Usage**: LLM tokens consumed
2. **Query Complexity**: Estimated cost 0-1
3. **Execution Time**: Historical averages
4. **Row Count**: Data volume impact

### Expensive Query Threshold
- **Cost > 0.7**: Shows warning modal
- **Requires Confirmation**: User must explicitly confirm
- **Recommendations**: Suggests adding indexes

### Cost Display
```javascript
{
  estimatedCost: 0.8,              // Complexity (0-1)
  tokensUsed: 350,                  // LLM tokens
  estimatedTokenCost: 0.00007,     // $ for tokens
  estimatedExecutionCost: 0.0008,  // $ for execution
  totalEstimate: 0.00087,          // Total cost
  expensive: true                   // Above threshold
}
```

## Error Handling

### Translation Errors
- Invalid query syntax → User-friendly message
- LLM timeout → Retry suggestion
- Schema not found → Refresh connection prompt
- Rate limit exceeded → Wait time display

### Execution Errors
- Connection failed → Check credentials
- Timeout exceeded → Optimize query suggestion
- Permission denied → Contact admin
- Unsafe query → Detailed safety explanation

### Frontend Error Display
- Red banner for critical errors
- Yellow banner for warnings
- Inline validation messages
- Dismissible notifications

## Testing

### Unit Tests
```bash
# Backend tests
cd backend
npm test

# Test chat service
npm test -- chatService.test.js

# Test controller
npm test -- chatController.test.js
```

### Integration Tests
```javascript
describe('Chat Translation', () => {
  it('should translate simple query', async () => {
    const result = await chatService.translateQuery(
      'Show all users',
      connectionId,
      orgId,
      userId
    );
    expect(result.query).toContain('SELECT');
    expect(result.safety).toBe('safe');
  });
});
```

### E2E Tests
```javascript
// Using Playwright
test('full chat workflow', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[placeholder="Ask a question"]', 'Show all orders');
  await page.click('button:has-text("Send")');
  await expect(page.locator('.query-inspector')).toBeVisible();
  await page.click('button:has-text("Execute")');
  await expect(page.locator('.results-table')).toBeVisible();
});
```

## Performance Optimization

### Backend
- In-memory caching for translations/results
- Database connection pooling
- Query result pagination
- Lazy loading of history
- Redis for distributed caching (optional)

### Frontend
- Virtual scrolling for large result sets
- Debounced input for clarifying questions
- Optimistic UI updates
- Message pagination
- Lazy load history sidebar

## Deployment

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...         # or GOOGLE_AI_API_KEY
MONGO_URI=mongodb+srv://...
JWT_SECRET=...

# Optional
OPENAI_MODEL=gpt-4o           # Default model
LLM_TEMPERATURE=0.0           # Deterministic
LLM_MAX_TOKENS=1000          # Response limit
```

### Docker Deployment
```bash
cd infra
docker-compose up -d --build backend
docker-compose logs -f backend
```

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure rate limiting
- [ ] Enable Redis for caching
- [ ] Set up monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Enable CORS for production domain
- [ ] Set up database backups
- [ ] Configure usage alerts
- [ ] Test failover scenarios
- [ ] Load test with expected traffic

## Monitoring

### Key Metrics
- Translation success rate
- Average response time
- Query execution time
- Cache hit rate
- Error rate by type
- Active users
- Queries per organization
- Token consumption

### Alerts
- Translation failure spike
- Slow query detection
- Usage quota warnings
- Rate limit breaches
- Expensive query frequency
- Error rate threshold

## Future Enhancements

### Planned Features
- [ ] Streaming responses (SSE)
- [ ] Query result export (CSV, JSON, Excel)
- [ ] Advanced query builder UI
- [ ] SQL to MongoDB conversion
- [ ] Natural language query optimization suggestions
- [ ] Collaborative query sharing
- [ ] Query templates/favorites
- [ ] Voice input support
- [ ] Multi-language support
- [ ] Query scheduling
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard

### Performance Improvements
- [ ] Redis cluster for caching
- [ ] Query result compression
- [ ] CDN for static assets
- [ ] WebSocket for real-time updates
- [ ] GraphQL API option
- [ ] Query result streaming
- [ ] Incremental loading

## Support

For issues or questions:
- Check logs: `docker-compose logs backend`
- Review audit logs in MongoDB
- Check rate limit headers
- Verify environment variables
- Test with curl/Postman

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: November 16, 2025  
**Status**: Production Ready ✅
