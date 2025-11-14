# API Reference

## Base URL

```
http://localhost:5000/api
```

All API requests require authentication except `/auth/login`.

## Authentication

### Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "admin|analyst|viewer"
    }
  }
}
```

### Register User (Admin Only)

**Endpoint:** `POST /api/auth/register`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "admin|analyst|viewer"
}
```

**Response:** `201 Created`

### Get Profile

**Endpoint:** `GET /api/auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

## Query Operations

### Translate Natural Language Query

**Endpoint:** `POST /api/translate`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "userQuery": "string",
  "context": {
    "additionalInfo": "optional"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "queryId": "string",
    "mongoQuery": {
      "collection": "string",
      "find": {} // or "aggregate": []
    },
    "explain": "string",
    "requiresIndexes": ["string"],
    "safety": {
      "allowed": boolean,
      "reason": "string"
    },
    "complexity": "low|medium|high"
  }
}
```

### Execute Query

**Endpoint:** `POST /api/execute`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "mongoQueryId": "string",
  "options": {
    "limit": 100,
    "skip": 0
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "field1": "value1",
      "field2": "value2"
    }
  ],
  "metadata": {
    "collection": "string",
    "queryType": "find|aggregate",
    "rowCount": 10,
    "executionTime": 42,
    "truncated": false
  }
}
```

### Get Query History

**Endpoint:** `GET /api/history?page=1&limit=20&collection=customers`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20
- `collection` (optional): Filter by collection name
- `executed` (optional): Filter by execution status (true/false)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "userId": "string",
      "userQuery": "string",
      "generatedQuery": {},
      "executed": boolean,
      "safetyPassed": boolean,
      "timestamp": "ISO date",
      "resultCount": 10
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Query Result

**Endpoint:** `GET /api/results/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "executionTime": 42,
    "collection": "string",
    "queryType": "find",
    "cached": true
  }
}
```

### Get Statistics

**Endpoint:** `GET /api/stats?timeRange=week`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeRange` (optional): day|week|month, default week

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalQueries": 150,
    "executedQueries": 120,
    "safeQueries": 145,
    "avgExecutionTime": 85.5
  }
}
```

## Schema Operations

### Get Database Schema

**Endpoint:** `GET /api/schema`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "customers": {
      "fields": {
        "name": { "type": "String", "required": true },
        "email": { "type": "String", "required": true },
        "city": { "type": "String", "required": false }
      },
      "description": "Customer information",
      "sampleQuery": "db.customers.find({...})"
    }
  }
}
```

### List Collections

**Endpoint:** `GET /api/tables`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": ["customers", "orders"]
}
```

### Get Collection Preview

**Endpoint:** `GET /api/tables/:collection/preview?limit=10`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of sample documents, max 100

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "collection": "customers",
    "samples": [...],
    "stats": {
      "count": 1000,
      "size": 50000,
      "avgObjSize": 50,
      "indexes": 3
    }
  }
}
```

### Get Collection Statistics

**Endpoint:** `GET /api/tables/:collection/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "count": 1000,
    "size": 50000,
    "avgObjSize": 50,
    "storageSize": 100000,
    "indexes": 3
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "must be a valid email"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided. Authorization denied."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. Required role: admin"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limits

- **Authentication endpoints**: 5 requests per 15 minutes
- **Query translation**: 10 requests per minute
- **Query execution**: 10 requests per minute
- **General API**: 100 requests per 15 minutes

Rate limits are per user (if authenticated) or per IP (if not).

Admin users have no rate limits on query endpoints.

## Pagination

Endpoints that return lists support pagination:

- `page`: Page number (1-indexed)
- `limit`: Items per page
- Response includes `pagination` object with total count and page info

## Filtering

Some endpoints support filtering via query parameters:

- `/api/history?collection=customers&executed=true`
- `/api/stats?timeRange=month`

## Best Practices

1. **Always check `safety.allowed`** before executing queries
2. **Handle rate limit errors** with exponential backoff
3. **Cache results** using the provided `queryId`
4. **Use pagination** for large result sets
5. **Include context** in translation requests for better results
