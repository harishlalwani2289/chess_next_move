# Chess Application Deployment Guide

## 🗄️ **Step 1: Database Setup - MongoDB Atlas (Free)**

### Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for free account
3. Create a new cluster (M0 Sandbox - FREE)
4. Choose AWS/Google Cloud/Azure (any region)
5. Cluster name: `chess-app-cluster`

### Configure Database Access
1. **Database Access** → Create Database User
   - Username: `chess-user`
   - Password: Generate secure password (save it!)
   - Database User Privileges: `Atlas admin`

2. **Network Access** → Add IP Address
   - Add `0.0.0.0/0` (Allow access from anywhere)
   - This is needed for deployment platforms

3. **Connect** → Get Connection String
   - Choose "Connect your application"
   - Copy connection string (looks like):
   ```
   mongodb+srv://chess-user:<password>@chess-app-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## 🔧 **Step 2: Backend Deployment - Railway (Free)**

### Option A: Railway (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your chess backend repository

### Environment Variables Setup
In Railway dashboard, go to your project → Variables:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://chess-user:<password>@chess-app-cluster.xxxxx.mongodb.net/chess-app?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### Alternative: Render (Free)
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. "New" → "Web Service"
4. Connect repository
5. Configuration:
   - **Name**: `chess-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

---

## 🌐 **Step 3: Frontend Deployment - Vercel (Free)**

### Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. "New Project" → Import your frontend repository
4. Framework Preset: `Vite`
5. Build Command: `npm run build`
6. Output Directory: `dist`

### Environment Variables
In Vercel dashboard → Project → Settings → Environment Variables:

```env
VITE_API_URL=https://your-railway-app.railway.app/api
```

---

## 📝 **Step 4: Code Changes Needed**

### Backend Changes
Create `railway.json` in backend root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build needed'"
  }
}
```

### Frontend Changes
Update your API service to use environment variable:

```typescript
// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

---

## 🔒 **Step 5: Security Best Practices**

### Environment Variables Security
- **Never commit** `.env` files to Git
- Use different secrets for production
- Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS Configuration
Update backend CORS to allow your Vercel domain:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'https://your-vercel-app.vercel.app'
  ],
  credentials: true
}));
```

---

## 🚀 **Step 6: Deployment Commands**

### Prepare for Deployment
```bash
# Backend
cd backend
npm install
npm run build  # if you have a build step

# Frontend  
cd frontend
npm install
npm run build
```

### Git & Deploy
```bash
# Commit all changes
git add .
git commit -m "Ready for deployment"
git push origin main

# Deploy will happen automatically on:
# - Railway: when you push to connected branch
# - Vercel: when you push to connected branch
```

---

## 🔧 **Step 7: Post-Deployment Configuration**

### Update Frontend API URL
1. Go to Vercel dashboard
2. Project → Settings → Environment Variables
3. Add: `VITE_API_URL=https://your-railway-app.railway.app/api`
4. Redeploy frontend

### Test Deployment
1. Visit your Vercel URL
2. Test authentication
3. Test chess board sync
4. Check browser console for errors

---

## 💰 **Free Tier Limits**

### MongoDB Atlas (Free)
- 512 MB storage
- Shared RAM
- No backup
- Perfect for development/small apps

### Railway (Free)
- $5 credit per month
- Sleep after 30 minutes of inactivity
- 1GB RAM, 1GB disk

### Vercel (Free)
- 100GB bandwidth
- Unlimited personal projects
- Custom domains

---

## 🐛 **Common Issues & Solutions**

### CORS Errors
- Check CORS_ORIGIN environment variable
- Ensure frontend URL matches exactly

### Database Connection Issues
- Verify MongoDB URI format
- Check IP whitelist (0.0.0.0/0)
- Confirm username/password

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies in package.json
- Check build logs for specific errors

---

## 📋 **Quick Deployment Checklist**

- [ ] MongoDB Atlas cluster created
- [ ] Database user and password created
- [ ] Connection string copied
- [ ] Backend deployed to Railway/Render
- [ ] Environment variables set in backend
- [ ] Frontend deployed to Vercel
- [ ] API URL configured in frontend
- [ ] CORS configured properly
- [ ] Authentication tested
- [ ] Board sync functionality tested

---

## 🔗 **Useful Links**

- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Railway](https://railway.app)
- [Render](https://render.com) 
- [Vercel](https://vercel.com)
- [Environment Variables Best Practices](https://12factor.net/config)
