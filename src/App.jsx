import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSessionQuote } from "./quotes";
import LoginScreen from "./LoginScreen";
import OnboardingScreen from "./OnboardingScreen";
import Dashboard from "./Dashboard";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [household, setHousehold] = useState(undefined); // undefined = loading, null = none yet
  const [checkingHousehold, setCheckingHousehold] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setHousehold(session === null ? null : undefined);
      return;
    }
    setCheckingHousehold(true);
    supabase
      .from("household_members")
      .select("household_id, households(*)")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error checking household:", error);
          setHousehold(null);
        } else {
          setHousehold(data ? data.households : null);
        }
        setCheckingHousehold(false);
      });
  }, [session]);

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (session === null) {
    return <LoginScreen />;
  }

  if (household === undefined || checkingHousehold) {
    return <LoadingScreen />;
  }

  if (household === null) {
    return <OnboardingScreen session={session} onHouseholdReady={setHousehold} />;
  }

  return <Dashboard session={session} household={household} />;
}

function LoadingScreen() {
  const quote = getSessionQuote("loading");
  return (
    <div className="hm-app">
      <style>{globalCss}</style>
      <div className="hm-loading">
        <div className="hm-loading-mark">Our Household Manager</div>
        <p className="hm-loading-quote">"{quote.text}"</p>
      </div>
    </div>
  );
}

export const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.hm-app {
  font-family: 'Inter', sans-serif;
  background: #FFFFFF;
  color: #3D2F24;
  min-height: 100vh;
}

.hm-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  gap: 18px;
}
.hm-loading-mark {
  font-family: 'Source Serif 4', serif;
  font-size: 20px;
  font-weight: 600;
  color: #8B6F4E;
}
.hm-loading-quote {
  font-family: 'Source Serif 4', serif;
  font-style: italic;
  font-size: 16px;
  color: #6B5A4A;
  max-width: 360px;
  line-height: 1.5;
}
`;
