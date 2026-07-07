import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSectionEncouragement, getSessionQuote } from "./quotes";
import { jsPDF } from "jspdf";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const CATEGORIES = {
  "Household": [
    "Cooking meals", "Grocery shopping", "Washing dishes", "Laundry",
    "Vacuuming / sweeping", "Mopping floors", "Cleaning bathrooms",
    "Taking out trash", "Tidying common areas", "Home repairs / maintenance",
  ],
  "Childcare": [
    "School drop-off / pick-up", "Helping with homework", "Bedtime routine",
    "Doctor / dental appointments", "Extracurricular activities", "Playtime / activities",
    "Packing school bag", "Buying school supplies",
  ],
  "Admin & Logistics": [
    "Paying bills", "Managing finances / budget", "Insurance admin",
    "Car maintenance", "Scheduling appointments", "Managing subscriptions",
  ],
  "Emotional & Social": [
    "Checking in on family", "Planning family events", "Managing social calendar",
    "Supporting partner emotionally", "Keeping track of birthdays / gifts",
  ],
  "Planning Ahead": [
    "Meal planning", "Vacation planning", "Long-term financial planning",
    "Home improvement planning", "Kids' future planning",
  ],
};

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(my) {
  if (!my) return "";
  const [year, month] = my.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function ReminderModal({ task, onClose, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");

  async function handleSave(e) {
    e.preventDefault();
    if (!date) return;
    const remindAt = new Date(`${date}T${time}:00`);
    remindAt.setHours(remindAt.getHours() - 1);
    await onSave(task.id, task.task_name, remindAt.toISOString());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">🔔 Set Reminder</div>
        <p className="modal-sub">For: <strong>{task.task_name}</strong></p>
        <p className="modal-sub">We'll email you 1 hour before the time you set.</p>
        <form onSubmit={handleSave}>
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <label>Time</label>
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

export default function LoadSplitter({ session, household, selectedMonth, onMonthChange, onDataChange }) {
  const [view, setView] = useState("list");
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [taskReminders, setTaskReminders] = useState({});
  const [reminderTask, setReminderTask] = useState(null);
  const [customTask, setCustomTask] = useState("");
  const [customCategory, setCustomCategory] = useState("Household");
  const quote = getSessionQuote("load");
  const enc = getSectionEncouragement("load");

  useEffect(() => { fetchTasks(); }, [household.id]);
  useEffect(() => { fetchAssignments(); fetchReminders(); }, [household.id, selectedMonth]);

  async function fetchTasks() {
    const { data } = await supabase
      .from("load_tasks")
      .select("*")
      .eq("household_id", household.id)
      .order("created_at");
    if (data && data.length > 0) {
      setTasks(data);
    } else {
      await seedDefaultTasks();
    }
  }

  async function seedDefaultTasks() {
    const rows = [];
    for (const [category, taskNames] of Object.entries(CATEGORIES)) {
      for (const name of taskNames) {
        rows.push({ household_id: household.id, category, task_name: name, is_custom: false });
      }
    }
    const { data } = await supabase.from("load_tasks").insert(rows).select();
    if (data) setTasks(data);
  }

  async function fetchAssignments() {
    const { data } = await supabase
      .from("load_assignments")
      .select("task_id, carried_by")
      .eq("household_id", household.id)
      .eq("month_year", selectedMonth);
    if (data) {
      const map = {};
      data.forEach(r => { map[r.task_id] = r.carried_by; });
      setAssignments(map);
    }
  }

  async function fetchReminders() {
    const { data } = await supabase
      .from("reminders")
      .select("reference_id, remind_at, sent")
      .eq("household_id", household.id)
      .eq("reminder_type", "task")
      .eq("user_email", session.user.email);
    if (data) {
      const map = {};
      data.forEach(r => { map[r.reference_id] = r; });
      setTaskReminders(map);
    }
  }

  async function handleAssign(taskId, carriedBy) {
    const current = assignments[taskId];
    const newVal = current === carriedBy ? null : carriedBy;
    setAssignments(prev => ({ ...prev, [taskId]: newVal }));
    if (newVal === null) {
      await supabase
        .from("load_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("month_year", selectedMonth);
    } else {
      await supabase
        .from("load_assignments")
        .upsert({
          household_id: household.id,
          task_id: taskId,
          month_year: selectedMonth,
          carried_by: newVal,
        }, { onConflict: "task_id,month_year" });
    }
    onDataChange();
  }

  async function saveReminder(taskId, taskName, remindAt) {
    await supabase.from("reminders").insert({
      household_id: household.id,
      user_email: session.user.email,
      reminder_type: "task",
      reference_id: taskId,
      remind_at: remindAt,
      label: taskName,
      sent: false,
    });
    setTaskReminders(prev => ({ ...prev, [taskId]: { remind_at: remindAt, sent: false } }));
  }

  async function addCustomTask(e) {
    e.preventDefault();
    if (!customTask.trim()) return;
    const { data } = await supabase
      .from("load_tasks")
      .insert({ household_id: household.id, category: customCategory, task_name: customTask.trim(), is_custom: true })
      .select()
      .single();
    if (data) { setTasks(prev => [...prev, data]); setCustomTask(""); }
  }

  async function handleShare() {
    const doc = generatePDF();
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], `load-report-${selectedMonth}.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Load Report — ${formatMonthYear(selectedMonth)}`,
          text: `Our Household Manager — ${household.name}\nHerPurposefulLife`,
          files: [file],
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          doc.save(`load-report-${selectedMonth}.pdf`);
        }
      }
    } else {
      doc.save(`load-report-${selectedMonth}.pdf`);
      alert("Your device doesn't support direct sharing. PDF downloaded — share it manually.");
    }
  }

  const assignedTasks = tasks.filter(t => assignments[t.id]);
  const me = assignedTasks.filter(t => assignments[t.id] === "me").length;
  const partner = assignedTasks.filter(t => assignments[t.id] === "partner").length;
  const shared = assignedTasks.filter(t => assignments[t.id] === "shared").length;
  const total = assignedTasks.length;

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
    doc.text(`Load Report — ${formatMonthYear(selectedMonth)} | ${household.name}`, mx, 70);

    y = 110;
    doc.setFillColor(...light);
    doc.roundedRect(mx, y, pw - mx * 2, 80, 8, 8, "F");
    doc.setTextColor(...coffee);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Load Summary", mx + 16, y + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`You: ${me} tasks (${total > 0 ? Math.round((me/total)*100) : 0}%)`, mx + 16, y + 44);
    doc.text(`Partner: ${partner} tasks (${total > 0 ? Math.round((partner/total)*100) : 0}%)`, mx + 190, y + 44);
    doc.text(`Shared: ${shared} tasks (${total > 0 ? Math.round((shared/total)*100) : 0}%)`, mx + 360, y + 44);
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...tan);
    doc.text(`"${enc.verse}" — ${enc.reference}`, mx + 16, y + 64, { maxWidth: pw - mx * 2 - 32 });

    y += 110;
    const cats = [...new Set(tasks.map(t => t.category))];
    for (const cat of cats) {
      const catTasks = tasks.filter(t => t.category === cat && assignments[t.id]);
      if (catTasks.length === 0) continue;
      if (y > 700) { doc.addPage(); y = 50; }
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...coffee);
      doc.text(cat, mx, y);
      y += 10;
      doc.setDrawColor(...light);
      doc.line(mx, y, pw - mx, y);
      y += 16;
      for (const task of catTasks) {
        if (y > 760) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...coffee);
        doc.text(task.task_name, mx + 12, y);
        const lbl = assignments[task.id] === "me" ? "You" : assignments[task.id] === "partner" ? "Partner" : "Shared";
        doc.setTextColor(...tan);
        doc.text(lbl, pw - mx, y, { align: "right" });
        if (taskReminders[task.id]) {
          doc.setTextColor(...sage);
          doc.setFontSize(9);
          doc.text(`🔔 Reminder set`, pw - mx - 80, y);
        }
        y += 18;
      }
      y += 8;
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
    doc.text(`"Two are better than one, because they have a good return for their labor." — Ecclesiastes 4:9`, mx, ny, { maxWidth: pw - mx * 2 });
    ny += 40;
    doc.setDrawColor(...light);
    doc.setLineWidth(0.75);
    while (ny < 760) { doc.line(mx, ny, pw - mx, ny); ny += 28; }

    return doc;
  }

  const groupedTasks = {};
  for (const cat of Object.keys(CATEGORIES)) {
    groupedTasks[cat] = tasks.filter(t => t.category === cat);
  }
  const customTasks = tasks.filter(t => t.is_custom);

  return (
    <div className="ls-wrap">
      <style>{lsCss}</style>

      {reminderTask && (
        <ReminderModal
          task={reminderTask}
          onClose={() => setReminderTask(null)}
          onSave={saveReminder}
        />
      )}

      <div className="ls-encouragement">
        <div className="ls-enc-verse">"{enc.verse}"</div>
        <div className="ls-enc-ref">— {enc.reference}</div>
        <div className="ls-enc-note">{enc.note}</div>
      </div>

      <div className="ls-top-row">
        <div>
          <div className="ls-title">Household Load</div>
          <div className="ls-subtitle">{formatMonthYear(selectedMonth)}</div>
        </div>
        <div className="ls-view-toggle">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Tasks</button>
          <button className={view === "breakdown" ? "active" : ""} onClick={() => setView("breakdown")}>Breakdown</button>
        </div>
      </div>

      {total > 0 && (
        <div className="ls-summary-bar">
          <div className="ls-bar-track">
            <div className="ls-bar-me" style={{ width: `${(me/total)*100}%` }} />
            <div className="ls-bar-shared" style={{ width: `${(shared/total)*100}%` }} />
            <div className="ls-bar-partner" style={{ width: `${(partner/total)*100}%` }} />
          </div>
          <div className="ls-bar-legend">
            <span className="ls-leg-me">You {Math.round((me/total)*100)}%</span>
            <span className="ls-leg-shared">Shared {Math.round((shared/total)*100)}%</span>
            <span className="ls-leg-partner">Partner {Math.round((partner/total)*100)}%</span>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="ls-list">
          {Object.entries(groupedTasks).map(([cat, catTasks]) => (
            <div key={cat} className="ls-category">
              <div className="ls-cat-label">{cat}</div>
              {catTasks.map(task => (
                <div key={task.id} className="ls-task">
                  <div className="ls-task-top">
                    <span className="ls-task-name">{task.task_name}</span>
                    <button
                      className={`ls-remind-btn ${taskReminders[task.id] ? "ls-remind-set" : ""}`}
                      onClick={() => setReminderTask(task)}
                      title="Set reminder"
                    >
                      🔔
                    </button>
                  </div>
                  {taskReminders[task.id] && (
                    <div className="ls-reminder-badge">
                      Reminder: {new Date(taskReminders[task.id].remind_at).toLocaleString()}
                    </div>
                  )}
                  <div className="ls-tag-row">
                    {["me", "shared", "partner"].map(v => (
                      <button
                        key={v}
                        className={`ls-tag ${assignments[task.id] === v ? `ls-tag-${v}` : ""}`}
                        onClick={() => handleAssign(task.id, v)}
                      >
                        {v === "me" ? "Me" : v === "shared" ? "Shared" : "Partner"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {customTasks.length > 0 && (
            <div className="ls-category">
              <div className="ls-cat-label">Custom tasks</div>
              {customTasks.map(task => (
                <div key={task.id} className="ls-task">
                  <div className="ls-task-top">
                    <span className="ls-task-name">{task.task_name}</span>
                    <button
                      className={`ls-remind-btn ${taskReminders[task.id] ? "ls-remind-set" : ""}`}
                      onClick={() => setReminderTask(task)}
                    >🔔</button>
                  </div>
                  <div className="ls-tag-row">
                    {["me", "shared", "partner"].map(v => (
                      <button
                        key={v}
                        className={`ls-tag ${assignments[task.id] === v ? `ls-tag-${v}` : ""}`}
                        onClick={() => handleAssign(task.id, v)}
                      >
                        {v === "me" ? "Me" : v === "shared" ? "Shared" : "Partner"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addCustomTask} className="ls-add-form">
            <div className="ls-add-label">Add your own task</div>
            <select value={customCategory} onChange={e => setCustomCategory(e.target.value)}>
              {Object.keys(CATEGORIES).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="ls-add-row">
              <input
                type="text"
                placeholder="e.g. Managing pet care"
                value={customTask}
                onChange={e => setCustomTask(e.target.value)}
              />
              <button type="submit">Add</button>
            </div>
          </form>
        </div>
      )}

      {view === "breakdown" && (
        <div className="ls-breakdown">
          {total === 0 ? (
            <div className="ls-empty">No tasks tagged yet. Switch to Tasks tab to assign who carries what.</div>
          ) : (
            <>
              <div className="ls-breakdown-cards">
                <div className="ls-bcard ls-bcard-me">
                  <div className="ls-bcard-num">{me}</div>
                  <div className="ls-bcard-label">You carry</div>
                </div>
                <div className="ls-bcard ls-bcard-shared">
                  <div className="ls-bcard-num">{shared}</div>
                  <div className="ls-bcard-label">Shared</div>
                </div>
                <div className="ls-bcard ls-bcard-partner">
                  <div className="ls-bcard-num">{partner}</div>
                  <div className="ls-bcard-label">Partner carries</div>
                </div>
              </div>
              {Object.entries(groupedTasks).map(([cat, catTasks]) => {
                const tagged = catTasks.filter(t => assignments[t.id]);
                if (tagged.length === 0) return null;
                return (
                  <div key={cat} className="ls-breakdown-section">
                    <div className="ls-cat-label">{cat}</div>
                    {tagged.map(task => (
                      <div key={task.id} className="ls-breakdown-row">
                        <span>{task.task_name}</span>
                        <span className={`ls-breakdown-tag ls-breakdown-${assignments[task.id]}`}>
                          {assignments[task.id] === "me" ? "You" : assignments[task.id] === "shared" ? "Shared" : "Partner"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
          <div className="ls-action-row">
            <button className="ls-download" onClick={() => generatePDF().save(`load-report-${selectedMonth}.pdf`)}>
              ⬇ Download PDF
            </button>
            <button className="ls-share" onClick={handleShare}>↗ Share</button>
          </div>
          <p className="ls-download-hint">Share to WhatsApp, email, or anywhere you like.</p>
        </div>
      )}
    </div>
  );
}

const lsCss = `
.ls-wrap { padding-bottom: 40px; }

.ls-encouragement {
  background: linear-gradient(135deg, #3D2F24 0%, #6B5A4A 100%);
  border-radius: 14px; padding: 20px; margin-bottom: 20px; color: white;
}
.ls-enc-verse { font-family: 'Source Serif 4', serif; font-style: italic; font-size: 15px; line-height: 1.5; margin-bottom: 6px; }
.ls-enc-ref { font-size: 12px; color: #D9CDBE; margin-bottom: 10px; }
.ls-enc-note { font-size: 13px; color: #FAF8F5; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }

.ls-top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.ls-title { font-family: 'Source Serif 4', serif; font-size: 22px; font-weight: 600; color: #3D2F24; }
.ls-subtitle { font-size: 13px; color: #8B6F4E; margin-top: 2px; }
.ls-view-toggle { display: flex; gap: 4px; background: #E8E0D5; border-radius: 8px; padding: 3px; }
.ls-view-toggle button { padding: 6px 12px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; background: none; color: #6B5A4A; }
.ls-view-toggle button.active { background: #FFFFFF; color: #3D2F24; }

.ls-summary-bar { margin-bottom: 20px; }
.ls-bar-track { height: 10px; border-radius: 5px; overflow: hidden; display: flex; background: #F0EBE2; margin-bottom: 8px; }
.ls-bar-me { background: #8B6F4E; height: 100%; transition: width 0.3s; }
.ls-bar-shared { background: #6B7A6C; height: 100%; transition: width 0.3s; }
.ls-bar-partner { background: #D9CDBE; height: 100%; transition: width 0.3s; }
.ls-bar-legend { display: flex; gap: 16px; }
.ls-bar-legend span { font-size: 12px; font-weight: 600; }
.ls-leg-me { color: #8B6F4E; }
.ls-leg-shared { color: #6B7A6C; }
.ls-leg-partner { color: #A89880; }

.ls-category { margin-bottom: 20px; }
.ls-cat-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8B6F4E; margin-bottom: 8px; }
.ls-task { background: #FFFFFF; border: 1.5px solid #E8E0D5; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
.ls-task-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ls-task-name { font-size: 14px; color: #3D2F24; }
.ls-remind-btn { background: none; border: none; font-size: 16px; cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
.ls-remind-btn:hover { opacity: 1; }
.ls-remind-set { opacity: 1; }
.ls-reminder-badge { font-size: 11px; color: #6B7A6C; font-weight: 600; margin-bottom: 6px; }
.ls-tag-row { display: flex; gap: 6px; }
.ls-tag { padding: 5px 12px; border: 1.5px solid #D9CDBE; border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; background: none; color: #8B6F4E; transition: all 0.15s; }
.ls-tag-me { background: #8B6F4E; color: white; border-color: #8B6F4E; }
.ls-tag-shared { background: #6B7A6C; color: white; border-color: #6B7A6C; }
.ls-tag-partner { background: #D9CDBE; color: #3D2F24; border-color: #D9CDBE; }

.ls-add-form { background: #FFFFFF; border: 1.5px dashed #D9CDBE; border-radius: 12px; padding: 18px; margin-top: 8px; }
.ls-add-label { font-size: 13px; font-weight: 600; color: #6B5A4A; margin-bottom: 10px; }
.ls-add-form select { width: 100%; padding: 10px 12px; border: 1.5px solid #D9CDBE; border-radius: 8px; font-size: 14px; margin-bottom: 8px; }
.ls-add-row { display: flex; gap: 8px; }
.ls-add-row input { flex: 1; padding: 10px 12px; border: 1.5px solid #D9CDBE; border-radius: 8px; font-size: 14px; }
.ls-add-row button { background: #3D2F24; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

.ls-breakdown { padding-top: 4px; }
.ls-empty { font-size: 14px; color: #A89880; text-align: center; padding: 32px 0; }
.ls-breakdown-cards { display: flex; gap: 10px; margin-bottom: 24px; }
.ls-bcard { flex: 1; border-radius: 12px; padding: 16px; text-align: center; }
.ls-bcard-me { background: #8B6F4E; color: white; }
.ls-bcard-shared { background: #6B7A6C; color: white; }
.ls-bcard-partner { background: #E8E0D5; color: #3D2F24; }
.ls-bcard-num { font-family: 'Source Serif 4', serif; font-size: 28px; font-weight: 600; }
.ls-bcard-label { font-size: 11px; font-weight: 600; margin-top: 2px; }

.ls-breakdown-section { margin-bottom: 16px; }
.ls-breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #FFFFFF; border: 1px solid #E8E0D5; border-radius: 8px; margin-bottom: 6px; font-size: 13px; }
.ls-breakdown-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
.ls-breakdown-me { background: #8B6F4E; color: white; }
.ls-breakdown-shared { background: #6B7A6C; color: white; }
.ls-breakdown-partner { background: #D9CDBE; color: #3D2F24; }

.ls-action-row { display: flex; gap: 10px; margin-top: 24px; margin-bottom: 8px; }
.ls-download { flex: 1; background: #3D2F24; color: white; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }
.ls-download:hover { background: #6B5A4A; }
.ls-share { flex: 1; background: #6B7A6C; color: white; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }
.ls-share:hover { background: #5C6B5D; }
.ls-download-hint { font-size: 12px; color: #8B6F4E; text-align: center; }

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
