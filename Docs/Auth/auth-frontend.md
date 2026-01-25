# **FRONTEND AUTHENTICATION RESOLUTION PATTERN**

---

## **1. Purpose of This Document**

This document describes the **frontend authentication resolution pattern** using the `useAuth` React hook. It covers session handling, organization resolution, loading behavior, and how the pattern works with Day-1 Row Level Security (RLS) policies.

---

## **2. Overview**

The `useAuth` hook provides a unified interface for accessing authentication state and user data in React components. It automatically:

1. **Resolves the authenticated user** from Supabase Auth
2. **Fetches the user's profile** from the `profiles` table
3. **Resolves the user's organization** via `organization_members` → `organizations` join
4. **Handles session refresh** and auth state changes
5. **Manages loading states** during data fetching

**Location:** `apps/web/hooks/useAuth.ts`

**Related Files:**
* `apps/web/lib/supabase.ts` - Shared Supabase client instance
* `apps/web/context/AuthContext.tsx` - React context provider

---

## **3. Hook API**

### **3.1 Return Value**

```typescript
interface UseAuthReturn {
  user: User | null;                    // Supabase Auth user
  profile: Profile | null;              // User's profile from profiles table
  organization: Organization | null;    // User's organization (first one)
  organizationMember: OrganizationMember | null; // Membership details
  loading: boolean;                     // Loading state
  session: Session | null;              // Current Supabase session
}
```

### **3.2 Usage Example**

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, profile, organization, loading, session } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {profile?.full_name || user.email}</h1>
      <p>Organization: {organization?.name}</p>
    </div>
  );
}
```

---

## **4. Session Handling**

### **4.1 Initial Session Resolution**

On component mount, the hook:

1. **Gets initial session** via `supabase.auth.getSession()`
   * Checks for existing session in localStorage/cookies
   * Returns session if user is already authenticated

2. **Sets user state** from session
   * `user` = session.user if session exists, otherwise `null`
   * `session` = current session object

3. **Fetches user data** if session exists
   * Triggers profile and organization fetching

### **4.2 Session Refresh**

The hook uses Supabase's `onAuthStateChange` listener to handle:

* **Token refresh** - Automatically refreshes expired tokens
* **Session updates** - Reacts to session changes in real-time
* **Sign out events** - Clears all user data when user signs out
* **Sign in events** - Fetches user data when user signs in

**Configuration:**
```typescript
{
  auth: {
    autoRefreshToken: true,    // Automatically refresh tokens
    persistSession: true,      // Persist session in localStorage
    detectSessionInUrl: true,  // Detect session in URL (OAuth callbacks)
  }
}
```

### **4.3 Auth State Events**

The hook listens to these Supabase auth events:

* `SIGNED_IN` - User signed in, fetches user data
* `SIGNED_OUT` - User signed out, clears all data
* `TOKEN_REFRESHED` - Token refreshed, updates session
* `USER_UPDATED` - User metadata updated, refetches data
* `PASSWORD_RECOVERY` - Password recovery initiated

---

## **5. Organization Resolution**

### **5.1 Resolution Flow**

The hook resolves the user's organization through a **join query**:

```typescript
// Query structure
from("organization_members")
  .select(`
    *,
    organizations (*)
  `)
  .eq("user_id", currentUser.id)
  .limit(1)
  .maybeSingle()
