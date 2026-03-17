-- ═══════════════════════════════════════════════════════════════════
-- SEED 50 CLIENTS — Full War Room simulation
--
-- Run AFTER reset_clients.sql in Supabase SQL Editor.
-- Coach: austin@irontribefitness.com (must already exist)
--
-- Distribution:
--   15 Thriving  (85-100%)
--   20 On Track  (65-84%)
--   10 Struggling (40-64%)
--    5 Critical   (<40%)
--
-- Each client: user + goal + 4 tasks + 30d task_logs + weight_logs + journals + alerts
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  v_coach uuid;
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_cid uuid; v_gid uuid;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  d date; day_off integer; roll double precision; i integer;
  v_name text; v_email text; v_goal text; v_cat text;
  v_sw numeric; v_cw numeric; v_gw numeric;
  v_days_in integer;
  -- pillar weakness: which pillar gets a compliance penalty
  pw integer; -- 1=activity, 2=nutrition, 3=sleep, 4=supplements
  r1 double precision; r2 double precision; r3 double precision; r4 double precision;

  -- Name arrays
  names text[] := ARRAY[
    'Austin Boone','Marcus Taylor','Lisa Chen','David Walsh','Rachel Holt',
    'Kevin Park','Amanda Ross','Tyler James','Nina Patel','Ben Wright',
    'Monica Peters','Jake Turner','Sophia Lee','Ryan Garcia','Hannah Cole',
    'Derek Kim','Olivia Brown','Ethan Clark','Mia Johnson','Carlos Rivera',
    'Sarah Kim','Brandon Lee','Jessica Ward','Tony Martinez','Ashley Thompson',
    'James Moore','Rusty Arnett','Moriah Boone','Dustin Fields','Kelly Nguyen',
    'Jordan Hayes','Priya Sharma','Mike Chen','Emma Stone','Liam Scott',
    'Zoe Williams','Nathan Brown','Ava Garcia','Lucas White','Maya Davis',
    'Owen Harris','Lily Martin','Jack Robinson','Chloe King','Mason Lee',
    'Grace Allen','Aiden Young','Ella Baker','Noah Hill','Sophia Green'
  ];

  goals_w text[] := ARRAY['Cut to 185','Lose 20 lbs','Summer shred','Get to 160','Drop weight','Lean out','Fat loss phase','Weight target','Shed 15 lbs','Trim down'];
  goals_b text[] := ARRAY['Body recomp','Lean bulk','Competition prep','Build muscle','Recomp phase','Lean mass gain','Physique goal','Body transformation'];
  goals_p text[] := ARRAY['Squat 315','Bench 225','Run sub-20 5K','Deadlift 405','Pull-up target','Sprint speed','Endurance goal','Strength cycle'];

  task_a text[] := ARRAY['Morning HIIT','Strength session','Cardio workout','Training session','Gym workout','30 min walk','Yoga flow','CrossFit WOD'];
  task_n text[] := ARRAY['Hit protein macro','Meal prep','Track calories','Nutrition compliance','No fast food','Calorie target','Balanced meals','Portion control'];
  task_s text[] := ARRAY['7+ hrs sleep','Bedtime by 11pm','Recovery stretching','No screens 10pm','Foam rolling','Sleep protocol','Wind-down routine','Recovery day'];
  task_sup text[] := ARRAY['Creatine + fish oil','Daily supplements','Vitamin D + zinc','Multivitamin','Fiber supplement','Electrolytes','Omega-3','Supplement stack'];

BEGIN

SELECT id INTO v_coach FROM public.users
WHERE email = 'austin@irontribefitness.com' AND role = 'coach';
IF v_coach IS NULL THEN RAISE EXCEPTION 'Coach not found.'; END IF;

