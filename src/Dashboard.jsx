import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSessionQuote, getSectionEncouragement } from "./quotes";
import LoadSplitter from "./LoadSplitter";
import Budget from "./Budget";
import Profile from "./Profile";

const TABS = [
  { id: "home", label: "🏠 Home" },
  { id: "load", label: "⚖️ Load" },
  { id: "budget", label: "💰 Budget" },
  { id: "profile", label: "👤 Profile" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(my) {
  if (!my) return "";
  const [year, month] = my.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function currency(n) {
  return "$" + Math.abs(Math.round(n)).toLocaleString();
}

export default function Dashboard({ session, household }) {
  const [tab, setTab] = useState("home");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear());
  const [loadSummary, setLoadSummary] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const quote = getSessionQuote("dashboard");
  const enc = getSectionEncouragement("dashboard");

  useEffect(() => {
    fetchHistory();
    fetchLoadSummary(selectedMonth);
    fetchBudgetSummary(selectedMonth);
  }, [household.id]);

  useEffect(() => {
    fetchLoadSummary(selectedMonth);
    fetchBudgetSummary(selectedMonth);
  }, [selectedMonth]);

  async function fetchHistory() {
    const { data } = await supabase
      .from("load_assignments")
      .select("month_year")
      .eq("household_id", household.id);
    if (data) {
      const months = [...new Set(data.map(r => r.month_year))].sort().reverse();
      setHistory(months);
    }
  }

  async function fetchLoadSummary(monthYear) {
    const { data } = await supabase
      .from("load_assignments")
      .select("carried_by")
      .eq("household_id", household.id)
      .eq("month_year", monthYear);
    if (data && data.length > 0) {
      const me = data.filter(r => r.carried_by === "me").length;
      const partner = data.filter(r => r.carried_by === "partner").length;
      const shared = data.filter(r => r.carried_by === "shared").length;
      setLoadSummary({ me, partner, shared, total: data.length });
    } else {
      setLoadSummary(null);
    }
  }

  async function fetchBudgetSummary(monthYear) {
    const { data } = await supabase
      .from("budget_entries")
      .select("entry_type, amount")
      .eq("household_id", household.id)
      .eq("month_year", monthYear);
    if (data && data.length > 0) {
      const income = data.filter(r => r.entry_type === "income").reduce((s, r) => s + Number(r.amount), 0);
      const expenses = data.filter(r => ["fixed_expense","variable_expense","bill","electricity","water","internet","insurance","rent_mortgage","other_bill","school_fees","medical","activities","clothing","gifts","other_kids","grocery_budget","pantry","dining_out","other_meal"].includes(r.entry_type)).reduce((s, r) => s + Number(r.amount), 0);
      const savings = data.filter(r => r.entry_type === "savings").reduce((s, r) => s + Number(r.amount), 0);
      setBudgetSummary({ income, expenses, savings, remaining: income - expenses - savings });
    } else {
      setBudgetSummary(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const allMonths = [...new Set([currentMonthYear(), ...history])].sort().reverse();

  return (
    <div className="hm-app">
      <style>{dashCss}</style>

      <header className="dash-header">
        <div className="dash-header-left">
          <span className="dash-brand">Our Household Manager</span>
          <span className="dash-tagline">Building Purposeful Homes Through Stewardship</span>
        </div>
        <button className="dash-logout" onClick={handleLogout}>Sign out</button>
      </header>

      <nav className="dash-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`dash-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="dash-main">

        {tab === "home" && (
          <div className="dash-home">

            {/* Faith encouragement banner */}
            <div className="dash-faith-banner">
              <div className="dash-faith-verse">"{enc.verse}"</div>
              <div className="dash-faith-ref">— {enc.reference}</div>
              <div className="dash-faith-note">{enc.note}</div>
            </div>

            {/* Household name + month selector */}
            <div className="dash-home-top">
              <div>
                <div className="dash-household-name">{household.name}</div>
                <div className="dash-month-display">{formatMonthYear(selectedMonth)}</div>
              </div>
              <select
                className="dash-month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                {allMonths.map(m => (
                  <option key={m} value={m}>{formatMonthYear(m)}</option>
                ))}
              </select>
            </div>

            {/* Overview cards */}
            <div className="dash-cards">
              <div className="dash-card" onClick={() => setTab("load")}>
                <div className="dash-card-label">⚖️ Household Load</div>
                {loadSummary ? (
                  <>
                    <div className="dash-card-big">{Math.round((loadSummary.me / loadSummary.total) * 100)}%</div>
                    <div className="dash-card-sub">carried by you this month</div>
                    <div className="dash-load-bar">
                      <div className="dash-load-me" style={{ width: `${(loadSummary.me / loadSummary.total) * 100}%` }} />
                      <div className="dash-load-shared" style={{ width: `${(loadSummary.shared / loadSummary.total) * 100}%` }} />
                      <div className="dash-load-partner" style={{ width: `${(loadSummary.partner / loadSummary.total) * 100}%` }} />
                    </div>
                    <div className="dash-load-legend">
                      <span className="legend-me">You</span>
                      <span className="legend-shared">Shared</span>
                      <span className="legend-partner">Partner</span>
                    </div>
                  </>
                ) : (
                  <div className="dash-card-empty">No load data yet → tap to add</div>
                )}
              </div>

              <div className="dash-card" onClick={() => setTab("budget")}>
                <div className="dash-card-label">💰 Budget</div>
                {budgetSummary ? (
                  <>
                    <div className={`dash-card-big ${budgetSummary.remaining >= 0 ? "positive" : "negative"}`}>
                      {currency(budgetSummary.remaining)}
                    </div>
                    <div className="dash-card-sub">remaining this month</div>
                    <div className="dash-budget-rows">
                      <div className="dash-budget-row">
                        <span>Income</span>
                        <strong>{currency(budgetSummary.income)}</strong>
                      </div>
                      <div className="dash-budget-row">
                        <span>Expenses</span>
                        <strong>{currency(budgetSummary.expenses)}</strong>
                      </div>
                      <div className="dash-budget-row">
                        <span>Savings</span>
                        <strong>{currency(budgetSummary.savings)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="dash-card-empty">No budget data yet → tap to add</div>
                )}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="dash-history">
                <div className="dash-section-label">Past months</div>
                {history.map(m => (
                  <button
                    key={m}
                    className={`dash-history-item ${selectedMonth === m ? "active" : ""}`}
                    onClick={() => setSelectedMonth(m)}
                  >
                    {formatMonthYear(m)}
                  </button>
                ))}
              </div>
            )}

            {/* Invite code */}
            <div className="dash-invite">
              <div className="dash-invite-label">Partner invite code</div>
              <div className="dash-invite-code">{household.invite_code}</div>
              <div className="dash-invite-hint">Share this with your partner so they can join (optional)</div>
            </div>

            {/* Brand footer */}
            <div className="dash-brand-footer">
              <div className="dash-brand-name">HerPurposefulLife</div>
              <div className="dash-brand-handle">@herpurposeful_life</div>
            </div>
          </div>
        )}

        {tab === "load" && (
          <LoadSplitter
            session={session}
            household={household}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onDataChange={() => { fetchLoadSummary(selectedMonth); fetchHistory(); }}
          />
        )}

        {tab === "budget" && (
          <Budget
            session={session}
            household={household}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onDataChange={() => { fetchBudgetSummary(selectedMonth); fetchHistory(); }}
          />
        )}

        {tab === "profile" && (
          <Profile
            session={session}
            household={household}
          />
        )}
      </main>
    </div>
  );
}

const dashCss = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
.hm-app { font-family: 'Inter', sans-serif; background: #FAF8F5; color: #3D2F24; min-height: 100vh; }

.dash-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; background: #3D2F24;
}
.dash-header-left { display: flex; flex-direction: column; gap: 2px; }
.dash-brand { font-family: 'Source Serif 4', serif; font-weight: 600; font-size: 16px; color: #FAF8F5; }
.dash-tagline { font-size: 11px; color: #D9CDBE; font-weight: 400; }
.dash-logout {
  background: none; border: 1.5px solid rgba(255,255,255,0.25); border-radius: 8px;
  padding: 7px 14px; font-size: 13px; font-weight: 600; color: #D9CDBE; cursor: pointer;
}

.dash-tabs {
  display: flex; background: #FFFFFF; border-bottom: 1px solid #E8E0D5;
  overflow-x: auto; padding: 0 8px;
}
.dash-tab {
  flex: 1; min-width: 70px; padding: 12px 6px; background: none; border: none;
  border-bottom: 2.5px solid transparent; font-size: 13px; font-weight: 600;
  color: #8B6F4E; cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.dash-tab.active { color: #3D2F24; border-bottom-color: #8B6F4E; }

.dash-main { max-width: 640px; margin: 0 auto; padding: 20px 16px 80px; }

.dash-faith-banner {
  background: linear-gradient(135deg, #3D2F24 0%, #6B5A4A 100%);
  border-radius: 14px; padding: 20px; margin-bottom: 20px; color: white;
}
.dash-faith-verse {
  font-family: 'Source Serif 4', serif; font-style: italic; font-size: 15px;
  line-height: 1.5; margin-bottom: 6px;
}
.dash-faith-ref { font-size: 12px; color: #D9CDBE; margin-bottom: 10px; }
.dash-faith-note {
  font-size: 13px; color: #FAF8F5; line-height: 1.4;
  border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;
}

.dash-home-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px;
}
.dash-household-name {
  font-family: 'Source Serif 4', serif; font-size: 20px; font-weight: 600; color: #3D2F24;
}
.dash-month-display { font-size: 13px; color: #8B6F4E; margin-top: 2px; }
.dash-month-select {
  padding: 8px 12px; border: 1.5px solid #D9CDBE; border-radius: 8px;
  font-size: 13px; font-family: 'Inter', sans-serif; color: #3D2F24; background: #FFFFFF;
}

.dash-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.dash-card {
  background: #FFFFFF; border: 1.5px solid #E8E0D5; border-radius: 14px;
  padding: 20px; cursor: pointer; transition: border-color 0.15s;
}
.dash-card:hover { border-color: #8B6F4E; }
.dash-card-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #8B6F4E; margin-bottom: 8px;
}
.dash-card-big {
  font-family: 'Source Serif 4', serif; font-size: 36px; font-weight: 600;
  color: #3D2F24; margin-bottom: 2px;
}
.dash-card-big.positive { color: #6B7A6C; }
.dash-card-big.negative { color: #A0522D; }
.dash-card-sub { font-size: 13px; color: #6B5A4A; margin-bottom: 14px; }
.dash-card-empty { font-size: 14px; color: #A89880; padding: 8px 0; }

.dash-load-bar {
  height: 10px; border-radius: 5px; overflow: hidden;
  display: flex; background: #F0EBE2; margin-bottom: 8px;
}
.dash-load-me { background: #8B6F4E; height: 100%; }
.dash-load-shared { background: #6B7A6C; height: 100%; }
.dash-load-partner { background: #D9CDBE; height: 100%; }
.dash-load-legend { display: flex; gap: 14px; }
.dash-load-legend span { font-size: 11px; font-weight: 600; }
.legend-me { color: #8B6F4E; }
.legend-shared { color: #6B7A6C; }
.legend-partner { color: #A89880; }

.dash-budget-rows { display: flex; flex-direction: column; gap: 4px; }
.dash-budget-row {
  display: flex; justify-content: space-between; font-size: 13px;
  padding: 5px 0; border-bottom: 1px solid #F0EBE2;
}
.dash-budget-row:last-child { border-bottom: none; }

.dash-section-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #8B6F4E; margin-bottom: 10px;
}
.dash-history { margin-bottom: 24px; }
.dash-history-item {
  display: block; width: 100%; text-align: left; background: #FFFFFF;
  border: 1.5px solid #E8E0D5; border-radius: 10px; padding: 12px 16px;
  font-size: 14px; font-weight: 500; color: #3D2F24; cursor: pointer;
  margin-bottom: 8px; transition: border-color 0.15s;
}
.dash-history-item.active { border-color: #8B6F4E; background: #FAF8F5; }
.dash-history-item:hover { border-color: #8B6F4E; }

.dash-invite {
  background: #FFFFFF; border: 1px dashed #D9CDBE; border-radius: 12px;
  padding: 18px; text-align: center; margin-bottom: 24px;
}
.dash-invite-label { font-size: 12px; font-weight: 600; color: #8B6F4E; margin-bottom: 8px; }
.dash-invite-code {
  font-family: 'Source Serif 4', serif; font-size: 24px; font-weight: 600;
  letter-spacing: 0.08em; color: #3D2F24; margin-bottom: 6px;
}
.dash-invite-hint { font-size: 12px; color: #A89880; }

.dash-brand-footer { text-align: center; padding: 16px 0; }
.dash-brand-name {
  font-family: 'Source Serif 4', serif; font-size: 15px; font-weight: 600; color: #8B6F4E;
}
.dash-brand-handle { font-size: 12px; color: #A89880; margin-top: 2px; }
`;
