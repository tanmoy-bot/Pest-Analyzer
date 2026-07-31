import React, { useMemo, useState } from "react";
import AdviceForm from "./components/AdviceForm.jsx";
import ResultCards from "./components/ResultCards.jsx";
import Loader from "./components/Loader.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function Backdrop() {
  const specks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 14,
        duration: 12 + Math.random() * 10,
      })),
    []
  );
  return (
    <div className="backdrop">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="grain-drift">
        {specks.map((s) => (
          <span
            key={s.id}
            className="grain-speck"
            style={{ left: `${s.left}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatLog, setChatLog] = useState([]); // {role, content}
  const [followupLoading, setFollowupLoading] = useState(false);

  async function handleSubmit(form) {
    setLoading(true);
    setError("");
    setAdvice(null);
    setChatLog([]);
    try {
      const res = await fetch(`${API_BASE}/api/advise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAdvice(data.advice);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowup(question) {
    setFollowupLoading(true);
    const nextLog = [...chatLog, { role: "user", content: question }];
    setChatLog(nextLog);
    try {
      const res = await fetch(`${API_BASE}/api/advise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", question, history: nextLog.slice(0, -1) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setChatLog([...nextLog, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setChatLog([...nextLog, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally {
      setFollowupLoading(false);
    }
  }

  return (
    <>
      <Backdrop />
      <div className="page">
        <div className="topline"><span className="leaf">🌾</span> ECOSTERILE GRAIN GUARD ADVISOR</div>

        <div className="hero">
          <h1>Know the pest. <span>Protect the harvest.</span></h1>
          <p>Tell us what's in your grain store and get plain-language prevention, storage, and treatment guidance — grounded in agricultural extension practice.</p>
        </div>

        <AdviceForm onSubmit={handleSubmit} loading={loading} />

        {error ? <div className="error-text">{error}</div> : null}

        {loading ? <Loader /> : null}

        {advice ? (
          <>
            <ResultCards advice={advice} onFollowup={handleFollowup} followupLoading={followupLoading} />
            {chatLog.length ? (
              <div className="card" style={{ padding: "18px 24px", marginTop: 4 }}>
                {chatLog.map((m, i) => (
                  <p key={i} style={{ margin: "8px 0", fontSize: 14 }}>
                    <strong style={{ color: m.role === "user" ? "#1f7a5c" : "#d97757" }}>
                      {m.role === "user" ? "You: " : "Advisor: "}
                    </strong>
                    {m.content}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <footer>Built for EcoSterile Grain Guard · AI guidance is not a substitute for a licensed agronomist or the product label.</footer>
      </div>
    </>
  );
}
