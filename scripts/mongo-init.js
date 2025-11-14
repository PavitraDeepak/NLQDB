// MongoDB init script to create users
db = db.getSiblingDB('nlqdb');

// Create admin user with read/write permissions
db.createUser({
  user: 'admin',
  pwd: 'admin123',
  roles: [
    {
      role: 'readWrite',
      db: 'nlqdb'
    }
  ]
});

print('✓ Admin user created: admin');

// Create read-only user for query execution
db.createUser({
  user: 'nlq_readonly',
  pwd: 'readonly123',
  roles: [
    {
      role: 'read',
      db: 'nlqdb'
    }
  ]
});

print('✓ Read-only user created: nlq_readonly');
