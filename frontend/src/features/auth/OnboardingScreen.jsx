import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import logo from "../../assets/logo.svg";

/** For users who signed in (e.g. OAuth) but have no org yet: create workspace (name + slug). */
export default function OnboardingScreen() {
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { session, loading, refreshOrganizations } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!session?.access_token) {
      setError("Not signed in.");
      return;
    }
    const name = businessName.trim();
    const s = slug.trim().toLowerCase();
    if (!name || !s) {
      setError("Business name and domain slug are required.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(s)) {
      setError("Slug must be lowercase letters, numbers, and hyphens only.");
      return;
    }
    setSubmitting(true);
    const res = await api("/onboard", {
      method: "POST",
      body: { name, slug: s },
      token: session.access_token,
    });
    setSubmitting(false);
    if (res.ok) {
      await refreshOrganizations();
      navigate("/campaigns/email", { replace: true });
    } else {
      setError(res.error || res.data?.detail || "Failed to create workspace");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <p className="font-sans text-[14px] text-gray-600">Loading…</p>
      </div>
    );
  }
  if (!session) {
    navigate("/signin", { replace: true });
    return null;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-surface-dark p-4">
      <div className="w-full max-w-md rounded-[26px] p-[12px] border border-surface-border bg-white shadow-sm">
        <div className="flex items-center gap-[4px] mb-4">
          <img src={logo} alt="Logo" className="w-[26px] h-[26px]" />
          <span className="font-brand font-semibold text-[19.35px] text-brand-dark">
            Mail<span className="text-brand-blue">App</span>
          </span>
        </div>
        <h2 className="font-sans font-medium text-[18px] text-[#0F172A] mb-4">
          Create your workspace
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="font-sans text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div>
            <label className="font-sans font-medium text-[13px] text-[#0F172A] block mb-1">
              Business name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="My Company"
              className="w-full h-[40px] rounded-[9px] border border-gray-200 px-3 text-[13px] outline-none font-sans"
            />
          </div>
          <div>
            <label className="font-sans font-medium text-[13px] text-[#0F172A] block mb-1">
              Domain slug (lowercase, letters, numbers, hyphens)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="my-company"
              className="w-full h-[40px] rounded-[9px] border border-gray-200 px-3 text-[13px] outline-none font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !businessName.trim() || !slug.trim()}
            className="h-[32px] rounded-[100px] px-4 flex items-center justify-center text-white font-sans text-[13px] font-medium disabled:opacity-70"
            style={{
              background:
                "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
            }}
          >
            {submitting ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
