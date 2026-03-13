"use client";

// ─────────────────────────────────────────────
// AddClientModal
//
// Renders the "+ Add Client" button and modal on the coach clients page.
// Supports three goal categories: Weight, Body Composition, Performance.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientWithInvite } from "./actions";

type GoalCategory = "weight" | "body_composition" | "performance";

type Gender = "male" | "female" | "prefer_not_to_say";

type FormState = {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  gender:         Gender | "";
  dateOfBirth:    string;
  height:         string;
  goalName:       string;
  goalDate:       string;
  goalCategory:   GoalCategory;
  // Weight
  startingWeight: string;
  goalWeight:     string;
  // Body composition
  startingBodyFat: string;
  goalBodyFat:     string;
  startingSmm:     string;
  goalSmm:         string;
  // Performance
  performanceMetricName:    string;
  performanceUnit:          string;
  performanceDirection:     "increase" | "decrease";
  startingPerformanceValue: string;
  goalPerformanceValue:     string;
};

const EMPTY: FormState = {
  firstName:      "",
  lastName:       "",
  email:          "",
  phone:          "",
  gender:         "",
  dateOfBirth:    "",
  height:         "",
  goalName:       "",
  goalDate:       "",
  goalCategory:   "weight",
  startingWeight: "",
  goalWeight:     "",
  startingBodyFat: "",
  goalBodyFat:     "",
  startingSmm:     "",
  goalSmm:         "",
  performanceMetricName:    "",
  performanceUnit:          "",
  performanceDirection:     "increase",
  startingPerformanceValue: "",
  goalPerformanceValue:     "",
};

function parseNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function AddClientModal() {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleClose() {
    setOpen(false);
    setForm(EMPTY);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim())  newErrors.lastName  = "Required";
    if (!form.email.trim())     newErrors.email     = "Required";
    if (!form.goalName.trim())  newErrors.goalName  = "Required";
    if (!form.goalDate)         newErrors.goalDate  = "Required";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    const result = await createClientWithInvite({
      firstName:    form.firstName.trim(),
      lastName:     form.lastName.trim(),
      email:        form.email.trim(),
      phone:        form.phone.trim() || null,
      gender:       form.gender || null,
      dateOfBirth:  form.dateOfBirth || null,
      height:       parseNum(form.height),
      goalName:     form.goalName.trim(),
      goalDate:     form.goalDate,
      goalCategory: form.goalCategory,
      startingWeight:           parseNum(form.startingWeight),
      goalWeight:               parseNum(form.goalWeight),
      startingBodyFat:          parseNum(form.startingBodyFat),
      goalBodyFat:              parseNum(form.goalBodyFat),
      startingSmm:              parseNum(form.startingSmm),
      goalSmm:                  parseNum(form.goalSmm),
      performanceMetricName:    form.performanceMetricName.trim() || null,
      performanceUnit:          form.performanceUnit.trim() || null,
      performanceDirection:     form.goalCategory === "performance" ? form.performanceDirection : null,
      startingPerformanceValue: parseNum(form.startingPerformanceValue),
      goalPerformanceValue:     parseNum(form.goalPerformanceValue),
    });
    setLoading(false);

    if (result.error) { setErrors({ submit: result.error }); return; }
    handleClose();
    router.refresh();
  }

  const inputCls = (field: string) =>
    `w-full border rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] ${
      errors[field] ? "border-[#7A1E1E]" : "border-[#252525]"
    }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#B8933A] hover:bg-[#C9A44A] text-[#0D0D0D] px-3 py-1.5 rounded transition-colors uppercase tracking-widest"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        <span className="text-sm leading-none">+</span> Add Client
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-[#141414] rounded border border-[#252525] w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#252525] sticky top-0 bg-[#141414]">
              <h2 className="text-base font-semibold text-[#F4EEE4]" style={{ fontFamily: "'Cinzel', serif" }}>Add Client</h2>
              <button onClick={handleClose} className="text-[#9A9080] hover:text-[#DDD5C0] text-xl leading-none" aria-label="Close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>First Name <span className="text-[#7A1E1E]">*</span></label>
                  <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" className={inputCls("firstName")} />
                  {errors.firstName && <p className="text-xs text-[#7A1E1E] mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Last Name <span className="text-[#7A1E1E]">*</span></label>
                  <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" className={inputCls("lastName")} />
                  {errors.lastName && <p className="text-xs text-[#7A1E1E] mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Email <span className="text-[#7A1E1E]">*</span></label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" className={inputCls("email")} />
                {errors.email && <p className="text-xs text-[#7A1E1E] mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Phone <span className="text-[#807868] font-normal normal-case">(optional)</span></label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" className="w-full border border-[#252525] rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]" />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Gender <span className="text-[#807868] font-normal normal-case">(optional)</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {([["male", "Male"], ["female", "Female"], ["prefer_not_to_say", "Prefer Not"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set("gender", form.gender === val ? "" : val)}
                      className={`px-3 py-2 text-xs font-semibold rounded border transition-colors ${
                        form.gender === val
                          ? "bg-[#B8933A] text-[#0D0D0D] border-[#B8933A]"
                          : "bg-[#1A1A1A] text-[#9A9080] border-[#252525] hover:border-[#B8933A]"
                      }`}
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth & Height */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Date of Birth <span className="text-[#807868] font-normal normal-case">(optional)</span></label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="w-full border border-[#252525] rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Height <span className="text-[#807868] font-normal normal-case">(inches)</span></label>
                  <input type="number" inputMode="decimal" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="70" className="w-full border border-[#252525] rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#252525] pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#807868]" style={{ fontFamily: "'Cinzel', serif" }}>First Goal</p>
              </div>

              {/* Goal name + date */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal <span className="text-[#7A1E1E]">*</span></label>
                <input type="text" value={form.goalName} onChange={(e) => set("goalName", e.target.value)} placeholder="Lose 30 lbs by summer" className={inputCls("goalName")} />
                {errors.goalName && <p className="text-xs text-[#7A1E1E] mt-1">{errors.goalName}</p>}
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Target Date <span className="text-[#7A1E1E]">*</span></label>
                <input type="date" value={form.goalDate} onChange={(e) => set("goalDate", e.target.value)} className={inputCls("goalDate")} />
                {errors.goalDate && <p className="text-xs text-[#7A1E1E] mt-1">{errors.goalDate}</p>}
              </div>

              {/* Goal category */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["weight", "body_composition", "performance"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => set("goalCategory", cat)}
                      className={`px-3 py-2 text-xs font-semibold rounded border transition-colors ${
                        form.goalCategory === cat
                          ? "bg-[#B8933A] text-[#0D0D0D] border-[#B8933A]"
                          : "bg-[#1A1A1A] text-[#9A9080] border-[#252525] hover:border-[#B8933A]"
                      }`}
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {cat === "weight" ? "Weight" : cat === "body_composition" ? "Body Comp" : "Performance"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Weight fields ── */}
              {form.goalCategory === "weight" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Starting Weight <span className="text-[#807868] font-normal normal-case">(lbs, optional)</span></label>
                    <input type="number" inputMode="decimal" value={form.startingWeight} onChange={(e) => set("startingWeight", e.target.value)} placeholder="220" className={inputCls("startingWeight")} />
                    {errors.startingWeight && <p className="text-xs text-[#7A1E1E] mt-1">{errors.startingWeight}</p>}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Weight <span className="text-[#807868] font-normal normal-case">(lbs, optional)</span></label>
                    <input type="number" inputMode="decimal" value={form.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} placeholder="190" className={inputCls("goalWeight")} />
                    {errors.goalWeight && <p className="text-xs text-[#7A1E1E] mt-1">{errors.goalWeight}</p>}
                  </div>
                </div>
              )}

              {/* ── Body composition fields ── */}
              {form.goalCategory === "body_composition" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Starting Body Fat % <span className="text-[#807868] font-normal normal-case">(optional)</span></label>
                      <input type="number" inputMode="decimal" value={form.startingBodyFat} onChange={(e) => set("startingBodyFat", e.target.value)} placeholder="28.0" className={inputCls("startingBodyFat")} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Body Fat %</label>
                      <input type="number" inputMode="decimal" value={form.goalBodyFat} onChange={(e) => set("goalBodyFat", e.target.value)} placeholder="20.0" className={inputCls("goalBodyFat")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Starting SMM (lbs) <span className="text-[#807868] font-normal normal-case">(optional)</span></label>
                      <input type="number" inputMode="decimal" value={form.startingSmm} onChange={(e) => set("startingSmm", e.target.value)} placeholder="75.0" className={inputCls("startingSmm")} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal SMM (lbs)</label>
                      <input type="number" inputMode="decimal" value={form.goalSmm} onChange={(e) => set("goalSmm", e.target.value)} placeholder="82.0" className={inputCls("goalSmm")} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Performance fields ── */}
              {form.goalCategory === "performance" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Metric Name</label>
                      <input type="text" value={form.performanceMetricName} onChange={(e) => set("performanceMetricName", e.target.value)} placeholder="Bench Press" className={inputCls("performanceMetricName")} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Unit</label>
                      <input type="text" value={form.performanceUnit} onChange={(e) => set("performanceUnit", e.target.value)} placeholder="lbs" className={inputCls("performanceUnit")} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["increase", "decrease"] as const).map((dir) => (
                        <button key={dir} type="button" onClick={() => set("performanceDirection", dir)}
                          className={`px-3 py-2 text-xs font-semibold rounded border transition-colors ${
                            form.performanceDirection === dir
                              ? "bg-[#B8933A] text-[#0D0D0D] border-[#B8933A]"
                              : "bg-[#1A1A1A] text-[#9A9080] border-[#252525] hover:border-[#B8933A]"
                          }`}
                          style={{ fontFamily: "'Cinzel', serif" }}>
                          {dir === "increase" ? "↑ Increase" : "↓ Decrease"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Starting Value</label>
                      <input type="number" inputMode="decimal" value={form.startingPerformanceValue} onChange={(e) => set("startingPerformanceValue", e.target.value)} placeholder="135" className={inputCls("startingPerformanceValue")} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Value</label>
                      <input type="number" inputMode="decimal" value={form.goalPerformanceValue} onChange={(e) => set("goalPerformanceValue", e.target.value)} placeholder="225" className={inputCls("goalPerformanceValue")} />
                    </div>
                  </div>
                </div>
              )}

              {errors.submit && <p className="text-sm text-[#7A1E1E]">{errors.submit}</p>}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={handleClose} className="text-sm text-[#9A9080] hover:text-[#DDD5C0] px-4 py-2 rounded transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-60 text-[#0D0D0D] text-xs font-semibold px-5 py-2 rounded transition-colors uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
                  {loading ? "Creating & sending invite…" : "Add Client & Send Invite"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
