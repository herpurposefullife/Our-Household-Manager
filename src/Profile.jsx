import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSectionEncouragement } from "./quotes";

export default function Profile({ session, household }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [householdName, setHouseholdName] = useState(household.name);
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [householdSaved, setHouseholdSaved] = useState(false);
  const [mode, setMode] = useState(household.mode);
  const enc = getSectionEncouragement("profile");

  useEffect(() => { fetchProfile(); }, [session.user.id]);

  async function fetchProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data) {
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || null);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${session.user.id}/avatar.${fileExt}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function saveHousehold(e) {
    e.preventDefault();
    setSavingHousehold(true);
    setHouseholdSaved(false);
    await supabase
      .from("households")
      .update({ name: householdName.trim(), mode })
      .eq("id", household.id);
    setSavingHousehold(false);
    setHouseholdSaved(true);
    setTimeout(() => setHouseholdSaved(false), 2500);
  }

  return (
    <div className="prof-wrap">
      <style>{profCss}</style>

      {/* Faith encouragement */}
      <div className="prof-encouragement">
        <div className="prof-enc-verse">"{enc.verse}"</div>
        <div className="prof-enc-ref">— {enc.reference}</div>
        <div className="prof-enc-note">{enc.note}</div>
      </div>

      {/* Profile section */}
      <div className="prof-section-label">Your profile</div>
      <div className="prof-card">
        <div className="prof-avatar-row">
          <div className="prof-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="prof-avatar-img" />
            ) : (
              <div className="prof-avatar-placeholder">
                {displayName ? displayName[0].toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div className="prof-avatar-actions">
            <label className="prof-upload-btn">
              {uploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            <div className="prof-email">{session.user.email}</div>
          </div>
        </div>

        <form onSubmit={saveProfile}>
          <label>Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How you want to appear in the app"
          />
          <label>Short bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="e.g. Mum, planner, coffee lover"
            rows={3}
          />
          <button type="submit" disabled={saving}>
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>

      {/* Household section */}
      <div className="prof-section-label" style={{ marginTop: 24 }}>
        Household settings
      </div>
      <div className="prof-card">
        <form onSubmit={saveHousehold}>
          <label>Household name</label>
          <input
            type="text"
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
          />
          <label>Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="together">Together (married / living together)</option>
            <option value="co_parenting">Co-Parenting (separated / divorced)</option>
          </select>
          <div className="prof-invite-row">
            <span className="prof-invite-label">Partner invite code:</span>
            <span className="prof-invite-code">{household.invite_code}</span>
          </div>
          <p className="prof-invite-hint">Share this code so your partner can join (optional).</p>
          <button type="submit" disabled={savingHousehold}>
            {householdSaved ? "✓ Saved!" : savingHousehold ? "Saving..." : "Save household settings"}
          </button>
        </form>
      </div>

      {/* Brand footer */}
      <div className="prof-brand-footer">
        <div className="prof-brand-name">HerPurposefulLife</div>
        <div className="prof-brand-handle">@herpurposeful_life</div>
        <div className="prof-brand-tagline">Building Purposeful Homes Through Stewardship</div>
      </div>
    </div>
  );
}

const profCss = `
.prof-wrap { padding-bottom: 60px; }

.prof-encouragement {
  background: linear-gradient(135deg, #3D2F24 0%, #6B5A4A 100%);
  border-radius: 14px; padding: 20px; margin-bottom: 20px; color: white;
}
.prof-enc-verse {
  font-family: 'Source Serif 4', serif; font-style: italic;
  font-size: 15px; line-height: 1.5; margin-bottom: 6px;
}
.prof-enc-ref { font-size: 12px; color: #D9CDBE; margin-bottom: 10px; }
.prof-enc-note {
  font-size: 13px; color: #FAF8F5; line-height: 1.4;
  border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;
}

.prof-section-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #8B6F4E; margin-bottom: 10px;
}

.prof-card {
  background: #FFFFFF; border: 1.5px solid #E8E0D5;
  border-radius: 14px; padding: 22px; margin-bottom: 4px;
}

.prof-avatar-row {
  display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
}
.prof-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  overflow: hidden; background: #E8E0D5; flex-shrink: 0;
}
.prof-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.prof-avatar-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center;
  justify-content: center; font-family: 'Source Serif 4', serif;
  font-size: 24px; font-weight: 600; color: #8B6F4E;
}
.prof-avatar-actions { display: flex; flex-direction: column; gap: 6px; }
.prof-upload-btn {
  display: inline-block; padding: 7px 14px; border: 1.5px solid #D9CDBE;
  border-radius: 8px; font-size: 13px; font-weight: 600;
  color: #6B5A4A; cursor: pointer;
}
.prof-email { font-size: 12px; color: #A89880; }

.prof-card label {
  display: block; font-size: 13px; font-weight: 600;
  color: #3D2F24; margin-bottom: 6px; margin-top: 14px;
}
.prof-card label:first-of-type { margin-top: 0; }
.prof-card input[type="text"],
.prof-card textarea,
.prof-card select {
  width: 100%; padding: 11px 14px; border: 1.5px solid #D9CDBE;
  border-radius: 10px; font-size: 14px; font-family: 'Inter', sans-serif;
  color: #3D2F24; resize: vertical;
}
.prof-card input:focus,
.prof-card textarea:focus,
.prof-card select:focus { outline: none; border-color: #8B6F4E; }

.prof-card button[type="submit"] {
  margin-top: 16px; width: 100%; background: #3D2F24; color: white;
  border: none; border-radius: 10px; padding: 13px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  font-family: 'Inter', sans-serif; transition: background 0.15s;
}
.prof-card button[type="submit"]:hover:not(:disabled) { background: #8B6F4E; }
.prof-card button[type="submit"]:disabled { opacity: 0.6; cursor: default; }

.prof-invite-row {
  display: flex; align-items: center; gap: 10px; margin-top: 14px;
  padding: 12px 14px; background: #FAF8F5; border-radius: 10px;
}
.prof-invite-label { font-size: 13px; color: #6B5A4A; font-weight: 600; }
.prof-invite-code {
  font-family: 'Source Serif 4', serif; font-size: 18px;
  font-weight: 600; letter-spacing: 0.06em; color: #3D2F24;
}
.prof-invite-hint { font-size: 12px; color: #A89880; margin-top: 6px; }

.prof-brand-footer {
  text-align: center; padding: 28px 0 8px;
}
.prof-brand-name {
  font-family: 'Source Serif 4', serif; font-size: 16px;
  font-weight: 600; color: #8B6F4E;
}
.prof-brand-handle { font-size: 13px; color: #A89880; margin-top: 2px; }
.prof-brand-tagline {
  font-size: 12px; color: #C4B8A8; margin-top: 4px;
  font-style: italic;
}
`;
