# NLQDB Deployment Guide for Render

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at https://render.com
3. **MongoDB Atlas** - Already configured (keep your connection string)
4. **Redis Cloud** - Sign up at https://redis.com/try-free/ for free tier

## Deployment Steps

### 1. Prepare Environment Variables

Create these environment variables in Render dashboard:

#### Backend Service Environment Variables:
```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-atlas-connection-string>
REDIS_URL=<your-redis-cloud-url>
JWT_SECRET=<auto-generate-or-use-strong-random-string>
DATABASE_ENCRYPTION_KEY=<auto-generate-or-use-32-char-string>
GOOGLE_AI_API_KEY=<your-google-gemini-api-key>
FRONTEND_URL=https://nlqdb.onrender.com
MAX_ROWS=10000
MAX_PIPELINE_STAGES=10
QUERY_TIMEOUT_MS=30000
```

#### Frontend Service Environment Variables:
```
VITE_API_URL=https://nlqdb-backend.onrender.com/api
```

### 2. Deploy Using Render Blueprint (render.yaml)

**Option A: Automatic Deployment (Recommended)**

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create all services automatically
5. Fill in the environment variables when prompted
6. Click "Apply" to deploy

**Option B: Manual Deployment**

#### Deploy Backend:
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: nlqdb-backend
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)
5. Add all environment variables listed above
6. Click "Create Web Service"

#### Deploy Frontend:
1. Click "New" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: nlqdb-frontend
   - **Branch**: main
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
4. Add `VITE_API_URL` environment variable
5. Add rewrite rule: `/*` → `/index.html` (for SPA routing)
6. Click "Create Static Site"

### 3. Setup External Services

#### MongoDB Atlas (Already Done ✓)
Your existing MongoDB Atlas connection should work as-is.

#### Redis Cloud Setup:
1. Sign up at https://redis.com/try-free/
2. Create a free database (30MB is enough for rate limiting)
3. Get connection URL: `redis://default:<password>@<host>:<port>`
4. Add to Render backend environment as `REDIS_URL`

### 4. Post-Deployment Configuration

1. **Update CORS origins** in backend if needed
2. **Test API health**: Visit `https://nlqdb-backend.onrender.com/api/health`
3. **Verify frontend**: Visit `https://nlqdb.onrender.com`

### 5. Custom Domain (Optional)

1. In Render dashboard, go to your frontend service
2. Click "Settings" → "Custom Domain"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Update DNS records as instructed
5. Update `FRONTEND_URL` in backend env vars

## Important Notes

### Free Tier Limitations:
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-50 seconds
- 750 hours/month of runtime
- Consider Starter plan ($7/month) for production

### Database Connections:
- Use MongoDB Atlas (not local MongoDB)
- External database connections work on free tier
- Keep connection strings in environment variables (never in code)

### Monitoring:
- Check logs in Render dashboard
- Set up health check endpoints
- Monitor MongoDB Atlas metrics

### Scaling:
- Upgrade to Starter plan for always-on services
- Enable auto-scaling if traffic increases
- Consider Redis persistence options for production

## Troubleshooting

**Backend won't start:**
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check build logs for errors

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure backend service is running

**Database connection errors:**
- Whitelist Render IPs in MongoDB Atlas (or use 0.0.0.0/0)
- Check connection string format
- Verify database user permissions

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Setup Redis Cloud database
- [ ] Deploy backend service with all env vars
- [ ] Deploy frontend service with API URL
- [ ] Test backend health endpoint
- [ ] Test frontend loads and connects to API
- [ ] Create test user and verify functionality
- [ ] Setup custom domain (optional)
- [ ] Configure monitoring and alerts

## Useful Commands

```bash
# Test backend locally before deploy
cd backend && npm start

# Build frontend locally to test
cd frontend && npm run build && npm run preview

# Check production build size
cd frontend && npm run build
```

## Support

- Render Docs: https://render.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
- Redis Cloud: https://redis.com/redis-enterprise-cloud/overview/
