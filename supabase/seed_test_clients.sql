-- ═══════════════════════════════════════════════════════════════════
-- SEED TEST CLIENTS — 7 realistic clients with 30 days of activity
--
-- Run AFTER reset_clients.sql in Supabase SQL Editor.
--
-- Coach: austin@irontribefitness.com (must already exist)
--
-- Clients seeded:
--   1. Sarah Johnson  — Weight loss, thriving (90-100%)
--   2. Mark Carter    — Body comp, thriving (85-95%)
--   3. Emily Davis    — Performance, stable (70-85%)
--   4. Chris Walker   — Weight loss, IMPROVING (40% → 85%)
--   5. Natalie Brooks — Body comp, inconsistent (40-90% swings)
--   6. Daniel Reed    — Performance, at risk (35-55%)
--   7. Laura Mitchell — Weight loss, critical (10-25%)
--
-- Improving clients (Chris, Emily) will trigger "Most Improved" analytics.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Resolve coach ID ─────────────────────────────────────────────
DO $$
DECLARE
  v_coach_id uuid;
  v_today    date := (now() at time zone 'America/Chicago')::date;

  -- Client IDs
  v_sarah   uuid := gen_random_uuid();
  v_mark    uuid := gen_random_uuid();
  v_emily   uuid := gen_random_uuid();
  v_chris   uuid := gen_random_uuid();
  v_natalie uuid := gen_random_uuid();
  v_daniel  uuid := gen_random_uuid();
  v_laura   uuid := gen_random_uuid();

  -- Goal IDs
  g_sarah   uuid := gen_random_uuid();
  g_mark    uuid := gen_random_uuid();
  g_emily   uuid := gen_random_uuid();
  g_chris   uuid := gen_random_uuid();
  g_natalie uuid := gen_random_uuid();
  g_daniel  uuid := gen_random_uuid();
  g_laura   uuid := gen_random_uuid();

  -- Task IDs (4 per client = 28 total)
  t uuid;
  d date;
  i integer;
  day_offset integer;
  compliance_roll double precision;

  -- Task ID arrays
  t_sarah_1 uuid := gen_random_uuid(); t_sarah_2 uuid := gen_random_uuid();
  t_sarah_3 uuid := gen_random_uuid(); t_sarah_4 uuid := gen_random_uuid();

  t_mark_1 uuid := gen_random_uuid(); t_mark_2 uuid := gen_random_uuid();
  t_mark_3 uuid := gen_random_uuid(); t_mark_4 uuid := gen_random_uuid();

  t_emily_1 uuid := gen_random_uuid(); t_emily_2 uuid := gen_random_uuid();
  t_emily_3 uuid := gen_random_uuid(); t_emily_4 uuid := gen_random_uuid();

  t_chris_1 uuid := gen_random_uuid(); t_chris_2 uuid := gen_random_uuid();
  t_chris_3 uuid := gen_random_uuid(); t_chris_4 uuid := gen_random_uuid();

  t_natalie_1 uuid := gen_random_uuid(); t_natalie_2 uuid := gen_random_uuid();
  t_natalie_3 uuid := gen_random_uuid(); t_natalie_4 uuid := gen_random_uuid();

  t_daniel_1 uuid := gen_random_uuid(); t_daniel_2 uuid := gen_random_uuid();
  t_daniel_3 uuid := gen_random_uuid(); t_daniel_4 uuid := gen_random_uuid();

  t_laura_1 uuid := gen_random_uuid(); t_laura_2 uuid := gen_random_uuid();
  t_laura_3 uuid := gen_random_uuid(); t_laura_4 uuid := gen_random_uuid();

BEGIN

-- Get coach
SELECT id INTO v_coach_id FROM public.users
WHERE email = 'austin@irontribefitness.com' AND role = 'coach';

IF v_coach_id IS NULL THEN
  RAISE EXCEPTION 'Coach austin@irontribefitness.com not found. Aborting seed.';
END IF;

