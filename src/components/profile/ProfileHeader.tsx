interface Props {
  name:      string;
  startDate: string;
}

export function ProfileHeader({ name, startDate }: Props) {
  return (
    <header className="bg-[#0D0D0D] pt-10 pb-6 px-5 border-b border-[#252525]">
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-widest text-[#B8933A] mb-1"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            PULSE Profile
          </p>
          <h1
            className="text-2xl text-[#F4EEE4] tracking-wide mb-4"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >
            {name}
          </h1>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] uppercase tracking-widest text-[#807868] w-24"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Age
              </span>
              <span className="text-sm text-[#9A9080]">—</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] uppercase tracking-widest text-[#807868] w-24"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Member Since
              </span>
              <span className="text-sm text-[#DDD5C0]">{startDate}</span>
            </div>
          </div>
        </div>

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16 flex-shrink-0 mt-1"
        >
          <polygon
            points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
            stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4}
          />
          <polygon
            points="50,14 80,28 90,57 76,82 50,90 24,82 10,57 20,28"
            stroke="#B8933A" strokeWidth={0.5} fill="none" opacity={0.2}
          />
          <polyline
            style={{ filter: "drop-shadow(0 0 4px rgba(184,147,58,0.9))" }}
            points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
            stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="3" fill="#B8933A" />
        </svg>
      </div>
    </header>
  );
}
