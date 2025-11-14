# Deployment Guide

## Production Deployment Options

### Option 1: Docker Compose (Recommended for VPS)

#### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Docker & Docker Compose installed
- Domain name pointed to server
- SSL certificate (Let's Encrypt)

#### Steps

1. **Clone repository on server:**
```bash
git clone https://github.com/yourusername/NLQDB.git
cd NLQDB
```

2. **Create production environment files:**

```bash
# Backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/nlqdb
MONGO_USER=admin
MONGO_PASSWORD=$(openssl rand -base64 32)
READONLY_DB_USER=nlq_readonly
READONLY_DB_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRE=7d
OPENAI_API_KEY=your-openai-key
LLM_MODEL=gpt-4
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
EOF

# Frontend
cat > frontend/.env << EOF
VITE_API_URL=https://yourdomain.com/api
EOF
```

3. **Update docker-compose for production:**

Create `infra/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  mongo:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
      - ./backup:/backup
    networks:
      - nlqdb-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - nlqdb-network

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
      target: production
    restart: always
    env_file:
      - ../backend/.env
    depends_on:
      - mongo
      - redis
    networks:
      - nlqdb-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      target: production
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - nlqdb-network

networks:
  nlqdb-network:
    driver: bridge

volumes:
  mongo_data:
  redis_data:
```

4. **Setup SSL with Nginx:**

Create `infra/nginx/default.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Get SSL certificate:**
```bash
sudo apt-get update
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/* infra/nginx/ssl/
```

6. **Deploy:**
```bash
cd infra
docker-compose -f docker-compose.prod.yml up -d --build
```

7. **Seed database:**
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

8. **Verify deployment:**
```bash
curl https://yourdomain.com/api/health
```

---

### Option 2: Kubernetes

#### Prerequisites
- Kubernetes cluster
- kubectl configured
- Helm installed

#### Steps

1. **Create namespace:**
```bash
kubectl create namespace nlqdb
```

2. **Create secrets:**
```bash
kubectl create secret generic nlqdb-secrets \
  --from-literal=mongo-password=$(openssl rand -base64 32) \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --from-literal=openai-key=your-openai-key \
  -n nlqdb
```

3. **Deploy MongoDB:**
```bash
helm install mongodb bitnami/mongodb \
  --namespace nlqdb \
  --set auth.rootPassword=<password> \
  --set persistence.size=20Gi
```

4. **Deploy Redis:**
```bash
helm install redis bitnami/redis \
  --namespace nlqdb \
  --set auth.enabled=false
```

5. **Apply manifests:**

Create `k8s/backend-deployment.yaml`, `k8s/frontend-deployment.yaml`, and service files.

```bash
kubectl apply -f k8s/ -n nlqdb
```

---

### Option 3: Cloud Platforms

#### AWS (Elastic Beanstalk + RDS/DocumentDB)

1. **Setup DocumentDB cluster**
2. **Setup ElastiCache (Redis)**
3. **Create Elastic Beanstalk application**
4. **Deploy using EB CLI:**

```bash
eb init nlqdb --platform node.js
eb create nlqdb-prod
eb deploy
```

#### Google Cloud Platform (Cloud Run)

```bash
# Build and push images
gcloud builds submit --tag gcr.io/PROJECT_ID/nlqdb-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/nlqdb-frontend ./frontend

# Deploy
gcloud run deploy nlqdb-backend \
  --image gcr.io/PROJECT_ID/nlqdb-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy nlqdb-frontend \
  --image gcr.io/PROJECT_ID/nlqdb-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku

```bash
heroku create nlqdb-backend
heroku create nlqdb-frontend
heroku addons:create mongolab
heroku addons:create heroku-redis

git subtree push --prefix backend heroku master
```

---

## Post-Deployment Tasks

### 1. Create Admin User

```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Authorization: Bearer YOUR_INITIAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@yourcompany.com",
    "password": "secure-password",
    "role": "admin"
  }'
```

### 2. Setup Monitoring

**Prometheus + Grafana:**

```bash
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3001:3000 grafana/grafana
```

Configure prometheus.yml to scrape metrics from your app.

**Application Monitoring:**
- Add New Relic, Datadog, or similar
- Setup error tracking (Sentry)
- Configure log aggregation (ELK stack)

### 3. Setup Backups

**MongoDB Backup:**

```bash
# Create backup script
cat > /opt/nlqdb/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec nlqdb-mongo mongodump \
  --archive=/backup/nlqdb_$DATE.archive \
  --gzip
# Upload to S3 or similar
EOF

chmod +x /opt/nlqdb/backup.sh

# Add to crontab
echo "0 2 * * * /opt/nlqdb/backup.sh" | crontab -
```

### 4. Setup Alerts

Configure alerts for:
- High error rates
- API latency > 1s
- Database connection failures
- Disk space < 20%
- Memory usage > 85%

### 5. Performance Tuning

**MongoDB Indexes:**
```javascript
db.customers.createIndex({ city: 1, lifetime_value: -1 });
db.orders.createIndex({ created_at: -1, status: 1 });
db.audit_queries.createIndex({ userId: 1, timestamp: -1 });
```

**Redis Cache:**
- Enable query result caching
- Cache schema information
- Cache user sessions

**Node.js:**
- Use PM2 for process management
- Enable cluster mode for multi-core
- Configure memory limits

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl https://yourdomain.com/api/health

# Database connection
docker exec nlqdb-mongo mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec nlqdb-redis redis-cli ping
```

### Log Viewing

```bash
# Backend logs
docker logs -f nlqdb-backend

# Frontend logs
docker logs -f nlqdb-frontend

# MongoDB logs
docker logs -f nlqdb-mongo
```

### Scaling

**Horizontal Scaling (Load Balancer):**

```yaml
# docker-compose with replicas
services:
  backend:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
```

**Vertical Scaling:**

Adjust resource limits in docker-compose:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

---

## Rollback Procedure

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore previous version
git checkout <previous-tag>

# Rebuild and start
docker-compose -f docker-compose.prod.yml up -d --build

# Restore database if needed
docker exec nlqdb-mongo mongorestore \
  --archive=/backup/nlqdb_backup.archive \
  --gzip
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Setup rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Implement IP whitelisting (if needed)
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable 2FA for admin accounts
- [ ] Regular security audits
- [ ] Database encryption at rest

---

## Troubleshooting

**Container won't start:**
```bash
docker logs <container-name>
docker inspect <container-name>
```

**Database connection issues:**
```bash
# Check MongoDB is accessible
docker exec nlqdb-backend ping mongo
# Check credentials
docker exec nlqdb-mongo mongosh -u admin -p <password>
```

**High memory usage:**
```bash
docker stats
# Adjust limits or scale horizontally
```

**Slow queries:**
```bash
# Enable MongoDB profiler
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```
