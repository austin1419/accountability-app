-- ═══════════════════════════════════════════════════════════════════
-- SEED 30 REALISTIC CLIENTS — Full coaching roster simulation
--
-- Run AFTER reset_clients.sql in Supabase SQL Editor.
-- Coach: austin@irontribefitness.com (must already exist)
--
-- Distribution:
--   Thriving (80-100%):  10 clients
--   Moderate (50-80%):   10 clients (mix of stable, improving, declining)
--   At Risk (30-50%):     5 clients (trending downward)
--   Critical (<30%):      5 clients (gone dark, disengaged)
--
-- Each client gets:
--   • 4 tasks (one per pillar: Activity, Nutrition, Sleep/Recovery, Supplements)
--   • 30 days of task_logs with compliance pattern
--   • Weight logs (weight-goal clients)
--   • Progress logs (body comp / performance clients)
--   • Journal entries (varied frequency)
--   • Alert state rows (for at-risk / critical clients)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  v_coach uuid;
  v_today date := (now() at time zone 'America/Chicago')::date;

  -- Arrays for batch generation
  v_client_id   uuid;
  v_goal_id     uuid;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  d date;
  day_off integer;
  roll double precision;
  i integer;

  -- Client config type
  TYPE_W constant text := 'weight';
  TYPE_B constant text := 'body_composition';
  TYPE_P constant text := 'performance';

BEGIN

-- Resolve coach
SELECT id INTO v_coach FROM public.users
WHERE email = 'austin@irontribefitness.com' AND role = 'coach';
IF v_coach IS NULL THEN
  RAISE EXCEPTION 'Coach not found. Aborting.';
END IF;

-- ═══════════════════════════════════════════════════════════════
-- HELPER: Create one full client with all data
-- ═══════════════════════════════════════════════════════════════

-- We'll inline everything since PL/pgSQL doesn't support local functions.
-- Each client block: INSERT user → goal → tasks → task_logs → weight/progress → journals

-- ─────────────────────────────────────────────────────────────
-- THRIVING CLIENTS (1-10): 80-100% compliance
-- ─────────────────────────────────────────────────────────────

-- Client 1: Austin Boone — thriving 95%, weight loss, 60 days in
v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES (v_client_id, 'austin.boone@example.com', 'Austin Boone', 'client', true, v_coach, now() - interval '60 days');
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight) VALUES (v_goal_id, v_client_id, 'Cut to 185', TYPE_W, v_today + 60, true, 205, 189, 185);
INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES (t1, v_goal_id, 'Morning HIIT session', 'Activity', true), (t2, v_goal_id, 'Hit protein macro', 'Nutrition', true), (t3, v_goal_id, '7+ hrs sleep', 'Sleep/Recovery', true), (t4, v_goal_id, 'Creatine + fish oil', 'Supplements', true);
FOR day_off IN 0..29 LOOP d := v_today - day_off;
  INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES (t1, v_client_id, d, random()<0.96, d::timestamptz+interval '7h'), (t2, v_client_id, d, random()<0.95, d::timestamptz+interval '7h'), (t3, v_client_id, d, random()<0.94, d::timestamptz+interval '7h'), (t4, v_client_id, d, random()<0.97, d::timestamptz+interval '7h');
  IF day_off % 3 = 0 THEN INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at) VALUES (v_client_id, 205 - (16.0*(1.0-day_off::numeric/29)) + random()*0.5, d, d::timestamptz+interval '7h') ON CONFLICT DO NOTHING; END IF;
END LOOP;
FOR i IN 0..9 LOOP d := v_today - (i*3);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at) VALUES (v_client_id, d, 7.5+random(), true, true, true, false, true, 2+floor(random()*2)::int, 8+floor(random()*2)::int, (ARRAY['Feeling incredible. Best month ever.','Hit all targets again today.','14 day streak! Momentum is real.','Sleep has been dialed in.','Weight is dropping consistently.','Coach plan is working perfectly.','Energy through the roof.','Meal prep game is strong.','PR on deadlift today.','Love the routine now.'])[i+1], d::timestamptz+interval '20h') ON CONFLICT DO NOTHING;
END LOOP;

