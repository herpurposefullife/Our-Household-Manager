import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSectionEncouragement, getSessionQuote } from "./quotes";
import { jsPDF } from "jspdf";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function formatMonthYear(my) {
  if (!my) return "";
  const [year, month] = my.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function curr(n) {
  return "$" + Math.abs(Math.round(n)).toLocaleString();
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "budget", label: "Monthly Budget" },
  { id: "bills", label: "Bills" },
  { id: "meals", label: "Meal Planner" },
  { id: "kids", label: "Kids" },
  { id: "goals", label: "Goals" },
];

const BUDGET_CATEGORIES = {
  income: { label: "Income", emoji: "💰" },
  fixed_expense: { label: "Fixed Expenses", emoji: "📌" },
  variable_expense: { label: "Variable Expenses", emoji: "🛍️" },
  savings: { label: "Savings", emoji: "🏦" },
  debt: { label: "Debt Payments", emoji: "📉" },
  emergency_fund: { label: "Emergency Fund", emoji: "🛡️" },
};

const BILLS_CATEGORIES = {
  electricity: { label: "Electricity", emoji: "⚡" },
  water: { label: "Water", emoji: "💧" },
  internet: { label: "Internet", emoji: "📶" },
  insurance: { label: "Insurance", emoji: "🔒" },
  rent_mortgage: { label: "Rent / Mortgage", emoji: "🏠" },
  other_bill: { label: "Other Bills", emoji: "📋" },
};

const KIDS_CATEGORIES = {
  school_fees: { label: "School Fees", emoji: "🎓" },
  medical: { label: "Medical", emoji: "🏥" },
  activities: { label: "Activities", emoji: "⚽" },
  clothing: { label: "Clothing", emoji: "👕" },
  gifts: { label: "Birthday / Gifts", emoji: "🎁" },
  other_kids: { label: "Other Kids", emoji: "👶" },
};

const MEAL_CATEGORIES = {
  grocery_budget: { label: "Weekly Grocery Budget", emoji: "🛒" },
  pantry: { label: "Pantry Stock", emoji: "🥫" },
  dining_out: { label: "Dining Out", emoji: "🍽️" },
  other_meal: { label: "Other Food", emoji: "🥗" },
};

const GOALS_CATEGORIES = {
  vacation: { label: "Family Vacation", emoji: "✈️", target: 5000 },
  renovation: { label: "Home Renovation", emoji: "🔨", target: 10000 },
  new_car: { label: "New Car", emoji: "🚗", target: 30000 },
  education: { label: "Children's Education", emoji: "📚", target: 20000 },
  christmas: { label: "Christmas Fund", emoji: "🎄", target: 1000 },
  other_goal: { label: "Other Goal", emoji: "🎯", target: 5000 },
};

function EncouragementBlock({ section }) {
  const enc = getSectionEncouragement(section);
  return (
    <div className="bgt-encouragement">
      <div className="bgt-enc-verse">"{enc.verse}"</div>
      <div className="bgt-enc-ref">— {enc.reference}</div>
      <div className="bgt-enc-note">{enc.note}</div>
    </div>
  );
}

