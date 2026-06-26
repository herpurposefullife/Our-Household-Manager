import { getSessionQuote } from "./quotes";
import { supabase } from "./supabaseClient";

export default function Dashboard({ session, household }) {
  const quote = getSessionQuote("dashboard");

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="hm-app">
      <style>{dashCss}</style>
      <header className="dash-header">
        <span className="dash-brand">Our Household Manager</span>
        <button className="dash-logout" onClick={handleLogout}>Sign out</button>
      </header>

      <main className="dash-content">
        <div className="dash-eyebrow">{household.name}</div>
        <h1>Welcome — you're set up.</h1>
        <p className="dash-quote">"{quote.text}" <span>— {quote.source}</span></p>

        <div className="dash-invite-card">
          <div className="dash-invite-label">Share this code with your partner</div>
          <div className="dash-invite-code">{household.invite_code}</div>
          <p className="dash-invite-hint">They'll enter this when they sign in for the first time.</p>
        </div>

        <div className="dash-next">
          <p>The Load Splitter and Budget tools are coming next — this dashboard will soon show your current month's overview here.</p>
        </div>
      </main>
    </div>
  );
}

const dashCss = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 1px solid #E8E0D5;
}

.dash-brand {
  font-family: 'Source Serif 4', serif;
  font-weight: 600;
  font-size: 16px;
  color: #3D2F24;
}

.dash-logout {
  background: none;
  border: 1.5px solid #D9CDBE;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6B5A4A;
  cursor: pointer;
}

.dash-content {
  max-width: 560px;
  margin: 0 auto;
  padding: 48px 24px;
}

.dash-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8B6F4E;
  margin-bottom: 10px;
}

.dash-content h1 {
  font-family: 'Source Serif 4', serif;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 18px;
}

.dash-quote {
  font-family: 'Source Serif 4', serif;
  font-style: italic;
  font-size: 16px;
  color: #6B5A4A;
  line-height: 1.5;
  margin-bottom: 32px;
}
.dash-quote span { font-style: normal; font-size: 13px; color: #8B6F4E; }

.dash-invite-card {
  background: #FAF8F5;
  border: 1.5px solid #D9CDBE;
  border-radius: 14px;
  padding: 24px;
  text-align: center;
  margin-bottom: 24px;
}

.dash-invite-label {
  font-size: 13px;
  font-weight: 600;
  color: #6B5A4A;
  margin-bottom: 10px;
}

.dash-invite-code {
  font-family: 'Source Serif 4', serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #3D2F24;
  margin-bottom: 8px;
}

.dash-invite-hint {
  font-size: 13px;
  color: #8B6F4E;
}

.dash-next {
  background: #FFFFFF;
  border: 1px dashed #D9CDBE;
  border-radius: 12px;
  padding: 18px;
  font-size: 14px;
  color: #6B5A4A;
  line-height: 1.5;
}
`;
