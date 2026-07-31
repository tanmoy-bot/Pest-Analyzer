import React, { useState } from "react";

function Delay({ index, children, className }) {
  return (
    <div className={className} style={{ animationDelay: `${0.08 * index}s` }}>
      {children}
    </div>
  );
}

export default function ResultCards({ advice, rawReply, onFollowup, followupLoading }) {
  const [question, setQuestion] = useState("");
  const risk = advice.riskLevel && advice.riskLevel.trim() in
    { Low: 1, Moderate: 1, High: 1, Severe: 1 }
    ? advice.riskLevel.trim()
    : "Unknown";

  const submitFollowup = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    onFollowup(question.trim());
    setQuestion("");
  };

  return (
    <div className="results">
      <Delay index={0} className="card result-head">
        <div>
          <h2>
            <span className="species">{advice.species || "Result"}</span>
            {advice.commonName ? <span className="common">{advice.commonName}</span> : null}
          </h2>
        </div>
        <span className={`risk-pill risk-${risk}`}>{risk} risk</span>
      </Delay>

      {advice.summary ? (
        <Delay index={1} className="card summary-line" style={{ padding: "18px 26px" }}>
          {advice.summary}
        </Delay>
      ) : null}

      <div className="grid-cards">
        {advice.prevention?.length ? (
          <Delay index={2} className="card mini-card">
            <h3>🛡️ Prevention</h3>
            <ul>{advice.prevention.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </Delay>
        ) : null}

        {advice.storageAdvice?.length ? (
          <Delay index={3} className="card mini-card">
            <h3>🌾 Storage technique</h3>
            <ul>{advice.storageAdvice.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </Delay>
        ) : null}

        {advice.nonChemicalOptions?.length ? (
          <Delay index={4} className="card mini-card">
            <h3>🌱 Non-chemical control</h3>
            <ul>{advice.nonChemicalOptions.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </Delay>
        ) : null}

        {advice.chemicalOptions?.length ? (
          <Delay index={5} className="card mini-card chem">
            <h3>🧪 Chemical control (label-guided)</h3>
            <ul>
              {advice.chemicalOptions.map((c, i) => (
                <li key={i}>
                  <span className="chem-name">{c.name}</span>
                  {c.notes}
                </li>
              ))}
            </ul>
          </Delay>
        ) : null}
      </div>

      {advice.disclaimer ? (
        <Delay index={6} className="disclaimer">⚠️ {advice.disclaimer}</Delay>
      ) : null}

      <form className="followup" onSubmit={submitFollowup}>
        <input
          placeholder="Ask a follow-up question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={followupLoading}>
          {followupLoading ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
