import React from "react";
import { useLocation } from "react-router-dom";

/**
 * Host shell: presents Surecoin inside a ≤960px iframe.
 * Operators can also iframe /game (or /surecoin) directly.
 */
const EmbedHost = () => {
  const { search, hash } = useLocation();
  const gameSrc = `/game${search}${hash}`;

  return (
    <div className="sc-embed-host">
      <iframe
        className="sc-embed-host__frame"
        title="Surecoin"
        src={gameSrc}
        allow="autoplay; fullscreen; clipboard-write"
        scrolling="auto"
      />
    </div>
  );
};

export default EmbedHost;
