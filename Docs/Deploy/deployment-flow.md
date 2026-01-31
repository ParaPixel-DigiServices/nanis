# **DEPLOYMENT FLOW**

---

## **Purpose of This Document**

This document outlines the planned deployment strategy for the Nanis SaaS platform, including the phased approach for authentication methods and deployment to Vercel.

---

## **Overview**

The deployment follows a **phased approach** to ensure stability and allow for incremental testing:

1. **Phase 1**: Deploy to Vercel with email/password authentication
2. **Phase 2**: Add Google OAuth integration
3. **Phase 3**: Add Apple OAuth integration

This approach allows for:

- Initial deployment with core authentication working
- Incremental testing of each authentication method
- Easier debugging and rollback if issues arise
- Client preview and feedback at each stage

---

## **Phase 1: Initial Vercel Deployment with Email/Password Auth**

### **1.1 Prerequisites**

- [ ] Authentication implementation complete (signup, login, session management)
- [ ] Database schema deployed (profiles, organizations, organization_members)
- [ ] RLS policies applied
- [ ] Edge function deployed (`on-signup-create-org`)
- [ ] Frontend authentication flow working locally

### **1.2 Vercel Project Setup**

1. **Create Vercel Project**

   - Connect GitHub repository
   - Select Next.js framework preset
   - Configure build settings:
     - Build Command: `npm run build` (or `next build`)
     - Output Directory: `.next`
     - Install Command: `npm install`

2. **Environment Variables**

   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: (For Edge Functions, if needed)

3. **Deployment Configuration**
   - Root directory: `apps/web` (if monorepo) or project root
   - Framework: Next.js
   - Node.js version: 18.x or 20.x

### **1.3 Supabase Configuration**

1. **Email/Password Authentication**

   - Ensure email/password provider is enabled in Supabase Dashboard
   - Configure email templates (if custom)
   - Set email confirmation requirements (recommended: disabled for initial deployment)

2. **Database Webhook**

   - Verify webhook is configured for `auth.users` INSERT events
   - Ensure Edge Function is deployed and accessible

3. **RLS Policies**
   - Verify all RLS policies are applied
   - Test that policies allow authenticated users to access their data

### **1.4 Testing Checklist**

- [ ] Signup flow works (creates user, profile, organization, membership)
- [ ] Login flow works (email/password)
- [ ] Session persistence works (refresh page, user stays logged in)
- [ ] Protected routes redirect unauthenticated users
- [ ] Organization data loads correctly
- [ ] Edge function creates organization on signup
- [ ] Multi-step signup flow completes successfully

### **1.5 Deployment Steps**

1. Push code to GitHub repository
2. Vercel will automatically detect and deploy
3. Monitor deployment logs for errors
4. Test authentication flows on deployed URL
5. Share preview URL with client for initial review

---

## **Phase 2: Google OAuth Integration**

### **2.1 Prerequisites**

- [ ] Phase 1 deployment stable and tested
- [ ] Email/password authentication working in production

### **2.2 Google OAuth Setup**

1. **Google Cloud Console**

   - Create OAuth 2.0 credentials
   - Configure authorized redirect URIs:
     - `https://[your-project].supabase.co/auth/v1/callback`
     - `https://[your-vercel-domain].vercel.app/auth/callback` (if custom callback)
   - Note Client ID and Client Secret

2. **Supabase Configuration**

   - Navigate to Authentication → Providers → Google
   - Enable Google provider
   - Enter Google Client ID and Client Secret
   - Configure redirect URL (Supabase handles this automatically)

3. **Frontend Integration**
   - Verify Google sign-in button works in signup/login pages
   - Test OAuth callback handling
   - Ensure user is redirected correctly after OAuth

### **2.3 Testing Checklist**

