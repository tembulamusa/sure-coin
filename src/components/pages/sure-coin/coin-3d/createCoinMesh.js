import * as THREE from "three";
import HeadsCoin from "../../../../assets/surecoin/heads.png";
import TailsCoin from "../../../../assets/surecoin/tails.png";

/** Coin radius in scene units; thickness gives a readable metallic rim. */
export const COIN_RADIUS = 1;
export const COIN_THICKNESS = 0.14;

const FACE_SEGMENTS = 64;

/**
 * Build a CylinderGeometry coin:
 * - materials[0] = rim (side)
 * - materials[1] = heads (top / +Y)
 * - materials[2] = tails (bottom / -Y)
 *
 * Mesh is tipped so heads faces the camera (+Z) at group rotation (0,0,0).
 * Tails map is mirrored on U so text reads correctly when that face is shown.
 */
export function createCoinMesh() {
    const loader = new THREE.TextureLoader();
    const headsMap = loader.load(HeadsCoin);
    const tailsMap = loader.load(TailsCoin);

    [headsMap, tailsMap].forEach((map) => {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        map.generateMipmaps = true;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        map.magFilter = THREE.LinearFilter;
    });

    // Bottom end-cap UVs read mirrored from the camera after a half-turn;
    // flip U so "TAILS" / "SURE COIN" stay upright and readable.
    tailsMap.wrapS = THREE.RepeatWrapping;
    tailsMap.repeat.x = -1;
    tailsMap.offset.x = 1;

    const geometry = new THREE.CylinderGeometry(
        COIN_RADIUS,
        COIN_RADIUS,
        COIN_THICKNESS,
        FACE_SEGMENTS,
        1,
        false
    );

    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xc9a227,
        metalness: 0.95,
        roughness: 0.22,
        envMapIntensity: 1,
    });

    const headsMat = new THREE.MeshStandardMaterial({
        map: headsMap,
        metalness: 0.62,
        roughness: 0.32,
    });

    const tailsMat = new THREE.MeshStandardMaterial({
        map: tailsMap,
        metalness: 0.62,
        roughness: 0.32,
    });

    const mesh = new THREE.Mesh(geometry, [rimMat, headsMat, tailsMat]);
    // Tip cylinder: +Y (heads) → +Z (camera)
    mesh.rotation.x = Math.PI / 2;

    const group = new THREE.Group();
    group.add(mesh);

    const dispose = () => {
        geometry.dispose();
        rimMat.dispose();
        headsMat.dispose();
        tailsMat.dispose();
        headsMap.dispose();
        tailsMap.dispose();
    };

    return { group, mesh, dispose };
}

/**
 * Target X rotation (radians) so the given face looks at the camera.
 * Heads = even multiples of π; tails = odd multiples of π (after tip).
 */
export function faceTargetRotationX(side, fromX = 0, extraHalfTurns = 0) {
    const normalized = String(side || "").toLowerCase() === "tails" ? "tails" : "heads";
    const wantOdd = normalized === "tails";
    let target = fromX + Math.PI * Math.max(0, extraHalfTurns);

    // Advance to next half-turn boundary at or beyond `target`
    const half = Math.PI;
    let n = Math.ceil(target / half - 1e-6);
    if (n < 0) n = 0;
    if (wantOdd && n % 2 === 0) n += 1;
    if (!wantOdd && n % 2 !== 0) n += 1;

    return n * half;
}