-- Client 2: Marcus Taylor — thriving 92%, body comp, 55 days
v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES (v_client_id, 'marcus.taylor@example.com', 'Marcus Taylor', 'client', true, v_coach, now() - interval '55 days');
INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm) VALUES (v_goal_id, v_client_id, 'Lean bulk phase', TYPE_B, v_today + 90, true, 16.0, 13.5, 12.0, 82, 85, 88);
INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES (t1, v_goal_id, 'Strength training', 'Activity', true), (t2, v_goal_id, 'Calorie surplus hit', 'Nutrition', true), (t3, v_goal_id, 'Recovery stretching', 'Sleep/Recovery', true), (t4, v_goal_id, 'Vitamin D + zinc', 'Supplements', true);
FOR day_off IN 0..29 LOOP d := v_today - day_off;
  INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES (t1, v_client_id, d, random()<0.93, d::timestamptz+interval '6h'), (t2, v_client_id, d, random()<0.91, d::timestamptz+interval '6h'), (t3, v_client_id, d, random()<0.90, d::timestamptz+interval '6h'), (t4, v_client_id, d, random()<0.94, d::timestamptz+interval '6h');
END LOOP;
FOR day_off IN 0..29 LOOP IF day_off % 5 = 0 THEN d := v_today - day_off;
  INSERT INTO public.progress_logs (user_id, goal_id, logged_at, body_fat, smm, created_at) VALUES (v_client_id, v_goal_id, d, 16.0-(2.5*(1.0-day_off::numeric/29))+random()*0.2, 82+(3.0*(1.0-day_off::numeric/29))+random()*0.2, d::timestamptz+interval '7h') ON CONFLICT DO NOTHING;
END IF; END LOOP;
FOR i IN 0..7 LOOP d := v_today - (i*4);
  INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at) VALUES (v_client_id, d, 7+random()*0.5, true, true, true, false, true, 3+floor(random()*2)::int, 7+floor(random()*2)::int, 'Gains are coming. Staying consistent.', d::timestamptz+interval '20h') ON CONFLICT DO NOTHING;
END LOOP;

-- Clients 3-10: Thriving template (varied goals, 85-98% compliance)
FOR i IN 1..8 LOOP
  v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
  t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
  INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES
    (v_client_id,
     (ARRAY['lisa.chen@example.com','david.walsh@example.com','rachel.holt@example.com','kevin.park@example.com','amanda.ross@example.com','tyler.james@example.com','nina.patel@example.com','ben.wright@example.com'])[i],
     (ARRAY['Lisa Chen','David Walsh','Rachel Holt','Kevin Park','Amanda Ross','Tyler James','Nina Patel','Ben Wright'])[i],
     'client', true, v_coach, now() - interval '1 day' * (30 + i*5));

  -- Alternate goal types
  IF i <= 3 THEN
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight) VALUES (v_goal_id, v_client_id, (ARRAY['Lose 15 lbs','Get to 160','Summer shred'])[i], TYPE_W, v_today + 60 + i*10, true, 180+i*5, 175+i*3, 165+i*2);
  ELSIF i <= 6 THEN
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm) VALUES (v_goal_id, v_client_id, (ARRAY['Body recomp','Lean out for summer','Competition prep'])[i-3], TYPE_B, v_today + 90, true, 22+i, 19+i*0.5, 15+i*0.5, 60+i, 63+i, 68+i);
  ELSE
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value) VALUES (v_goal_id, v_client_id, (ARRAY['Squat 315','Run sub-20 5K'])[i-6], TYPE_P, v_today + 120, true, (ARRAY['Squat','5K Time'])[i-6], (ARRAY['lbs','min'])[i-6], (ARRAY['increase','decrease'])[i-6], (ARRAY[225,26])[i-6], (ARRAY[285,22])[i-6], (ARRAY[315,20])[i-6]);
  END IF;

  INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
    (t1, v_goal_id, 'Training session', 'Activity', true),
    (t2, v_goal_id, 'Nutrition compliance', 'Nutrition', true),
    (t3, v_goal_id, 'Sleep protocol', 'Sleep/Recovery', true),
    (t4, v_goal_id, 'Daily supplements', 'Supplements', true);

  roll := 0.85 + random()*0.12; -- 85-97% base compliance
  FOR day_off IN 0..29 LOOP d := v_today - day_off;
    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES
      (t1, v_client_id, d, random()<roll, d::timestamptz+interval '8h'),
      (t2, v_client_id, d, random()<roll, d::timestamptz+interval '8h'),
      (t3, v_client_id, d, random()<(roll-0.05), d::timestamptz+interval '8h'),  -- sleep slightly weaker
      (t4, v_client_id, d, random()<(roll+0.02), d::timestamptz+interval '8h');
  END LOOP;

  -- Weight logs for weight clients
  IF i <= 3 THEN
    FOR day_off IN 0..29 LOOP IF day_off % 3 = 0 THEN d := v_today - day_off;
      INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at) VALUES (v_client_id, (180+i*5) - ((10+i)*(1.0-day_off::numeric/29)) + random()*0.8, d, d::timestamptz+interval '7h') ON CONFLICT DO NOTHING;
    END IF; END LOOP;
  END IF;

  -- Journals (6-8 entries)
  FOR day_off IN 0..6 LOOP d := v_today - (day_off*4);
    INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
    VALUES (v_client_id, d, 6.5+random()*1.5, random()<0.8, random()<0.85, random()<0.8, random()<0.1, true, 2+floor(random()*3)::int, 6+floor(random()*3)::int, 'Good day. Staying on track.', d::timestamptz+interval '20h') ON CONFLICT DO NOTHING;
  END LOOP;
