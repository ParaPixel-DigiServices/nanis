# **GOOGLE OAUTH CONFIGURATION**

---

## **Purpose of This Document**

This document provides step-by-step instructions for configuring Google OAuth authentication for the Nanis SaaS platform, including redirect URL setup for both localhost (development) and Vercel (production) environments.

---

## **Overview**

Google OAuth requires specific redirect URLs to be configured in both:
1. **Google Cloud Console** - Where OAuth credentials are created
2. **Supabase Dashboard** - Where the OAuth provider is enabled

The redirect URLs differ between development (localhost) and production (Vercel) environments.

---

## **Redirect URLs**

### **Development (Localhost)**

When running locally at `http://localhost:3000`:

**Supabase Redirect URL:**
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

**Note:** Supabase handles the OAuth callback automatically. You don't need to configure `http://localhost:3000/auth/callback` - Supabase redirects back to your app after authentication.

### **Production (Vercel)**

When deployed to Vercel at `https://[your-app].vercel.app`:

**Supabase Redirect URL:**
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

**Note:** Same as development - Supabase handles the callback. The redirect URL in Google Cloud Console should point to Supabase, not directly to your Vercel domain.

---

## **Step-by-Step Setup**

### **Step 1: Google Cloud Console Setup**

1. **Navigate to Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project (or create a new one)

2. **Enable Google+ API**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google+ API" or "People API"
   - Click **Enable** (if not already enabled)

3. **Create OAuth 2.0 Credentials**
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - If prompted, configure the OAuth consent screen first:
     - User Type: **External** (for public apps)
     - App name: **Nanis**
     - User support email: Your email
     - Developer contact: Your email
     - Click **Save and Continue** through the steps

4. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: **Nanis Web App**
   - **Authorized redirect URIs**: Add the following:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
     Replace `[your-project-ref]` with your actual Supabase project reference.
   
   **Example:**
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```

5. **Save Credentials**
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**
   - Keep these secure - you'll need them for Supabase configuration

---

### **Step 2: Supabase Dashboard Configuration**

1. **Navigate to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Providers**

2. **Enable Google Provider**
   - Find **Google** in the list of providers
   - Toggle it to **Enabled**

3. **Enter OAuth Credentials**
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret

4. **Configure Redirect URL**
   - The redirect URL is automatically set to:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - This matches what you configured in Google Cloud Console

5. **Save Configuration**
   - Click **Save**
   - The Google OAuth provider is now enabled

---

## **Environment-Specific Configuration**

### **Development Environment**

**Localhost URL:** `http://localhost:3000`

**Google Cloud Console:**
- Authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
- Authorized JavaScript origins: `http://localhost:3000` (optional, for testing)

**Supabase:**
- Redirect URL: `https://[your-project-ref].supabase.co/auth/v1/callback` (automatic)
- Site URL: `http://localhost:3000` (set in Supabase Dashboard → Authentication → URL Configuration)

**Frontend Code:**
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
  },
});
```

The `redirectTo` option tells Supabase where to redirect the user after successful authentication. This should be your app's URL (localhost or Vercel).

---

### **Production Environment (Vercel)**

**Vercel URL:** `https://[your-app].vercel.app` or custom domain

**Google Cloud Console:**
- Authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
- Authorized JavaScript origins: `https://[your-app].vercel.app` (optional)

**Supabase:**
- Redirect URL: `https://[your-project-ref].supabase.co/auth/v1/callback` (automatic)
- Site URL: `https://[your-app].vercel.app` (set in Supabase Dashboard → Authentication → URL Configuration)

**Frontend Code:**
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
  },
});
```

The `redirectTo` will automatically use the current origin (Vercel URL in production).

---

## **Important Notes**

### **1. Single Redirect URL**

**Key Point:** You only need **one redirect URL** in Google Cloud Console:
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

This works for both localhost and Vercel because:
- Supabase handles the OAuth callback
- Supabase then redirects to your app's URL (specified in `redirectTo` option)
- The `redirectTo` is dynamic and uses `window.location.origin`

### **2. Site URL Configuration**

Make sure your **Site URL** is configured correctly in Supabase:
- **Development:** `http://localhost:3000`
- **Production:** `https://[your-app].vercel.app`