-- ═══════════════════════════════════════════════════════════════
-- INSERT CLIENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES
  (v_sarah,   'sarah.johnson@example.com',  'Sarah Johnson',   'client', true, v_coach_id, now() - interval '90 days'),
  (v_mark,    'mark.carter@example.com',    'Mark Carter',     'client', true, v_coach_id, now() - interval '75 days'),
  (v_emily,   'emily.davis@example.com',    'Emily Davis',     'client', true, v_coach_id, now() - interval '60 days'),
  (v_chris,   'chris.walker@example.com',   'Chris Walker',    'client', true, v_coach_id, now() - interval '45 days'),
  (v_natalie, 'natalie.brooks@example.com', 'Natalie Brooks',  'client', true, v_coach_id, now() - interval '50 days'),
  (v_daniel,  'daniel.reed@example.com',    'Daniel Reed',     'client', true, v_coach_id, now() - interval '40 days'),
  (v_laura,   'laura.mitchell@example.com', 'Laura Mitchell',  'client', true, v_coach_id, now() - interval '35 days');

-- ═══════════════════════════════════════════════════════════════
-- INSERT GOALS
-- ═══════════════════════════════════════════════════════════════

-- Sarah: Weight loss
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight, target_days_per_week)
VALUES (g_sarah, v_sarah, 'Lose 20 lbs for Summer', 'weight', v_today + 60, true, 165.0, 152.0, 145.0, 7);

-- Mark: Body composition
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, target_days_per_week)
VALUES (g_mark, v_mark, 'Lean Out for Competition', 'body_composition', v_today + 45, true, 18.5, 14.2, 12.0, 78.0, 81.5, 84.0, 7);

-- Emily: Performance
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value, target_days_per_week)
VALUES (g_emily, v_emily, 'Hit 200 lb Bench Press', 'performance', v_today + 90, true, 'Bench Press', 'lbs', 'increase', 135.0, 175.0, 200.0, 6);

-- Chris: Weight loss (improving)
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight, target_days_per_week)
VALUES (g_chris, v_chris, 'Drop to 185 lbs', 'weight', v_today + 30, true, 210.0, 195.0, 185.0, 7);

-- Natalie: Body composition (inconsistent)
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, target_days_per_week)
VALUES (g_natalie, v_natalie, 'Recomp Phase', 'body_composition', v_today + 75, true, 28.0, 25.5, 22.0, 55.0, 57.0, 60.0, 6);

-- Daniel: Performance (at risk)
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value, target_days_per_week)
VALUES (g_daniel, v_daniel, '5K Under 22 Minutes', 'performance', v_today + 60, true, '5K Time', 'min', 'decrease', 28.0, 26.5, 22.0, 5);

-- Laura: Weight loss (critical)
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight, target_days_per_week)
VALUES (g_laura, v_laura, 'Get to 140 lbs', 'weight', v_today + 90, true, 175.0, 173.0, 140.0, 7);