END LOOP;

-- ─────────────────────────────────────────────────────────────
-- MODERATE CLIENTS (11-20): 50-80% compliance, varied patterns
-- ─────────────────────────────────────────────────────────────

FOR i IN 1..10 LOOP
  v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
  t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
  INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES
    (v_client_id,
     (ARRAY['monica.peters@example.com','jake.turner@example.com','sophia.lee@example.com','ryan.garcia@example.com','hannah.cole@example.com','derek.kim@example.com','olivia.brown@example.com','ethan.clark@example.com','mia.johnson@example.com','carlos.rivera@example.com'])[i],
     (ARRAY['Monica Peters','Jake Turner','Sophia Lee','Ryan Garcia','Hannah Cole','Derek Kim','Olivia Brown','Ethan Clark','Mia Johnson','Carlos Rivera'])[i],
     'client', true, v_coach, now() - interval '1 day' * (20 + i*4));

  IF i <= 4 THEN
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight) VALUES (v_goal_id, v_client_id, 'Weight management', TYPE_W, v_today + 90, true, 170+i*8, 168+i*6, 155+i*3);
  ELSIF i <= 7 THEN
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm) VALUES (v_goal_id, v_client_id, 'Body recomp', TYPE_B, v_today + 90, true, 25+i, 23+i*0.7, 18+i*0.5, 55+i*2, 57+i*2, 62+i*2);
  ELSE
    INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value) VALUES (v_goal_id, v_client_id, 'Strength gains', TYPE_P, v_today + 120, true, 'Bench Press', 'lbs', 'increase', 115+i*10, 140+i*8, 185+i*5);
  END IF;

  INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
    (t1, v_goal_id, 'Workout session', 'Activity', true),
    (t2, v_goal_id, 'Meal plan compliance', 'Nutrition', true),
    (t3, v_goal_id, 'Bedtime routine', 'Sleep/Recovery', true),
    (t4, v_goal_id, 'Supplement stack', 'Supplements', true);

  FOR day_off IN 0..29 LOOP d := v_today - day_off;
    -- Pattern varies per client:
    -- i=1-3: stable moderate (60-75%)
    -- i=4-6: improving (45% → 75%)
    -- i=7-8: declining (75% → 50%)
    -- i=9-10: inconsistent (alternating good/bad weeks)
    IF i <= 3 THEN
      roll := 0.60 + random()*0.15;
    ELSIF i <= 6 THEN
      roll := 0.45 + (0.30 * (1.0 - day_off::double precision / 29.0));
    ELSIF i <= 8 THEN
      roll := 0.75 - (0.25 * (1.0 - day_off::double precision / 29.0));
    ELSE
      roll := CASE WHEN (day_off / 7) % 2 = 0 THEN 0.80 ELSE 0.35 END;
    END IF;

    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES
      (t1, v_client_id, d, random()<roll, d::timestamptz+interval '9h'),
      (t2, v_client_id, d, random()<(roll-0.05), d::timestamptz+interval '9h'),  -- nutrition weaker
      (t3, v_client_id, d, random()<(roll-0.15), d::timestamptz+interval '9h'),  -- sleep much weaker
      (t4, v_client_id, d, random()<(roll+0.05), d::timestamptz+interval '9h');
  END LOOP;

  -- Weight logs for weight clients
  IF i <= 4 THEN
    FOR day_off IN 0..29 LOOP IF day_off % 4 = 0 THEN d := v_today - day_off;
      INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at) VALUES (v_client_id, (170+i*8) - (5*(1.0-day_off::numeric/29)) + random()*2 - 1, d, d::timestamptz+interval '7h') ON CONFLICT DO NOTHING;
    END IF; END LOOP;
  END IF;

  -- Journals: moderate clients have sporadic entries (4-6)
  FOR day_off IN 0..4 LOOP d := v_today - (day_off*5 + floor(random()*2)::int);
    INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
    VALUES (v_client_id, d, 5.5+random()*2, random()<0.5, random()<0.5, random()<0.6, random()<0.25, random()<0.6,
      4+floor(random()*4)::int, 4+floor(random()*4)::int,
      (ARRAY['Decent day, could be better.','Missed some targets but trying.','Work stress affecting everything.','Getting back on track.','Inconsistent week.'])[day_off+1],
      d::timestamptz+interval '21h') ON CONFLICT DO NOTHING;
  END LOOP;