**Location:** Supabase Dashboard → Authentication → URL Configuration → Site URL

### **3. Redirect Flow**

```
User clicks "Sign in with Google"
    ↓
Frontend calls: supabase.auth.signInWithOAuth()
    ↓
User redirected to: Google OAuth consent screen
    ↓
User authorizes
    ↓
Google redirects to: https://[project].supabase.co/auth/v1/callback
    ↓
Supabase processes OAuth callback
    ↓
Supabase redirects to: [redirectTo value] (e.g., https://app.vercel.app/dashboard)
    ↓
User lands on dashboard, authenticated
```

---

## **Testing**

### **Localhost Testing**

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Should redirect back to `http://localhost:3000/dashboard`

### **Vercel Testing**

1. Deploy to Vercel
2. Navigate to `https://[your-app].vercel.app/login`
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Should redirect back to `https://[your-app].vercel.app/dashboard`

---

## **Troubleshooting**

### **Error: "redirect_uri_mismatch"**

**Cause:** The redirect URI in Google Cloud Console doesn't match what Supabase is using.

**Solution:**
1. Check Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
2. Ensure it exactly matches: `https://[your-project-ref].supabase.co/auth/v1/callback`
3. No trailing slashes, exact match required

### **Error: "Invalid client"**

**Cause:** Client ID or Client Secret is incorrect in Supabase.

**Solution:**
1. Verify Client ID and Client Secret in Supabase Dashboard
2. Copy directly from Google Cloud Console (no extra spaces)
3. Ensure you're using the correct credentials (not from a different project)

### **Redirects to Wrong URL**

**Cause:** Site URL or `redirectTo` option is misconfigured.

**Solution:**
1. Check Supabase Dashboard → Authentication → URL Configuration → Site URL
2. Verify `redirectTo` in frontend code uses `window.location.origin`
3. Ensure the final redirect URL matches your app's domain

### **OAuth Works Locally but Not on Vercel**

**Cause:** Site URL in Supabase is set to localhost only.

**Solution:**
1. Update Supabase Site URL to your Vercel domain
2. Or add both URLs (Supabase supports multiple redirect URLs)
3. Ensure Google Cloud Console has the correct redirect URI

---

## **Security Best Practices**

1. **Never Commit Secrets**
   - Client Secret should only be in Supabase Dashboard
   - Never commit to version control
   - Use environment variables if needed (but Supabase handles this)

2. **Use HTTPS in Production**
   - Vercel automatically provides HTTPS
   - Google OAuth requires HTTPS for production

3. **Restrict OAuth Scopes**
   - Only request necessary scopes
   - Default Supabase Google OAuth requests minimal scopes (email, profile)

4. **Regularly Rotate Credentials**
   - Rotate Client Secret if compromised
   - Update in both Google Cloud Console and Supabase

---

## **Reference: Decision Log**

See **D-018: Vercel Deployment with OAuth for Client Preview** in `Docs/decision-log.md` for the original decision and deployment strategy.

See **Phase 2: Google OAuth Integration** in `Docs/deployment-flow.md` for deployment-specific steps.

---

## **Configuration Checklist**

### **Google Cloud Console**
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Authorized redirect URI added: `https://[project-ref].supabase.co/auth/v1/callback`
- [ ] Client ID and Client Secret copied

### **Supabase Dashboard**
- [ ] Google provider enabled
- [ ] Client ID entered
- [ ] Client Secret entered
- [ ] Site URL configured (localhost for dev, Vercel for prod)

### **Frontend Code**
- [ ] `signInWithOAuth` uses `redirectTo: ${window.location.origin}/dashboard`
- [ ] Error handling implemented
- [ ] Loading states handled

### **Testing**
- [ ] OAuth works on localhost
- [ ] OAuth works on Vercel
- [ ] User redirects to dashboard after authentication
- [ ] Session persists after page refresh

---

**Last Updated:** [Date will be updated as configuration progresses]
