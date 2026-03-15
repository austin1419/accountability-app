-- ═══════════════════════════════════════════════════════════════════
-- 7-Day Fake Data Simulation for austinboone1419@gmail.com
--
-- INSTRUCTIONS:
--   1. Run this in the Supabase SQL Editor
--   2. Verify the user_id resolves before running the INSERTs
--   3. Does NOT create users, goals, tasks, or alter schema
--
-- DATES: 2026-03-09 → 2026-03-15 (ending today)
--
-- WEEK STRUCTURE:
--   Day 1 (Mon 03-09) — Strong day
--   Day 2 (Tue 03-10) — Strong day
--   Day 3 (Wed 03-11) — Missed nutrition
--   Day 4 (Thu 03-12) — Missed nutrition again
--   Day 5 (Fri 03-13) — Poor sleep
--   Day 6 (Sat 03-14) — Alcohol + low energy
--   Day 7 (Sun 03-15) — Rebound / good recovery
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- Step 0: Resolve IDs
--
-- Run this SELECT first to verify IDs exist.
-- Copy the user_id and task IDs into the DO block
-- variables if they differ from what's generated below.
-- ─────────────────────────────────────────────

-- Verify user
SELECT id, email, name FROM users WHERE email = 'austinboone1419@gmail.com';

-- Verify active goal + tasks
SELECT g.id AS goal_id, g.goal_name, g.goal_category,
       t.id AS task_id, t.task_name, t.category, t.is_active
FROM goals g
JOIN tasks t ON t.goal_id = g.id
WHERE g.user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND g.is_active = true
  AND t.is_active = true
ORDER BY t.category, t.task_name;


-- ─────────────────────────────────────────────
-- Step 1: Clean up any existing data for these
--         7 days (safe re-run)
-- ─────────────────────────────────────────────

DELETE FROM task_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND date BETWEEN '2026-03-09' AND '2026-03-15';

DELETE FROM daily_journal
WHERE user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND date BETWEEN '2026-03-09' AND '2026-03-15';

DELETE FROM weight_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND logged_at BETWEEN '2026-03-09' AND '2026-03-15';


-- ═══════════════════════════════════════════════════════════════════
-- Step 2: INSERT task_logs
--
-- This uses a DO block to dynamically resolve the user's task IDs.
-- Each task gets a row per day. "completed" varies by day scenario.
--
-- Convention:
--   ✅ = completed (true)
--   ❌ = missed    (false)
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id uuid;
  v_task    record;
  v_date    date;
  v_completed boolean;
  v_day     int;
BEGIN
  -- Resolve user
  SELECT id INTO v_user_id
  FROM users WHERE email = 'austinboone1419@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: austinboone1419@gmail.com';
  END IF;

  -- Loop through each active task
  FOR v_task IN
    SELECT t.id, t.task_name, t.category
    FROM tasks t
    JOIN goals g ON g.id = t.goal_id
    WHERE g.user_id = v_user_id
      AND g.is_active = true
      AND t.is_active = true
    ORDER BY t.category, t.task_name
  LOOP
    -- Loop through 7 days: 2026-03-09 to 2026-03-15
    FOR v_day IN 0..6 LOOP
      v_date := '2026-03-09'::date + v_day;

      -- Default: completed
      v_completed := true;

      -- ── Day 3 (03-11) — Missed nutrition ──
      -- Nutrition tasks missed; everything else done
      IF v_day = 2 AND lower(v_task.category) = 'nutrition' THEN
        v_completed := false;
      END IF;

      -- ── Day 4 (03-12) — Missed nutrition again ──
      -- Same pattern: nutrition missed, rest done
      IF v_day = 3 AND lower(v_task.category) = 'nutrition' THEN
        v_completed := false;
      END IF;

      -- ── Day 5 (03-13) — Poor sleep ──
      -- Rough day: missed ~half of tasks (nutrition + supplements)
      IF v_day = 4 AND lower(v_task.category) IN ('nutrition', 'supplements') THEN
        v_completed := false;
      END IF;

      -- ── Day 6 (03-14) — Alcohol + low energy ──
      -- Worst day: only Movement tasks done, rest missed
      IF v_day = 5 AND lower(v_task.category) != 'movement' THEN
        v_completed := false;
      END IF;

      -- ── Day 7 (03-15) — Rebound ──
      -- All tasks completed (handled by default = true)

      INSERT INTO task_logs (task_id, user_id, date, completed)
      VALUES (v_task.id, v_user_id, v_date, v_completed)
      ON CONFLICT (task_id, user_id, date) DO UPDATE SET completed = EXCLUDED.completed;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'task_logs inserted for user %', v_user_id;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- Step 3: INSERT daily_journal