END LOOP;

-- ─────────────────────────────────────────────────────────────
-- AT RISK CLIENTS (21-25): 30-50%, trending down
-- ─────────────────────────────────────────────────────────────

FOR i IN 1..5 LOOP
  v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
  t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
  INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES
    (v_client_id,
     (ARRAY['sarah.kim@example.com','brandon.lee@example.com','jessica.ward@example.com','tony.martinez@example.com','ashley.thompson@example.com'])[i],
     (ARRAY['Sarah Kim','Brandon Lee','Jessica Ward','Tony Martinez','Ashley Thompson'])[i],
     'client', true, v_coach, now() - interval '1 day' * (25 + i*5));

  INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight) VALUES (v_goal_id, v_client_id, 'Weight loss goal', TYPE_W, v_today + 60, true, 190+i*10, 188+i*9, 165+i*5);

  INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
    (t1, v_goal_id, 'Cardio session', 'Activity', true),
    (t2, v_goal_id, 'Track calories', 'Nutrition', true),
    (t3, v_goal_id, 'No screens after 10pm', 'Sleep/Recovery', true),
    (t4, v_goal_id, 'Fiber supplement', 'Supplements', true);

  FOR day_off IN 0..29 LOOP d := v_today - day_off;
    -- Declining pattern: was 60-70% → now 25-40%
    roll := 0.65 - (0.35 * (1.0 - day_off::double precision / 29.0));
    -- Weekend drops
    IF extract(dow FROM d) IN (0, 6) THEN roll := roll - 0.15; END IF;

    INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES
      (t1, v_client_id, d, random()<roll, d::timestamptz+interval '10h'),
      (t2, v_client_id, d, random()<(roll-0.10), d::timestamptz+interval '10h'),
      (t3, v_client_id, d, random()<(roll-0.20), d::timestamptz+interval '10h'),  -- sleep terrible
      (t4, v_client_id, d, random()<(roll+0.05), d::timestamptz+interval '10h');
  END LOOP;

  -- Stalled weight
  FOR day_off IN 0..29 LOOP IF day_off % 4 = 0 THEN d := v_today - day_off;
    INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at) VALUES (v_client_id, (188+i*9) + random()*3 - 1.5, d, d::timestamptz+interval '8h') ON CONFLICT DO NOTHING;
  END IF; END LOOP;

  -- Sporadic journals with stress
  FOR day_off IN 0..3 LOOP d := v_today - (day_off*7);
    INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
    VALUES (v_client_id, d, 4.5+random()*1.5, false, random()<0.3, random()<0.4, random()<0.4, random()<0.3,
      6+floor(random()*3)::int, 2+floor(random()*3)::int,
      (ARRAY['Struggling to stay on plan.','Stress is winning right now.','Missed everything this week.','Trying to get back on track.'])[day_off+1],
      d::timestamptz+interval '22h') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Alert states for at-risk clients
  INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
  VALUES (v_coach, v_client_id, 'compliance_drop', 'reviewed', now() - interval '2 days', now() - interval '2 days')
  ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, updated_at=now();
