// ─────────────────────────────────────────────
// Deterministic coaching message library.
//
// Each scenario maps to an array of coaching
// messages. The engine selects from these at
// runtime, allowing random rotation so clients
// don't see the same message twice in a row.
//
// Not connected to UI yet — structure only.
// ─────────────────────────────────────────────

import type { CoachingScenario } from "./scenarios";

export const coachingMessages: Record<CoachingScenario, string[]> = {

  training_only_no_nutrition: [
    "You showed up for training today — that matters. But the nutrition side got missed, and that's where a lot of your progress is built. Training without nutrition is like building a house and skipping the foundation. What got in the way of the food today?",
    "Good work getting the training in. But here's the truth — you can't out-train a missed nutrition plan. The gym is the fun part. The kitchen is the hard part. What would it take to get the nutrition locked in tomorrow?",
    "Training is done, which is great. But you're leaving results on the table when nutrition slides. One without the other only gets you halfway there. What's your plan for meals tomorrow?",
    "You did the work in training today. Now I need you to be honest — what happened with nutrition? That's not a guilt trip, it's a real question. The answer usually tells us where the real barrier is. What got in the way?",
    "The effort in training is clear. But the gap between where you are and where you want to be usually comes down to what you eat, not how hard you train. What's one nutrition task you can nail tomorrow without overthinking it?",
  ],

  goal_deadline_approaching: [
    "Your goal deadline is getting close. Not to create pressure, but to create clarity — the time for experimenting is over. It's execution mode now. What's the single most important thing you need to protect every day between now and then?",
    "The timeline on your goal is getting tight. That doesn't mean panic — it means focus. Every day between now and your deadline needs to count. What's the one thing you're most likely to skip that you can't afford to?",
    "We're in the final stretch. This is where discipline either pays off or the deadline passes and you're left wondering what happened. No new plans — just execute the one you have. What does tomorrow look like?",
    "Your deadline is approaching fast. This isn't about being perfect — it's about not wasting days. Every task you complete between now and then is a direct investment in your result. What's your biggest risk between now and the finish line?",
    "The clock is real now. You've put in the work to get here, but the last stretch is where most people lose focus. Stay locked in on the basics. What's one thing you need to stop doing to protect your time?",
  ],

  compliance_recovering: [
    "You're bouncing back from a rough stretch and it shows. Getting back on track is harder than staying on track — and you're doing it. Don't try to be perfect this week. Just be consistent. What made you start showing up again?",
    "Last week was tough, but this week looks different. That turnaround didn't happen by accident — you made a decision. Now the job is to keep making that decision daily. What's the biggest thing that changed?",
    "The comeback is underway. You went from a hard week to actually getting things done again. That takes more effort than people realize. What's the one thing you're doing differently that you want to keep doing?",
    "You're pulling yourself out of a dip and I want you to recognize that. Most people let a bad week turn into a bad month. You didn't. Keep it simple this week — what's your one non-negotiable each day?",
    "I see the recovery happening. After the week you had, showing up again is the hardest part — and you did it. Now don't try to overcompensate. Just match yesterday. What's the first task you're tackling today?",
  ],

  consistency_plateau: [
    "You've been putting in the work and staying consistent. The results might not be showing it right now, but that doesn't mean it's not working. Plateaus break when you stay the course while others quit. Is there one variable — sleep, water, stress — that might need attention?",
    "You're doing the right things. The scale or the mirror might not be rewarding you yet, but consistency is the prerequisite for everything that comes next. Don't change the plan — trust it. What's one thing outside of training and nutrition that might be affecting your progress?",
    "This is the frustrating part — you're checking every box but the needle isn't moving. That's normal. It's also temporary. The worst thing you can do right now is start changing everything. What's one area where you could dial things in just a little tighter?",
    "Consistent effort, flat results. I know that's frustrating. But plateaus aren't punishments — they're thresholds. The people who push through them are the ones who don't flinch. What does your recovery look like right now?",
    "You've been doing the work. The progress will catch up — it always does when consistency is there. Resist the urge to blow up the plan. Instead, let's look at the edges. Are you sleeping enough? Drinking enough water? What's one thing you're overlooking?",
  ],

  scale_spike_reassurance: [
    "The scale jumped. I see it. But your effort hasn't changed — so this isn't about what you did wrong. Water, sodium, sleep, stress — any of those can move the number overnight. Don't let one reading undo a week of good work. What did yesterday actually look like?",
    "Before you react to the scale — take a breath. One reading doesn't tell you anything meaningful. Your consistency has been solid. Bodies fluctuate. What matters is the trend, not the day. How are you feeling aside from the number?",
    "The number went up. I know that's hard to see. But if you've been doing the work — and you have — this isn't a real gain. It's noise. Stay the course and let the data settle over the week. What's your plan for today?",
    "I already know what you're thinking about the scale. Don't spiral on it. One day doesn't override a pattern of consistency. Your job today is the same as yesterday — show up and execute. Has anything changed with your water or sleep lately?",
    "Scale spike. It happens. If your compliance has been solid — and it has — then this is your body doing what bodies do. The worst response is to overreact and cut harder or skip meals. Trust the process. What does the rest of your week look like?",
  ],

  early_streak: [
    "A few days in a row now. It's still early, but this is exactly how momentum starts — quietly, one day at a time. Don't overthink it. What's the first task you're knocking out tomorrow?",
    "You're starting to string some days together. This is the part where most people get comfortable and let off the gas. You're not most people. What's the thing most likely to trip you up this week?",
    "Couple days in a row — I see you building. It doesn't feel like much yet, but habits are formed in stretches exactly like this. What's been making it easier to show up lately?",
    "The streak is young, but it's real. You've proven you can do it one day at a time. Now the only job is to not break the chain. What would make tomorrow a guaranteed win?",
    "You're in that early phase where consistency is still a choice, not a habit yet. That makes these days matter more, not less. Keep it simple. What's one task you're committing to first thing tomorrow?",
  ],

  momentum_reinforcement: [
    "You've been showing up consistently and it's starting to show. This is the part of the process most people never reach because they quit too early. Don't coast — press into it. What's one area you could tighten up this week?",
    "The consistency is real right now. You're past the point where this is just motivation — this is becoming who you are. The opportunity is to push a little harder while things feel good. Where do you feel like you're leaving something on the table?",
    "Strong stretch. You're doing the work and it's compounding. The biggest risk right now isn't failure — it's getting comfortable. What's one thing you haven't been doing that you know would make a difference?",
    "You're in a groove and the numbers back it up. This is earned, not given. Now's the time to challenge yourself a bit — not more tasks, but sharper execution. What's one habit you've been half-doing that deserves full effort?",
    "The momentum you've built didn't happen by accident. You've been consistent and it matters. But momentum is fragile if you stop feeding it. What does your plan look like for the rest of this week?",
  ],

  perfect_day: [
    "Clean sweep today — every single task done. That's not luck, that's discipline showing up. Days like this are what separate people who talk about goals from people who hit them. What made today click for you?",
    "You didn't leave anything on the table today. That's the version of you that wins. The question isn't whether you can do it — you just proved that. So what's going to make tomorrow look the same?",
    "All tasks done. No excuses needed, no asterisks. This is what it looks like when you're locked in. What felt different about today compared to the days you don't finish?",
    "Today was a statement. You showed up and handled everything on your list. Now the challenge is making this feel normal instead of special. What's the one thing you did today that you could repeat tomorrow without thinking?",
    "Nothing left undone — that's a real day of work. Most people don't finish what they start. You did. What would it take to stack three of these in a row?",
  ],

  streak_milestone: [
    "Look at that streak. That's not just a number — that's proof of who you're becoming. Most people can't string together what you just did. Now the challenge shifts from building the streak to protecting it. What's the biggest threat to tomorrow?",
    "You hit a real milestone. This kind of consistency changes more than your body — it changes how you see yourself. You're someone who follows through now. What's one thing you've learned about yourself during this stretch?",
    "That streak is earned. Every single day of it was a choice you made. Don't let it become background noise — recognize what you've built. Now, what would it look like to raise the bar just slightly while this momentum is here?",
    "This is a serious streak. The kind that separates people who dabble from people who commit. You've proven you can show up day after day. The question now is — are you ready to push the quality of those days, not just the quantity?",
    "Major milestone. Take a second to actually appreciate what you've done — because tomorrow the work continues. Streaks like this are rare and they're built on decisions you made when you didn't feel like it. What kept you going on the hardest day?",
  ],

  goal_pace_ahead: [
    "You're ahead of pace on your goal. That's a strong position to be in. The temptation now is to ease off — don't. Being ahead is an opportunity to create a buffer for the inevitable rough patches. What's one thing you can push harder on while things are going well?",
    "Right now you're moving faster than you need to — and that's a great problem to have. Use this momentum wisely. Don't coast. What would it look like to finish this goal early instead of just on time?",
    "Ahead of schedule. That didn't happen by accident — you've been executing. Now the smart move is to keep the same intensity and let the results compound. What's the one area where you know you could still be better?",
    "Your pace is strong. You're in a position most people never reach — ahead of the timeline with momentum behind you. The danger is getting comfortable. What's one thing you haven't tried yet that could accelerate things further?",
    "You're tracking ahead and I want you to feel that. But I also want you to stay hungry. Being ahead of pace means you have room to be aggressive. What would you attempt this week if you knew you couldn't fail?",
  ],

  midweek_rescue: [
    "We're past the halfway point this week and there's ground to make up. That's not a lecture — it's just the reality. The week isn't lost, but it needs you to show up today. What's the one task you can finish in the next hour?",
    "The first half of the week got away from you. It happens. But the back half is where you decide what kind of week this actually is. Forget Monday — what can you control today?",
    "I'm not going to sugarcoat it — this week needs a comeback. You've done it before and you can do it now. Pick the most important task on your list and get it done before anything else. What's that task?",
    "The week started slow, but there's still time to turn it around. You don't need a perfect finish — you need a strong one. What's the single most important thing you can do today to get back on track?",
    "It's been a tough week so far. That's fine — what matters is what you do with what's left. One strong day can shift the whole trajectory. What are you willing to commit to finishing today?",
  ],

};
