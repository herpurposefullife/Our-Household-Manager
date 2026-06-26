import { useState } from "react";
import { supabase } from "./supabaseClient";
import { getSessionQuote } from "./quotes";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const quote = getSessionQuote("login");

  async function handleSendLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Something went wrong. Please try again.");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="hm-app">
      <style>{loginCss}</style>
      <div className="login-shell">
        <div className="login-left">
          <div className="login-brand">Our Household Manager</div>
          <p className="login-quote">"{quote.text}"</p>
          <p className="login-quote-source">— {quote.source}</p>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="login-card-eyebrow">Welcome</div>
            <h1 className="login-card-title">Held well, when we carry it together.</h1>
            <p className="login-card-lede">
              Enter your email and we'll send you a link to sign in — no password to remember.
            </p>

            {status === "sent" ? (
              <div className="login-sent">
                <div className="login-sent-icon">✓</div>
                <p>Check your inbox at <strong>{email}</strong> for a sign-in link.</p>
                <p className="login-sent-sub">It may take a minute or two to arrive.</p>
              </div>
            ) : (
              <form onSubmit={handleSendLink} className="login-form">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                />
                {status === "error" && <div className="login-error">{errorMsg}</div>}
                <button type="submit" disabled={status === "sending"}>
                  {status === "sending" ? "Sending..." : "Send sign-in link"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const loginCss = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.hm-app {
  font-family: 'Inter', sans-serif;
  background: #FFFFFF;
  color: #3D2F24;
  min-height: 100vh;
}

.login-shell {
  display: flex;
  min-height: 100vh;
}

.login-left {
  flex: 1.1;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px;
  border-right: 1px solid #E8E0D5;
}

.login-brand {
  font-family: 'Source Serif 4', serif;
  font-size: 15px;
  font-weight: 600;
  color: #8B6F4E;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 40px;
}

.login-quote {
  font-family: 'Source Serif 4', serif;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.35;
  color: #3D2F24;
  max-width: 520px;
  margin-bottom: 16px;
}

.login-quote-source {
  font-size: 14px;
  color: #8B6F4E;
  font-weight: 500;
}

.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.login-card {
  width: 100%;
  max-width: 380px;
}

.login-card-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8B6F4E;
  margin-bottom: 12px;
}

.login-card-title {
  font-family: 'Source Serif 4', serif;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 14px;
}

.login-card-lede {
  font-size: 15px;
  color: #6B5A4A;
  line-height: 1.5;
  margin-bottom: 28px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-form label {
  font-size: 13px;
  font-weight: 600;
  color: #3D2F24;
  margin-bottom: 4px;
}

.login-form input {
  padding: 13px 16px;
  border: 1.5px solid #D9CDBE;
  border-radius: 10px;
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  color: #3D2F24;
  margin-bottom: 16px;
}

.login-form input:focus {
  outline: none;
  border-color: #8B6F4E;
}

.login-form button {
  background: #3D2F24;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s ease;
}

.login-form button:hover:not(:disabled) {
  background: #8B6F4E;
}

.login-form button:disabled {
  opacity: 0.6;
  cursor: default;
}

.login-error {
  background: #FBEAE5;
  border: 1px solid #E0A88F;
  color: #8A3B22;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.login-sent {
  background: #FAF8F5;
  border: 1.5px solid #D9CDBE;
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
}

.login-sent-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6B7A6C;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin: 0 auto 16px;
}

.login-sent p {
  font-size: 15px;
  color: #3D2F24;
  line-height: 1.5;
  margin-bottom: 6px;
}

.login-sent-sub {
  font-size: 13px;
  color: #8B6F4E;
}

@media (max-width: 760px) {
  .login-shell { flex-direction: column; }
  .login-left { padding: 40px 28px; border-right: none; border-bottom: 1px solid #E8E0D5; }
  .login-quote { font-size: 24px; }
  .login-right { padding: 32px 24px; }
}
`;