END LOOP;

-- ─────────────────────────────────────────────────────────────
-- CRITICAL CLIENTS (26-30): <30%, gone dark / disengaged
-- ─────────────────────────────────────────────────────────────

FOR i IN 1..5 LOOP
  v_client_id := gen_random_uuid(); v_goal_id := gen_random_uuid();
  t1 := gen_random_uuid(); t2 := gen_random_uuid(); t3 := gen_random_uuid(); t4 := gen_random_uuid();
  INSERT INTO public.users (id, email, name, role, is_active, coach_id, created_at) VALUES
    (v_client_id,
     (ARRAY['james.moore@example.com','rusty.arnett@example.com','moriah.boone@example.com','dustin.fields@example.com','kelly.nguyen@example.com'])[i],
     (ARRAY['James Moore','Rusty Arnett','Moriah Boone','Dustin Fields','Kelly Nguyen'])[i],
     'client', true, v_coach, now() - interval '1 day' * (CASE WHEN i <= 2 THEN 45 + i*10 ELSE 5 + i END));  -- Some long-term, some new

  INSERT INTO public.goals (id, user_id, goal_name, goal_category, goal_date, is_active, start_weight, current_weight, goal_weight) VALUES (v_goal_id, v_client_id, (ARRAY['Fat loss program','Body recomp','Weight loss kickstart','Get healthy','Lose 30 lbs'])[i], TYPE_W, v_today + 90, true, 200+i*10, 199+i*9, 170+i*5);

  INSERT INTO public.tasks (id, goal_id, task_name, category, is_active) VALUES
    (t1, v_goal_id, '30 min walk', 'Activity', true),
    (t2, v_goal_id, 'No fast food', 'Nutrition', true),
    (t3, v_goal_id, 'Bedtime by 11pm', 'Sleep/Recovery', true),
    (t4, v_goal_id, 'Daily multivitamin', 'Supplements', true);

  FOR day_off IN 0..29 LOOP d := v_today - day_off;
    -- Critical patterns:
    -- i=1: gone dark (0% last 8 days, was 40% before)
    -- i=2: gone dark (0% last 5 days, was 50% before)
    -- i=3: brand new (day 1, zero logs)
    -- i=4: barely engaging (10-15%)
    -- i=5: sporadic (0% most days, random 100% days)
    IF i = 1 THEN
      roll := CASE WHEN day_off < 8 THEN 0.0 ELSE 0.40 END;
    ELSIF i = 2 THEN
      roll := CASE WHEN day_off < 5 THEN 0.0 ELSE 0.50 END;
    ELSIF i = 3 THEN
      roll := CASE WHEN day_off < 1 THEN 0.0 ELSE 0.0 END;  -- brand new, no data
    ELSIF i = 4 THEN
      roll := 0.12;
    ELSE
      roll := CASE WHEN day_off % 7 = 0 THEN 0.90 ELSE 0.05 END;
    END IF;

    IF i != 3 OR day_off > 0 THEN  -- skip logs for brand-new client
      INSERT INTO public.task_logs (task_id, user_id, date, completed, created_at) VALUES
        (t1, v_client_id, d, random()<roll, d::timestamptz+interval '14h'),
        (t2, v_client_id, d, random()<roll, d::timestamptz+interval '14h'),
        (t3, v_client_id, d, random()<(roll*0.5), d::timestamptz+interval '14h'),
        (t4, v_client_id, d, random()<roll, d::timestamptz+interval '14h');
    END IF;
  END LOOP;

  -- Minimal weight logs
  IF i <= 2 THEN
    FOR day_off IN 0..29 LOOP IF day_off % 7 = 0 AND day_off > 7 THEN d := v_today - day_off;
      INSERT INTO public.weight_logs (user_id, weight, logged_at, created_at) VALUES (v_client_id, (199+i*9) + random()*2, d, d::timestamptz+interval '9h') ON CONFLICT DO NOTHING;
    END IF; END LOOP;
  END IF;

  -- Very few journals (1-2)
  IF i <= 2 THEN
    d := v_today - (7 + i*3);
    INSERT INTO public.daily_journal (user_id, date, sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, stress_level, energy_level, notes, created_at)
    VALUES (v_client_id, d, 4+random(), false, false, random()<0.2, random()<0.5, false,
      8+floor(random()*2)::int, 1+floor(random()*2)::int,
      (ARRAY['I don''t know if I can do this anymore.','Everything feels impossible right now.'])[i],
      d::timestamptz+interval '23h') ON CONFLICT DO NOTHING;
  END IF;

  -- Alert states
  IF i <= 2 THEN
    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, updated_at)
    VALUES (v_coach, v_client_id, 'inactivity_streak', 'new', now())
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, updated_at=now();
    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, updated_at)
    VALUES (v_coach, v_client_id, 'compliance_drop', 'reviewed', now() - interval '3 hours', now() - interval '3 hours')
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, updated_at=now();
  END IF;
  IF i = 3 THEN -- new member alert
    INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, updated_at)
    VALUES (v_coach, v_client_id, 'journal_gap', 'new', now())
    ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, updated_at=now();
  END IF;