function EntryList({ entries, onDelete, onSetReminder, categoryMap }) {
  if (entries.length === 0) return (
    <div className="bgt-empty">No entries yet. Add your first one below.</div>
  );
  return (
    <div className="bgt-entries">
      {Object.entries(categoryMap).map(([catId, cat]) => {
        const catEntries = entries.filter(e => e.entry_type === catId);
        if (catEntries.length === 0) return null;
        const total = catEntries.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div key={catId} className="bgt-cat-group">
            <div className="bgt-cat-header">
              <span>{cat.emoji} {cat.label}</span>
              <span className="bgt-cat-total">{curr(total)}</span>
            </div>
            {catEntries.map(entry => (
              <div key={entry.id} className="bgt-entry">
                <div className="bgt-entry-left">
                  <span>{entry.label}</span>
                  {entry.reminder_at && (
                    <span className="bgt-reminder-badge">🔔 {new Date(entry.reminder_at).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="bgt-entry-right">
                  <span>{curr(entry.amount)}</span>
                  <button className="bgt-remind-btn" onClick={() => onSetReminder(entry)} title="Set reminder">🔔</button>
                  <button className="bgt-delete" onClick={() => onDelete(entry.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AddEntryForm({ categoryMap, onAdd }) {
  const [type, setType] = useState(Object.keys(categoryMap)[0]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim() || !amount) return;
    await onAdd({ type, label: label.trim(), amount: parseFloat(amount) || 0 });
    setLabel("");
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="bgt-add-form">
      <div className="bgt-add-label">Add entry</div>
      <select value={type} onChange={e => setType(e.target.value)}>
        {Object.entries(categoryMap).map(([id, cat]) => (
          <option key={id} value={id}>{cat.emoji} {cat.label}</option>
        ))}
      </select>
      <input type="text" placeholder="Label (e.g. Salary, TNB bill)" value={label} onChange={e => setLabel(e.target.value)} />
      <div className="bgt-add-row">
        <input type="number" placeholder="Amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        <button type="submit">Add</button>
      </div>
    </form>
  );
}

function ReminderModal({ entry, onClose, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");

  async function handleSave(e) {
    e.preventDefault();
    if (!date) return;
    const remindAt = new Date(`${date}T${time}:00`);
    remindAt.setHours(remindAt.getHours() - 1);
    await onSave(entry.id, remindAt.toISOString());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">🔔 Set Reminder</div>
        <p className="modal-sub">For: <strong>{entry.label}</strong></p>
        <p className="modal-sub">We'll email you 1 hour before the time you set.</p>
        <form onSubmit={handleSave}>
          <label>Due date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <label>Due time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          <div className="modal-btn-row">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-save">Set reminder</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Budget({ session, household, selectedMonth, onMonthChange, onDataChange }) {
  const [section, setSection] = useState("overview");
  const [entries, setEntries] = useState([]);
  const [reminderEntry, setReminderEntry] = useState(null);
  const [mealNotes, setMealNotes] = useState({ checklist: "", pantryNotes: "", mealPlan: "" });

  useEffect(() => { fetchEntries(); }, [household.id, selectedMonth]);

  async function fetchEntries() {
    const { data } = await supabase
      .from("budget_entries")
      .select("*")
      .eq("household_id", household.id)
      .eq("month_year", selectedMonth)
      .order("created_at");
    if (data) setEntries(data);
  }

  async function addEntry({ type, label, amount }) {
    const { data } = await supabase
      .from("budget_entries")
      .insert({ household_id: household.id, month_year: selectedMonth, entry_type: type, label, amount })
      .select().single();
    if (data) { setEntries(prev => [...prev, data]); onDataChange(); }
  }

  async function deleteEntry(id) {
    await supabase.from("budget_entries").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
    onDataChange();
  }

  async function saveReminder(entryId, remindAt) {
    await supabase.from("budget_entries").update({ reminder_at: remindAt }).eq("id", entryId);
    await supabase.from("reminders").insert({
      household_id: household.id,
      user_email: session.user.email,
      reminder_type: "bill",
      reference_id: entryId,
      remind_at: remindAt,
      label: entries.find(e => e.id === entryId)?.label || "Bill reminder",
      sent: false,
    });
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, reminder_at: remindAt } : e));
  }

  const calc = (types) => entries.filter(e => types.includes(e.entry_type)).reduce((s, e) => s + Number(e.amount), 0);
  const income = calc(["income"]);
  const fixed = calc(["fixed_expense"]);
  const variable = calc(["variable_expense"]);
  const savings = calc(["savings"]);
  const debt = calc(["debt"]);
  const emergency = calc(["emergency_fund"]);
  const bills = calc(Object.keys(BILLS_CATEGORIES));
  const kids = calc(Object.keys(KIDS_CATEGORIES));
  const meals = calc(Object.keys(MEAL_CATEGORIES));
  const goals = calc(Object.keys(GOALS_CATEGORIES));
  const totalOut = fixed + variable + savings + debt + emergency + bills + kids + meals;
  const remaining = income - totalOut;

  function generatePDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const mx = 48;
    let y = 0;
    const coffee = [61, 47, 36];
    const tan = [139, 111, 78];
    const paper = [250, 248, 245];
    const light = [217, 205, 190];
    const sage = [107, 122, 108];

    doc.setFillColor(...coffee);
    doc.rect(0, 0, pw, 90, "F");
    doc.setTextColor(...paper);
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text("Our Household Manager", mx, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("HerPurposefulLife — Building Purposeful Homes Through Stewardship", mx, 54);
    doc.text(`Budget Report — ${formatMonthYear(selectedMonth)} | ${household.name}`, mx, 70);

    y = 110;
    doc.setFillColor(...light);
    doc.roundedRect(mx, y, pw - mx * 2, 100, 8, 8, "F");
    doc.setTextColor(...coffee);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Monthly Overview", mx + 16, y + 22);
    [
      ["Total Income", curr(income), coffee],
      ["Total Out", curr(totalOut), tan],
      ["Remaining", curr(remaining), remaining >= 0 ? sage : [160, 82, 45]],
    ].forEach(([label, val, color], i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...coffee);
      doc.text(label, mx + 16, y + 45 + i * 20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(val, pw - mx - 16, y + 45 + i * 20, { align: "right" });
    });

    y += 120;
    const enc = getSectionEncouragement("budget");
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...tan);
    doc.text(`"${enc.verse}" — ${enc.reference}`, mx, y, { maxWidth: pw - mx * 2 });
    y += 40;

    const allSections = [
      { title: "Monthly Budget", cats: BUDGET_CATEGORIES },
      { title: "Household Bills", cats: BILLS_CATEGORIES },
      { title: "Meal Budget", cats: MEAL_CATEGORIES },
      { title: "Kids Expenses", cats: KIDS_CATEGORIES },
      { title: "Savings Goals", cats: GOALS_CATEGORIES },
    ];

    for (const sec of allSections) {
      const secEntries = entries.filter(e => Object.keys(sec.cats).includes(e.entry_type));
      if (secEntries.length === 0) continue;
      if (y > 660) { doc.addPage(); y = 50; }
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...coffee);
      doc.text(sec.title, mx, y);
      y += 10;
      doc.setDrawColor(...light);
      doc.line(mx, y, pw - mx, y);
      y += 18;
      for (const [catId, cat] of Object.entries(sec.cats)) {
        const catEntries = secEntries.filter(e => e.entry_type === catId);
        if (catEntries.length === 0) continue;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...tan);
        doc.text(cat.label, mx + 8, y);
        y += 16;
        for (const entry of catEntries) {
          if (y > 760) { doc.addPage(); y = 50; }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(...coffee);
          doc.text(entry.label, mx + 16, y);
          doc.text(curr(entry.amount), pw - mx, y, { align: "right" });
          y += 16;
        }
        y += 6;
      }
      y += 10;
    }

    doc.addPage();
    let ny = 70;
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...coffee);
    doc.text("Notes & Reflections", mx, ny);
    ny += 10;
    doc.setDrawColor(...tan);
    doc.setLineWidth(1.5);
    doc.line(mx, ny, mx + 60, ny);
    ny += 26;
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...tan);
    doc.text(`"Every penny you steward wisely is a seed for your family's future." — HerPurposefulLife`, mx, ny, { maxWidth: pw - mx * 2 });
    ny += 40;
    doc.setDrawColor(...light);
    doc.setLineWidth(0.75);
    while (ny < 760) { doc.line(mx, ny, pw - mx, ny); ny += 28; }

    return doc;
  }

  async function handleDownload() {
    generatePDF().save(`budget-${selectedMonth}.pdf`);
  }

  async function handleShare() {
    const doc = generatePDF();
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], `budget-${selectedMonth}.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Budget Report — ${formatMonthYear(selectedMonth)}`,
          text: `Our Household Manager — ${household.name}\nHerPurposefulLife`,
          files: [file],
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          doc.save(`budget-${selectedMonth}.pdf`);
          alert("Sharing not supported. PDF downloaded instead.");
        }
      }
    } else {
      doc.save(`budget-${selectedMonth}.pdf`);
      alert("Your device doesn't support direct sharing. PDF downloaded — share it manually.");
    }
  }

  const sectionEntries = (cats) => entries.filter(e => Object.keys(cats).includes(e.entry_type));

  return (
    <div className="bgt-wrap">
      <style>{bgtCss}</style>

      {reminderEntry && (
        <ReminderModal
          entry={reminderEntry}
          onClose={() => setReminderEntry(null)}
          onSave={saveReminder}
        />
      )}

      <div className="bgt-subtabs">
        {SECTIONS.map(s => (
          <button key={s.id} className={`bgt-subtab ${section === s.id ? "active" : ""}`} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="dashboard" />
          <div className="bgt-subtitle">{formatMonthYear(selectedMonth)}</div>
          <div className="bgt-overview-cards">
            <div className="bgt-ov-card bgt-ov-income">
              <div className="bgt-ov-label">💰 Total Income</div>
              <div className="bgt-ov-amount">{curr(income)}</div>
            </div>
            <div className={`bgt-ov-card ${remaining >= 0 ? "bgt-ov-positive" : "bgt-ov-negative"}`}>
              <div className="bgt-ov-label">🏦 Remaining</div>
              <div className="bgt-ov-amount">{curr(remaining)}</div>
              <div className="bgt-ov-sub">{remaining >= 0 ? "You're on track 🙌" : "Over budget — let's review"}</div>
            </div>
          </div>
          <div className="bgt-breakdown-list">
            {[
              { label: "💰 Monthly Budget", val: fixed + variable + savings + debt + emergency },
              { label: "🏠 Bills", val: bills },
              { label: "🛒 Meals", val: meals },
              { label: "👶 Kids", val: kids },
              { label: "🎯 Goals", val: goals },
            ].map(r => (
              <div key={r.label} className="bgt-breakdown-row">
                <span>{r.label}</span>
                <div className="bgt-breakdown-right">
                  <div className="bgt-mini-bar-track">
                    <div className="bgt-mini-bar-fill" style={{ width: income > 0 ? `${Math.min((r.val / income) * 100, 100)}%` : "0%" }} />
                  </div>
                  <span>{curr(r.val)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bgt-action-row">
            <button className="bgt-btn-download" onClick={handleDownload}>⬇ Download PDF</button>
            <button className="bgt-btn-share" onClick={handleShare}>↗ Share</button>
          </div>
          <p className="bgt-action-hint">Share to WhatsApp, email, or anywhere you like.</p>
        </div>
      )}

      {section === "budget" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="budget" />
          <div className="bgt-section-title">💰 Monthly Budget</div>
          <EntryList entries={sectionEntries(BUDGET_CATEGORIES)} onDelete={deleteEntry} onSetReminder={setReminderEntry} categoryMap={BUDGET_CATEGORIES} />
          <AddEntryForm categoryMap={BUDGET_CATEGORIES} onAdd={addEntry} />
        </div>
      )}

      {section === "bills" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="bills" />
          <div className="bgt-section-title">🏠 Household Bills</div>
          <EntryList entries={sectionEntries(BILLS_CATEGORIES)} onDelete={deleteEntry} onSetReminder={setReminderEntry} categoryMap={BILLS_CATEGORIES} />
          <AddEntryForm categoryMap={BILLS_CATEGORIES} onAdd={addEntry} />
        </div>
      )}

      {section === "meals" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="meals" />
          <div className="bgt-section-title">🛒 Meal Budget Planner</div>
          <EntryList entries={sectionEntries(MEAL_CATEGORIES)} onDelete={deleteEntry} onSetReminder={setReminderEntry} categoryMap={MEAL_CATEGORIES} />
          <AddEntryForm categoryMap={MEAL_CATEGORIES} onAdd={addEntry} />
          <div className="bgt-meal-notes">
            <div className="bgt-meal-notes-label">📝 Meal Plan Notes</div>
            <textarea placeholder="e.g. Monday - nasi lemak, Tuesday - pasta..." value={mealNotes.mealPlan} onChange={e => setMealNotes(p => ({ ...p, mealPlan: e.target.value }))} rows={4} />
            <div className="bgt-meal-notes-label">🥫 Pantry Notes</div>
            <textarea placeholder="Items running low, things to restock..." value={mealNotes.pantryNotes} onChange={e => setMealNotes(p => ({ ...p, pantryNotes: e.target.value }))} rows={3} />
            <div className="bgt-meal-notes-label">✅ Grocery Checklist</div>
            <textarea placeholder="Rice, eggs, cooking oil..." value={mealNotes.checklist} onChange={e => setMealNotes(p => ({ ...p, checklist: e.target.value }))} rows={4} />
          </div>
        </div>
      )}

      {section === "kids" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="kids" />
          <div className="bgt-section-title">👶 Kids Expense Tracker</div>
          <EntryList entries={sectionEntries(KIDS_CATEGORIES)} onDelete={deleteEntry} onSetReminder={setReminderEntry} categoryMap={KIDS_CATEGORIES} />
          <AddEntryForm categoryMap={KIDS_CATEGORIES} onAdd={addEntry} />
        </div>
      )}

      {section === "goals" && (
        <div className="bgt-section-content">
          <EncouragementBlock section="goals" />
          <div className="bgt-section-title">🎯 Savings Goals</div>
          <div className="bgt-goals-list">
            {Object.entries(GOALS_CATEGORIES).map(([catId, cat]) => {
              const saved = entries.filter(e => e.entry_type === catId).reduce((s, e) => s + Number(e.amount), 0);
              const pct = Math.min((saved / cat.target) * 100, 100);
              return (
                <div key={catId} className="bgt-goal-card">
                  <div className="bgt-goal-header">
                    <span>{cat.emoji} {cat.label}</span>
                    <span className="bgt-goal-amounts">{curr(saved)} <span className="bgt-goal-of">of {curr(cat.target)}</span></span>
                  </div>
                  <div className="bgt-goal-bar-track">
                    <div className="bgt-goal-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="bgt-goal-pct">{Math.round(pct)}% saved</div>
                  {pct >= 100 && <div className="bgt-goal-complete">🎉 Goal reached! Praise God!</div>}
                </div>
              );
            })}
          </div>
          <AddEntryForm
            categoryMap={Object.fromEntries(Object.entries(GOALS_CATEGORIES).map(([k,v]) => [k, { label: v.label, emoji: v.emoji }]))}
            onAdd={addEntry}
          />
        </div>
      )}
    </div>
  );
}

const bgtCss = `
.bgt-wrap { padding-bottom: 60px; }
.bgt-subtabs { display: flex; overflow-x: auto; gap: 4px; margin-bottom: 20px; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
.bgt-subtab { flex-shrink: 0; padding: 8px 14px; border: 1.5px solid #D9CDBE; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; background: #FFFFFF; color: #6B5A4A; white-space: nowrap; transition: all 0.15s; }
.bgt-subtab.active { background: #3D2F24; color: #FFFFFF; border-color: #3D2F24; }
.bgt-section-content { }
.bgt-section-title { font-family: 'Source Serif 4', serif; font-size: 20px; font-weight: 600; color: #3D2F24; margin-bottom: 16px; }
.bgt-subtitle { font-size: 13px; color: #8B6F4E; margin-bottom: 16px; font-weight: 500; }
.bgt-encouragement { background: linear-gradient(135deg, #3D2F24 0%, #6B5A4A 100%); border-radius: 14px; padding: 20px; margin-bottom: 20px; color: white; }
.bgt-enc-verse { font-family: 'Source Serif 4', serif; font-style: italic; font-size: 15px; line-height: 1.5; margin-bottom: 6px; }
.bgt-enc-ref { font-size: 12px; color: #D9CDBE; margin-bottom: 10px; font-weight: 500; }
.bgt-enc-note { font-size: 13px; color: #FAF8F5; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }
.bgt-overview-cards { display: flex; gap: 10px; margin-bottom: 20px; }
.bgt-ov-card { flex: 1; border-radius: 12px; padding: 16px; }
.bgt-ov-income { background: #6B7A6C; color: white; }
.bgt-ov-positive { background: #3D2F24; color: white; }
.bgt-ov-negative { background: #A0522D; color: white; }
.bgt-ov-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; opacity: 0.85; }
.bgt-ov-amount { font-family: 'Source Serif 4', serif; font-size: 22px; font-weight: 600; }
.bgt-ov-sub { font-size: 11px; margin-top: 4px; opacity: 0.8; }
.bgt-breakdown-list { margin-bottom: 24px; }
.bgt-breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E8E0D5; font-size: 14px; }
.bgt-breakdown-right { display: flex; align-items: center; gap: 10px; }
.bgt-mini-bar-track { width: 80px; height: 6px; background: #F0EBE2; border-radius: 3px; overflow: hidden; }
.bgt-mini-bar-fill { height: 100%; background: #8B6F4E; border-radius: 3px; }
.bgt-action-row { display: flex; gap: 10px; margin-bottom: 8px; }
.bgt-btn-download { flex: 1; background: #3D2F24; color: white; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }
.bgt-btn-download:hover { background: #6B5A4A; }
.bgt-btn-share { flex: 1; background: #6B7A6C; color: white; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }
.bgt-btn-share:hover { background: #5C6B5D; }
.bgt-action-hint { font-size: 12px; color: #8B6F4E; text-align: center; }
.bgt-cat-group { margin-bottom: 14px; }
.bgt-cat-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: #8B6F4E; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.bgt-cat-total { font-family: 'Source Serif 4', serif; font-size: 14px; color: #3D2F24; }
.bgt-entry { display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1.5px solid #E8E0D5; border-radius: 10px; padding: 11px 14px; margin-bottom: 6px; font-size: 14px; color: #3D2F24; }
.bgt-entry-left { display: flex; flex-direction: column; gap: 3px; }
.bgt-reminder-badge { font-size: 11px; color: #6B7A6C; font-weight: 600; }
.bgt-entry-right { display: flex; align-items: center; gap: 8px; }
.bgt-remind-btn { background: none; border: none; font-size: 15px; cursor: pointer; opacity: 0.5; }
.bgt-remind-btn:hover { opacity: 1; }
.bgt-delete { background: none; border: none; color: #D9CDBE; font-size: 18px; cursor: pointer; }
.bgt-delete:hover { color: #A0522D; }
.bgt-empty { font-size: 14px; color: #A89880; padding: 16px 0; text-align: center; }
.bgt-add-form { background: #FFFFFF; border: 1.5px dashed #D9CDBE; border-radius: 12px; padding: 18px; margin-top: 16px; }
.bgt-add-label { font-size: 13px; font-weight: 600; color: #6B5A4A; margin-bottom: 10px; }
.bgt-add-form select, .bgt-add-form input[type="text"] { width: 100%; padding: 10px 12px; border: 1.5px solid #D9CDBE; border-radius: 8px; font-size: 14px; margin-bottom: 8px; font-family: 'Inter', sans-serif; }
.bgt-add-row { display: flex; gap: 8px; }
.bgt-add-row input { flex: 1; padding: 10px 12px; border: 1.5px solid #D9CDBE; border-radius: 8px; font-size: 14px; }
.bgt-add-row button { background: #3D2F24; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }
.bgt-meal-notes { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.bgt-meal-notes-label { font-size: 13px; font-weight: 700; color: #6B5A4A; }
.bgt-meal-notes textarea { width: 100%; padding: 12px; border: 1.5px solid #D9CDBE; border-radius: 10px; font-size: 14px; font-family: 'Inter', sans-serif; resize: vertical; color: #3D2F24; }
.bgt-goals-list { margin-bottom: 16px; }
.bgt-goal-card { background: #FFFFFF; border: 1.5px solid #E8E0D5; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.bgt-goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; font-weight: 600; color: #3D2F24; }
.bgt-goal-amounts { font-family: 'Source Serif 4', serif; font-size: 15px; }
.bgt-goal-of { font-size: 12px; color: #8B6F4E; font-weight: 400; }
.bgt-goal-bar-track { height: 8px; background: #F0EBE2; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
.bgt-goal-bar-fill { height: 100%; background: linear-gradient(90deg, #8B6F4E, #6B7A6C); border-radius: 4px; transition: width 0.4s; }
.bgt-goal-pct { font-size: 12px; color: #8B6F4E; font-weight: 600; }
.bgt-goal-complete { margin-top: 8px; font-size: 13px; color: #6B7A6C; font-weight: 600; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.modal-card { background: #FFFFFF; border-radius: 16px; padding: 28px; width: 100%; max-width: 380px; }
.modal-title { font-family: 'Source Serif 4', serif; font-size: 20px; font-weight: 600; color: #3D2F24; margin-bottom: 8px; }
.modal-sub { font-size: 13px; color: #6B5A4A; margin-bottom: 6px; line-height: 1.4; }
.modal-card label { display: block; font-size: 13px; font-weight: 600; color: #3D2F24; margin: 14px 0 6px; }
.modal-card input { width: 100%; padding: 11px 14px; border: 1.5px solid #D9CDBE; border-radius: 10px; font-size: 14px; font-family: 'Inter', sans-serif; }
.modal-btn-row { display: flex; gap: 10px; margin-top: 20px; }
.modal-cancel { flex: 1; background: #FAF8F5; border: 1.5px solid #D9CDBE; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; color: #6B5A4A; }
.modal-save { flex: 1; background: #3D2F24; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; color: white; }
`;
