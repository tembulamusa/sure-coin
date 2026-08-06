import { useEffect, useRef } from "react";
import { faceTargetRotationX } from "./createCoinMesh";

const SETTLE_DURATION_MS = 520;
const IDLE_FACE_DURATION_MS = 320;
const TUMBLE_X = 14.5;
const TUMBLE_Y = 3.8;
const TUMBLE_Z_AMP = 0.22;
const TUMBLE_Z_FREQ = 9.5;

function easeOutCubic(t) {
    const x = Math.min(1, Math.max(0, t));
    return 1 - (1 - x) ** 3;
}

function normalizeSide(value) {
    const side = String(value || "").trim().toLowerCase();
    return side === "heads" || side === "tails" ? side : null;
}

/**
 * Drives idle / spinning tumble / settle via spinning + outcomeSide.
 * Registers a tick on the scene loop; does not own the renderer.
 */
export function useCoinFlipAnimation({
    tickRef,
    coinGroupRef,
    ready,
    spinning,
    outcomeSide,
    displaySide,
    onSettleComplete,
}) {
    const phaseRef = useRef("idle");
    const spinTimeRef = useRef(0);
    const settleRef = useRef(null);
    const idleFaceRef = useRef(null);
    const wasSpinningRef = useRef(false);
    const onSettleCompleteRef = useRef(onSettleComplete);
    const displaySideRef = useRef(normalizeSide(displaySide) || "heads");
    const outcomeSideRef = useRef(normalizeSide(outcomeSide));

    useEffect(() => {
        onSettleCompleteRef.current = onSettleComplete;
    }, [onSettleComplete]);

    useEffect(() => {
        outcomeSideRef.current = normalizeSide(outcomeSide);
    }, [outcomeSide]);

    useEffect(() => {
        if (!ready) return;

        const group = coinGroupRef.current;
        if (!group) return;

        if (spinning) {
            wasSpinningRef.current = true;
            phaseRef.current = "spinning";
            settleRef.current = null;
            idleFaceRef.current = null;
            spinTimeRef.current = 0;
            return;
        }

        const resolvedOutcome = normalizeSide(outcomeSide);
        const side =
            resolvedOutcome ||
            normalizeSide(displaySide) ||
            displaySideRef.current ||
            "heads";
        displaySideRef.current = side;

        // Keep tumbling visually until outcome arrives after spin ends
        if (wasSpinningRef.current && !resolvedOutcome) {
            phaseRef.current = "spinning";
            return;
        }

        if (wasSpinningRef.current && resolvedOutcome) {
            wasSpinningRef.current = false;
            const fromX = group.rotation.x;
            const fromY = group.rotation.y;
            const fromZ = group.rotation.z;
            // Several full tumbles then land on the correct face
            const toX = faceTargetRotationX(side, fromX, 6);
            settleRef.current = {
                start: performance.now(),
                duration: SETTLE_DURATION_MS,
                fromX,
                fromY,
                fromZ,
                toX,
                toY: Math.round(fromY / (Math.PI * 2)) * Math.PI * 2,
                toZ: 0,
            };
            phaseRef.current = "settling";
            return;
        }

        // Idle face change (user pick / initial) — gentle turn, no settle sound phase
        if (phaseRef.current === "spinning" || phaseRef.current === "settling") {
            return;
        }

        const wantOdd = side === "tails";
        const halfTurns = Math.round(group.rotation.x / Math.PI);
        const isOdd = Math.abs(halfTurns) % 2 === 1;
        if (wantOdd === isOdd && Math.abs(group.rotation.y) < 0.08 && Math.abs(group.rotation.z) < 0.08) {
            phaseRef.current = "idle";
            return;
        }

        const fromX = group.rotation.x;
        idleFaceRef.current = {
            start: performance.now(),
            duration: IDLE_FACE_DURATION_MS,
            fromX,
            fromY: group.rotation.y,
            fromZ: group.rotation.z,
            toX: faceTargetRotationX(side, fromX, 0),
            toY: 0,
            toZ: 0,
        };
        phaseRef.current = "idle-face";
    }, [spinning, outcomeSide, displaySide, ready, coinGroupRef]);

    useEffect(() => {
        if (!ready || !tickRef) return undefined;

        tickRef.current = (dt, now) => {
            const group = coinGroupRef.current;
            if (!group) return;

            const phase = phaseRef.current;

            if (phase === "spinning") {
                spinTimeRef.current += dt;
                const t = spinTimeRef.current;
                group.rotation.x += TUMBLE_X * dt;
                group.rotation.y += TUMBLE_Y * dt;
                group.rotation.z = Math.sin(t * TUMBLE_Z_FREQ) * TUMBLE_Z_AMP;
                return;
            }

            if (phase === "settling" && settleRef.current) {
                const s = settleRef.current;
                const u = easeOutCubic((now - s.start) / s.duration);
                group.rotation.x = s.fromX + (s.toX - s.fromX) * u;
                group.rotation.y = s.fromY + (s.toY - s.fromY) * u;
                group.rotation.z = s.fromZ + (s.toZ - s.fromZ) * u;

                if (u >= 1) {
                    group.rotation.x = s.toX;
                    group.rotation.y = s.toY;
                    group.rotation.z = s.toZ;
                    settleRef.current = null;
                    phaseRef.current = "idle";
                    displaySideRef.current = outcomeSideRef.current || displaySideRef.current;
                    if (typeof onSettleCompleteRef.current === "function") {
                        onSettleCompleteRef.current();
                    }
                }
                return;
            }

            if (phase === "idle-face" && idleFaceRef.current) {
                const s = idleFaceRef.current;
                const u = easeOutCubic((now - s.start) / s.duration);
                group.rotation.x = s.fromX + (s.toX - s.fromX) * u;
                group.rotation.y = s.fromY + (s.toY - s.fromY) * u;
                group.rotation.z = s.fromZ + (s.toZ - s.fromZ) * u;

                if (u >= 1) {
                    group.rotation.x = s.toX;
                    group.rotation.y = s.toY;
                    group.rotation.z = s.toZ;
                    idleFaceRef.current = null;
                    phaseRef.current = "idle";
                }
            }
        };

        return () => {
            tickRef.current = null;
        };
    }, [ready, tickRef, coinGroupRef]);
}
