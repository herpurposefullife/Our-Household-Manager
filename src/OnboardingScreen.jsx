import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function OnboardingScreen({ session, onHouseholdReady }) {
  const [mode, setMode] = useState("choose"); // choose | create | join
  const [householdName, setHouseholdName] = useState("Our Household");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const { data: newHousehold, error: createError } = await supabase
      .from("households")
      .insert({ name: householdName.trim() || "Our Household", created_by: session.user.id })
      .select()
      .single();

    if (createError) {
      setStatus("error");
      setErrorMsg(createError.message);
      return;
    }

    const { error: memberError } = await supabase
      .from("household_members")
      .insert({ household_id: newHousehold.id, user_id: session.user.id });

    if (memberError) {
      setStatus("error");
      setErrorMsg(memberError.message);
      return;
    }

    onHouseholdReady(newHousehold);
  }

  async function handleJoin(e) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const { data: foundHousehold, error: findError } = await supabase
      .from("households")
      .select()
      .eq("invite_code", inviteCode.trim().toLowerCase())
      .maybeSingle();

    if (findError || !foundHousehold) {
      setStatus("error");
      setErrorMsg("We couldn't find a household with that invite code. Double-check it and try again.");
      return;
    }

    const { error: memberError } = await supabase
      .from("household_members")
      .insert({ household_id: foundHousehold.id, user_id: session.user.id });

    if (memberError) {
      setStatus("error");
      setErrorMsg(memberError.message);
      return;
    }

    onHouseholdReady(foundHousehold);
  }

  return (
    <div className="hm-app">
      <style>{onboardingCss}</style>
      <div className="onb-shell">
        <div className="onb-card">
          <div className="onb-eyebrow">Let's get set up</div>

          {mode === "choose" && (
            <>
              <h1>Are you starting fresh, or joining your partner?</h1>
              <div className="onb-choice-row">
                <button className="onb-choice-btn" onClick={() => setMode("create")}>
                  <span className="onb-choice-title">Start a household</span>
                  <span className="onb-choice-sub">You'll get an invite code to share</span>
                </button>
                <button className="onb-choice-btn" onClick={() => setMode("join")}>
                  <span className="onb-choice-title">Join with a code</span>
                  <span className="onb-choice-sub">Your partner already started one</span>
                </button>
              </div>
            </>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreate}>
              <h1>What should we call your household?</h1>
              <label htmlFor="hname">Household name</label>
              <input
                id="hname"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Our Household"
              />
              {status === "error" && <div className="onb-error">{errorMsg}</div>}
              <button type="submit" disabled={status === "working"}>
                {status === "working" ? "Creating..." : "Create household"}
              </button>
              <button type="button" className="onb-back" onClick={() => setMode("choose")}>← Back</button>
            </form>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoin}>
              <h1>Enter your invite code</h1>
              <label htmlFor="code">Invite code</label>
              <input
                id="code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. a1b2c3d4"
              />
              {status === "error" && <div className="onb-error">{errorMsg}</div>}
              <button type="submit" disabled={status === "working"}>
                {status === "working" ? "Joining..." : "Join household"}
              </button>
              <button type="button" className="onb-back" onClick={() => setMode("choose")}>← Back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const onboardingCss = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

.onb-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FAF8F5;
  padding: 24px;
}

.onb-card {
  background: #FFFFFF;
  border: 1.5px solid #E8E0D5;
  border-radius: 16px;
  padding: 44px;
  max-width: 460px;
  width: 100%;
}

.onb-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8B6F4E;
  margin-bottom: 14px;
}

.onb-card h1 {
  font-family: 'Source Serif 4', serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  color: #3D2F24;
  margin-bottom: 24px;
}

.onb-choice-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onb-choice-btn {
  text-align: left;
  background: #FAF8F5;
  border: 1.5px solid #D9CDBE;
  border-radius: 12px;
  padding: 18px 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.15s ease;
}

.onb-choice-btn:hover { border-color: #8B6F4E; }

.onb-choice-title {
  font-size: 15px;
  font-weight: 600;
  color: #3D2F24;
}

.onb-choice-sub {
  font-size: 13px;
  color: #8B6F4E;
}

.onb-card form label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #3D2F24;
  margin-bottom: 6px;
}

.onb-card form input {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid #D9CDBE;
  border-radius: 10px;
  font-size: 15px;
  margin-bottom: 16px;
  font-family: 'Inter', sans-serif;
}

.onb-card form input:focus { outline: none; border-color: #8B6F4E; }

.onb-card form button[type="submit"] {
  width: 100%;
  background: #3D2F24;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 10px;
}

.onb-card form button[type="submit"]:hover:not(:disabled) { background: #8B6F4E; }
.onb-card form button[type="submit"]:disabled { opacity: 0.6; }

.onb-back {
  background: none;
  border: none;
  color: #8B6F4E;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  text-align: center;
}

.onb-error {
  background: #FBEAE5;
  border: 1px solid #E0A88F;
  color: #8A3B22;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
}
`;
