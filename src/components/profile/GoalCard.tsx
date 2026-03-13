interface Props {
  goalName:  string | null;
  progress:  number;
  startVal:  string | null;
  goalVal:   string | null;
}

function barColor(pct: number): string {
  if (pct < 30) return "bg-[#7A1E1E]";
  if (pct < 70) return "bg-[#B8933A]";
  return "bg-[#3A7A3A]";
}

export function GoalCard({ goalName, progress, startVal, goalVal }: Props) {
  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525]">
      <p
        className="text-xs uppercase tracking-widest text-[#9A9080] mb-4"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Current Goal
      </p>

      {goalName ? (
        <>
          <p className="text-base font-semibold text-[#DDD5C0] leading-snug mb-4">
            {goalName}
          </p>

          <div className="mb-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#807868]">Progress</span>
              <span className="text-sm font-bold text-[#DDD5C0]">{progress}%</span>
            </div>
            <div className="h-2 bg-[#252525] rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${barColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {(startVal || goalVal) && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#252525]">
              <div>
                <p
                  className="text-[10px] text-[#807868] mb-0.5"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  Start
                </p>
                <p className="text-sm font-semibold text-[#9A9080]">{startVal ?? "—"}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-[10px] text-[#807868] mb-0.5"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  Goal
                </p>
                <p className="text-sm font-semibold text-[#B8933A]">{goalVal ?? "—"}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[#9A9080]">No active goal.</p>
      )}
    </section>
  );
}
