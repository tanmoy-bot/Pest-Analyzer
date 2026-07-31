import React from "react";

export default function Loader() {
  return (
    <div className="loader-wrap">
      <div className="loader-grain">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="loader-text">Consulting the advisor…</div>
    </div>
  );
}
