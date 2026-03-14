"use client";

// ─────────────────────────────────────────────
// PulseChat — interactive AI coaching chat
//
// Full-screen mobile-first chat interface that
// connects to the /api/pulse/chat endpoint.
// Reuses the same visual language as BriefingShell.
// ─────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  selectedDate: string;
  conversationId: string;
  initialMessages?: Message[];
};

// ── Shared styles ──────────────────────────────

const cinzel   = "'Cinzel', serif";
const garamond = "'EB Garamond', serif";

// ── PULSE logo SVG ─────────────────────────────

function PulseLogo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" width={size} height={size}>
      <polygon
        points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
        stroke="#B8933A" strokeWidth={3} fill="none" opacity={0.5}
      />
      <polyline
        points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
        stroke="#B8933A" strokeWidth={4} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="5" fill="#B8933A" />
    </svg>
  );
}

// ── Message bubble ─────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "rgba(184,147,58,0.1)", border: "1px solid #3A3020",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 10, marginTop: 4,
        }}>
          <PulseLogo size={16} />
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "#1A1A1A" : "#111111",
        border: `1px solid ${isUser ? "#2A2A2A" : "#252525"}`,
        borderRadius: isUser ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
        padding: "12px 16px",
      }}>
        <p style={{
          fontFamily: garamond,
          fontSize: 15,
          color: isUser ? "#D4CFC4" : "#F4EEE4",
          margin: 0,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}>
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ── Typing indicator ───────────────────────────

function TypingIndicator() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "rgba(184,147,58,0.1)", border: "1px solid #3A3020",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PulseLogo size={16} />
      </div>
      <div style={{
        background: "#111111", border: "1px solid #252525",
        borderRadius: "2px 12px 12px 12px", padding: "12px 16px",
        display: "flex", gap: 6,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#B8933A", opacity: 0.4,
            animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 0.8; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main component ─────────────────────────────

export function PulseChat({ selectedDate, conversationId, initialMessages = [] }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/pulse/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          selectedDate,
          conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: err.error ?? "Something went wrong. Try again." },
        ]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, selectedDate, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      minHeight: "100dvh", background: "#0D0D0D",
      display: "flex", flexDirection: "column",
      maxWidth: 420, margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid #1A1A1A",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#807868", fontSize: 18, padding: "4px 8px",
            fontFamily: garamond,
          }}
          aria-label="Go back"
        >
          &#8249; Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PulseLogo size={20} />
          <span style={{
            fontFamily: cinzel, fontWeight: 700, fontSize: 9,
            letterSpacing: "0.2em", color: "#B8933A",
            textTransform: "uppercase",
          }}>
            PULSE AI
          </span>
        </div>
        <div style={{ width: 60 }} />
      </header>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: "auto", padding: "20px 20px 140px",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Welcome message if no history */}
        {messages.length === 0 && !sending && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", flex: 1, gap: 16,
            textAlign: "center", padding: "40px 20px",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(184,147,58,0.08)", border: "1.5px solid #3A3020",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PulseLogo size={28} />
            </div>
            <p style={{
              fontFamily: garamond, fontSize: 16, color: "#807868",
              fontStyle: "italic", margin: 0, maxWidth: 260, lineHeight: 1.5,
            }}>
              Ask me anything about your progress, habits, or goals.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {sending && <TypingIndicator />}
      </div>

      {/* ── Input ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 420,
        background: "linear-gradient(transparent, #0D0D0D 20%)",
        padding: "24px 20px 24px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 10,
          background: "#141414", border: "1px solid #252525",
          borderRadius: 24, padding: "8px 8px 8px 16px",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI coach..."
            rows={1}
            disabled={sending}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: garamond, fontSize: 15, color: "#F4EEE4",
              resize: "none", lineHeight: 1.4,
              maxHeight: 100, overflowY: "auto",
              padding: "4px 0",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: input.trim() && !sending ? "#B8933A" : "#2A2A2A",
              cursor: input.trim() && !sending ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.2s",
            }}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke={input.trim() && !sending ? "#0D0D0D" : "#807868"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