```

**Steps:**
1. Query `organization_members` table filtered by `user_id`
2. Join with `organizations` table to get organization details
3. Limit to 1 result (first organization)
4. Extract organization from joined result

### **5.2 RLS Compatibility**

The organization resolution works with Day-1 RLS policies:

**Organization Members Policy:**
```sql
-- Users can read their own organization_members rows
USING (user_id = auth.uid())
```

**Organizations Policy:**
```sql
-- Users can read organizations they are members of
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
    AND user_id = auth.uid()
  )
)
```

The join query respects both policies:
* User can read their own membership (first policy)
* User can read the organization they're a member of (second policy)

### **5.3 Multiple Organizations**

**Current Behavior:**
* Returns the **first organization** the user belongs to
* Uses `.limit(1)` in the query

**Future Enhancement:**
* Could be extended to return all organizations
* Could add organization selection/switching logic
* Could add `currentOrganization` state management

### **5.4 No Organization Scenario**

If user has no organization:
* `organization` = `null`
* `organizationMember` = `null`
* Hook still returns successfully (no error)

This can happen if:
* User just signed up and Edge Function hasn't run yet
* User's organization was deleted
* User was removed from all organizations

---

## **6. Loading Behavior**

### **6.1 Loading States**

The `loading` state indicates when data is being fetched:

**Initial Load:**
```typescript
loading = true  // While fetching initial session and user data
loading = false // After data is fetched or if no session exists
```

**Session Changes:**
```typescript
loading = true  // When auth state changes (sign in/out)
loading = false // After new data is fetched or user signed out
```

### **6.2 Loading Flow Diagram**

```
Component Mount
    ↓
loading = true
    ↓
Get Session
    ↓
Session exists?
    ├─ Yes → Fetch Profile + Organization
    │         ↓
    │      loading = false
    │
    └─ No → loading = false
```

### **6.3 Best Practices for Loading States**

**Show Loading UI:**
```typescript
if (loading) {
  return <LoadingSpinner />;
}
```

**Handle No User:**
```typescript
if (!loading && !user) {
  return <SignInPrompt />;
}
```

**Handle No Organization:**
```typescript
if (!loading && user && !organization) {
  return <OrganizationSetupPrompt />;
}
```

---

## **7. Data Fetching Strategy**

### **7.1 Profile Fetching**

**Query:**
```typescript
.from("profiles")
  .select("*")
  .eq("id", currentUser.id)
  .single()
```

**RLS Policy:** `profiles_select_own` - Users can read their own profile

**Error Handling:**
* `PGRST116` (not found) - Profile might not exist yet (handled gracefully)
* Other errors - Logged to console, profile set to `null`

### **7.2 Organization Fetching**

**Query:**
```typescript
.from("organization_members")
  .select(`
    *,
    organizations (*)
  `)
  .eq("user_id", currentUser.id)
  .limit(1)
  .maybeSingle()
