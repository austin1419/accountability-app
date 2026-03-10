-- ═══════════════════════════════════════════════════════════════════
-- Migration 002 — Add weight tracking columns to goals
--
-- The dashboard needs start_weight, goal_weight, and current_weight
-- to calculate and display the progress ring.
--
-- Run this AFTER 001_initial_schema.sql.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

alter table public.goals
  -- The weight the client started at when coaching began
  add column start_weight   numeric(5, 1),

  -- The target weight the client is trying to reach
  add column goal_weight    numeric(5, 1),

  -- The client's most recently logged weight
  -- Updated each time they log a new weight entry
  add column current_weight numeric(5, 1);

-- numeric(5, 1) means up to 5 digits total, 1 after the decimal point.
-- Examples: 240.0, 218.5, 190.0
-- Columns are nullable — not every goal has weight data (e.g. non-weight goals later)
