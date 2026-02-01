# Deploy Backend to Render

Step-by-step to host the Nanis FastAPI backend on Render (frontend on Vercel).

---

## 1. Prepare the repo

- Backend code is in the **backend/** folder.
- Ensure **backend/requirements.txt** and **backend/app/main.py** are committed.

---

## 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) and sign in (GitHub).
2. **Dashboard** → **New** → **Web Service**.
3. Connect your **GitHub** account if needed, then select the **Nanis** repo.
4. Use these settings:

   | Field              | Value                                              |
   | ------------------ | -------------------------------------------------- |
   | **Name**           | `nanis-api` (or any name)                          |
   | **Region**         | Choose closest to your users                       |
   | **Branch**         | `main`                                             |
   | **Root Directory** | `backend`                                          |
   | **Runtime**        | **Python 3**                                       |
   | **Build Command**  | `pip install -r requirements.txt`                  |
   | **Start Command**  | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

5. Click **Advanced** and add **Environment Variables** (see step 3).
6. Click **Create Web Service**.

Render will build and deploy. The first deploy may take a few minutes.

---

## 3. Environment variables on Render

In the Web Service → **Environment** tab, add:

**Required (Supabase):**

| Key                         | Value                              | Notes                                    |
| --------------------------- | ---------------------------------- | ---------------------------------------- |
| `SUPABASE_URL`              | `https://your-project.supabase.co` | From Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY`         | `eyJ...`                           | Same place                               |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`                           | Same place (keep secret)                 |
| `SUPABASE_JWT_SECRET`       | Your JWT secret                    | Dashboard → Settings → API → JWT Secret  |

**Server:**

| Key           | Value        |
| ------------- | ------------ |
| `ENVIRONMENT` | `production` |

**CORS (so Vercel frontend can call the API):**

| Key                     | Value                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS_EXTRA` | Your Vercel app URL, e.g. `https://nanis.vercel.app` (no trailing slash). Multiple: `https://a.vercel.app,https://b.vercel.app` |

**Optional (Phase 2 — email):**  
If you use SES, add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL` as in **backend/.env.example**.

After saving, Render will redeploy automatically.

---

## 4. Get the backend URL

- In Render: **Web Service** → top of page: **URL** (e.g. `https://nanis-api.onrender.com`).
- Use this as the API base URL for the frontend.

---

## 5. Point the frontend to the backend

In your **Vercel** project (or local **frontend/.env**):

- Set: `VITE_API_URL=https://your-render-url.onrender.com` (no trailing slash).  
  The frontend uses this in **frontend/src/lib/api.js**.

Redeploy the frontend on Vercel after changing env vars.

---

## 6. Verify

1. Open `https://your-render-url.onrender.com/api/v1/health` → should return `{"status":"ok"}`.
2. Open your Vercel app, sign in/sign up → requests should go to the Render backend and CORS should allow them.

---

## Notes

- **Free tier:** The service may spin down after inactivity; the first request after idle can be slow (cold start).
- **Docs in production:** OpenAPI docs (`/docs`, `/redoc`) are disabled when `ENVIRONMENT=production` for security.
- **Logs:** Use **Render Dashboard → your service → Logs** to debug failed builds or runtime errors.
