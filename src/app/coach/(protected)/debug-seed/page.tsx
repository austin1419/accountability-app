// ─────────────────────────────────────────────
// DEBUG SEED VIEWER — temporary dev-only route
//
// Renders a structured summary of all seeded client
// data for visual verification. Safe to remove after
// testing. Does not modify any data.
// ─────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface ClientSummary {
  id: string;
  name: string;
  email: string;
  coachName: string | null;
  isActive: boolean;
  isDeleted: boolean;
  goal: { name: string; category: string; date: string | null } | null;
  compliance: { today: number; week: number; month: number };
  counts: {
    taskLogs: number;
    journals: number;
    weightLogs: number;
    progressLogs: number;
    clientNotes: number;
    coachNotes: number;
    alertStates: number;
  };
  alerts: { active: number; resolved: number; withIntervention: number };
  journal: { latestDate: string | null; stress: number | null; energy: number | null };
  timelineSignal: boolean;
}

export default async function DebugSeedPage() {
  const supabase = createAdminClient();

  // Get all clients (coach_id not in generated types — cast through unknown)
  const { data: rawClients } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: { id: string; name: string; email: string; is_active: boolean; is_deleted: boolean; coach_id: string | null }[] | null;
          }>;
        };
      };
    };
  }).from("users").select("id, name, email, is_active, is_deleted, coach_id").eq("role", "client").order("name", { ascending: true });

  const clients = rawClients ?? [];

  if (clients.length === 0) {
    return (
      <div style={{ padding: "20px", color: "#DDD5C0", fontFamily: "monospace" }}>
        <h1>Debug Seed Viewer</h1>
        <p>No clients found in database.</p>
      </div>
    );
  }

  const clientIds = clients.map((c) => c.id);

  // Parallel bulk queries
  const [
    goalsRes, taskLogsRes, journalsRes, weightLogsRes,
    progressLogsRes, clientNotesRes, coachRes,
  ] = await Promise.all([
    supabase.from("goals").select("id, user_id, goal_name, goal_category, goal_date, is_active").in("user_id", clientIds),
    supabase.from("task_logs").select("user_id, date, completed").in("user_id", clientIds),
    supabase.from("daily_journal").select("user_id, date, stress_level, energy_level").in("user_id", clientIds).order("date", { ascending: false }),
    supabase.from("weight_logs").select("user_id").in("user_id", clientIds),
    supabase.from("progress_logs").select("user_id").in("user_id", clientIds),
    supabase.from("client_notes").select("client_id").in("client_id", clientIds),
    supabase.from("users").select("id, name").eq("role", "coach"),
  ]);

  // Untyped queries for tables not in generated types
  // Query all alert states and filter in JS (can't use .in() with untyped easily)
  const allAlertStates = await (supabase as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: unknown[] | null }> };
  }).from("coach_alert_state").select("client_id, status, intervention_type");

  const alertRows = ((allAlertStates.data ?? []) as { client_id: string; status: string; intervention_type: string | null }[])
    .filter((a) => clientIds.includes(a.client_id));

  const coachNotesRes = await (supabase as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: unknown[] | null }> };
  }).from("coach_notes").select("client_id");
  const coachNoteRows = ((coachNotesRes.data ?? []) as { client_id: string | null }[])
    .filter((n) => n.client_id && clientIds.includes(n.client_id));

  // Build lookups
  const coachMap = new Map<string, string>();
  for (const c of coachRes.data ?? []) coachMap.set(c.id, c.name);

  const goals = goalsRes.data ?? [];
  const taskLogs = taskLogsRes.data ?? [];
  const journals = journalsRes.data ?? [];
  const weightLogs = weightLogsRes.data ?? [];
  const progressLogs = progressLogsRes.data ?? [];
  const clientNotes = clientNotesRes.data ?? [];

  // Date helpers
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const sevenAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); })();
  const thirtyAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); })();

  // Build per-client summaries
  const summaries: ClientSummary[] = clients.map((c) => {
    const isDeleted = (c as Record<string, unknown>).is_deleted === true;
    const goal = goals.find((g) => g.user_id === c.id && g.is_active);

    // Task logs for this client
    const myLogs = taskLogs.filter((l) => l.user_id === c.id);
    const todayLogs = myLogs.filter((l) => l.date === today);
    const weekLogs = myLogs.filter((l) => l.date >= sevenAgo && l.date <= today);
    const monthLogs = myLogs.filter((l) => l.date >= thirtyAgo && l.date <= today);

    // Simple compliance (completed / total logs in window)
    const pct = (logs: typeof myLogs) => {
      if (logs.length === 0) return 0;
      return Math.round((logs.filter((l) => l.completed).length / logs.length) * 100);
    };

    // Journals
    const myJournals = journals.filter((j) => j.user_id === c.id);
    const latestJournal = myJournals[0] ?? null;

    // Alerts
    const myAlerts = alertRows.filter((a) => a.client_id === c.id);

    // Counts
    const myWeightLogs = weightLogs.filter((w) => w.user_id === c.id);
    const myProgressLogs = progressLogs.filter((p) => p.user_id === c.id);
    const myClientNotes = clientNotes.filter((n) => n.client_id === c.id);
    const myCoachNotes = coachNoteRows.filter((n) => n.client_id === c.id);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      coachName: c.coach_id ? (coachMap.get(c.coach_id) ?? c.coach_id) : null,
      isActive: c.is_active,
      isDeleted,
      goal: goal ? { name: goal.goal_name, category: goal.goal_category, date: goal.goal_date } : null,
      compliance: { today: pct(todayLogs), week: pct(weekLogs), month: pct(monthLogs) },
      counts: {
        taskLogs: myLogs.length,
        journals: myJournals.length,
        weightLogs: myWeightLogs.length,
        progressLogs: myProgressLogs.length,
        clientNotes: myClientNotes.length,
        coachNotes: myCoachNotes.length,
        alertStates: myAlerts.length,
      },
      alerts: {
        active: myAlerts.filter((a) => a.status !== "resolved").length,
        resolved: myAlerts.filter((a) => a.status === "resolved").length,
        withIntervention: myAlerts.filter((a) => a.intervention_type != null).length,
      },
      journal: {
        latestDate: latestJournal?.date ?? null,
        stress: latestJournal?.stress_level ?? null,
        energy: latestJournal?.energy_level ?? null,
      },
      timelineSignal: myLogs.length > 0 || myJournals.length > 0 || myAlerts.length > 0,
    };
  });

  // Top-level summary
  const byCategory = new Map<string, number>();
  for (const s of summaries) {
    const cat = s.goal?.category ?? "none";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }
  const tierCounts = { thriving: 0, atRisk: 0, critical: 0, goneDark: 0 };
  for (const s of summaries) {
    const pct = s.compliance.week;
    if (s.counts.taskLogs === 0) tierCounts.goneDark++;
    else if (pct >= 70) tierCounts.thriving++;
    else if (pct >= 40) tierCounts.atRisk++;
    else tierCounts.critical++;
  }

  return (
    <div style={{ padding: "18px", color: "#DDD5C0", fontFamily: "'EB Garamond', serif", fontSize: "13px", lineHeight: 1.6 }}>

      {/* Header */}
      <div style={{ marginBottom: "20px", borderBottom: "1px solid #1A1A1A", paddingBottom: "12px" }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", color: "#B8933A", margin: 0 }}>
          DEBUG SEED VIEWER
        </h1>
        <p style={{ color: "#4A3F2A", fontStyle: "italic", marginTop: "4px" }}>
          Temporary dev route — remove before production
        </p>
      </div>

      {/* Top summary */}
      <div style={{ background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: "7px", padding: "14px 18px", marginBottom: "16px" }}>
        <Row label="Total Clients" value={String(summaries.length)} />
        <Row label="By Category" value={[...byCategory.entries()].map(([k, v]) => `${k}: ${v}`).join(" · ")} />
        <Row label="By Tier (7d)" value={`thriving: ${tierCounts.thriving} · at_risk: ${tierCounts.atRisk} · critical: ${tierCounts.critical} · gone_dark: ${tierCounts.goneDark}`} />
      </div>

      {/* Per-client cards */}
      {summaries.map((s) => (
        <div
          key={s.id}
          style={{
            background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: "7px",
            padding: "14px 18px", marginBottom: "10px",
            borderLeft: `3px solid ${s.compliance.week >= 70 ? "#1D9E75" : s.compliance.week >= 40 ? "#B8933A" : "#7A1E1E"}`,
          }}
        >
          {/* Identity */}
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: "12px", fontWeight: 700, color: "#F4EEE4", marginBottom: "6px" }}>
            {s.name}
          </div>
          <Row label="Email" value={s.email} />
          <Row label="Coach" value={s.coachName ?? "—"} />
          <Row label="Status" value={`active=${s.isActive} · deleted=${s.isDeleted}`} />

          {/* Goal */}
          {s.goal ? (
            <>
              <Divider />
              <Row label="Goal" value={s.goal.name} />
              <Row label="Category" value={s.goal.category} />
              <Row label="Target" value={s.goal.date ?? "—"} />
            </>
          ) : (
            <Row label="Goal" value="None" />
          )}

          {/* Compliance */}
          <Divider />
          <Row label="Today" value={`${s.compliance.today}%`} color={pctColor(s.compliance.today)} />
          <Row label="7-Day" value={`${s.compliance.week}%`} color={pctColor(s.compliance.week)} />
          <Row label="30-Day" value={`${s.compliance.month}%`} color={pctColor(s.compliance.month)} />

          {/* Counts */}
          <Divider />
          <Row label="Task Logs" value={String(s.counts.taskLogs)} />
          <Row label="Journals" value={String(s.counts.journals)} />
          <Row label="Weight Logs" value={String(s.counts.weightLogs)} />
          <Row label="Progress Logs" value={String(s.counts.progressLogs)} />
          <Row label="Client Notes" value={String(s.counts.clientNotes)} />
          <Row label="Coach Notes" value={String(s.counts.coachNotes)} />
          <Row label="Alert States" value={String(s.counts.alertStates)} />

          {/* Alerts */}
          {(s.alerts.active > 0 || s.alerts.resolved > 0) && (
            <>
              <Divider />
              <Row label="Active Alerts" value={String(s.alerts.active)} color={s.alerts.active > 0 ? "#7A1E1E" : undefined} />
              <Row label="Resolved" value={String(s.alerts.resolved)} />
              <Row label="With Intervention" value={String(s.alerts.withIntervention)} />
            </>
          )}

          {/* Journal */}
          <Divider />
          <Row label="Last Journal" value={s.journal.latestDate ?? "—"} />
          <Row label="Stress" value={s.journal.stress !== null ? `${s.journal.stress}/10` : "—"} />
          <Row label="Energy" value={s.journal.energy !== null ? `${s.journal.energy}/10` : "—"} />

          {/* Timeline */}
          <Row label="Timeline Data" value={s.timelineSignal ? "Yes" : "No"} color={s.timelineSignal ? "#1D9E75" : "#4A3F2A"} />
        </div>
      ))}
    </div>
  );
}

// ── Tiny helpers ─────────────────────────────────────────────────

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "2px" }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868", minWidth: "110px", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color: color ?? "#DDD5C0", fontSize: "12px" }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #1A1A1A", margin: "6px 0" }} />;
}

function pctColor(pct: number): string {
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#B8933A";
  return "#7A1E1E";
}