--
-- Each row is hand-crafted to trigger specific signals.
-- Signal thresholds (from deriveJournalSignals):
--   sleepDeficit:        sleep_hours < 6 OR felt_rested = false
--   recoveryDeficit:     sleepDeficit AND recovery_work = false
--   nutritionSlip:       protein_hit = false OR hydration_hit = false OR alcohol = true
--   trainingGap:         trained_today = false AND zone2_cardio = false
--   highStressLowEnergy: stress_level >= 4 AND energy_level <= 2
--   lowReadiness:        felt_rested = false AND energy_level <= 2
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO daily_journal (
  user_id, date,
  sleep_hours, felt_rested,
  protein_hit, hydration_hit, alcohol,
  trained_today, zone2_cardio, recovery_work, supplements_taken,
  stress_level, energy_level,
  notes
)
SELECT u.id,
  vals.date,
  vals.sleep_hours, vals.felt_rested,
  vals.protein_hit, vals.hydration_hit, vals.alcohol,
  vals.trained_today, vals.zone2_cardio, vals.recovery_work, vals.supplements_taken,
  vals.stress_level, vals.energy_level,
  vals.notes
FROM users u
CROSS JOIN (VALUES

  -- ────────────────────────────────────────────────────────────────
  -- DAY 1 — Monday 03-09 — STRONG DAY
  --
  -- Signals:  all false (no flags)
  -- Scenario: perfect_day (all tasks completed)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-09'::date,
    7.5,   true,           -- sleep: 7.5h, rested → sleepDeficit = false
    true,  true,  false,   -- protein ✅, hydration ✅, no alcohol → nutritionSlip = false
    true,  false, true,  true,  -- trained ✅, no z2, recovery ✅, supps ✅ → trainingGap = false
    2,     4,              -- stress 2, energy 4 → highStressLowEnergy = false, lowReadiness = false
    'Clean day. Hit everything.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 2 — Tuesday 03-10 — STRONG DAY
  --
  -- Signals:  all false (no flags)
  -- Scenario: early_streak (streak = 2)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-10'::date,
    7.0,   true,           -- sleep: 7h, rested
    true,  true,  false,   -- nutrition solid
    true,  true,  false, true,  -- trained ✅, z2 ✅, no recovery (ok), supps ✅
    2,     4,              -- low stress, good energy
    'Two in a row. Feeling good.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 3 — Wednesday 03-11 — MISSED NUTRITION
  --
  -- Signals:  nutritionSlip = true (protein missed)
  -- Scenario: training_only_no_nutrition
  --           (has nutrition tasks, nutrition tasks missed,
  --            but some tasks completed → this beats nutritionSlip
  --            in priority since it's checked first)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-11'::date,
    7.0,   true,           -- sleep fine
    false, true,  false,   -- protein MISSED → nutritionSlip = true
    true,  false, true,  true,  -- trained ✅
    2,     3,              -- calm
    'Skipped meal prep. Training was solid though.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 4 — Thursday 03-12 — MISSED NUTRITION AGAIN
  --
  -- Signals:  nutritionSlip = true (protein + hydration missed)
  -- Scenario: training_only_no_nutrition
  --           (same pattern — nutrition tasks missed, others done)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-12'::date,
    6.5,   true,           -- sleep ok
    false, false, false,   -- protein MISSED + hydration MISSED → nutritionSlip = true
    true,  false, false, true,  -- trained ✅, no recovery
    3,     3,              -- stress creeping up
    'Busy day. Ate out, didn''t track. Forgot water bottle.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 5 — Friday 03-13 — POOR SLEEP
  --
  -- Signals:  sleepDeficit = true  (5h < 6)
  --           recoveryDeficit = true  (sleepDeficit + no recovery)
  --           nutritionSlip = true  (protein missed)
  -- Scenario: recovery_deficit
  --           (lowReadiness = false because energy = 3 > 2,
  --            highStressLowEnergy = false because energy = 3,
  --            so recoveryDeficit wins)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-13'::date,
    5.0,   false,          -- 5h sleep, NOT rested → sleepDeficit = true
    false, true,  false,   -- protein MISSED
    true,  false, false, false,  -- trained ✅, NO recovery → recoveryDeficit = true
    3,     3,              -- energy 3 (above 2, so no lowReadiness)
    'Couldn''t fall asleep. Dragged through the workout.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 6 — Saturday 03-14 — ALCOHOL + LOW ENERGY
  --
  -- Signals:  sleepDeficit = true  (not rested)
  --           recoveryDeficit = true  (sleepDeficit + no recovery)
  --           nutritionSlip = true  (alcohol + protein missed)
  --           trainingGap = true  (no training, no z2)
  --           highStressLowEnergy = true  (stress 4, energy 2)
  --           lowReadiness = true  (not rested + energy 2)
  -- Scenario: low_readiness
  --           (highest health-signal priority in detectScenario)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-14'::date,
    5.5,   false,          -- not rested → sleepDeficit = true
    false, false, true,    -- protein ❌, hydration ❌, ALCOHOL → nutritionSlip = true
    false, false, false, false,  -- no training, no z2, no recovery → trainingGap = true, recoveryDeficit = true
    4,     2,              -- stress 4 + energy 2 → highStressLowEnergy = true, lowReadiness = true
    'Went out last night. Wrote the day off.'
  ),

  -- ────────────────────────────────────────────────────────────────
  -- DAY 7 — Sunday 03-15 — REBOUND / GOOD RECOVERY
  --
  -- Signals:  all false (clean slate)
  -- Scenario: perfect_day (all tasks completed)
  -- ────────────────────────────────────────────────────────────────
  (
    '2026-03-15'::date,
    8.0,   true,           -- great sleep
    true,  true,  false,   -- nutrition dialed in
    true,  true,  true,  true,  -- trained, z2, recovery, supps — full sweep
    1,     5,              -- low stress, high energy
    'Back on track. Long walk, big meal prep, early bed.'
  )

) AS vals(
  date,
  sleep_hours, felt_rested,
  protein_hit, hydration_hit, alcohol,
  trained_today, zone2_cardio, recovery_work, supplements_taken,
  stress_level, energy_level,
  notes
)
WHERE u.email = 'austinboone1419@gmail.com'
ON CONFLICT (user_id, date) DO UPDATE SET
  sleep_hours       = EXCLUDED.sleep_hours,
  felt_rested       = EXCLUDED.felt_rested,
  protein_hit       = EXCLUDED.protein_hit,
  hydration_hit     = EXCLUDED.hydration_hit,
  alcohol           = EXCLUDED.alcohol,
  trained_today     = EXCLUDED.trained_today,
  zone2_cardio      = EXCLUDED.zone2_cardio,
  recovery_work     = EXCLUDED.recovery_work,
  supplements_taken = EXCLUDED.supplements_taken,
  stress_level      = EXCLUDED.stress_level,
  energy_level      = EXCLUDED.energy_level,
  notes             = EXCLUDED.notes,
  updated_at        = now();


