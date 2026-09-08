# 🚀 Critica Deployment Guide (Frontend & Backend)

This guide provides step-by-step instructions to deploy both the **Backend (Django REST + MongoDB)** and the **Frontend (Next.js)** to production using **Render** (or Railway) and **Vercel**.

---

## 🛠️ Step 1: Deploy Backend to Render (or Railway)

### 1. Push code to GitHub
Ensure all your project changes are committed and pushed to your GitHub repository.

### 2. Create a Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`Critica`).
3. Set the following fields:
   - **Name:** `critica-backend` (or your preferred name)
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Region:** Choose the region closest to your users.
   - **Build Command:** `./build.sh` (or `pip install -r requirement.txt && python manage.py collectstatic --noinput && python manage.py migrate`)
   - **Start Command:** `gunicorn config.wsgi:application`

### 3. Configure Backend Environment Variables
In the Render **Environment** tab, add the following key-value pairs:

| Variable Name | Value / Description | Example |
| :--- | :--- | :--- |
| `DEBUG` | `False` | `False` |
| `SECRET_KEY` | Generate a strong random key | `django-insecure-your-secret-key...` |
| `MONGO_URI` | Your MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster0...` |
| `ALLOWED_HOSTS` | Render host & Vercel host | `critica-backend.onrender.com,localhost` |
| `CORS_ALLOWED_ORIGINS` | Your Vercel frontend URL | `https://critica-sigma.vercel.app` |
| `GEMINI_API_KEY` | *(Optional)* Your Google Gemini API Key | `AIzaSy...` |

4. Click **Create Web Service**. Once deployed, copy your backend URL (e.g. `https://critica-backend.onrender.com`).

---

## 🌐 Step 2: Deploy Frontend to Vercel

### 1. Import Project on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Select your `Critica` GitHub repository.

### 2. Configure Vercel Project Settings
- **Framework Preset:** `Next.js`
- **Root Directory:** Click **Edit** and set to `frontend`
- **Build & Development Settings:** Keep default (`npm run build` / `pnpm build`)

### 3. Add Environment Variable
Under **Environment Variables**, add:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://critica-backend.onrender.com/api` |

*(Replace `https://critica-backend.onrender.com` with your actual Render backend URL).*

4. Click **Deploy**.

---

## 🔗 Step 3: Link Backend CORS with Vercel Frontend Domain

Once Vercel finishes deploying your frontend, it will generate a live URL (e.g. `https://critica-sigma.vercel.app` or `https://critica-frontend.vercel.app`).

1. Copy your Vercel URL.
2. Go back to **Render** -> **Environment** for `critica-backend`.
3. Update `CORS_ALLOWED_ORIGINS` to include your live Vercel URL:
   ```env
   CORS_ALLOWED_ORIGINS=https://critica-sigma.vercel.app,https://your-custom-domain.com
   ```
4. Re-deploy the backend service if Render doesn't auto-deploy.

---

## ✅ Verification Checklist

- [ ] Backend API health check returns `200 OK`: `https://critica-backend.onrender.com/api/`
- [ ] Frontend page loads properly on Vercel URL.
- [ ] Registration (`/auth`) successfully sends request to backend & MongoDB writes the user document.
- [ ] Login returns JWT token and stores it in `localStorage`.
- [ ] Dashboard displays user details without CORS or 500 errors.
