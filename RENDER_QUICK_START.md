# Quick Start: Deploy to Render

## 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## 2. Setup External Services

### Redis Cloud (Required for Rate Limiting)
1. Go to https://redis.com/try-free/
2. Sign up and create a free database
3. Copy the connection URL (format: `redis://default:password@host:port`)

### MongoDB Atlas (Already Configured ✓)
- You're already using MongoDB Atlas
- Just keep your connection string ready

## 3. Deploy on Render

### Quick Method (Blueprint - Recommended):
1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repo: `PavitraDeepak/NLQDB`
4. Render will detect `render.yaml`
5. Fill in these environment variables:

   **Backend:**
   ```
   MONGODB_URI=<your-atlas-connection-string>
   REDIS_URL=<your-redis-cloud-url>
   JWT_SECRET=<click-generate>
   DATABASE_ENCRYPTION_KEY=<click-generate>
   GOOGLE_AI_API_KEY=<your-gemini-api-key>
   ```

6. Click "Apply"

### Manual Method (If Blueprint doesn't work):

**A. Deploy Backend:**
1. New → Web Service
2. Connect GitHub → Select NLQDB repo
3. Settings:
   - Name: `nlqdb-backend`
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
4. Add environment variables (same as above)
5. Create

**B. Deploy Frontend:**
1. New → Static Site
2. Connect GitHub → Select NLQDB repo
3. Settings:
   - Name: `nlqdb-frontend`
   - Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://nlqdb-backend.onrender.com/api
   ```
5. Add Rewrite Rule: `/*` → `/index.html`
6. Create

## 4. Verify Deployment

1. **Backend Health Check:**
   - Visit: `https://nlqdb-backend.onrender.com/api/health`
   - Should see: `{"status":"ok",...}`

2. **Frontend:**
   - Visit: `https://nlqdb.onrender.com`
   - Should see login page

3. **Test Full Flow:**
   - Register a new account
   - Connect a database
   - Run a query

## 5. Important: First Request
⚠️ **Free tier services sleep after 15 min of inactivity**
- First request takes 30-50 seconds to wake up
- Upgrade to Starter ($7/month) for always-on service

## Environment Variables Reference

### Required for Backend:
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | Your MongoDB Atlas connection | `mongodb+srv://user:pass@cluster.mongodb.net/nlqdb` |
| `REDIS_URL` | Redis Cloud connection | `redis://default:pass@host:port` |
| `JWT_SECRET` | Random string for JWT | Click "Generate" in Render |
| `DATABASE_ENCRYPTION_KEY` | 32-char encryption key | Click "Generate" in Render |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | Get from Google AI Studio |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Port number | `5000` (auto-set) |
| `FRONTEND_URL` | Frontend URL for CORS | `https://nlqdb.onrender.com` |

### Required for Frontend:
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://nlqdb-backend.onrender.com/api` |

## Troubleshooting

**Backend fails to start:**
```bash
# Check these in Render logs:
- MongoDB connection string format correct?
- All env variables set?
- Redis URL accessible?
```

**Frontend blank page:**
```bash
# In browser console:
- Check VITE_API_URL is correct
- Verify backend is running
- Check CORS settings
```

**502 Bad Gateway:**
```bash
# Backend is probably starting (wait 30-50 sec)
# Or check backend logs for errors
```

## Post-Deployment

1. **Whitelist Render IPs in MongoDB Atlas:**
   - Go to MongoDB Atlas → Network Access
   - Add: `0.0.0.0/0` (or Render's IP ranges)

2. **Monitor:**
   - Check Render dashboard for logs
   - Monitor MongoDB Atlas metrics
   - Set up alerts for downtime

3. **Upgrade (Optional):**
   - Starter plan ($7/mo) keeps service always-on
   - Better for production use

## Need Help?

- **Render Docs**: https://render.com/docs
- **Support**: Check `DEPLOYMENT.md` for detailed guide
- **Logs**: View in Render dashboard under each service
