import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createCoinMesh } from "./createCoinMesh";

function supportsWebGL() {
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
    } catch {
        return false;
    }
}

/**
 * Owns scene, camera, lights, renderer, resize, RAF loop, and full dispose.
 * Consumers register a per-frame tick via `tickRef.current = (dt, now) => {}`.
 */
export function useCoinScene(canvasRef) {
    const tickRef = useRef(null);
    const coinGroupRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [supported, setSupported] = useState(() =>
        typeof window !== "undefined" ? supportsWebGL() : true
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        if (!supportsWebGL()) {
            setSupported(false);
            setReady(false);
            return undefined;
        }

        setSupported(true);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
        camera.position.set(0, 0.05, 3.15);

        const ambient = new THREE.AmbientLight(0xfff4dc, 0.72);
        const key = new THREE.DirectionalLight(0xffe6a8, 1.25);
        key.position.set(2.4, 3.2, 4.2);
        const fill = new THREE.DirectionalLight(0xb8c8ff, 0.38);
        fill.position.set(-3.2, -0.8, 2.4);
        const rimLight = new THREE.DirectionalLight(0xffd070, 0.55);
        rimLight.position.set(-2.2, 1.4, -3.4);
        scene.add(ambient, key, fill, rimLight);

        const { group, dispose: disposeCoin } = createCoinMesh();
        coinGroupRef.current = group;
        scene.add(group);

        const setSize = () => {
            const parent = canvas.parentElement;
            const w = Math.max(1, parent?.clientWidth || canvas.clientWidth || 160);
            const h = Math.max(1, parent?.clientHeight || canvas.clientHeight || 160);
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };

        setSize();

        let resizeObserver;
        if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
            resizeObserver = new ResizeObserver(() => setSize());
            resizeObserver.observe(canvas.parentElement);
        } else {
            window.addEventListener("resize", setSize);
        }

        let rafId = 0;
        let last = performance.now();
        let disposed = false;

        const loop = (now) => {
            if (disposed) return;
            rafId = requestAnimationFrame(loop);

            if (typeof document !== "undefined" && document.hidden) {
                last = now;
                return;
            }

            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            const tick = tickRef.current;
            if (typeof tick === "function") {
                tick(dt, now);
            }

            renderer.render(scene, camera);
        };

        setReady(true);
        rafId = requestAnimationFrame(loop);

        return () => {
            disposed = true;
            cancelAnimationFrame(rafId);
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener("resize", setSize);
            }
            tickRef.current = null;
            coinGroupRef.current = null;
            setReady(false);
            disposeCoin();
            renderer.dispose();
            renderer.forceContextLoss?.();
        };
    }, [canvasRef]);

    return { tickRef, coinGroupRef, ready, supported };
}