```

**RLS Policies:**
* `organization_members_select_own` - Users can read their own memberships
* `organizations_select_member` - Users can read organizations they're members of

**Error Handling:**
* `PGRST116` (not found) - User has no organization (handled gracefully)
* Other errors - Logged to console, organization set to `null`

### **7.3 Fetch Timing**

**Initial Fetch:**
* Happens after session is confirmed
* Runs once on component mount

**Refetch on Auth Change:**
* Triggers when `onAuthStateChange` fires
* Refetches all data when user signs in
* Clears all data when user signs out

---

## **8. Error Handling**

### **8.1 Session Errors**

**Error Getting Session:**
```typescript
if (sessionError) {
  console.error("Error getting session:", sessionError);
  setUser(null);
  setSession(null);
  setLoading(false);
}
```

**Result:** Hook returns with `user = null`, `loading = false`

### **8.2 Profile Errors**

**Profile Not Found (PGRST116):**
* Handled gracefully - profile might not exist yet
* `profile` set to `null`
* Hook continues normally

**Other Profile Errors:**
* Logged to console
* `profile` set to `null`
* Hook continues normally

### **8.3 Organization Errors**

**No Organization (PGRST116):**
* Handled gracefully - user might not have organization yet
* `organization` and `organizationMember` set to `null`
* Hook continues normally

**Other Organization Errors:**
* Logged to console
* `organization` and `organizationMember` set to `null`
* Hook continues normally

### **8.4 Component Cleanup**

**Unmount Handling:**
```typescript
return () => {
  mounted = false;
  subscription.unsubscribe();
};
```

* Prevents state updates after unmount
* Unsubscribes from auth state listener
* Prevents memory leaks

---

## **9. RLS Compatibility**

### **9.1 How It Works with Day-1 RLS**

The hook is designed to work seamlessly with Day-1 minimal RLS policies:

| Data | RLS Policy | Hook Behavior |
|------|-----------|---------------|
| Profile | `profiles_select_own` | Queries own profile only |
| Organization | `organizations_select_member` | Queries via membership join |
| Membership | `organization_members_select_own` | Queries own memberships only |

### **9.2 Query Permissions**

All queries use the **authenticated user's session**, which means:
* RLS policies are automatically enforced
* User can only access their own data
* No service role or elevated permissions needed
* Secure by default

### **9.3 Edge Cases**

**Profile Doesn't Exist:**
* RLS allows query (user can read own profile)
* Query returns "not found" (PGRST116)
* Hook handles gracefully, returns `null`

**No Organization:**
* RLS allows query (user can read own memberships)
* Query returns "not found" (PGRST116)
* Hook handles gracefully, returns `null`

---

## **10. Usage Patterns**

### **10.1 Basic Usage**

```typescript
function Dashboard() {
  const { user, profile, organization, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <SignIn />;
  if (!organization) return <SetupOrganization />;

  return <DashboardContent org={organization} />;
}
```

### **10.2 Conditional Rendering**

```typescript
function Header() {
  const { user, profile, organization } = useAuth();

  return (
    <header>
      {user ? (
        <div>
          <span>{profile?.full_name || user.email}</span>
          {organization && <span>{organization.name}</span>}
        </div>
      ) : (
        <SignInButton />
      )}
    </header>
  );
}
```

### **10.3 Accessing Session**

```typescript
function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) {
    router.push('/signin');
    return null;
  }

  return <ProtectedContent />;
}
```

### **10.4 Organization Context**

```typescript
function OrganizationSwitcher() {
  const { organization, organizationMember } = useAuth();

  if (!organization) return null;

  return (
    <div>
      <span>{organization.name}</span>
      <span>Role: {organizationMember?.role}</span>
    </div>
  );
}
```

---

## **11. Supabase Client Architecture**

### **11.1 Shared Client Instance**

The application uses a **singleton Supabase client** pattern to prevent AbortErrors and ensure consistent session management.

**Location:** `apps/web/lib/supabase.ts`

**Implementation:**
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Benefits:**
* Single client instance across the entire application
* Prevents AbortErrors from multiple client instances during navigation
* Consistent session management
* Better performance (no duplicate client creation)

### **11.2 Usage Pattern**

All components import and use the shared client:

```typescript
import { supabase } from '@/lib/supabase';

// Use directly - no need to create new instances
await supabase.auth.signOut();
```

**Files using shared client:**
* `apps/web/hooks/useAuth.ts` - Authentication hook
* `apps/web/app/signin/page.tsx` - Sign in page
* `apps/web/app/test-auth/page.tsx` - Test page

---

## **12. Environment Variables**

The application requires these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

**Where to find:**
* Supabase Dashboard → Project Settings → API

**Security:**
* These are public keys (safe to expose in frontend)
* RLS policies enforce security at the database level
* Never use service role key in frontend

---

## **13. Performance Considerations**

### **12.1 Query Optimization**

**Profile Query:**
* Uses `.single()` for direct lookup
* Indexed on `id` (primary key)
* Fast lookup

**Organization Query:**
* Uses `.limit(1)` to get first organization
* Joins with `organizations` in single query
* Efficient for most use cases

### **12.2 Caching**

**Session Caching:**
* Supabase client caches session in localStorage
* Reduces unnecessary API calls
* Automatic token refresh

**Data Caching:**
* Hook doesn't implement additional caching
* Data refetches on auth state changes
* Consider adding React Query or SWR for advanced caching

### **12.3 Re-renders**

**State Updates:**
* Hook updates state only when data changes
* Uses React's `useState` and `useEffect`
* Minimal re-renders

**Optimization Tips:**
* Use `React.memo` for components using the hook
* Extract specific values if only using part of the return
* Consider context provider for app-wide access

---

## **14. Best Practices**

### **13.1 Always Check Loading State**

```typescript
// ✅ Good
if (loading) return <Spinner />;