- [ ] Google sign-in button appears on signup/login pages
- [ ] Clicking Google button redirects to Google OAuth
- [ ] After Google authentication, user is redirected back
- [ ] User session is created correctly
- [ ] Organization is created for OAuth users (via Edge Function)
- [ ] User can access protected routes after Google sign-in
- [ ] Signup flow works with Google OAuth

### **2.4 Deployment Steps**

1. Update Supabase OAuth configuration
2. Test Google OAuth locally (if possible)
3. Deploy to Vercel (no code changes needed if already implemented)
4. Test Google OAuth on production
5. Share updated preview with client

---

## **Phase 3: Apple OAuth Integration**

### **3.1 Prerequisites**

- [ ] Phase 2 deployment stable and tested
- [ ] Google OAuth working in production

### **3.2 Apple OAuth Setup**

1. **Apple Developer Account**

   - Create App ID in Apple Developer Portal
   - Configure Services ID for Sign in with Apple
   - Create Service ID with domain and redirect URLs:
     - Domain: `[your-project].supabase.co`
     - Redirect URL: `https://[your-project].supabase.co/auth/v1/callback`
   - Generate Client Secret (JWT)
   - Note Services ID and Team ID

2. **Supabase Configuration**

   - Navigate to Authentication → Providers → Apple
   - Enable Apple provider
   - Enter Apple Services ID, Team ID, Key ID, and Private Key
   - Configure redirect URL

3. **Frontend Integration**
   - Verify Apple sign-in button works in signup/login pages
   - Test OAuth callback handling
   - Ensure user is redirected correctly after OAuth

### **3.3 Testing Checklist**

- [ ] Apple sign-in button appears on signup/login pages
- [ ] Clicking Apple button redirects to Apple OAuth
- [ ] After Apple authentication, user is redirected back
- [ ] User session is created correctly
- [ ] Organization is created for OAuth users (via Edge Function)
- [ ] User can access protected routes after Apple sign-in
- [ ] Signup flow works with Apple OAuth
- [ ] Email handling works (Apple may hide email)

### **3.4 Deployment Steps**

1. Update Supabase OAuth configuration
2. Test Apple OAuth locally (if possible)
3. Deploy to Vercel (no code changes needed if already implemented)
4. Test Apple OAuth on production
5. Share final preview with client

---

## **Post-Deployment Checklist**

### **Security**

- [ ] All environment variables are set correctly
- [ ] Service role key is not exposed in frontend
- [ ] RLS policies are active and tested
- [ ] OAuth redirect URLs are correctly configured
- [ ] HTTPS is enforced (Vercel default)

### **Performance**

- [ ] Page load times are acceptable
- [ ] Authentication flows are responsive
- [ ] Database queries are optimized
- [ ] Edge function execution time is reasonable

### **Monitoring**

- [ ] Error tracking configured (if applicable)
- [ ] Logs are accessible in Vercel dashboard
- [ ] Supabase logs are monitored
- [ ] Edge function logs are reviewed

### **Documentation**

- [ ] Deployment URL is documented
- [ ] Environment variables are documented
- [ ] OAuth configuration is documented
- [ ] Troubleshooting guide is available

---

## **Rollback Plan**

If issues arise during deployment:

1. **Phase 1 Issues**

   - Revert to previous Vercel deployment
   - Check environment variables
   - Review Supabase configuration
   - Check database webhook status

2. **Phase 2/3 Issues (OAuth)**
   - Disable problematic OAuth provider in Supabase
   - Email/password auth remains functional
   - Fix OAuth configuration
   - Re-enable provider after testing

---

## **Reference: Decision Log**

See **D-018: Vercel Deployment with OAuth for Client Preview** in `Docs/Overview/decision-log.md` for the original decision and reasoning.

---

## **Deployment Status**

- [ ] Phase 1: Email/Password Auth - **Not Started**
- [ ] Phase 2: Google OAuth - **Not Started**
- [ ] Phase 3: Apple OAuth - **Not Started**

---

**Last Updated:** [Date will be updated as deployment progresses]