-- ═══════════════════════════════════════════════════════════════
-- INSERT TASKS (4 per client, one per pillar)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
  -- Sarah (thriving)
  (t_sarah_1, g_sarah, '30 min morning walk',      'Activity',       true),
  (t_sarah_2, g_sarah, 'Hit protein target',        'Nutrition',      true),
  (t_sarah_3, g_sarah, '7+ hours sleep',            'Sleep/Recovery', true),
  (t_sarah_4, g_sarah, 'Take daily supplements',    'Supplements',    true),
  -- Mark (thriving)
  (t_mark_1, g_mark, 'Strength training session',   'Activity',       true),
  (t_mark_2, g_mark, 'Meal prep compliance',        'Nutrition',      true),
  (t_mark_3, g_mark, 'Recovery stretching',          'Sleep/Recovery', true),
  (t_mark_4, g_mark, 'Creatine + vitamins',          'Supplements',    true),
  -- Emily (stable)
  (t_emily_1, g_emily, 'Bench press workout',        'Activity',       true),
  (t_emily_2, g_emily, 'High protein meals',          'Nutrition',      true),
  (t_emily_3, g_emily, '8 hours sleep target',        'Sleep/Recovery', true),
  (t_emily_4, g_emily, 'Pre-workout + protein shake', 'Supplements',    true),
  -- Chris (declining)
  (t_chris_1, g_chris, '45 min cardio session',      'Activity',       true),
  (t_chris_2, g_chris, 'Track calories under 2000',  'Nutrition',      true),
  (t_chris_3, g_chris, 'No screens after 10pm',       'Sleep/Recovery', true),
  (t_chris_4, g_chris, 'Fiber supplement',             'Supplements',    true),
  -- Natalie (inconsistent)
  (t_natalie_1, g_natalie, 'Weight training session', 'Activity',       true),
  (t_natalie_2, g_natalie, 'Balanced macros',          'Nutrition',      true),
  (t_natalie_3, g_natalie, 'Foam rolling 15 min',      'Sleep/Recovery', true),
  (t_natalie_4, g_natalie, 'Omega-3 + multivitamin',   'Supplements',    true),
  -- Daniel (at risk)
  (t_daniel_1, g_daniel, 'Running session',            'Activity',       true),
  (t_daniel_2, g_daniel, 'Hydration 100oz',             'Nutrition',      true),
  (t_daniel_3, g_daniel, 'Zone 2 recovery walk',        'Sleep/Recovery', true),
  (t_daniel_4, g_daniel, 'Electrolyte supplement',       'Supplements',    true),
  -- Laura (critical)
  (t_laura_1, g_laura, '20 min walk',                  'Activity',       true),
  (t_laura_2, g_laura, 'No fast food',                  'Nutrition',      true),
  (t_laura_3, g_laura, 'Bedtime by 11pm',               'Sleep/Recovery', true),
  (t_laura_4, g_laura, 'Daily multivitamin',             'Supplements',    true);

-- ═══════════════════════════════════════════════════════════════
-- GENERATE 30 DAYS OF TASK LOGS
-- ═══════════════════════════════════════════════════════════════

-- Helper: For each client × task × day, insert a task_log with
-- compliance probability based on the client's profile.

-- SARAH (thriving 90-100%)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  FOREACH t IN ARRAY ARRAY[t_sarah_1, t_sarah_2, t_sarah_3, t_sarah_4] LOOP
    compliance_roll := random();
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_sarah, d, compliance_roll < 0.95, d::timestamptz + interval '8 hours');
  END LOOP;
END LOOP;

-- MARK (thriving 85-95%)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  FOREACH t IN ARRAY ARRAY[t_mark_1, t_mark_2, t_mark_3, t_mark_4] LOOP
    compliance_roll := random();
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_mark, d, compliance_roll < 0.90, d::timestamptz + interval '7 hours');
  END LOOP;
END LOOP;

-- EMILY (IMPROVING: 50% week1 → 65% week2 → 80% week3 → 90% week4)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  compliance_roll := 0.50 + (0.40 * (1.0 - day_offset::double precision / 29.0));
  FOREACH t IN ARRAY ARRAY[t_emily_1, t_emily_2, t_emily_3, t_emily_4] LOOP
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_emily, d, random() < compliance_roll, d::timestamptz + interval '9 hours');
  END LOOP;
END LOOP;

-- CHRIS (IMPROVING: 40% week1 → 55% week2 → 70% week3 → 85% week4)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  -- Probability increases as we approach today (inverse of declining)
  compliance_roll := 0.40 + (0.45 * (1.0 - day_offset::double precision / 29.0));
  FOREACH t IN ARRAY ARRAY[t_chris_1, t_chris_2, t_chris_3, t_chris_4] LOOP
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_chris, d, random() < compliance_roll, d::timestamptz + interval '10 hours');
  END LOOP;
END LOOP;

-- NATALIE (inconsistent: alternating 90% and 40% weeks)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  -- Alternate good/bad weeks
  IF (day_offset / 7) % 2 = 0 THEN
    compliance_roll := 0.90;
  ELSE
    compliance_roll := 0.40;
  END IF;
  FOREACH t IN ARRAY ARRAY[t_natalie_1, t_natalie_2, t_natalie_3, t_natalie_4] LOOP
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_natalie, d, random() < compliance_roll, d::timestamptz + interval '11 hours');
  END LOOP;