FOR i IN 1..50 LOOP
  v_cid := gen_random_uuid(); v_gid := gen_random_uuid();
  t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();

  v_name := names[i];
  v_email := lower(replace(v_name, ' ', '.')) || '@example.com';
  v_days_in := 25 + floor(random()*35)::int; -- 25-60 days in program
  pw := 1 + floor(random()*4)::int; -- random weak pillar per client

  -- Goal type rotation: weight / body_comp / performance
  IF i % 3 = 1 THEN
    v_cat := 'weight';
    v_sw := 170 + floor(random()*50)::int;
    v_gw := v_sw - 15 - floor(random()*15)::int;
  ELSIF i % 3 = 2 THEN
    v_cat := 'body_composition';
  ELSE
    v_cat := 'performance';
  END IF;

  -- Insert user
  INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at)
  VALUES (v_cid, v_email, v_name, 'client', true, v_coach, now() - interval '1 day' * v_days_in);

  -- Insert goal
  IF v_cat = 'weight' THEN
    v_cw := v_sw - floor(random()*12)::int;
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight)
    VALUES (v_gid, v_cid, goals_w[1 + floor(random()*10)::int % 10], v_cat, v_today + 60 + floor(random()*60)::int, true, v_sw, v_cw, v_gw);
  ELSIF v_cat = 'body_composition' THEN
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active,
      starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm)
    VALUES (v_gid, v_cid, goals_b[1 + floor(random()*8)::int % 8], v_cat, v_today + 90, true,
      20 + floor(random()*10)::int, 17 + floor(random()*8)::int, 12 + floor(random()*5)::int,
      60 + floor(random()*20)::int, 63 + floor(random()*20)::int, 70 + floor(random()*15)::int);
  ELSE
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active,
      performance_metric_name, performance_unit, performance_direction,
      starting_performance_value, current_performance_value, goal_performance_value)
    VALUES (v_gid, v_cid, goals_p[1 + floor(random()*8)::int % 8], v_cat, v_today + 120, true,
      'Bench Press', 'lbs', 'increase',
      115 + floor(random()*50)::int, 150 + floor(random()*40)::int, 200 + floor(random()*50)::int);
  END IF;

  -- Insert 4 tasks (one per pillar)
  INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
    (t1, v_gid, task_a[1 + floor(random()*8)::int % 8], 'Activity', true),
    (t2, v_gid, task_n[1 + floor(random()*8)::int % 8], 'Nutrition', true),
    (t3, v_gid, task_s[1 + floor(random()*8)::int % 8], 'Sleep/Recovery', true),
    (t4, v_gid, task_sup[1 + floor(random()*8)::int % 8], 'Supplements', true);

  -- ── DETERMINE COMPLIANCE TIER ──────────────────────────────
  -- i=1-15: Thriving (85-100%)
  -- i=16-35: On Track (65-84%)
  -- i=36-45: Struggling (40-64%)
  -- i=46-50: Critical (<40%)

  FOR day_off IN 0..29 LOOP
    d := v_today - day_off;

    IF i <= 15 THEN
      -- THRIVING: high flat compliance
      roll := 0.85 + random() * 0.14;
    ELSIF i <= 35 THEN
      -- ON TRACK: moderate, some with trends
      IF i <= 25 THEN
        roll := 0.65 + random() * 0.18; -- stable moderate
      ELSIF i <= 30 THEN
        -- improving over time
        roll := 0.55 + (0.25 * (1.0 - day_off::double precision / 29.0)) + random() * 0.05;
      ELSE
        -- slight decline
        roll := 0.80 - (0.18 * (1.0 - day_off::double precision / 29.0)) + random() * 0.05;
      END IF;
    ELSIF i <= 45 THEN
      -- STRUGGLING: declining or inconsistent
      IF i <= 40 THEN
        roll := 0.60 - (0.25 * (1.0 - day_off::double precision / 29.0));
      ELSE
        roll := CASE WHEN (day_off / 7) % 2 = 0 THEN 0.70 ELSE 0.30 END;
      END IF;
      -- weekend drops
      IF extract(dow FROM d) IN (0, 6) THEN roll := roll - 0.12; END IF;
    ELSE
      -- CRITICAL: very low, some gone dark
      IF i <= 48 THEN
        roll := CASE WHEN day_off < (3 + (i-46)*2) THEN 0.0 ELSE 0.25 END; -- gone dark recently
      ELSE
        roll := 0.10 + random() * 0.08;
      END IF;
    END IF;

    -- Clamp
    IF roll < 0.0 THEN roll := 0.0; END IF;
    IF roll > 1.0 THEN roll := 1.0; END IF;

    -- Per-pillar rates with weakness
    r1 := roll; r2 := roll; r3 := roll; r4 := roll;
    IF pw = 1 THEN r1 := roll * 0.6; -- weak Activity
    ELSIF pw = 2 THEN r2 := roll * 0.65; -- weak Nutrition
    ELSIF pw = 3 THEN r3 := roll * 0.5; -- weak Sleep (most common weak pillar)
    ELSE r4 := roll * 0.7; END IF;

    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES
      (t1, v_cid, d, random() < r1, d::timestamptz + interval '8 hours'),
      (t2, v_cid, d, random() < r2, d::timestamptz + interval '8 hours'),
      (t3, v_cid, d, random() < r3, d::timestamptz + interval '8 hours'),
      (t4, v_cid, d, random() < r4, d::timestamptz + interval '8 hours');
  END LOOP;

  -- ── WEIGHT LOGS (weight-goal clients, every 3 days) ────────
  IF v_cat = 'weight' THEN
    FOR day_off IN 0..29 LOOP
      IF day_off % 3 = 0 THEN
        d := v_today - day_off;
        INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
        VALUES (v_cid, v_sw - ((v_sw - v_cw) * (1.0 - day_off::numeric/29)) + random()*1.0 - 0.5, d, d::timestamptz + interval '7 hours')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ── PROGRESS LOGS (body comp clients, every 5 days) ────────
  IF v_cat = 'body_composition' THEN
    FOR day_off IN 0..29 LOOP
      IF day_off % 5 = 0 THEN
        d := v_today - day_off;
        INSERT INTO public.progress_logs (user_id, goal_id, logged_at, body_fat, smm, created_at)
        VALUES (v_cid, v_gid, d,
          20 + floor(random()*8)::int - (3.0*(1.0-day_off::numeric/29)) + random()*0.3,
          62 + floor(random()*10)::int + (2.0*(1.0-day_off::numeric/29)) + random()*0.3,
          d::timestamptz + interval '7 hours')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ── JOURNAL ENTRIES ────────────────────────────────────────
  -- Thriving: 8-10 entries, On Track: 5-7, Struggling: 2-4, Critical: 0-2
  IF i <= 15 THEN
    FOR day_off IN 0..8 LOOP d := v_today - (day_off * 3);
      INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
      VALUES (v_cid, d, 7 + random()*1.5, true, true, random()<0.9, false, true,
        1 + floor(random()*3)::int, 7 + floor(random()*3)::int,
        (ARRAY['Feeling strong.','Great day.','Hit all targets.','Momentum building.','Best week yet.','Sleep was perfect.','Coach plan working.','Energy is up.','Love the process.'])[day_off+1],
        d::timestamptz + interval '20 hours')
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF i <= 35 THEN
    FOR day_off IN 0..5 LOOP d := v_today - (day_off * 5);
      INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
      VALUES (v_cid, d, 6 + random()*1.5, random()<0.6, random()<0.7, random()<0.6, random()<0.15, random()<0.7,
        3 + floor(random()*3)::int, 5 + floor(random()*3)::int,
        (ARRAY['Decent day.','Could be better.','Getting back on track.','Missed some targets.','Solid effort.','Working on consistency.'])[day_off+1],
        d::timestamptz + interval '20 hours')
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF i <= 45 THEN
    FOR day_off IN 0..2 LOOP d := v_today - (day_off * 8);
      INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
      VALUES (v_cid, d, 5 + random(), false, random()<0.3, random()<0.4, random()<0.35, random()<0.3,
        6 + floor(random()*3)::int, 2 + floor(random()*3)::int,
        (ARRAY['Struggling.','Stress winning.','Trying to regroup.'])[day_off+1],
        d::timestamptz + interval '22 hours')
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSE
    -- Critical: maybe 1 entry
    IF random() < 0.4 THEN
      d := v_today - floor(random()*15)::int;
      INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
      VALUES (v_cid, d, 4 + random(), false, false, false, random()<0.5, false,
        8 + floor(random()*2)::int, 1 + floor(random()*2)::int,
        'Everything feels impossible.', d::timestamptz + interval '23 hours')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ── ALERT STATES for struggling + critical ─────────────────
  IF i > 35 AND i <= 45 THEN
    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
    VALUES (v_coach, v_cid, 'compliance_drop', 'reviewed', now() - interval '1 day' * (i-35), now() - interval '1 day' * (i-35))
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, updated_at=now();
  END IF;

  IF i > 45 THEN
    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, updated_at)
    VALUES (v_coach, v_cid, 'inactivity_streak', 'new', now())
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, updated_at=now();

    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
    VALUES (v_coach, v_cid, 'compliance_drop', 'reviewed', now() - interval '2 hours', now() - interval '2 hours')
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, updated_at=now();
  END IF;