-- ═══════════════════════════════════════════════════════════════════
-- Step 4: INSERT weight_logs (optional — weight goal context)
--
-- Simulates a slow downtrend with a Day 6 spike (water retention
-- from alcohol). If the user's goal is not weight-based, skip this.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO weight_logs (user_id, weight, logged_at)
SELECT u.id, vals.weight, vals.logged_at
FROM users u
CROSS JOIN (VALUES
  ('2026-03-09'::date, 212.0),   -- Day 1 baseline
  ('2026-03-10'::date, 211.6),   -- Day 2 slight drop
  ('2026-03-11'::date, 211.8),   -- Day 3 flat
  ('2026-03-12'::date, 211.4),   -- Day 4 small drop
  ('2026-03-13'::date, 211.2),   -- Day 5 still trending
  ('2026-03-14'::date, 213.4),   -- Day 6 SPIKE (+2.2 lbs — alcohol/water retention)
  ('2026-03-15'::date, 211.0)    -- Day 7 back down (rebound)
) AS vals(logged_at, weight)
WHERE u.email = 'austinboone1419@gmail.com'
ON CONFLICT (user_id, logged_at) DO UPDATE SET weight = EXCLUDED.weight;


-- ═══════════════════════════════════════════════════════════════════
-- Step 5: Verify
-- ═══════════════════════════════════════════════════════════════════

-- Task logs per day
SELECT tl.date,
       count(*) FILTER (WHERE tl.completed) AS done,
       count(*) AS total,
       round(100.0 * count(*) FILTER (WHERE tl.completed) / count(*)) AS pct
FROM task_logs tl
JOIN users u ON u.id = tl.user_id
WHERE u.email = 'austinboone1419@gmail.com'
  AND tl.date BETWEEN '2026-03-09' AND '2026-03-15'
GROUP BY tl.date
ORDER BY tl.date;

-- Journal entries
SELECT date, sleep_hours, felt_rested, protein_hit, hydration_hit,
       alcohol, trained_today, stress_level, energy_level
FROM daily_journal
WHERE user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND date BETWEEN '2026-03-09' AND '2026-03-15'
ORDER BY date;

-- Weight log
SELECT logged_at, weight
FROM weight_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'austinboone1419@gmail.com')
  AND logged_at BETWEEN '2026-03-09' AND '2026-03-15'
ORDER BY logged_at;