END LOOP;

-- DANIEL (at risk: 35-55%, worse on weekends)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  IF extract(dow FROM d) IN (0, 6) THEN
    compliance_roll := 0.25;
  ELSE
    compliance_roll := 0.50;
  END IF;
  FOREACH t IN ARRAY ARRAY[t_daniel_1, t_daniel_2, t_daniel_3, t_daniel_4] LOOP
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_daniel, d, random() < compliance_roll, d::timestamptz + interval '12 hours');
  END LOOP;
END LOOP;

-- LAURA (critical: 10-25%, many gaps, last activity 5+ days ago)
FOR day_offset IN 0..29 LOOP
  d := v_today - day_offset;
  IF day_offset < 5 THEN
    compliance_roll := 0.0;  -- no activity last 5 days (gone dark trigger)
  ELSE
    compliance_roll := 0.18;
  END IF;
  FOREACH t IN ARRAY ARRAY[t_laura_1, t_laura_2, t_laura_3, t_laura_4] LOOP
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at)
    VALUES (t, v_laura, d, random() < compliance_roll, d::timestamptz + interval '14 hours');
  END LOOP;
END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- WEIGHT LOGS (for weight-goal clients)
-- ═══════════════════════════════════════════════════════════════

-- Sarah: steady loss from 165 → 152 over 30 days
FOR day_offset IN 0..29 LOOP
  IF day_offset % 3 = 0 THEN  -- log every 3 days
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_sarah, 165.0 - (13.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.5 - 0.25), d, d::timestamptz + interval '7 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Chris: improving (210 → 195 over 30 days)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 3 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_chris, 210.0 - (15.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.8 - 0.4), d, d::timestamptz + interval '8 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Emily: stable around 150-151 (performance goal, weight not primary)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 4 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_emily, 150.0 + (random() * 1.5 - 0.75), d, d::timestamptz + interval '8 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Natalie: fluctuating 155-159 (body comp recomp)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 3 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_natalie, 157.0 + (random() * 4.0 - 2.0), d, d::timestamptz + interval '9 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Daniel: slowly gaining (runner, adding muscle slowly) 165-168
FOR day_offset IN 0..29 LOOP
  IF day_offset % 5 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_daniel, 165.0 + (3.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.5), d, d::timestamptz + interval '10 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Mark: cutting weight (185 → 178 for competition)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 3 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_mark, 185.0 - (7.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.5 - 0.25), d, d::timestamptz + interval '7 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Laura: barely any change (173-175)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 5 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at)
    VALUES (v_laura, 173.0 + (random() * 2.0), d, d::timestamptz + interval '9 hours')
    ON CONFLICT (user_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- PROGRESS LOGS (body comp + performance clients)
-- ═══════════════════════════════════════════════════════════════

-- Mark: body fat decreasing, SMM increasing (every 5 days)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 5 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.progress_logs (user_id, goal_id, logged_at, body_fat, smm, created_at)
    VALUES (v_mark, g_mark,
      d,
      18.5 - (4.3 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.3),
      78.0 + (3.5 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.3),
      d::timestamptz + interval '7 hours')
    ON CONFLICT (user_id, goal_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Emily: bench press increasing (every 7 days)
FOR day_offset IN 0..29 LOOP
  IF day_offset % 7 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.progress_logs (user_id, goal_id, logged_at, performance_value, created_at)
    VALUES (v_emily, g_emily,
      d,
      135.0 + (40.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 2.0),
      d::timestamptz + interval '10 hours')
    ON CONFLICT (user_id, goal_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Natalie: body fat slowly decreasing, SMM slowly increasing
FOR day_offset IN 0..29 LOOP
  IF day_offset % 7 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.progress_logs (user_id, goal_id, logged_at, body_fat, smm, created_at)
    VALUES (v_natalie, g_natalie,
      d,
      28.0 - (2.5 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.5),
      55.0 + (2.0 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.3),
      d::timestamptz + interval '11 hours')
    ON CONFLICT (user_id, goal_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- Daniel: 5K time barely improving
FOR day_offset IN 0..29 LOOP
  IF day_offset % 7 = 0 THEN
    d := v_today - day_offset;
    INSERT INTO public.progress_logs (user_id, goal_id, logged_at, performance_value, created_at)
    VALUES (v_daniel, g_daniel,
      d,
      28.0 - (1.5 * (1.0 - day_offset::numeric / 29.0)) + (random() * 0.5),
      d::timestamptz + interval '12 hours')
    ON CONFLICT (user_id, goal_id, logged_at) DO NOTHING;
  END IF;
END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- DAILY JOURNAL ENTRIES (10 per client, varied content)
-- ═══════════════════════════════════════════════════════════════

-- Sarah: positive, low stress, high energy
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_sarah, d, 7.5 + (random()), true, true, true, false, true, (random() < 0.5), true, true,
    2 + floor(random() * 2)::int,
    8 + floor(random() * 2)::int,
    (ARRAY['Feeling great, momentum building!', 'Solid day. Hit all my marks.', 'Morning walk was refreshing. Energy is up.', 'Love the routine now. Feels natural.', 'Down another pound this week!', 'Sleep was incredible last night.', 'Meal prep on point this week.', 'Feeling strong and motivated.', 'Recovery day was exactly what I needed.', 'Excited to see progress on the scale.'])[i + 1],
    d::timestamptz + interval '20 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Mark: focused, moderate stress from competition prep
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_mark, d, 7.0 + (random() * 0.5), true, true, true, false, true, false, true, true,
    4 + floor(random() * 2)::int,
    7 + floor(random() * 2)::int,
    (ARRAY['Comp prep is intense but I love it.', 'Hit a new PR on deadlift today.', 'Meal prep getting easier each week.', 'Body fat check was encouraging.', 'Need to focus on recovery more.', 'Feeling the cut but staying disciplined.', 'Coach feedback was really helpful.', 'Posing practice went well.', 'Hydration has been on point.', 'Excited about where my physique is heading.'])[i + 1],
    d::timestamptz + interval '19 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Emily: steady, focused on lifting
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_emily, d, 7.0 + (random()), (random() < 0.7), true, (random() < 0.8), (random() < 0.15), true, false, (random() < 0.6), true,
    3 + floor(random() * 3)::int,
    6 + floor(random() * 3)::int,
    (ARRAY['Bench felt heavy today but pushed through.', 'Good training session. Progressing slowly.', 'Ate a bit off plan but back on tomorrow.', 'Sleep was rough. Work stress.', 'Feeling strong on the bench.', 'Recovery day. Stretching helped.', 'Hit 170 on bench! Getting close.', 'Nutrition was solid this week.', 'Energy dipping mid-afternoon.', 'Weekend training was productive.'])[i + 1],
    d::timestamptz + interval '21 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Chris: improving motivation (recent entries more positive)
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_chris, d, 5.5 + (random() * 1.5), (i < 5), (i < 6), (i < 5), (i > 6), (i < 7), false, (i < 4), (i < 5),
    CASE WHEN i < 3 THEN 3 + floor(random() * 2)::int ELSE 6 + floor(random() * 2)::int END,
    CASE WHEN i < 3 THEN 7 + floor(random() * 2)::int ELSE 3 + floor(random() * 2)::int END,
    (ARRAY['Crushed my workout today! Feeling the momentum.', 'Hit all my targets. Coach plan is working.', 'Best week in a month. Energy is coming back.', 'Getting into a rhythm finally.', 'Simplified plan is helping. Less overwhelm.', 'Had a rough day but still got my walk in.', 'Work stress is high but trying to push through.', 'Missed my cardio session. Need to regroup.', 'Feeling unmotivated. Job is stressful.', 'Starting to think about giving up.'])[i + 1],
    d::timestamptz + interval '22 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Natalie: emotional swings, inconsistent
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_natalie, d, 6.0 + (random() * 2), (random() < 0.5), (random() < 0.6), (random() < 0.5), (random() < 0.3), (random() < 0.7), (random() < 0.3), (random() < 0.4), (random() < 0.6),
    3 + floor(random() * 5)::int,
    4 + floor(random() * 5)::int,
    (ARRAY['Great week! Hit everything.', 'Totally fell off this week. Social events.', 'Back at it. Feeling motivated again.', 'Struggled with nutrition. Emotional eating.', 'Crushed my workout today!', 'Missed 3 days. Traveling for work.', 'On fire this week. Everything clicking.', 'Stress eating hit hard.', 'Got back in the gym. Felt good.', 'Inconsistency is frustrating me.'])[i + 1],
    d::timestamptz + interval '20 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Daniel: low energy, struggling
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_daniel, d, 5.0 + (random()), (random() < 0.3), (random() < 0.3), (random() < 0.4), (random() < 0.2), (random() < 0.4), (random() < 0.2), false, (random() < 0.3),
    7 + floor(random() * 2)::int,
    2 + floor(random() * 3)::int,
    (ARRAY['Legs feel heavy. Skipped the run.', 'Barely ate today. No appetite.', 'Tried to run but quit after 10 min.', 'Stress from family stuff affecting everything.', 'Didn''t sleep well at all.', 'Forced myself to walk. It''s something.', 'Feeling burned out.', 'Hydration has been terrible.', 'Maybe I need to adjust my goal.', 'Low motivation day.'])[i + 1],
    d::timestamptz + interval '22 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- Laura: minimal engagement, some despair
FOR i IN 0..9 LOOP
  d := v_today - (i * 3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level, notes, created_at)
  VALUES (v_laura, d, 4.5 + (random()), false, false, (random() < 0.3), (random() < 0.5), false, false, false, false,
    8 + floor(random() * 2)::int,
    1 + floor(random() * 2)::int,
    (ARRAY['I don''t know if I can do this.', 'Ate fast food again. Feeling guilty.', 'Didn''t do anything today.', 'Scale hasn''t moved. Why bother.', 'Couldn''t get out of bed.', 'Had alcohol last night. Regret it.', 'Tried to walk but it was too hot.', 'Feeling overwhelmed.', 'Skipped everything again.', 'I want to try but I''m stuck.'])[i + 1],
    d::timestamptz + interval '23 hours')
  ON CONFLICT (user_id, date) DO NOTHING;
END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- SEED ALERT STATE ROWS (intervention scenarios)
-- ═══════════════════════════════════════════════════════════════

-- Chris Walker: coach texted about training gap (intervention — waiting on outcome)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
VALUES (v_coach_id, v_chris, 'compliance_drop', 'intervention', now() - interval '2 days', 'message_client', 'Texted Chris about his training gap. He said work has been overwhelming but wants to get back on track. We agreed to simplify his plan for this week.', now() - interval '2 days');

-- Daniel Reed: recovery conversation scheduled (intervention — follow-up pending)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
VALUES (v_coach_id, v_daniel, 'high_stress_signal', 'intervention', now() - interval '1 day', 'schedule_call', 'Scheduled a recovery conversation for this week. Daniel mentioned family stress. Plan to discuss reducing training volume and focusing on walks + hydration.', now() + interval '2 days', now() - interval '1 day');

-- Laura Mitchell: new critical alert (unactioned)
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, updated_at)
VALUES (v_coach_id, v_laura, 'inactivity_streak', 'new', now());

-- Laura Mitchell: reviewed journal gap alert
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
VALUES (v_coach_id, v_laura, 'journal_gap', 'reviewed', now() - interval '3 hours', now() - interval '3 hours');

-- Daniel Reed: resolved old alert
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, resolved_at, updated_at)
VALUES (v_coach_id, v_daniel, 'low_energy_signal', 'resolved', now() - interval '5 days', now() - interval '3 days', now() - interval '3 days');

-- Natalie Brooks: reviewed alert
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
VALUES (v_coach_id, v_natalie, 'stalled_goal_progress', 'reviewed', now() - interval '1 day', now() - interval '1 day');

RAISE NOTICE 'Seed complete: 7 clients, 30 days of task logs, journals, metric logs, and alert states created.';

END;
$$;

COMMIT;

