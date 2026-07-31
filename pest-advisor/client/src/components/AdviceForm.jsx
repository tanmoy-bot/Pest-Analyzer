import React, { useState } from "react";

const PEST_OPTIONS = [
  "Rhyzopertha dominica (Lesser grain borer)",
  "Sitophilus oryzae (Rice weevil)",
  "Tribolium castaneum (Red flour beetle)",
  "Not sure — describe symptoms instead",
];

export default function AdviceForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    pest: PEST_OPTIONS[0],
    crop: "",
    storageType: "",
    region: "",
    symptoms: "",
  });

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const pest = form.pest.startsWith("Not sure") ? "" : form.pest;
    onSubmit({ ...form, pest });
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="pest">Pest / species</label>
          <select id="pest" value={form.pest} onChange={update("pest")}>
            {PEST_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="crop">Crop</label>
          <input id="crop" placeholder="e.g. Rice, wheat, pulses" value={form.crop} onChange={update("crop")} />
        </div>

        <div className="field">
          <label htmlFor="storageType">Storage type</label>
          <input id="storageType" placeholder="e.g. Jute sacks, metal bin, godown" value={form.storageType} onChange={update("storageType")} />
        </div>

        <div className="field">
          <label htmlFor="region">Region (optional)</label>
          <input id="region" placeholder="e.g. Karimganj, Assam" value={form.region} onChange={update("region")} />
        </div>

        <div className="field">
          <label htmlFor="symptoms">Symptoms noticed (optional)</label>
          <input id="symptoms" placeholder="e.g. Small holes in kernels, powder" value={form.symptoms} onChange={update("symptoms")} />
        </div>

        <div className="field full">
          <label htmlFor="notes">Anything else? (optional)</label>
          <textarea id="notes" placeholder="Extra context for the advisor…" value={form.notes || ""} onChange={update("notes")} />
        </div>
      </div>

      <div className="submit-row">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Consulting…" : "Get advice"} <span aria-hidden>→</span>
        </button>
        <span className="hint-text">Powered by an LLM via OpenRouter — always verify chemical advice against the product label.</span>
      </div>
    </form>
  );
}
