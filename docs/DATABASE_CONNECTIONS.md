# External Database Connections

## Overview

NLQDB now supports connecting to external databases using two different connection methods:
- **Standard Connection**: For SQL databases (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle)
- **URI Connection**: For NoSQL databases (MongoDB, Redis, Cassandra)

## Connection Methods

### Standard Connection (SQL Databases)

SQL databases use individual connection parameters:

**Required Fields:**
- Host (e.g., `localhost` or `db.example.com`)
- Port (e.g., `5432` for PostgreSQL, `3306` for MySQL)
- Database Name
- Username
- Password

**Example:**
```javascript
{
  type: "postgresql",
  connectionMethod: "standard",
  host: "localhost",
  port: 5432,
  database: "my_database",
  username: "db_user",
  password: "secret_password"
}
```

**Supported SQL Databases:**
- PostgreSQL (default port: 5432)
- MySQL (default port: 3306)
- MariaDB (default port: 3306)
- SQL Server (default port: 1433)
- Oracle (default port: 1521)

### URI Connection (NoSQL Databases)

NoSQL databases use a connection URI string that includes all connection information:

**Required Fields:**
- Connection URI (includes credentials, host, port, database in one string)

**Example for MongoDB:**
```javascript
{
  type: "mongodb",
  connectionMethod: "uri",
  uri: "mongodb://username:password@localhost:27017/database_name"
}
```

**MongoDB URI Formats:**
- Standard: `mongodb://username:password@host:port/database`
- With options: `mongodb://username:password@host:port/database?retryWrites=true&w=majority`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database`

**Supported NoSQL Databases:**
- MongoDB (standard or Atlas clusters)
- Redis (planned)
- Cassandra (planned)

## Connection Code Examples

### Python with MySQL (SQL - Standard Connection)

```python
import mysql.connector

# Establishing the connection
connection = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="your_username",
    password="your_password",
    database="your_database_name"
)

if connection.is_connected():
    print("Connection successful!")
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM users;")
    records = cursor.fetchall()
    connection.close()
```

### Python with MongoDB (NoSQL - URI Connection)

```python
from pymongo import MongoClient

# Establishing the connection using a URI
# Format: mongodb://[username:password@]host[:port][/[database][?options]]
uri = "mongodb://your_username:your_password@localhost:27017/"

client = MongoClient(uri)

try:
    # Check connection
    client.admin.command('ping')
    print("Connection successful!")
    
    # Access database and collection
    db = client.your_database_name
    collection = db.your_collection_name
    
    # Query documents
    documents = collection.find_one()
    
except Exception as e:
    print(f"Connection failed: {e}")
finally:
    client.close()
```

## Security Features

### Encryption
- All credentials (passwords and URIs) are encrypted using AES-256-CBC
- Encryption key stored securely in environment variable `DB_ENCRYPTION_KEY`
- Each encrypted value has a unique Initialization Vector (IV)

### Read-Only Mode
- Connections default to read-only mode for security
- Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries allowed in read-only mode
- Can be disabled for write access (requires organization admin role)

### Role-Based Access Control (RBAC)
- Only Organization Owners and Managers can create/edit/delete connections
- All organization members can view and use connections
- Test connection requires authentication

## Using the UI

### Adding a Connection

1. Navigate to **Connections** in the sidebar
2. Click **Add Connection** button
3. Fill in connection details:
   - **Connection Name**: Descriptive name for your connection
   - **Database Type**: Select from dropdown (PostgreSQL, MySQL, MongoDB, etc.)
   - **Connection Method**: 
     - Choose "Standard (SQL)" for PostgreSQL, MySQL, MariaDB, SQL Server, Oracle
     - Choose "URI (NoSQL)" for MongoDB, Redis, Cassandra
   - For Standard: Enter host, port, database, username, password
   - For URI: Enter complete connection URI string
   - **Read-Only**: Check to enforce read-only queries (recommended)
   - **Description**: Optional notes about this connection
4. Click **Save** - connection will be tested automatically
5. If test succeeds, schema will be introspected and connection becomes active

### Testing a Connection

- Click **Test** button on any connection card
- System will verify connection and show success/failure message
- Connection status updates automatically

### Editing a Connection

- Click **Edit** button on connection card
- Modify any fields (passwords/URIs not pre-filled for security)
- Leave password/URI blank to keep existing credentials
- Connection is tested again on save

### Deleting a Connection

- Click **Delete** button (trash icon) on connection card
- Confirm deletion
- Connection and cached schema data are removed

## API Endpoints

### Create Connection
```
POST /api/database-connections
Authorization: Bearer <token>

Body:
{
  "name": "Production DB",
  "type": "mongodb",
  "connectionMethod": "uri",
  "uri": "mongodb://user:pass@host:27017/db",
  "readOnly": true,
  "description": "Production MongoDB cluster"
}
```

### Test Connection
```
POST /api/database-connections/:id/test
Authorization: Bearer <token>
```

### Get Schema
```
GET /api/database-connections/:id/schema
Authorization: Bearer <token>
```

### Execute Query
```
POST /api/database-connections/:id/execute
Authorization: Bearer <token>

Body:
{
  "query": "SELECT * FROM users LIMIT 10"
}
```

## Best Practices

1. **Always use read-only mode** unless write access is absolutely necessary
2. **Use descriptive connection names** to easily identify databases
3. **Test connections regularly** to ensure they remain active
4. **Rotate credentials periodically** for security
5. **Use SSL/TLS** for production databases when available
6. **For MongoDB**: Use MongoDB Atlas connection strings with `+srv` for better reliability
7. **Keep URIs secure**: Never commit URIs with credentials to version control

## Troubleshooting

### Connection Test Fails

**For SQL Databases:**
- Verify host and port are correct
- Check firewall rules allow connections
- Confirm database name exists
- Verify username/password credentials
- Ensure user has SELECT permissions

**For MongoDB:**
- Verify URI format is correct
- Check IP whitelist in MongoDB Atlas
- Confirm database name in URI matches actual database
- Verify user has read permissions on database

### Schema Introspection Fails

- Connection may succeed but schema introspection can fail
- Check user has permissions to read schema information:
  - PostgreSQL: `information_schema` access
  - MySQL: `SHOW TABLES` and `DESCRIBE` permissions
  - MongoDB: `listCollections` permission
- Connection will be created with status "testing" - can still be used manually

### Query Execution Fails

- Verify read-only mode restrictions
- Check SQL syntax for the specific database type
- For MongoDB: Ensure query object format is correct
- Review error message for specific database errors

## Future Enhancements

- [ ] Support for Redis connections
- [ ] Support for Cassandra connections
- [ ] Connection pooling statistics dashboard
- [ ] Query performance monitoring
- [ ] Automated schema refresh scheduling
- [ ] Connection health monitoring alerts
- [ ] Support for SSH tunneling
- [ ] Multi-region connection routing
