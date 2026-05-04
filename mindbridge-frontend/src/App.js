import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const userId = "user_" + Math.random().toString(36).substr(2, 9);

const modeConfig = {
  empathetic_listening: { label: "Empathetic Listener", icon: "♡", color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.2)" },
  cognitive_reflection: { label: "Cognitive Reflection", icon: "◎", color: "#38bdf8", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.2)" },
  behavioral_coach:     { label: "Behavioral Coach",    icon: "◈", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
  supportive_companion: { label: "Supportive Companion", icon: "◇", color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
};

const emotionConfig = {
  anxious:     { emoji: "◌", color: "#facc15", label: "Anxious" },
  sad:         { emoji: "◍", color: "#60a5fa", label: "Sad" },
  angry:       { emoji: "◉", color: "#f87171", label: "Angry" },
  neutral:     { emoji: "○", color: "#94a3b8", label: "Neutral" },
  happy:       { emoji: "●", color: "#4ade80", label: "Happy" },
  overwhelmed: { emoji: "◎", color: "#c084fc", label: "Overwhelmed" },
};

const intensityColor = { low: "#4ade80", medium: "#facc15", high: "#f87171" };

const PIPELINE_STAGES = [
  { id: "emotion",    label: "Emotion Analysis",   icon: "⬡" },
  { id: "rag",        label: "Memory Retrieval",   icon: "⬡" },
  { id: "therapy",    label: "Therapy Agent",       icon: "⬡" },
  { id: "meta",       label: "Meta Learning",      icon: "⬡" },
  { id: "scoring",    label: "Scoring",            icon: "⬡" },
];

const SCORE_METRICS = [
  { key: "emotional_validation",  label: "Emotional Validation",  color: "#c084fc" },
  { key: "empathy_level",         label: "Empathy Level",         color: "#38bdf8" },
  { key: "therapeutic_alignment", label: "Therapeutic Alignment", color: "#4ade80" },
  { key: "engagement_quality",    label: "Engagement Quality",    color: "#fb923c" },
  { key: "safety_appropriateness",label: "Safety",                color: "#f87171" },
  { key: "response_relevance",    label: "Response Relevance",    color: "#facc15" },
  { key: "depth_of_insight",      label: "Depth of Insight",      color: "#a78bfa" },
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", padding: "4px 0", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#c084fc",
          animation: `mbPulse 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
    </div>
  );
}

function PipelineIndicator({ activeStage, therapeuticStyle, done }) {
  const stages = PIPELINE_STAGES.map(s => {
    if (s.id === "therapy" && therapeuticStyle) {
      const mc = modeConfig[therapeuticStyle];
      return { ...s, label: mc ? mc.label : "Therapy Agent", icon: mc ? mc.icon : "⬡" };
    }
    return s;
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0",
      padding: "10px 16px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      marginBottom: "12px",
      overflowX: "auto",
    }}>
      {stages.map((stage, i) => {
        const stageIndex = stages.findIndex(s => s.id === activeStage);
        const isPast    = done || i < stageIndex;
        const isActive  = !done && i === stageIndex;
        const isFuture  = !done && i > stageIndex;

        return (
          <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              minWidth: "80px"
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px",
                background: isPast ? "rgba(192,132,252,0.15)" : isActive ? "rgba(192,132,252,0.25)" : "rgba(255,255,255,0.03)",
                border: isPast ? "1px solid rgba(192,132,252,0.4)" : isActive ? "1px solid #c084fc" : "1px solid rgba(255,255,255,0.08)",
                color: isPast ? "#c084fc" : isActive ? "#fff" : "#374151",
                boxShadow: isActive ? "0 0 12px rgba(192,132,252,0.4)" : "none",
                animation: isActive ? "mbGlow 1.5s ease-in-out infinite" : "none",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }}>
                {isPast ? "✓" : stage.icon}
              </div>
              <span style={{
                fontSize: "9px",
                color: isPast ? "#c084fc" : isActive ? "#e2e8f0" : "#374151",
                letterSpacing: "0.3px",
                textAlign: "center",
                whiteSpace: "nowrap",
                fontWeight: isActive ? "600" : "400",
              }}>{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{
                width: "24px", height: "1px",
                background: isPast ? "rgba(192,132,252,0.4)" : "rgba(255,255,255,0.06)",
                marginBottom: "14px", flexShrink: 0,
                transition: "background 0.3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBar({ label, score, color, delay = 0 }) {
  const pct = Math.round((score / 10) * 100);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.3px" }}>{label}</span>
        <span style={{ fontSize: "11px", color, fontWeight: "600" }}>{score.toFixed(1)}</span>
      </div>
      <div style={{
        height: "4px", borderRadius: "2px",
        background: "rgba(255,255,255,0.04)",
        overflow: "hidden"
      }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          animation: `mbBarFill 0.7s ease ${delay}ms forwards`,
          transformOrigin: "left",
        }} />
      </div>
    </div>
  );
}

function ScorePanel({ scores, emotion, intensity, therapeuticStyle, effectivenessScore, adjustment }) {
  const [open, setOpen] = useState(false);
  const mc = modeConfig[therapeuticStyle] || {};
  const ec = emotionConfig[emotion] || {};

  return (
    <div style={{
      marginTop: "8px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      overflow: "hidden",
    }}>
      {/* Summary row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: "10px",
          cursor: "pointer", userSelect: "none",
          flexWrap: "wrap",
        }}
      >
        {/* Emotion pill */}
        {emotion && (
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "20px",
            background: `${ec.color}11`,
            border: `1px solid ${ec.color}33`,
            fontSize: "11px", color: ec.color,
          }}>
            <span>{ec.emoji}</span>
            <span style={{ textTransform: "capitalize" }}>{emotion}</span>
            {intensity && (
              <span style={{
                fontSize: "9px", fontWeight: "700", letterSpacing: "0.5px",
                color: intensityColor[intensity],
                textTransform: "uppercase"
              }}>{intensity}</span>
            )}
          </div>
        )}

        {/* Agent pill */}
        {therapeuticStyle && mc.label && (
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "20px",
            background: mc.bg, border: `1px solid ${mc.border}`,
            fontSize: "11px", color: mc.color,
          }}>
            <span>{mc.icon}</span>
            <span>{mc.label}</span>
          </div>
        )}

        {/* Overall score */}
        {scores?.overall_score !== undefined && (
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "20px",
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.2)",
            fontSize: "11px", color: "#a78bfa",
          }}>
            <span>◆</span>
            <span>{scores.overall_score.toFixed(1)}/10</span>
          </div>
        )}

        {/* Adjustment badge */}
        {adjustment && adjustment !== "none" && (
          <div style={{
            padding: "3px 10px", borderRadius: "20px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid rgba(251,146,60,0.2)",
            fontSize: "11px", color: "#fb923c",
          }}>
            ↻ {adjustment.replace(/_/g, " ")}
          </div>
        )}

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#374151" }}>
          {open ? "▲ hide" : "▼ details"}
        </div>
      </div>

      {/* Expanded detail panel */}
      {open && scores && (
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          animation: "mbFadeSlide 0.2s ease",
        }}>
          <div style={{ marginBottom: "14px" }}>
            {SCORE_METRICS.map((m, i) => (
              <ScoreBar
                key={m.key}
                label={m.label}
                score={scores[m.key] ?? 0}
                color={m.color}
                delay={i * 60}
              />
            ))}
          </div>

          {/* Strengths / Improvements */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {scores.strengths && (
              <div style={{
                padding: "10px", borderRadius: "8px",
                background: "rgba(74,222,128,0.05)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}>
                <div style={{ fontSize: "9px", color: "#4ade80", letterSpacing: "1px", marginBottom: "4px", fontWeight: "700" }}>STRENGTHS</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>{scores.strengths}</div>
              </div>
            )}
            {scores.areas_for_improvement && (
              <div style={{
                padding: "10px", borderRadius: "8px",
                background: "rgba(251,146,60,0.05)",
                border: "1px solid rgba(251,146,60,0.15)",
              }}>
                <div style={{ fontSize: "9px", color: "#fb923c", letterSpacing: "1px", marginBottom: "4px", fontWeight: "700" }}>IMPROVE</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>{scores.areas_for_improvement}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [pipeline,   setPipeline]   = useState(null);  // { stage, therapeuticStyle, done }
  const [headerData, setHeaderData] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pipeline]);

  // Simulates pipeline stage progression while waiting for API
  const runPipelineAnimation = (therapeuticStyleHint) => {
    const stages = ["emotion", "rag", "therapy", "meta", "scoring"];
    let i = 0;
    setPipeline({ stage: stages[0], therapeuticStyle: therapeuticStyleHint, done: false });
    const iv = setInterval(() => {
      i++;
      if (i < stages.length) {
        setPipeline(p => ({ ...p, stage: stages[i] }));
      } else {
        clearInterval(iv);
      }
    }, 900);
    return iv;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    const iv = runPipelineAnimation(null);

    try {
      const res = await axios.post(`${API}/chat`, {
        user_id: userId,
        message: userText,
        chat_history: messages.map(m => ({
          role: m.role === "user" ? "human" : "assistant",
          content: m.text
        }))
      });

      clearInterval(iv);

      const {
        response, emotion, intensity, therapeutic_style,
        effectiveness_score, detailed_scores, recommended_adjustment
      } = res.data;

      // Update pipeline to done with correct style
      setPipeline({ stage: "scoring", therapeuticStyle: therapeutic_style, done: true });

      setHeaderData({ emotion, intensity, therapeutic_style, effectiveness_score });

      setMessages(prev => [...prev, {
        role: "assistant",
        text: response,
        emotion, intensity, therapeutic_style,
        effectiveness_score, detailed_scores,
        recommended_adjustment,
      }]);

      // Clear pipeline after a moment
      setTimeout(() => setPipeline(null), 1800);

    } catch (err) {
      clearInterval(iv);
      setPipeline(null);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        error: true
      }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const hd = headerData;
  const hMode = hd ? modeConfig[hd.therapeutic_style] : null;
  const hEmot = hd ? emotionConfig[hd.emotion] : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070710",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Syne', 'DM Sans', sans-serif",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070710; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
        @keyframes mbPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
        @keyframes mbFadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes mbGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(192,132,252,0.3); }
          50%       { box-shadow: 0 0 18px rgba(192,132,252,0.7); }
        }
        @keyframes mbBarFill {
          from { width: 0%; }
        }
        @keyframes mbFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .msg-enter { animation: mbFadeSlide 0.35s ease forwards; }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        .send-btn:hover:not(:disabled) { background: #9333ea !important; transform: translateY(-1px); }
        .send-btn:active:not(:disabled) { transform: translateY(0); }
        .send-btn { transition: all 0.15s ease; }
        .chip:hover { opacity: 0.8; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(7,7,16,0.96)",
        backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 20,
        flexWrap: "wrap", gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #c084fc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px", fontFamily: "DM Serif Display, serif", color: "#fff",
            boxShadow: "0 0 20px rgba(192,132,252,0.3)",
          }}>M</div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "19px", color: "#f1f5f9", letterSpacing: "-0.3px" }}>MindBridge</div>
            <div style={{ fontSize: "10px", color: "#2d2d4e", letterSpacing: "1.5px", fontWeight: "600" }}>AGENTIC MENTAL HEALTH AI</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {hEmot && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "20px",
              background: `${hEmot.color}0d`, border: `1px solid ${hEmot.color}33`,
              fontSize: "12px", color: hEmot.color,
            }}>
              <span>{hEmot.emoji}</span>
              <span style={{ textTransform: "capitalize" }}>{hd.emotion}</span>
              {hd.intensity && (
                <span style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.8px",
                  color: intensityColor[hd.intensity], textTransform: "uppercase"
                }}>{hd.intensity}</span>
              )}
            </div>
          )}
          {hMode && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "20px",
              background: hMode.bg, border: `1px solid ${hMode.border}`,
              fontSize: "12px", color: hMode.color,
            }}>
              <span>{hMode.icon}</span>
              <span>{hMode.label}</span>
            </div>
          )}
          {hd?.effectiveness_score !== undefined && (
            <div style={{
              padding: "5px 12px", borderRadius: "20px",
              background: "rgba(167,139,250,0.08)",
              border: "1px solid rgba(167,139,250,0.2)",
              fontSize: "12px", color: "#a78bfa",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              ◆ {hd.effectiveness_score}/10
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "28px 24px",
        display: "flex", flexDirection: "column",
        maxWidth: "820px", width: "100%", margin: "0 auto",
      }}>

        {/* Welcome screen */}
        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", gap: "24px",
            animation: "mbFadeIn 0.6s ease",
            paddingTop: "60px",
          }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(192,132,252,0.1))",
              border: "1px solid rgba(192,132,252,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "36px", fontFamily: "DM Serif Display, serif", color: "#c084fc",
              boxShadow: "0 0 40px rgba(192,132,252,0.1)",
            }}>M</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#f1f5f9", marginBottom: "10px", letterSpacing: "-0.5px" }}>
                How are you feeling?
              </div>
              <div style={{ fontSize: "14px", color: "#374151", maxWidth: "360px", lineHeight: "1.8", margin: "0 auto" }}>
                I'm here to listen and support you. Every response includes detailed analytics — emotion detection, agent routing, and quality scoring.
              </div>
            </div>

            {/* Pipeline preview */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "12px 20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "14px",
            }}>
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "6px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", color: "#2d2d4e",
                    }}>{s.icon}</div>
                    <span style={{ fontSize: "8px", color: "#1e1e3e", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>{s.label}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && <div style={{ width: "16px", height: "1px", background: "rgba(255,255,255,0.04)", marginBottom: "10px" }} />}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              {["I feel anxious today", "I'm overwhelmed with work", "I've been feeling really low", "I need someone to talk to"].map(s => (
                <button key={s} className="chip" onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{
                  padding: "8px 16px", borderRadius: "20px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "#374151", fontSize: "13px", cursor: "pointer",
                  fontFamily: "Syne, sans-serif", transition: "opacity 0.15s",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline in-progress indicator */}
        {loading && pipeline && (
          <div className="msg-enter" style={{ marginBottom: "8px" }}>
            <PipelineIndicator
              activeStage={pipeline.stage}
              therapeuticStyle={pipeline.therapeuticStyle}
              done={pipeline.done}
            />
          </div>
        )}

        {/* Completed pipeline (after response arrives, briefly) */}
        {!loading && pipeline?.done && (
          <div className="msg-enter" style={{ marginBottom: "8px" }}>
            <PipelineIndicator
              activeStage="scoring"
              therapeuticStyle={pipeline.therapeuticStyle}
              done={true}
            />
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div key={i} className="msg-enter" style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: "16px",
          }}>
            {m.role === "assistant" && (
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "linear-gradient(135deg, #7c3aed, #c084fc)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontFamily: "DM Serif Display, serif",
                color: "white", marginRight: "10px", flexShrink: 0, marginTop: "2px",
              }}>M</div>
            )}

            <div style={{ maxWidth: m.role === "assistant" ? "100%" : "72%", flex: m.role === "assistant" ? 1 : "unset" }}>
              {/* Bubble */}
              <div style={{
                padding: "13px 17px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user"
                  ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                  : m.error ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
                border: m.role === "user"
                  ? "none"
                  : m.error ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)",
                fontSize: "15px", lineHeight: "1.75",
                color: m.role === "user" ? "#fff" : "#c8d3e0",
                fontFamily: "DM Sans, sans-serif",
              }}>
                {m.text}
              </div>

              {/* Score panel for assistant messages */}
              {m.role === "assistant" && !m.error && (m.emotion || m.detailed_scores) && (
                <ScorePanel
                  scores={m.detailed_scores}
                  emotion={m.emotion}
                  intensity={m.intensity}
                  therapeuticStyle={m.therapeutic_style}
                  effectivenessScore={m.effectiveness_score}
                  adjustment={m.recommended_adjustment}
                />
              )}
            </div>
          </div>
        ))}

        {/* Typing dots when loading (no pipeline yet shown or alongside) */}
        {loading && (
          <div className="msg-enter" style={{ display: "flex", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed, #c084fc)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontFamily: "DM Serif Display, serif",
              color: "white", marginRight: "10px", flexShrink: 0,
            }}>M</div>
            <div style={{
              padding: "13px 17px",
              borderRadius: "16px 16px 16px 4px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(7,7,16,0.97)",
        backdropFilter: "blur(16px)",
        padding: "14px 24px 18px",
      }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px", padding: "11px 15px",
              transition: "border-color 0.2s",
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(192,132,252,0.35)"}
            onBlurCapture={e =>  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Share what's on your mind…"
              rows={1}
              style={{
                width: "100%", background: "transparent", border: "none",
                color: "#e2e8f0", fontSize: "15px", lineHeight: "1.6",
                fontFamily: "DM Sans, sans-serif", maxHeight: "120px", overflowY: "auto",
              }}
            />
          </div>
          <button
            className="send-btn"
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: loading || !input.trim() ? "rgba(255,255,255,0.04)" : "#7c3aed",
              border: "none",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: loading || !input.trim() ? "#2d2d4e" : "white",
              fontSize: "18px", flexShrink: 0,
              boxShadow: loading || !input.trim() ? "none" : "0 0 20px rgba(124,58,237,0.4)",
            }}
          >↑</button>
        </div>
        <div style={{
          maxWidth: "820px", margin: "8px auto 0",
          fontSize: "11px", color: "#1a1a2e", textAlign: "center",
        }}>
          MindBridge is not a substitute for professional mental health care. If you're in crisis, please contact a helpline.
        </div>
      </div>
    </div>
  );
}