END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- INTERVENTIONS + FOLLOW-UPS (using known emails)
-- ═══════════════════════════════════════════════════════════════

-- Intervention: Austin Boone (thriving — sleep text)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'high_stress_signal', 'intervention', now()-interval '2 hours', 'message_client', 'Texted about sleep — waiting to hear back', now()-interval '2 hours'
FROM public.users u WHERE u.email='austin.boone@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

-- Intervention: Lisa Chen (goal change)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'stalled_goal_progress', 'intervention', now()-interval '4 hours', 'review_progress', 'Goal change approved — new protein target set', now()-interval '4 hours'
FROM public.users u WHERE u.email='lisa.chen@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

-- Intervention: Marcus Taylor (milestone)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'intervention', now()-interval '6 hours', 'message_client', 'Acknowledged 30-day milestone', now()-interval '6 hours'
FROM public.users u WHERE u.email='marcus.taylor@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

-- Follow-up: Rusty Arnett (overdue)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'intervention', now()-interval '2 days', 'message_client', 'Texted 2 days ago — no response. Escalate to call.', now()+interval '1 hour', now()-interval '2 days'
FROM public.users u WHERE u.email='rusty.arnett@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

-- Follow-up: Austin Boone (today)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'high_stress_signal', 'intervention', now()-interval '12 hours', 'schedule_call', 'Check for reply about sleep text.', now()+interval '6 hours', now()-interval '12 hours'
FROM public.users u WHERE u.email='austin.boone@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

-- Follow-up: Rachel Holt (today)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'stalled_goal_progress', 'reviewed', now()-interval '3 days', 'schedule_call', 'Meeting requested — schedule response needed.', now()+interval '12 hours', now()-interval '3 days'
FROM public.users u WHERE u.email='rachel.holt@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

-- Resolved: David Walsh
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, resolved_at, updated_at)
SELECT v_coach, u.id, 'low_energy_signal', 'resolved', now()-interval '5 days', now()-interval '3 days', now()-interval '3 days'
FROM public.users u WHERE u.email='david.walsh@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, resolved_at=EXCLUDED.resolved_at, updated_at=now();

-- Resolved: Kevin Park
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, resolved_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'resolved', now()-interval '7 days', now(), 'adjust_habit', 'Simplified habit plan — compliance recovered', now()
FROM public.users u WHERE u.email='kevin.park@example.com' AND u.role='client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, resolved_at=EXCLUDED.resolved_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

RAISE NOTICE 'Seed complete: 50 clients, 30 days of task logs, journals, weight logs, progress logs, and alert states.';

END;
$$;

COMMIT;
