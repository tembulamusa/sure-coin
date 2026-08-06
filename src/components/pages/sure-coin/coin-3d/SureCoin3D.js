import React, { useRef } from "react";
import HeadsCoin from "../../../../assets/surecoin/heads.png";
import TailsCoin from "../../../../assets/surecoin/tails.png";
import { useCoinScene } from "./useCoinScene";
import { useCoinFlipAnimation } from "./useCoinFlipAnimation";

/**
 * Three.js coin canvas. Parent (rotating-coin) keeps sound / overlays;
 * this component is only the 3D visual child.
 */
function SureCoin3D({
    spinning = false,
    outcomeSide = null,
    displaySide = "heads",
    onSettleComplete,
    className = "",
}) {
    const canvasRef = useRef(null);
    const { tickRef, coinGroupRef, ready, supported } = useCoinScene(canvasRef);

    useCoinFlipAnimation({
        tickRef,
        coinGroupRef,
        ready,
        spinning,
        outcomeSide,
        displaySide,
        onSettleComplete,
    });

    const fallbackSrc =
        String(displaySide || "").toLowerCase() === "tails" ? TailsCoin : HeadsCoin;

    if (!supported) {
        return (
            <img
                src={fallbackSrc}
                alt={displaySide || "coin"}
                className={`sc-coin-3d-fallback ${className}`.trim()}
                draggable={false}
            />
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className={`sc-coin-3d-canvas ${className}`.trim()}
            aria-label={
                spinning
                    ? "Coin spinning"
                    : displaySide
                      ? `Coin showing ${displaySide}`
                      : "Surecoin"
            }
        />
    );
}

export default React.memo(SureCoin3D);
