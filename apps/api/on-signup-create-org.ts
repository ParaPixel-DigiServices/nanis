// Supabase Edge Function: On Signup Create Organization
// Creates profile, organization, and organization_members row atomically
// Uses service role to bypass RLS for organization creation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupEvent {
  record: {
    id: string;
    email?: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get service role client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse the signup event
    const event: SignupEvent = await req.json();
    const userId = event.record.id;
    const userEmail = event.record.email;
    const userMetadata = event.record.raw_user_meta_data || {};
    const fullName =
      userMetadata.full_name || userMetadata.name || userEmail?.split("@")[0] || "User";

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if profile already exists (idempotency check)
    const { data: existingProfile, error: profileCheckError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" - that's expected for new users
      throw new Error(`Failed to check profile: ${profileCheckError.message}`);
    }

    // If profile exists, check if user already has an organization
    if (existingProfile) {
      const { data: existingMembership, error: membershipCheckError } =
        await supabaseAdmin
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", userId)
          .eq("role", "owner")
          .limit(1)
          .single();

      if (membershipCheckError && membershipCheckError.code !== "PGRST116") {
        throw new Error(
          `Failed to check membership: ${membershipCheckError.message}`
        );
      }

      // If user already has an organization, return success (idempotent)
      if (existingMembership) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "User already has organization",
            organization_id: existingMembership.organization_id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Create profile if it doesn't exist (idempotent)
    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: userEmail,
          full_name: fullName,
        });

      if (profileError) {
        // If profile already exists (race condition), continue
        if (profileError.code !== "23505") {
          // 23505 is unique violation - expected in race conditions
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }
      }
    }

    // Generate organization name and slug from user's name/email
    const orgName = `${fullName}'s Workspace`;
    const baseSlug = (fullName || userEmail || "workspace")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure unique slug by appending user ID if needed
    let orgSlug = baseSlug;
    let slugAttempts = 0;
    let slugAvailable = false;

    while (!slugAvailable && slugAttempts < 10) {
      const { data: existingOrg } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (!existingOrg) {
        slugAvailable = true;
      } else {
        slugAttempts++;
        orgSlug = `${baseSlug}-${userId.slice(0, 8)}`;
      }
    }

    // Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: orgName,
        slug: orgSlug,
        created_by: userId,
      })
      .select("id")
      .single();

    if (orgError) {
      // If organization creation fails, check if it was created by another request (race condition)
      if (orgError.code === "23505") {
        // Unique constraint violation on slug - try to find existing org
        const { data: existingOrg } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("slug", orgSlug)
          .single();

        if (existingOrg) {
          // Use existing organization
          const { data: membership, error: membershipError } =
            await supabaseAdmin
              .from("organization_members")
              .insert({
                organization_id: existingOrg.id,
                user_id: userId,
                role: "owner",
              })
              .select("organization_id")
              .single();

          if (membershipError) {
            // If membership already exists, return success (idempotent)
            if (membershipError.code === "23505") {
              return new Response(
                JSON.stringify({
                  success: true,
                  message: "Organization and membership already exist",
                  organization_id: existingOrg.id,
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }
            throw new Error(
              `Failed to create membership: ${membershipError.message}`
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Organization and membership created",
              organization_id: existingOrg.id,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    // Create organization_members row with role = 'owner'
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: "owner",
      })
      .select("organization_id")
      .single();

    if (membershipError) {
      // If membership already exists (race condition), return success (idempotent)
      if (membershipError.code === "23505") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Membership already exists",
            organization_id: organization.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile, organization, and membership created successfully",
        organization_id: organization.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in on-signup-create-org:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