// ❌ Bad - might show stale data
if (!user) return <SignIn />;
```

### **13.2 Handle Null Values Safely**

```typescript
// ✅ Good
{profile?.full_name || user?.email || 'User'}

// ❌ Bad - might throw error
{profile.full_name}
```

### **13.3 Use Optional Chaining**

```typescript
// ✅ Good
{organization?.name}

// ❌ Bad
{organization && organization.name}
```

### **13.4 Don't Call in Loops**

```typescript
// ✅ Good - call once at component level
const { user } = useAuth();

// ❌ Bad - violates rules of hooks
users.map(user => {
  const { profile } = useAuth(); // Don't do this
});
```

---

## **15. Error Handling**

### **15.1 AbortError Handling**

The implementation handles `AbortError` gracefully, which can occur when:
* React/Next.js aborts requests during component unmount
* Navigation happens while requests are in flight
* Component cleanup occurs during async operations

**Handling Strategy:**
* AbortErrors are caught and ignored (they're expected in these scenarios)
* Other errors are logged for debugging
* State updates are guarded with `mounted` checks
* Loading state is always set to `false` in `finally` blocks

**Example:**
```typescript
try {
  // ... async operations
} catch (error) {
  // Ignore AbortError - it's expected when component unmounts
  if (error instanceof Error && error.name !== "AbortError") {
    console.error("Error:", error);
  }
} finally {
  // Always clean up
  if (mounted) {
    setLoading(false);
  }
}
```

### **15.2 Network Errors**

Network errors are handled gracefully:
* Failed requests don't crash the application
* Missing data (profile/organization) is handled with null checks
* User experience remains smooth even with network issues

---

## **16. Troubleshooting**

### **16.1 User Not Loading**

**Check:**
* Environment variables set correctly
* User is authenticated (check Supabase Auth)
* Session exists in localStorage
* Network requests in browser DevTools

**Debug:**
```typescript
const { user, session, loading } = useAuth();
console.log({ user, session, loading });
```

### **16.2 Profile Not Loading**

**Possible Causes:**
* Profile doesn't exist (user just signed up)
* RLS policy blocking access
* Network error

**Check:**
* Verify profile exists in database
* Check RLS policies are applied
* Check browser console for errors

### **16.3 Organization Not Loading**

**Possible Causes:**
* User has no organization
* Organization creation failed during signup
* RLS policy blocking access

**Check:**
* Verify `organization_members` row exists
* Verify `organizations` row exists
* Check RLS policies are applied
* Check Edge Function logs for signup errors

### **16.4 Loading Never Stops**

**Possible Causes:**
* Error in fetchUserData not caught
* Component unmounted before fetch completes
* Infinite loop in auth state change

**Check:**
* Check browser console for errors
* Verify cleanup function is called
* Check for circular dependencies

---

### **16.1 AbortError in Console**

**Symptom:** Console shows "AbortError: signal is aborted without reason"

**Cause:** Multiple Supabase client instances or navigation during requests

**Solution:**
* Ensure all components use the shared `supabase` client from `lib/supabase.ts`
* Don't create new client instances in components
* AbortErrors are now handled and ignored (they're expected during navigation)

---

## **17. Related Documentation**

* **RLS Policies:** `Docs/Database/rls.md` - Day-1 minimal RLS strategy
* **Signup Flow:** `Docs/Auth/signup-flow.md` - How profiles and organizations are created
* **Database Schema:** `database/schema-auth-tables.sql` - Table definitions
* **Hook Implementation:** `apps/web/hooks/useAuth.ts` - Source code
* **Shared Client:** `apps/web/lib/supabase.ts` - Singleton Supabase client
* **Auth Context:** `apps/web/context/AuthContext.tsx` - React context provider

---

## **18. Status**

✅ **Frontend authentication resolution pattern is implemented and documented.**

The `useAuth` hook provides a robust, RLS-compatible way to access authentication state and user data throughout the application.

---