END LOOP;

-- ═══════════════════════════════════════════════════════════════
-- INTERVENTION HISTORY (spread across roster)
-- ═══════════════════════════════════════════════════════════════

-- Get some client IDs for interventions
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'high_stress_signal', 'intervention', now() - interval '1 day', 'message_client',
  'Texted about sleep — waiting to hear back', now() - interval '1 day'
FROM public.users u WHERE u.email = 'austin.boone@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'stalled_goal_progress', 'intervention', now() - interval '4 hours', 'review_progress',
  'Goal change approved — new protein target set', now() - interval '4 hours'
FROM public.users u WHERE u.email = 'lisa.chen@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'intervention', now() - interval '6 hours', 'message_client',
  'Coach note added — acknowledged 30-day milestone', now() - interval '6 hours'
FROM public.users u WHERE u.email = 'marcus.taylor@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

-- Follow-up records
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'intervention', now() - interval '2 days', 'message_client',
  'Texted 2 days ago — no response. Escalate to call.', now() + interval '1 hour', now() - interval '2 days'
FROM public.users u WHERE u.email = 'rusty.arnett@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'high_stress_signal', 'intervention', now() - interval '12 hours', 'schedule_call',
  'Texted about sleep last night — check for reply today.', now() + interval '6 hours', now() - interval '12 hours'
FROM public.users u WHERE u.email = 'austin.boone@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, intervention_type, intervention_note, follow_up_date, updated_at)
SELECT v_coach, u.id, 'stalled_goal_progress', 'reviewed', now() - interval '3 days', 'schedule_call',
  'Meeting requested Mar 13 — schedule response needed.', now() + interval '12 hours', now() - interval '3 days'
FROM public.users u WHERE u.email = 'rachel.holt@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, follow_up_date=EXCLUDED.follow_up_date, updated_at=now();

-- Resolved alerts
INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, resolved_at, updated_at)
SELECT v_coach, u.id, 'low_energy_signal', 'resolved', now() - interval '5 days', now() - interval '3 days', now() - interval '3 days'
FROM public.users u WHERE u.email = 'david.walsh@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, resolved_at=EXCLUDED.resolved_at, updated_at=now();

INSERT INTO public.coach_alert_state (coach_id, client_id, alert_type, status, reviewed_at, resolved_at, intervention_type, intervention_note, updated_at)
SELECT v_coach, u.id, 'compliance_drop', 'resolved', now() - interval '7 days', now(), 'adjust_habit',
  'Simplified habit plan — compliance recovered', now()
FROM public.users u WHERE u.email = 'kevin.park@example.com' AND u.role = 'client'
ON CONFLICT (coach_id, client_id, alert_type) DO UPDATE SET status=EXCLUDED.status, reviewed_at=EXCLUDED.reviewed_at, resolved_at=EXCLUDED.resolved_at, intervention_type=EXCLUDED.intervention_type, intervention_note=EXCLUDED.intervention_note, updated_at=now();

RAISE NOTICE 'Seed complete: 30 clients with 30 days of behavioral data, journals, metrics, alerts, and interventions.';

END;
$$;

COMMIT;
