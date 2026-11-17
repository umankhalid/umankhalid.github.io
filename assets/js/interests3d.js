/**
 * Research interest models (home page)
 *
 * One WebGL model per research interest, rendered with three.js: physically
 * based materials, an environment map for reflections, and a shadowed ground.
 * Each model plays a short, staged explanation of its topic. The steps, the
 * live readout, the play/pause control and (where it teaches something) one
 * parameter slider are driven from the SCENES table below.
 *
 * The keyword list and captions work straight away; three.js itself (the one
 * large file) is fetched only when the model is about to scroll into view.
 * Drawing stops while the model is off screen or the tab is hidden. With
 * "reduce motion" set, each model opens paused on a representative frame.
 *
 * Quantities shown in the readouts are computed, not scripted:
 *   sensing       phase uncertainty of a squeezed spin state, xi / sqrt(N)
 *   network       Werner-state fidelity after entanglement swapping
 *   resource      concurrence, purity and CHSH value of a Werner state
 *   optimization  gradient descent on the plotted energy surface
 *   satellite     elevation of the satellite seen from each ground station
 *   rydberg       exact Schrodinger evolution of a 3 x 3 driven Rydberg array
 */

const body = document.getElementById('interests-body');
const stage = document.getElementById('interest-stage');
const wrap = stage && stage.querySelector('.interest-canvas-wrap');
const canvas = document.getElementById('interest-canvas');
const labelLayer = document.getElementById('interest-labels');

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Seeded generator (mulberry32), so every visit builds the models alike. */
function rng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

let THREE = null;       // set once the library has loaded
let K = null;           // drawing kit, built on THREE
const pal = {};         // model colours for the current theme

function readPalette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const text = getComputedStyle(document.documentElement);
    const token = (name, fallback) => new THREE.Color((text.getPropertyValue(name) || '').trim() || fallback);
    pal.dark = dark;
    pal.indigo = new THREE.Color(dark ? '#7f9bff' : '#2c45ad');
    pal.gold = new THREE.Color(dark ? '#f2c063' : '#d39a2c');
    pal.teal = new THREE.Color(dark ? '#58d8ca' : '#109a93');
    pal.steel = new THREE.Color(dark ? '#9aa6c2' : '#69748c');
    pal.deep = new THREE.Color(dark ? '#16224a' : '#1b2a5c');
    pal.ink = token('--text-primary', '#121a2b');
    pal.card = token('--bg-secondary', '#ffffff');
}

// --------------------------------------------------------------------------
// Drawing kit: materials and the few shapes every model shares
// --------------------------------------------------------------------------

function makeKit() {
    const UP = new THREE.Vector3(0, 1, 0);
    const tmp = new THREE.Vector3();

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const g2 = glowCanvas.getContext('2d');
    const grad = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 128, 128);
    const glowMap = new THREE.CanvasTexture(glowCanvas);

    const kit = {
        v: (x, y, z) => new THREE.Vector3(x, y, z),

        // Materials
        metal: (color, rough) => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: rough === undefined ? 0.3 : rough }),
        gloss: (color, rough) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.05, roughness: rough === undefined ? 0.35 : rough, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
        glass: (color, opacity) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.06, clearcoat: 1, transparent: true, opacity: opacity === undefined ? 0.2 : opacity, depthWrite: false, side: THREE.DoubleSide }),
        lit: (color, power) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: power === undefined ? 1.2 : power, roughness: 0.4, metalness: 0, transparent: true }),
        soft: (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }),
        line: (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity === undefined ? 1 : opacity }),

        // Shapes
        mesh(geometry, material, shadow) {
            const m = new THREE.Mesh(geometry, material);
            m.castShadow = shadow !== false;
            m.receiveShadow = shadow !== false;
            return m;
        },
        sphere: (r, material, shadow) => kit.mesh(new THREE.SphereGeometry(r, 40, 28), material, shadow),
        /** A mesh that only casts a shadow: grounds glass objects. */
        shadowOf(geometry) {
            const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
            m.castShadow = true;
            return m;
        },
        /** Torus lying flat (in the xz plane). */
        ring(radius, thickness, material, shadow) {
            const m = kit.mesh(new THREE.TorusGeometry(radius, thickness, 12, 96), material, shadow);
            m.rotation.x = Math.PI / 2;
            return m;
        },
        /** Cylinder of unit length; rod.between(a, b) lays it from a to b. */
        rod(radius, material, shadow, radiusEnd) {
            const m = kit.mesh(new THREE.CylinderGeometry(radiusEnd === undefined ? radius : radiusEnd, radius, 1, 16, 1, radiusEnd !== undefined), material, shadow);
            m.between = (a, b) => {
                m.position.copy(a).add(b).multiplyScalar(0.5);
                tmp.copy(b).sub(a);
                m.scale.set(1, tmp.length(), 1);
                m.quaternion.setFromUnitVectors(UP, tmp.normalize());
                return m;
            };
            return m;
        },
        tube(points, radius, material, shadow) {
            const curve = new THREE.CatmullRomCurve3(points);
            const m = kit.mesh(new THREE.TubeGeometry(curve, 120, radius, 8, false), material, shadow);
            m.userData.curve = curve;
            return m;
        },
        /** Closed or open polyline. */
        path(points, material) {
            return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
        },
        circle(radius, y) {
            const pts = [];
            for (let i = 0; i <= 96; i++) pts.push(kit.v(Math.cos((i / 96) * TAU) * radius, y || 0, Math.sin((i / 96) * TAU) * radius));
            return pts;
        },
        /**
         * Flat ring sector in the xz plane, re-shaped every frame with
         * band.set(fromAngle, toAngle). Angles run counter-clockwise seen
         * from above.
         */
        band(inner, outer, material) {
            const n = 48;
            const pos = new Float32Array((n + 1) * 6);
            const idx = [];
            for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setIndex(idx);
            const m = new THREE.Mesh(geo, material);
            m.frustumCulled = false;
            m.set = (a0, a1) => {
                for (let i = 0; i <= n; i++) {
                    const a = lerp(a0, a1, i / n), c = Math.cos(a), s = -Math.sin(a);
                    pos.set([c * inner, 0, s * inner, c * outer, 0, s * outer], i * 6);
                }
                geo.attributes.position.needsUpdate = true;
            };
            return m;
        },
        glow(color, size, opacity) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowMap, color, transparent: true, opacity: opacity === undefined ? 0.7 : opacity,
                depthWrite: false, blending: pal.dark ? THREE.AdditiveBlending : THREE.NormalBlending
            }));
            s.scale.setScalar(size);
            return s;
        },
        /** A travelling quantum or classical signal. */
        photon(color, r) {
            const g = new THREE.Group();
            const radius = r || 0.035;
            g.add(kit.sphere(radius, kit.lit(color, 2), false));
            g.add(kit.glow(color, radius * 10, 0.75));
            return g;
        },
        /** Set the opacity of everything under obj (0 hides it). */
        fade(obj, opacity) {
            obj.visible = opacity > 0.01;
            if (!obj.visible) return;
            obj.traverse((o) => {
                const m = o.material;
                if (!m) return;
                if (m.userData.base === undefined) {
                    m.userData.base = m.opacity;
                    m.transparent = true;
                }
                m.opacity = m.userData.base * opacity;
            });
        }
    };
    return kit;
}

// --------------------------------------------------------------------------
// Scenes
//   note      one-paragraph summary under the model
//   source    the paper the model is drawn from
//   duration  seconds per cycle          view   resting camera
//   steps     [{ at, title, text }]      at = fraction of the cycle
//   param     optional slider; `auto(u)` sweeps it until the visitor takes hold
//   still     cycle fraction shown when motion is reduced
//   build(ctx) -> { update(u, t, n, value, camera), readout(), stepAt?(u, value) }
//             u = cycle fraction, t = running seconds, n = cycle count
// --------------------------------------------------------------------------

const SCENES = {};

// 1. Quantum sensing: Ramsey interferometry with a spin-squeezed probe.
SCENES.sensing = {
    note: 'A Ramsey measurement with a collective spin of N = 20 atoms on the Bloch sphere. Squeezing reshapes the probe’s quantum uncertainty so that it is narrow along the direction in which the phase is read, which lowers the phase error Δφ below the standard quantum limit 1/√N.',
    source: { title: 'Metrologically resourceful multipartite entanglement under quantum many-body effects', venue: 'Quantum Science and Technology, 2021', href: 'https://doi.org/10.1088/2058-9565/abd893' },
    duration: 15, still: 0.88,
    view: { yaw: 0.55, pitch: 0.34, dist: 7.4, target: [0, -0.1, 0], sway: 0.22 },
    param: { label: 'Squeezing', min: 0, max: 8, step: 0.5, value: 6, format: (v) => `${v.toFixed(1)} dB` },
    steps: [
        { at: 0, title: 'Prepare', text: 'All spins point the same way: a coherent state, with equal uncertainty in every direction (the round patch).' },
        { at: 0.18, title: 'Squeeze', text: 'Entangling the spins squeezes the patch: narrower along the equator, wider along the meridian. Its area is conserved.' },
        { at: 0.42, title: 'Sense', text: 'The signal rotates the spin about the vertical axis, writing the unknown phase φ into its direction.' },
        { at: 0.82, title: 'Read out', text: 'The narrow axis sets the error. Δφ = ξ/√N beats the standard quantum limit by the squeezing factor ξ.' }
    ],
    build(ctx) {
        const root = ctx.root, R = 1.1, N = 20, s0 = 1 / Math.sqrt(N), phiEnd = 2.25;
        ctx.ground(-1.42);

        root.add(K.mesh(new THREE.SphereGeometry(R, 72, 48), K.glass(pal.indigo, pal.dark ? 0.14 : 0.12), false));
        root.add(K.shadowOf(new THREE.SphereGeometry(R * 0.6, 32, 20)));
        root.add(K.ring(R, 0.009, K.metal(pal.indigo, 0.35), false));
        [0, Math.PI / 2].forEach((turn) => {
            const m = K.path(K.circle(R), K.line(pal.indigo, 0.45));
            m.rotation.order = 'YXZ';              // stand the circle up, then turn it
            m.rotation.set(Math.PI / 2, turn, 0);
            root.add(m);
        });
        [-0.52, 0.52].forEach((lat) => root.add(K.path(K.circle(R * Math.cos(lat), R * Math.sin(lat)), K.line(pal.indigo, 0.22))));
        root.add(K.rod(0.007, K.metal(pal.steel), false).between(K.v(0, -R * 1.2, 0), K.v(0, R * 1.2, 0)));
        root.add(K.rod(0.005, K.metal(pal.steel), false).between(K.v(0, 0, 0), K.v(R, 0, 0)));
        root.add(K.sphere(0.03, K.metal(pal.steel)).translateX(R));

        // Collective spin vector
        const arrow = new THREE.Group();
        const shaft = K.mesh(new THREE.CylinderGeometry(0.02, 0.02, R - 0.14, 16), K.metal(pal.ink, 0.35));
        shaft.position.y = (R - 0.14) / 2;
        const head = K.mesh(new THREE.ConeGeometry(0.055, 0.15, 24), K.metal(pal.ink, 0.35));
        head.position.y = R - 0.075;
        arrow.add(shaft, head);
        root.add(arrow, K.sphere(0.045, K.metal(pal.ink, 0.3)));

        // Uncertainty patch on the sphere, and a cloud of measurement shots
        const ringN = 56;
        const patchPos = new Float32Array((ringN + 2) * 3);
        const patchGeo = new THREE.BufferGeometry();
        patchGeo.setAttribute('position', new THREE.BufferAttribute(patchPos, 3));
        const fan = [];
        for (let i = 1; i <= ringN; i++) fan.push(0, i, i + 1);
        patchGeo.setIndex(fan);
        const patch = new THREE.Mesh(patchGeo, K.soft(pal.gold, 0.5));
        patch.frustumCulled = false;
        root.add(patch);

        const random = rng(11), shots = [];
        for (let i = 0; i < 70; i++) {
            const m = Math.sqrt(-2 * Math.log(1 - random() * 0.999)), a = TAU * random();
            shots.push([m * Math.cos(a), m * Math.sin(a)]);
        }
        const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(0.017, 10, 8), K.lit(pal.gold, 0.7), shots.length);
        cloud.frustumCulled = false;
        root.add(cloud);

        const arc = K.band(R * 0.36, R * 0.43, K.soft(pal.gold, 0.95));
        const wedge = K.band(0, R, K.soft(pal.gold, 0.26));
        arc.position.y = 0.004;
        wedge.position.y = 0.002;
        root.add(arc, wedge);

        const lUp = ctx.label('|↑↑…↑⟩'), lDown = ctx.label('|↓↓…↓⟩');
        lUp.pos.set(0, R * 1.32, 0);
        lDown.pos.set(0, -R * 1.32, 0);
        const lPhi = ctx.label('φ', 'gold'), lErr = ctx.label('Δφ', 'gold');

        const n = new THREE.Vector3(), ePhi = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
        const p = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), mat = new THREE.Matrix4();
        const state = { phi: 0, err: s0, gain: 0 };

        return {
            update(u, t, cycle, dB) {
                const xi = Math.pow(10, -dB / 20);
                const back = 1 - smooth(0.955, 1, u);
                const k = smooth(0.18, 0.4, u) * back;
                const phi = phiEnd * smooth(0.42, 0.82, u) * back;
                const minor = s0 * lerp(1, xi, k), major = s0 * lerp(1, 1 / xi, k);
                const tilt = (1 - k) * 0.7;

                n.set(Math.cos(phi), 0, -Math.sin(phi));
                ePhi.set(-Math.sin(phi), 0, -Math.cos(phi));
                e1.copy(ePhi).multiplyScalar(Math.cos(tilt)).addScaledVector(UP, Math.sin(tilt));
                e2.copy(ePhi).multiplyScalar(-Math.sin(tilt)).addScaledVector(UP, Math.cos(tilt));
                arrow.quaternion.setFromUnitVectors(UP, n);

                const onSphere = (x, y, lift) => p.copy(n).addScaledVector(e1, x * minor).addScaledVector(e2, y * major).normalize().multiplyScalar(R * lift);
                onSphere(0, 0, 1.006).toArray(patchPos, 0);
                for (let i = 0; i <= ringN; i++) {
                    const a = (i / ringN) * TAU;
                    onSphere(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 1.006).toArray(patchPos, (i + 1) * 3);
                }
                patchGeo.attributes.position.needsUpdate = true;
                shots.forEach((s, i) => {
                    mat.setPosition(onSphere(s[0], s[1], 1.012));
                    cloud.setMatrixAt(i, mat);
                });
                cloud.instanceMatrix.needsUpdate = true;

                arc.visible = phi > 0.02;
                arc.set(0, phi);
                wedge.visible = u > 0.42 && back > 0.5;
                wedge.set(phi - minor, phi + minor);
                lPhi.show = arc.visible ? 1 : 0;
                lPhi.pos.set(Math.cos(phi / 2) * R * 0.56, 0, -Math.sin(phi / 2) * R * 0.56);
                lErr.show = wedge.visible ? 1 : 0;
                lErr.pos.copy(n).multiplyScalar(R * 1.2).y += 0.14;

                state.phi = phi;
                state.err = minor;
                state.gain = -20 * Math.log10(minor / s0);
            },
            readout: () => [
                ['φ', `${state.phi.toFixed(2)} rad`],
                ['Δφ', `${state.err.toFixed(3)} rad`, 'gold'],
                ['SQL 1/√N', `${s0.toFixed(3)} rad`],
                ['gain', `${state.gain.toFixed(1)} dB`]
            ]
        };
    }
};

// 2. Quantum networking: entanglement distribution and swapping at a repeater.
SCENES.network = {
    note: 'A quantum repeater link. Entangled photon pairs are shared over two short fibres and held in quantum memories; a Bell-state measurement at the middle node then joins them into one long-distance entangled pair. The fidelities are those of Werner states with F = 0.95 on each link.',
    source: { title: 'Quantum network engineering in the NISQ age: Principles, missions, and challenges', venue: 'IEEE Network, 2024', href: 'https://doi.org/10.1109/mnet.2023.3328892' },
    duration: 13, still: 0.86,
    view: { yaw: 0.12, pitch: 0.3, dist: 7.6, target: [0, 0, 0], sway: 0.3 },
    steps: [
        { at: 0, title: 'Distribute', text: 'A source in the middle of each fibre emits an entangled photon pair, one photon toward each end.' },
        { at: 0.3, title: 'Store', text: 'Quantum memories catch the photons. Alice–Repeater and Repeater–Bob now each share an entangled pair.' },
        { at: 0.5, title: 'Swap', text: 'The repeater performs a Bell-state measurement on its two memories and sends the two-bit result to Alice and Bob.' },
        { at: 0.7, title: 'End-to-end link', text: 'Alice and Bob are entangled although their qubits never met. Swapping costs fidelity: F′ = F² + (1 − F)²/3.' }
    ],
    build(ctx) {
        const root = ctx.root, F = 0.95, Fswap = F * F + ((1 - F) * (1 - F)) / 3;
        ctx.ground(-1.15);
        const A = K.v(-1.55, 0, 0.3), M = K.v(0, 0.14, -0.1), B = K.v(1.55, 0, 0.35);
        const extra = [K.v(-0.85, 0.62, -1.15), K.v(0.95, 0.56, -1.2), K.v(0.15, -0.42, 1.2)];

        const fibre = K.glass(pal.indigo, 0.55);
        [[A, M], [M, B], [A, extra[0]], [extra[0], extra[1]], [extra[1], B], [M, extra[0]], [M, extra[1]], [A, extra[2]], [extra[2], B], [M, extra[2]]]
            .forEach((e) => root.add(K.rod(0.011, fibre, false).between(e[0], e[1])));
        extra.forEach((q) => root.add(K.sphere(0.085, K.metal(pal.steel, 0.35)).translateX(q.x).translateY(q.y).translateZ(q.z)));

        // Main nodes, each with a memory ring that lights while it holds a qubit
        const nodes = [A, M, B].map((q) => {
            const g = new THREE.Group();
            g.position.copy(q);
            g.add(K.sphere(0.14, K.metal(pal.indigo, 0.22)));
            const memory = K.ring(0.2, 0.014, K.lit(pal.gold, 1.6), false);
            const halo = K.glow(pal.gold, 0.9, 0.6);
            g.add(memory, halo);
            root.add(g);
            return { memory, halo };
        });

        const hops = [[A, M], [M, B]].map((h) => {
            const mid = h[0].clone().lerp(h[1], 0.5);
            const crystal = K.mesh(new THREE.OctahedronGeometry(0.065), K.gloss(pal.gold, 0.15));
            crystal.position.copy(mid);
            const strand = K.rod(0.024, K.lit(pal.gold, 1.5), false).between(h[0], h[1]);
            const photons = [K.photon(pal.gold), K.photon(pal.gold)];
            root.add(crystal, strand, photons[0], photons[1]);
            return { ends: h, mid, crystal, strand, photons };
        });

        const flash = K.ring(0.2, 0.012, K.lit(pal.teal, 2), false);
        flash.position.copy(M);
        const bits = [A, B].map(() => K.mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), K.lit(pal.teal, 1.6), false));
        const lift = A.clone().lerp(B, 0.5).add(K.v(0, 0.95, 0));
        const arc = K.tube([A, A.clone().lerp(lift, 0.6), lift, B.clone().lerp(lift, 0.6), B], 0.024, K.lit(pal.gold, 1.6), false);
        const runner = K.photon(pal.gold, 0.03);
        root.add(flash, bits[0], bits[1], arc, runner);

        ctx.label('Alice').pos.copy(A).y -= 0.3;
        ctx.label('Repeater').pos.copy(M).y -= 0.32;
        ctx.label('Bob').pos.copy(B).y -= 0.3;
        const lBsm = ctx.label('Bell measurement', 'teal');
        lBsm.pos.copy(M).y += 0.42;
        let stepNow = 0;

        return {
            update(u, t) {
                const fly = smooth(0.03, 0.28, u);
                const held = smooth(0.26, 0.34, u) * (1 - smooth(0.58, 0.7, u));
                const swap = smooth(0.5, 0.7, u);
                const end = smooth(0.66, 0.78, u) * (1 - smooth(0.95, 1, u));
                stepNow = u < 0.3 ? 0 : u < 0.5 ? 1 : u < 0.7 ? 2 : 3;

                hops.forEach((h) => {
                    h.crystal.rotation.y = t * 1.2;
                    h.crystal.scale.setScalar(1 + 0.25 * Math.sin(t * 6) * (u < 0.28 ? 1 : 0));
                    h.photons.forEach((ph, i) => {
                        ph.visible = u > 0.03 && u < 0.3;
                        ph.position.copy(h.mid).lerp(h.ends[i], fly);
                    });
                    K.fade(h.strand, held * (0.75 + 0.25 * Math.sin(t * 5)));
                });
                const hold = [Math.max(held * (1 - swap), end), held, Math.max(held * (1 - swap), end)];
                nodes.forEach((nd, i) => {
                    K.fade(nd.memory, hold[i]);
                    nd.memory.rotation.z = t * 0.8;
                    nd.halo.material.opacity = 0.55 * hold[i];
                });

                const ring = swap > 0 && swap < 1;
                flash.visible = ring;
                flash.scale.setScalar(1 + 2.2 * swap);
                flash.material.opacity = 1 - swap;
                lBsm.show = ring ? 1 : 0;
                const sent = smooth(0.56, 0.7, u);
                bits.forEach((b, i) => {
                    b.visible = sent > 0 && sent < 1;
                    b.position.copy(M).lerp(i ? B : A, sent).y += 0.12;
                    b.rotation.set(t * 3, t * 2, 0);
                });

                K.fade(arc, end);
                runner.visible = end > 0.5;
                runner.position.copy(arc.userData.curve.getPoint(0.5 + 0.48 * Math.sin(t * 1.6)));
            },
            readout: () => [
                ['F Alice–Rep.', stepNow >= 1 && stepNow < 3 ? F.toFixed(2) : '—'],
                ['F Rep.–Bob', stepNow >= 1 && stepNow < 3 ? F.toFixed(2) : '—'],
                ['F Alice–Bob', stepNow === 3 ? Fswap.toFixed(3) : '—', 'gold']
            ]
        };
    }
};

// 3. Quantum resources: tomography of a two-qubit Werner state.
SCENES.resource = {
    note: 'The density matrix of a two-qubit Werner state, ρ = p |Φ⁺⟩⟨Φ⁺| + (1 − p) I/4, drawn the way state tomography reports it. One parameter, p, carries the state through three distinct quantum resources: discord for any p > 0, entanglement above p = 1/3, and Bell nonlocality above p = 1/√2.',
    source: { title: 'Entanglement detection with artificial neural networks', venue: 'Scientific Reports, 2023', href: 'https://doi.org/10.1038/s41598-023-28745-3' },
    duration: 18, still: 0.27,
    view: { yaw: 0.62, pitch: 0.5, dist: 7.6, target: [0, -0.1, 0], sway: 0.25 },
    param: { label: 'Mixing p', min: 0, max: 1, step: 0.01, value: 0.5, format: (v) => v.toFixed(2), auto: (u) => 0.5 - 0.5 * Math.cos(TAU * u) },
    steps: [
        { at: 0.03, title: 'Separable', text: 'Mostly noise. The coherences (corner columns) sit below the threshold ring: no entanglement, though quantum discord is already present for any p > 0.' },
        { at: 0.2, title: 'Entangled', text: 'Past p = 1/3 the coherences clear the threshold and turn gold: concurrence C > 0. The CHSH value is still below 2.' },
        { at: 0.33, title: 'Bell-nonlocal', text: 'Past p = 1/√2 the state violates the CHSH inequality (S > 2): no local hidden-variable model can reproduce it.' }
    ],
    build(ctx) {
        const root = ctx.root, cell = 0.52, tall = 2.2, y0 = -0.72, half = cell * 2;
        ctx.ground(y0 - 0.075);
        const plate = K.mesh(new THREE.BoxGeometry(half * 2 + 0.24, 0.07, half * 2 + 0.24), K.gloss(pal.deep, 0.3));
        plate.position.y = y0 - 0.036;
        root.add(plate);

        const boxGeo = new THREE.BoxGeometry(cell * 0.72, 1, cell * 0.72);
        boxGeo.translate(0, 0.5, 0);
        const grey = pal.steel.clone().lerp(pal.card, 0.2);
        const bars = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const coherence = (i === 0 && j === 3) || (i === 3 && j === 0);
                const m = K.mesh(boxGeo, K.gloss(i === j ? pal.indigo : grey, 0.3));
                m.position.set((j - 1.5) * cell, y0, (i - 1.5) * cell);
                root.add(m);
                bars.push({ m, i, j, coherence });
                if (coherence) {
                    const yw = y0 + tall / 6, w = cell * 0.44;
                    const loop = K.path([K.v(-w, 0, -w), K.v(w, 0, -w), K.v(w, 0, w), K.v(-w, 0, w), K.v(-w, 0, -w)], K.line(pal.teal, 0.95));
                    loop.position.set(m.position.x, yw, m.position.z);
                    root.add(loop);
                }
            }
        }
        const basis = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
        basis.forEach((b, i) => {
            ctx.label(b).pos.set((i - 1.5) * cell, y0, half + 0.3);
            ctx.label(b).pos.set(half + 0.36, y0, (i - 1.5) * cell);
        });
        ctx.label('threshold p = 1/3', 'teal').pos.set(-1.5 * cell - 0.2, y0 + tall / 6 + 0.16, 1.5 * cell);
        const state = { p: 0 };

        return {
            stepAt: (u, p) => (p < 1 / 3 ? 0 : p < Math.SQRT1_2 ? 1 : 2),
            update(u, t, cycle, p) {
                state.p = p;
                const entangled = p > 1 / 3, nonlocal = p > Math.SQRT1_2;
                bars.forEach((b) => {
                    let v = 0;
                    if (b.i === b.j) v = (b.i === 0 || b.i === 3) ? (1 + p) / 4 : (1 - p) / 4;
                    else if (b.coherence) v = p / 2;
                    b.m.scale.y = Math.max(v * tall, 0.012);
                    if (b.coherence) {
                        b.m.material.color.copy(entangled ? pal.gold : grey);
                        b.m.material.emissive.copy(pal.gold).multiplyScalar(nonlocal ? 0.35 : 0);
                    }
                });
            },
            readout() {
                const p = state.p, S = 2 * Math.SQRT2 * p;
                return [
                    ['p', p.toFixed(2)],
                    ['concurrence', Math.max(0, (3 * p - 1) / 2).toFixed(2), p > 1 / 3 ? 'gold' : ''],
                    ['purity', ((1 + 3 * p * p) / 4).toFixed(2)],
                    ['CHSH S', S.toFixed(2), S > 2 ? 'gold' : '']
                ];
            }
        };
    }
};

// 4. Quantum semantic communication: send the meaning, not every sample.
SCENES.semantic = {
    note: 'Semantic communication sends what a message means for the task, not every sample of it. Here a 144-value source is distilled to features carried by three qubits over an entanglement-assisted channel, and the receiver rebuilds a coarser picture that keeps the shape that mattered.',
    source: { title: 'Quantum semantic communications for Metaverse: Principles and challenges', venue: 'IEEE Wireless Communications, 2023', href: 'https://doi.org/10.1109/mwc.002.2200613' },
    duration: 15, still: 0.93,
    view: { yaw: 0, pitch: 0.2, dist: 7.3, target: [0, 0.05, 0], sway: 0.24 },
    steps: [
        { at: 0, title: 'Source', text: 'The sender holds a detailed source: 144 values, most of them background that the task does not need.' },
        { at: 0.24, title: 'Semantic encoding', text: 'The encoder keeps only the task-relevant structure and writes it into the states of three qubits.' },
        { at: 0.5, title: 'Quantum transmission', text: 'The qubits cross the channel, assisted by entanglement shared in advance between the two ends.' },
        { at: 0.74, title: 'Reconstruction', text: 'The decoder rebuilds the meaning: a coarser picture, with the shape that mattered intact.' }
    ],
    build(ctx) {
        const root = ctx.root, random = rng(5);
        ctx.ground(-0.95);
        const intensity = (x, y) => {
            const r = Math.hypot(x, y);
            return clamp(Math.exp(-Math.pow((r - 0.62) / 0.15, 2)) + Math.exp(-Math.pow(r / 0.2, 2)), 0, 1);
        };
        const dim = pal.deep.clone().lerp(pal.steel, 0.25), tone = new THREE.Color(), mat = new THREE.Matrix4();
        const tileColor = (v) => tone.copy(dim).lerp(pal.teal, v);

        const panel = (x, turn, n, pitch) => {
            const g = new THREE.Group();
            g.position.set(x, 0.05, 0);
            g.rotation.y = turn;
            const back = K.mesh(new THREE.BoxGeometry(n * pitch + 0.08, n * pitch + 0.08, 0.03), K.gloss(pal.deep, 0.3));
            back.position.z = -0.03;
            const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(pitch * 0.86, pitch * 0.86, 0.03), K.gloss(0xffffff, 0.4), n * n);
            tiles.castShadow = true;
            const cells = [];
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const px = (j - (n - 1) / 2) * pitch, py = ((n - 1) / 2 - i) * pitch;
                    mat.setPosition(px, py, 0);
                    tiles.setMatrixAt(i * n + j, mat);
                    tiles.setColorAt(i * n + j, dim);
                    cells.push({ local: K.v(px, py, 0.03), v: 0, row: i });
                }
            }
            g.add(back, tiles);
            root.add(g);
            g.updateMatrixWorld(true);
            cells.forEach((c) => { c.world = g.localToWorld(c.local.clone()); });
            return { tiles, cells };
        };
        const src = panel(-1.7, 0.42, 12, 0.082), dst = panel(1.7, -0.42, 6, 0.164);
        src.cells.forEach((c, k) => { c.v = intensity(((k % 12) - 5.5) / 5.5, (Math.floor(k / 12) - 5.5) / 5.5); });
        dst.cells.forEach((c, k) => {
            const j = k % 6, i = Math.floor(k / 6);
            c.v = (src.cells[i * 2 * 12 + j * 2].v + src.cells[i * 2 * 12 + j * 2 + 1].v + src.cells[(i * 2 + 1) * 12 + j * 2].v + src.cells[(i * 2 + 1) * 12 + j * 2 + 1].v) / 4;
        });
        const salient = src.cells.slice().sort((a, b) => b.v - a.v).slice(0, 36);

        // Encoder and decoder horns, channel, carrier qubits
        const inX = -0.62, outX = 0.62;
        [[-0.9, -1, inX], [0.9, 1, outX]].forEach((h) => {
            const horn = K.mesh(new THREE.CylinderGeometry(0.1, 0.4, 0.55, 40, 1, true), K.glass(pal.indigo, 0.34), false);
            horn.rotation.z = h[1] * Math.PI / 2;      // narrow end toward the channel
            horn.position.set(h[0], 0.05, 0);
            const lip = K.mesh(new THREE.TorusGeometry(0.1, 0.012, 12, 48), K.metal(pal.indigo, 0.3));
            lip.rotation.y = Math.PI / 2;
            lip.position.set(h[2], 0.05, 0);
            root.add(horn, lip);
        });
        root.add(K.rod(0.085, K.glass(pal.indigo, 0.12), false).between(K.v(inX, 0.05, 0), K.v(outX, 0.05, 0)));

        const qubits = [0, 1, 2].map((i) => {
            const g = new THREE.Group();
            g.add(K.sphere(0.075, K.glass(pal.gold, 0.4), false), K.sphere(0.03, K.lit(pal.gold, 1.4), false));
            const needle = K.rod(0.008, K.metal(pal.gold, 0.25), false).between(K.v(0, 0, 0), K.v(0, 0.075, 0));
            const spin = new THREE.Group();
            spin.add(needle);
            g.add(spin, K.glow(pal.gold, 0.5, 0.5));
            root.add(g);
            return { g, spin, i };
        });

        const bell = [K.v(inX, 0.24, 0), K.v(outX, 0.24, 0)];
        const pairArc = K.tube([bell[0], K.v(inX * 0.6, 0.82, 0), K.v(0, 0.98, 0), K.v(outX * 0.6, 0.82, 0), bell[1]], 0.008, K.lit(pal.gold, 1.2), false);
        root.add(pairArc);
        bell.forEach((q) => root.add(K.photon(pal.gold, 0.028).translateX(q.x).translateY(q.y)));

        const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 10, 8), K.lit(pal.teal, 1.6), 36);
        motes.frustumCulled = false;
        root.add(motes);
        const offs = salient.map(() => random());

        ctx.label('source').pos.set(-1.7, -0.62, 0);
        ctx.label('encoder').pos.set(-0.9, -0.5, 0);
        ctx.label('quantum channel').pos.set(0, -0.2, 0);
        ctx.label('decoder').pos.set(0.9, -0.5, 0);
        ctx.label('reconstruction').pos.set(1.7, -0.62, 0);
        ctx.label('shared entanglement', 'gold').pos.set(0, 1.12, 0);

        const mouthIn = K.v(inX - 0.5, 0.05, 0), mouthOut = K.v(outX + 0.5, 0.05, 0), q = new THREE.Vector3(), hide = K.v(0, -50, 0);
        const state = { sent: 0, built: 0 };

        return {
            update(u, t) {
                const reset = 1 - smooth(0.96, 1, u);
                // Source lights up row by row
                const scan = smooth(0, 0.2, u) * 13;
                src.cells.forEach((c, k) => src.tiles.setColorAt(k, tileColor(c.v * clamp(scan - c.row, 0, 1))));
                src.tiles.instanceColor.needsUpdate = true;

                const enc = smooth(0.24, 0.5, u), dec = smooth(0.74, 0.94, u), cross = smooth(0.5, 0.72, u);
                let built = 0;
                salient.forEach((c, k) => {
                    const a = clamp(enc * 1.6 - offs[k] * 0.6, 0, 1), b = clamp(dec * 1.6 - offs[k] * 0.6, 0, 1);
                    if (a > 0 && a < 1) q.copy(c.world).lerp(mouthIn, smooth(0, 1, a));
                    else if (b > 0 && b < 1) q.copy(mouthOut).lerp(dst.cells[k].world, smooth(0, 1, b));
                    else q.copy(hide);
                    mat.setPosition(q);
                    motes.setMatrixAt(k, mat);
                    const shown = b >= 1 ? reset : 0;
                    if (shown) built++;
                    dst.tiles.setColorAt(k, tileColor(dst.cells[k].v * shown));
                });
                motes.instanceMatrix.needsUpdate = true;
                dst.tiles.instanceColor.needsUpdate = true;

                qubits.forEach((qb) => {
                    const x = lerp(inX + 0.14 + qb.i * 0.16, outX - 0.46 + qb.i * 0.16, cross);
                    qb.g.position.set(x, 0.05, 0);
                    const on = smooth(0.3, 0.5, u) * (1 - smooth(0.74, 0.86, u));
                    K.fade(qb.g, on);
                    qb.spin.rotation.set(0.7 + qb.i * 0.9, 0, 1.1 + qb.i * 1.3 + (cross > 0 && cross < 1 ? t * 2 : 0));
                });
                pairArc.material.opacity = 0.45 + 0.4 * (cross > 0 && cross < 1 ? 0.5 + 0.5 * Math.sin(t * 6) : 0);
                state.sent = u > 0.5 ? 3 : 0;
                state.built = built;
            },
            readout: () => [
                ['source', '144 values'],
                ['transmitted', state.sent ? '3 qubits' : '—', 'gold'],
                ['rebuilt', `${state.built} / 36 values`, 'teal']
            ]
        };
    }
};

// 5. Quantum machine learning: one training iteration of a hybrid model.
SCENES.learning = {
    note: 'One training iteration of a hybrid quantum-classical model. A parameterised circuit acts on four entangled qubits, its measurement outcomes feed a small classical network, and the gradient of the loss returns to update the gate angles. The loss falls from one epoch to the next as the angles settle.',
    source: { title: 'Quantum Machine Learning: Towards Hybrid Quantum-Classical Vision Models', venue: 'Mathematics, 2025', href: 'https://doi.org/10.3390/math13162645' },
    duration: 12, still: 0.45,
    view: { yaw: -0.22, pitch: 0.2, dist: 7.8, target: [0, -0.22, 0], sway: 0.22 },
    steps: [
        { at: 0, title: 'Encode', text: 'A data sample is loaded onto four qubits and enters the first layer of rotation gates.' },
        { at: 0.25, title: 'Variational circuit', text: 'Entangling gates and trainable rotations U(θ) process the state. Each dial is one trainable angle.' },
        { at: 0.5, title: 'Measure', text: 'The qubits are measured and the outcomes pass through a classical network to the prediction.' },
        { at: 0.7, title: 'Update', text: 'The loss gradient returns along the lower path and nudges every angle: θ ← θ − η∇L.' }
    ],
    build(ctx) {
        const root = ctx.root, random = rng(31);
        ctx.ground(-1.5);
        const wires = [0.54, 0.18, -0.18, -0.54], x0 = -1.75, x1 = 0.35, gx = [-1.25, -0.35];
        const steel = K.metal(pal.steel, 0.35);

        const dials = [];
        const meters = [];
        wires.forEach((y, i) => {
            root.add(K.rod(0.008, steel).between(K.v(x0, y, 0), K.v(x1, y, 0)));
            gx.forEach((x) => {
                const box = K.mesh(new THREE.BoxGeometry(0.21, 0.21, 0.21), K.glass(pal.indigo, 0.34), false);
                box.position.set(x, y, 0);
                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), K.line(pal.indigo, 0.9));
                edges.position.copy(box.position);
                const dial = new THREE.Group();
                dial.position.copy(box.position);
                dial.add(K.rod(0.009, K.lit(pal.gold, 0.9), false).between(K.v(0, 0, 0), K.v(0, 0.088, 0)));
                dial.add(K.sphere(0.018, K.lit(pal.gold, 0.9), false));
                root.add(box, edges, dial, K.shadowOf(box.geometry).translateX(x).translateY(y));
                dials.push({ dial, from: random() * TAU, to: (random() - 0.5) * 1.2 });
            });
            const meter = K.mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, TAU, 0, Math.PI / 2), K.gloss(pal.deep, 0.3));
            meter.position.set(x1, y - 0.04, 0);
            const needle = new THREE.Group();
            needle.position.copy(meter.position);
            needle.add(K.rod(0.006, K.lit(pal.gold, 0.9), false).between(K.v(0, 0, 0.02), K.v(0, 0.085, 0.02)));
            root.add(meter, needle);
            meters.push(needle);
        });

        // Entangling gates: control dot, link, target ring
        const controls = [];
        [[-0.8, 0, 1], [-0.8, 2, 3], [0.05, 1, 2]].forEach((c) => {
            const ya = wires[c[1]], yb = wires[c[2]];
            const dot = K.sphere(0.036, K.lit(pal.indigo, 0.3));
            dot.position.set(c[0], ya, 0);
            const target = K.mesh(new THREE.TorusGeometry(0.06, 0.009, 10, 40), K.metal(pal.indigo, 0.3));
            target.position.set(c[0], yb, 0);
            root.add(K.rod(0.008, K.metal(pal.indigo, 0.3)).between(K.v(c[0], ya, 0), K.v(c[0], yb - 0.06, 0)), dot, target);
            controls.push(dot);
        });

        // Classical network
        const layerA = wires.map((y, i) => K.v(0.9, y * 0.95, i % 2 ? -0.28 : 0.28));
        const layerB = [K.v(1.3, 0.4, -0.2), K.v(1.3, 0, 0.26), K.v(1.3, -0.4, -0.2)], out = K.v(1.7, 0, 0);
        const links = [];
        layerA.forEach((a) => layerB.forEach((b) => links.push([a, b])));
        layerB.forEach((b) => links.push([b, out]));
        const seg = [];
        wires.forEach((y, i) => seg.push(K.v(x1 + 0.09, y, 0), layerA[i]));
        links.forEach((l) => seg.push(l[0], l[1]));
        root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), K.line(pal.teal, 0.5)));
        layerA.concat(layerB).forEach((q) => root.add(K.sphere(0.055, K.gloss(pal.teal, 0.25)).translateX(q.x).translateY(q.y).translateZ(q.z)));
        const outNode = K.sphere(0.08, K.lit(pal.teal, 0.2));
        outNode.position.copy(out);
        const outGlow = K.glow(pal.teal, 0.8, 0);
        outGlow.position.copy(out);
        root.add(outNode, outGlow);

        const loop = K.tube([K.v(1.7, -0.12, 0), K.v(1.62, -0.85, 0.36), K.v(0.6, -1.26, 0.52), K.v(-0.7, -1.26, 0.52), K.v(-1.3, -1.02, 0.36), K.v(-1.25, -0.74, 0)], 0.008, K.lit(pal.teal, 0.9), false);
        const grad = K.photon(pal.teal, 0.032);
        const pulses = wires.map(() => K.photon(pal.gold, 0.03));
        const signals = [0, 1, 2, 3].map(() => K.photon(pal.teal, 0.024));
        root.add(loop, grad, ...pulses, ...signals);

        ctx.label('data').pos.set(x0 - 0.12, 0.84, 0);
        ctx.label('quantum circuit U(θ)').pos.set(-0.75, 0.9, 0);
        ctx.label('classical network').pos.set(1.32, 0.78, 0);
        ctx.label('θ ← θ − η∇L', 'teal').pos.set(0, -1.44, 0.52);

        const angle = (d, epoch) => d.to + (d.from - d.to) * Math.exp(-epoch / 2.5);
        const state = { epoch: 0, loss: 1 };

        return {
            update(u, t, cycle) {
                const epoch = cycle % 10;
                const learn = smooth(0.86, 0.99, u);
                dials.forEach((d) => { d.dial.rotation.x = lerp(angle(d, epoch), angle(d, epoch + 1), learn); });

                const a = smooth(0, 0.24, u), b = smooth(0.26, 0.5, u);
                pulses.forEach((p, i) => {
                    p.visible = u < 0.52;
                    p.position.set(u < 0.25 ? lerp(x0, gx[0], a) : lerp(gx[0], x1, b), wires[i], 0);
                });
                controls.forEach((c) => { c.material.emissiveIntensity = 0.3 + 2.2 * Math.exp(-Math.pow((u - 0.33) / 0.05, 2)); });
                meters.forEach((m, i) => { m.rotation.z = -0.9 + 1.8 * smooth(0.5, 0.56, u) * (0.3 + 0.7 * ((i * 37 + epoch * 13) % 10) / 10) * (1 - smooth(0.9, 1, u)); });

                const s1 = smooth(0.52, 0.61, u), s2 = smooth(0.61, 0.7, u);
                signals.forEach((s, i) => {
                    s.visible = u > 0.52 && u < 0.7;
                    if (u < 0.61) s.position.copy(layerA[i]).lerp(layerB[i % 3], s1);
                    else s.position.copy(layerB[i % 3]).lerp(out, s2);
                });
                const fire = Math.exp(-Math.pow((u - 0.72) / 0.06, 2));
                outNode.material.emissiveIntensity = 0.2 + 2 * fire;
                outGlow.material.opacity = 0.7 * fire;

                const ret = smooth(0.72, 0.9, u);
                grad.visible = ret > 0 && ret < 1;
                grad.position.copy(loop.userData.curve.getPoint(ret));

                state.epoch = epoch + 1;
                state.loss = 0.02 + 0.98 * Math.exp(-(epoch + learn) / 1.25);
            },
            readout: () => [
                ['epoch', `${state.epoch} / 10`],
                ['loss', state.loss.toFixed(3), 'teal'],
                ['trainable angles', '8']
            ]
        };
    }
};

// 6. Quantum optimisation: a variational algorithm on an energy landscape.
SCENES.optimization = {
    note: 'A variational quantum algorithm at work. The surface is the energy ⟨H(θ)⟩ as a function of two circuit parameters; the ball follows a real gradient descent across it. The first run is caught by a local minimum, and a restart from a new initial point reaches the ground-state energy E₀.',
    source: { title: 'Quantum Computing for Intelligent Transportation Systems: VQE-Based Traffic Routing and EV Charging Scheduling', venue: 'Mathematics, 2025', href: 'https://doi.org/10.3390/math13172761' },
    duration: 16, still: 0.86,
    view: { yaw: 0.65, pitch: 0.62, dist: 8, target: [0, -0.35, 0], sway: 0.3 },
    steps: [
        { at: 0, title: 'Initialise', text: 'The circuit parameters θ start at a random point of the energy landscape.' },
        { at: 0.07, title: 'Descend', text: 'Each iteration measures ⟨H⟩ on the quantum processor; a classical optimiser steps θ downhill.' },
        { at: 0.4, title: 'Trapped', text: 'The run settles in a local minimum: the gradient vanishes, but the energy is not the lowest available.' },
        { at: 0.52, title: 'Restart', text: 'A new initial point leads to the global minimum: the ground-state energy E₀, and the solution it encodes.' }
    ],
    build(ctx) {
        const root = ctx.root, D = 1.45;
        const E = (x, z) => 0.3 * Math.sin(1.9 * x + 0.4) * Math.cos(1.6 * z - 0.3) + 0.2 * Math.sin(2.7 * z + 1.1) * Math.cos(1.1 * x) + 0.09 * (x * x + z * z) - 0.3;
        ctx.ground(-1.3);

        const seg = 80, geo = new THREE.PlaneGeometry(2 * D, 2 * D, seg, seg);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
        let low = Infinity, high = -Infinity, best = [0, 0];
        for (let i = 0; i < pos.count; i++) {
            const e = E(pos.getX(i), pos.getZ(i));
            pos.setY(i, e);
            if (e < low) { low = e; best = [pos.getX(i), pos.getZ(i)]; }
            if (e > high) high = e;
        }
        const top = pal.indigo.clone().lerp(pal.card, 0.62), c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const k = (pos.getY(i) - low) / (high - low);
            c.copy(pal.deep).lerp(pal.indigo, smooth(0, 0.55, k)).lerp(top, smooth(0.45, 1, k)).toArray(colors, i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        root.add(K.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide })));

        const grid = [];
        for (let i = 0; i <= 16; i++) {
            const d = -D + (2 * D * i) / 16;
            for (let j = 0; j < 48; j++) {
                const s0 = -D + (2 * D * j) / 48, s1 = -D + (2 * D * (j + 1)) / 48;
                grid.push(K.v(d, E(d, s0) + 0.004, s0), K.v(d, E(d, s1) + 0.004, s1), K.v(s0, E(s0, d) + 0.004, d), K.v(s1, E(s1, d) + 0.004, d));
            }
        }
        root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), K.line(pal.dark ? pal.card : pal.ink, 0.16)));

        // Gradient descent with momentum from a given start, sampled as a path
        const descend = (x, z) => {
            const pts = [], h = 0.01;
            let vx = 0, vz = 0;
            for (let k = 0; k < 900; k++) {
                pts.push(K.v(x, E(x, z) + 0.075, z));
                vx = vx * 0.95 - ((E(x + h, z) - E(x - h, z)) / (2 * h)) * 0.0011;
                vz = vz * 0.95 - ((E(x, z + h) - E(x, z - h)) / (2 * h)) * 0.0011;
                x = clamp(x + vx, -D, D);
                z = clamp(z + vz, -D, D);
                if (k > 60 && Math.hypot(vx, vz) < 0.0004) break;
            }
            return { pts, end: E(x, z) };
        };
        const random = rng(23);
        let stuck = null, solved = null;
        for (let k = 0; k < 80 && !(stuck && solved); k++) {
            const run = descend(lerp(-D, D, random()) * 0.9, lerp(-D, D, random()) * 0.9);
            if (run.pts.length < 80) continue;
            if (run.end > low + 0.06) stuck = stuck || run;
            else solved = solved || run;
        }
        stuck = stuck || solved;
        solved = solved || stuck;

        const runs = [stuck, solved].map((run) => {
            const curve = new THREE.CatmullRomCurve3(run.pts.filter((_, i) => i % 4 === 0 || i === run.pts.length - 1));
            const trail = K.mesh(new THREE.TubeGeometry(curve, 240, 0.013, 6, false), K.lit(pal.gold, 1.1), false);
            root.add(trail);
            return { curve, trail, steps: run.pts.length, end: run.end };
        });
        const ball = K.sphere(0.075, K.metal(pal.gold, 0.2));
        const halo = K.glow(pal.gold, 0.7, 0.5);
        root.add(ball, halo);

        const ground = K.v(best[0], low, best[1]);
        const mark = K.ring(0.15, 0.012, K.lit(pal.gold, 1.4), false);
        mark.position.copy(ground).y += 0.03;
        root.add(mark, K.rod(0.005, K.lit(pal.gold, 1), false).between(ground, ground.clone().setY(low + 0.55)));
        ctx.label('E₀', 'gold').pos.copy(ground).y += 0.68;
        const lTrap = ctx.label('local minimum', 'teal');
        lTrap.pos.copy(stuck.pts[stuck.pts.length - 1]).y += 0.3;
        const state = { e: 0, k: 0 }, p = new THREE.Vector3();

        return {
            update(u, t) {
                const first = u < 0.52;
                const run = runs[first ? 0 : 1];
                const f = first ? smooth(0.07, 0.4, u) : smooth(0.58, 0.9, u);
                run.curve.getPoint(f, p);
                const drop = first ? 1 - smooth(0, 0.07, u) : 1 - smooth(0.52, 0.58, u);
                ball.position.copy(p).y += drop * 0.6;
                halo.position.copy(ball.position);
                const visible = (first ? 1 - smooth(0.48, 0.52, u) : 1) * (1 - smooth(0.97, 1, u)) * (1 - drop * 0.9);
                K.fade(ball, visible);
                halo.material.opacity = 0.5 * visible;

                runs.forEach((r, i) => {
                    const on = (i === 0) === first;
                    r.trail.visible = on && f > 0.004;
                    r.trail.geometry.setDrawRange(0, Math.floor(f * 240) * 36);
                    r.trail.material.opacity = visible;
                });
                mark.scale.setScalar(1 + (u > 0.9 ? 0.25 * Math.sin(t * 5) : 0));
                lTrap.show = u > 0.38 && u < 0.52 ? 1 : 0;
                state.e = E(p.x, p.z);
                state.k = Math.round(f * run.steps);
            },
            readout: () => [
                ['⟨H(θ)⟩', state.e.toFixed(3), 'gold'],
                ['E₀', low.toFixed(3)],
                ['iteration', String(state.k)]
            ]
        };
    }
};

// 7. Satellite-ground networks: a dual-downlink pass over two ground stations.
SCENES.satellite = {
    note: 'A satellite carrying an entangled-photon source passes over two ground stations. While both see it above the horizon it sends one photon of each pair to each station, leaving the two distant stations entangled: the basis of an integrated satellite-ground quantum sensing network. Altitude is exaggerated for clarity.',
    source: { title: 'Integrated satellite-ground variational quantum sensing networks', venue: 'IEEE Communications Magazine, 2024', href: 'https://doi.org/10.1109/mcom.005.2300844' },
    duration: 16, still: 0.55,
    view: { yaw: 0, pitch: 0.42, dist: 8.6, target: [0, 0.05, 0], sway: 0.2 },
    steps: [
        { at: 0, title: 'Approach', text: 'The satellite is still below the horizon of the two ground stations: no optical link is possible yet.' },
        { at: 0.4, title: 'Dual downlink', text: 'Both stations now see the satellite. It beams one photon of each entangled pair down to each of them.' },
        { at: 0.5, title: 'Stations entangled', text: 'The stations share entanglement across the ground: a quantum link for joint sensing over a long baseline.' },
        { at: 0.6, title: 'Pass ends', text: 'The satellite sets. The stored entanglement fades unless it is used or refreshed by the next pass.' }
    ],
    build(ctx) {
        const root = ctx.root, R = 1, alt = 1.42, minEl = 10;
        ctx.ground(-1.45);
        const onGlobe = (lat, lon, r) => K.v(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));
        const deg = Math.PI / 180;

        root.add(K.mesh(new THREE.SphereGeometry(R, 72, 48), new THREE.MeshPhysicalMaterial({ color: pal.deep, roughness: 0.5, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.35 })));
        const air = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 48, 32), new THREE.MeshBasicMaterial({ color: pal.indigo, transparent: true, opacity: pal.dark ? 0.2 : 0.16, side: THREE.BackSide, depthWrite: false }));
        root.add(air);
        const grat = [];
        for (let i = -2; i <= 2; i++) for (let j = 0; j < 72; j++) grat.push(onGlobe(i * 30 * deg, (j / 72) * TAU, R * 1.003), onGlobe(i * 30 * deg, ((j + 1) / 72) * TAU, R * 1.003));
        for (let i = 0; i < 12; i++) for (let j = 0; j < 36; j++) grat.push(onGlobe((-90 + j * 5) * deg, (i / 12) * TAU, R * 1.003), onGlobe((-85 + j * 5) * deg, (i / 12) * TAU, R * 1.003));
        root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), K.line(pal.dark ? pal.indigo : pal.card, 0.32)));

        const UP = new THREE.Vector3(0, 1, 0);
        const station = (lat, lon, main) => {
            const at = onGlobe(lat * deg, lon * deg, R);
            const dish = K.mesh(new THREE.ConeGeometry(main ? 0.04 : 0.025, main ? 0.08 : 0.05, 16), main ? K.lit(pal.teal, 0.5) : K.metal(pal.steel));
            dish.position.copy(at).multiplyScalar(1.03);
            dish.quaternion.setFromUnitVectors(UP, at.clone().normalize());
            const halo = K.glow(pal.teal, 0.5, 0);
            halo.position.copy(dish.position);
            root.add(dish, halo);
            return { at, dish, halo, up: at.clone().normalize() };
        };
        const G = [station(36, -17, true), station(27, 17, true)];
        [[58, 62], [-8, -52], [2, 58], [62, -70]].forEach((s) => station(s[0], s[1], false));

        // Orbit passing over the midpoint of the two stations
        const overhead = G[0].up.clone().add(G[1].up).normalize();
        const east = new THREE.Vector3().crossVectors(UP, overhead).normalize();
        const north = new THREE.Vector3().crossVectors(overhead, east);
        const along = east.clone().multiplyScalar(Math.cos(0.45)).addScaledVector(north, Math.sin(0.45));
        const orbitAt = (u, out) => out.copy(overhead).multiplyScalar(Math.cos(TAU * (u - 0.5)) * alt).addScaledVector(along, Math.sin(TAU * (u - 0.5)) * alt);
        const ringPts = [];
        for (let i = 0; i <= 128; i++) ringPts.push(orbitAt(i / 128, new THREE.Vector3()));
        root.add(K.path(ringPts, K.line(pal.steel, 0.5)));
        const other = K.path(K.circle(1.62), K.line(pal.steel, 0.28));
        other.rotation.set(1.15, 0, 0.5);
        root.add(other);

        const craft = () => {
            const g = new THREE.Group();
            g.add(K.mesh(new THREE.BoxGeometry(0.085, 0.07, 0.07), K.metal(pal.gold, 0.35)));
            [-1, 1].forEach((s) => {
                const wing = K.mesh(new THREE.BoxGeometry(0.17, 0.006, 0.075), K.gloss(pal.indigo, 0.2));
                wing.position.x = s * 0.135;
                g.add(wing);
            });
            const scope = K.mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.05, 16), K.metal(pal.steel, 0.3));
            scope.rotation.x = Math.PI / 2;
            scope.position.z = 0.06;
            g.add(scope);
            root.add(g);
            return g;
        };
        const sat = craft(), drifter = craft();

        const links = G.map(() => {
            const beam = K.rod(0.05, K.soft(pal.gold, pal.dark ? 0.3 : 0.38), false, 0.012);
            const photons = [K.photon(pal.gold, 0.022), K.photon(pal.gold, 0.022)];
            root.add(beam, photons[0], photons[1]);
            return { beam, photons };
        });
        const arcPts = [];
        for (let i = 0; i <= 24; i++) arcPts.push(G[0].up.clone().lerp(G[1].up, i / 24).normalize().multiplyScalar(R * 1.045));
        const groundArc = K.tube(arcPts, 0.012, K.lit(pal.gold, 1.6), false);
        root.add(groundArc);

        const lA = ctx.label('station A', 'teal'), lB = ctx.label('station B', 'teal'), lSat = ctx.label('entangled-photon source', 'gold');
        // Station names sit clear of the globe, joined to their dishes by a leader
        lA.pos.set(-1.5, 0.95, 0.3);
        lB.pos.set(1.5, 0.95, 0.3);
        [[G[0], lA, 0.3], [G[1], lB, -0.3]].forEach((l) => {
            root.add(K.path([l[0].dish.position, l[1].pos.clone().add(K.v(l[2], -0.08, 0))], K.line(pal.teal, 0.7)));
        });

        const p = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Vector3();
        const elevation = (u, g) => {
            orbitAt(u, d).sub(g.at);
            return Math.asin(d.dot(g.up) / d.length()) / deg;
        };
        const state = { el: [0, 0], linked: false, stored: 0 };

        return {
            stepAt(u) {
                const up = elevation(u, G[0]) > minEl && elevation(u, G[1]) > minEl;
                if (u < 0.5) return up ? 1 : 0;
                return up && u < 0.56 ? 2 : (state.stored > 0.02 && up ? 2 : 3);
            },
            update(u, t) {
                orbitAt(u, p);
                sat.position.copy(p);
                sat.lookAt(0, 0, 0);
                drifter.position.set(Math.cos(t * 0.22 + 1) * 1.62, 0, Math.sin(t * 0.22 + 1) * 1.62).applyEuler(other.rotation);
                drifter.lookAt(0, 0, 0);
                lSat.pos.copy(p).multiplyScalar(1.14);

                let both = 1;
                G.forEach((g, i) => {
                    const el = elevation(u, g), vis = smooth(minEl, minEl + 8, el);
                    state.el[i] = el;
                    both = Math.min(both, vis);
                    links[i].beam.between(g.dish.position, p);
                    K.fade(links[i].beam, vis);
                    links[i].photons.forEach((ph, k) => {
                        ph.visible = vis > 0.3;
                        ph.position.copy(p).lerp(g.dish.position, (t * 0.9 + k * 0.5 + i * 0.25) % 1);
                    });
                    g.halo.material.opacity = 0.75 * vis;
                    g.dish.material.emissiveIntensity = 0.5 + 2 * vis;
                });
                // Entanglement builds while both links are up, then decays
                const window = smooth(0.42, 0.5, u);
                state.stored = both > 0.3 ? window : window * (1 - smooth(0.62, 0.86, u)) * (u > 0.5 ? 1 : 0);
                K.fade(groundArc, state.stored * (0.8 + 0.2 * Math.sin(t * 5)));
                state.linked = both > 0.3;
                lSat.show = p.z > -0.4 ? 1 : 0;
            },
            readout: () => [
                ['elevation at A', state.el[0] > 0 ? `${state.el[0].toFixed(0)}°` : 'below horizon'],
                ['elevation at B', state.el[1] > 0 ? `${state.el[1].toFixed(0)}°` : 'below horizon'],
                ['downlink', state.linked ? 'both stations' : 'none', state.linked ? 'gold' : ''],
                ['ground link', state.stored > 0.5 ? 'entangled' : state.stored > 0.02 ? 'fading' : 'none', state.stored > 0.5 ? 'gold' : '']
            ]
        };
    }
};

// 8. Clock synchronisation with time-correlated photon pairs.
SCENES.clock = {
    note: 'Three remote clocks drift away from true time (the pale hand). A central source shares entangled photons whose arrival times are tightly correlated, so comparing the recorded timestamps reveals each clock’s offset Δt to picosecond precision, and each node corrects itself. Offsets shown are illustrative.',
    source: { title: 'Quantum Clock Synchronization Networks: A Survey', venue: 'IEEE Communications Surveys & Tutorials, 2026', href: 'https://doi.org/10.1109/comst.2026.3694353' },
    duration: 15, still: 0.5,
    view: { yaw: 0, pitch: 0.2, dist: 8.2, target: [0, -0.15, 0], sway: 0.28 },
    steps: [
        { at: 0, title: 'Drift', text: 'Each clock runs slightly fast or slow. The gold wedge is its offset Δt from true time.' },
        { at: 0.28, title: 'Share photons', text: 'The source emits entangled photons that leave at the same instant and travel to every node.' },
        { at: 0.56, title: 'Correlate', text: 'Each node timestamps its arrivals. Cross-correlating the records exposes the offsets between the clocks.' },
        { at: 0.76, title: 'Correct', text: 'Every node subtracts its measured offset. The clocks now agree: Δt → 0.' }
    ],
    build(ctx) {
        const root = ctx.root, floor = -1.25;
        ctx.ground(floor);
        const S = K.v(0, -0.5, 0.15);
        const sites = [{ at: K.v(-1.4, 0.1, 0.35), dt: 38, name: 'A' }, { at: K.v(1.4, 0.1, 0.35), dt: -27, name: 'B' }, { at: K.v(0, 0.62, -1.25), dt: 15, name: 'C' }];
        const steel = K.metal(pal.steel, 0.35), r = 0.36;

        const stand = (at, radius) => {
            root.add(K.rod(0.014, steel).between(K.v(at.x, floor, at.z), at));
            const foot = K.mesh(new THREE.CylinderGeometry(radius, radius * 1.15, 0.03, 32), steel);
            foot.position.set(at.x, floor + 0.015, at.z);
            root.add(foot);
        };
        stand(S, 0.16);
        const crystal = K.mesh(new THREE.OctahedronGeometry(0.13), K.gloss(pal.gold, 0.12));
        crystal.position.copy(S).y += 0.14;
        const sHalo = K.glow(pal.gold, 1, 0.4);
        sHalo.position.copy(crystal.position);
        root.add(crystal, sHalo);
        ctx.label('entangled-photon source').pos.copy(S).y -= 0.2;

        const hand = (w, len, material, z) => {
            const g = new THREE.BoxGeometry(w, len, 0.008);
            g.translate(0, len / 2 - 0.02, 0);
            const m = K.mesh(g, material, false);
            m.position.z = z;
            return m;
        };
        const clocks = sites.map((s) => {
            stand(s.at, 0.13);
            root.add(K.rod(0.008, K.glass(pal.indigo, 0.5), false).between(crystal.position, s.at));
            const g = new THREE.Group();
            g.position.copy(s.at);
            const face = K.mesh(new THREE.CylinderGeometry(r, r, 0.05, 64), K.gloss(pal.card, 0.35));
            face.rotation.x = Math.PI / 2;
            const rim = K.mesh(new THREE.TorusGeometry(r, 0.022, 14, 80), K.metal(pal.indigo, 0.25));
            const glowRim = K.mesh(new THREE.TorusGeometry(r * 1.1, 0.012, 10, 80), K.lit(pal.teal, 1.8), false);
            g.add(face, rim, glowRim);
            for (let i = 0; i < 12; i++) {
                const tick = K.mesh(new THREE.BoxGeometry(0.012, i % 3 ? 0.035 : 0.06, 0.006), K.gloss(pal.ink, 0.4), false);
                const a = (i / 12) * TAU;
                tick.position.set(Math.sin(a) * r * 0.86, Math.cos(a) * r * 0.86, 0.028);
                tick.rotation.z = -a;
                g.add(tick);
            }
            const truth = hand(0.012, r * 0.78, K.gloss(pal.steel.clone().lerp(pal.card, 0.4), 0.4), 0.03);
            const local = hand(0.02, r * 0.74, K.gloss(pal.ink, 0.3), 0.038);
            const wedge = K.band(r * 0.2, r * 0.7, K.soft(pal.gold, 0.6));
            wedge.rotation.x = Math.PI / 2;      // band lies in xz; stand it up in the dial plane
            wedge.position.z = 0.029;
            const hub = K.mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 20), K.metal(pal.gold, 0.25), false);
            hub.rotation.x = Math.PI / 2;
            hub.position.z = 0.044;
            g.add(truth, local, wedge, hub);
            root.add(g);
            ctx.label(`clock ${s.name}`).pos.copy(s.at).y += r + 0.2;
            const photons = [0, 1, 2].map(() => K.photon(pal.gold, 0.028));
            root.add(...photons);
            return { g, truth, local, wedge, glowRim, photons, site: s, now: 0 };
        });

        return {
            update(u, t, cycle, value, camera) {
                const drift = smooth(0, 0.26, u) * (1 - smooth(0.76, 0.92, u));
                const synced = smooth(0.9, 0.94, u) * (1 - smooth(0.97, 1, u));
                const ref = t * 0.7;
                crystal.rotation.y = t * 0.9;
                const emitting = u > 0.28 && u < 0.56;
                sHalo.material.opacity = 0.35 + (emitting ? 0.35 + 0.3 * Math.sin(t * 9) : 0);

                clocks.forEach((c) => {
                    c.g.quaternion.copy(camera.quaternion);      // dials always face the viewer
                    const off = (c.site.dt / 40) * drift;
                    c.now = c.site.dt * drift;
                    c.truth.rotation.z = -ref;
                    c.local.rotation.z = -(ref + off);
                    c.wedge.visible = Math.abs(off) > 0.01;
                    // band angles run counter-clockwise from +x; the dial runs clockwise from 12
                    c.wedge.set(Math.PI / 2 - ref - off, Math.PI / 2 - ref);
                    const measuring = smooth(0.56, 0.6, u) * (1 - smooth(0.72, 0.76, u));
                    c.wedge.material.opacity = 0.6 + 0.35 * measuring * Math.sin(t * 8);
                    K.fade(c.glowRim, Math.max(synced, measuring * 0.5));
                    c.photons.forEach((ph, k) => {
                        const f = (u - 0.29 - k * 0.075) / 0.11;
                        ph.visible = f > 0 && f < 1;
                        ph.position.copy(crystal.position).lerp(c.site.at, clamp(f, 0, 1));
                    });
                });
            },
            readout: () => clocks.map((c) => [`Δt ${c.site.name}`, `${c.now >= 0 ? '+' : '−'}${Math.abs(c.now).toFixed(0)} ps`, Math.abs(c.now) < 0.5 ? 'teal' : 'gold'])
        };
    }
};

// 9. Neutral atoms: exact dynamics of a driven 3 x 3 Rydberg array.
SCENES.rydberg = {
    note: 'Nine atoms held in optical tweezers and driven toward a Rydberg state. The excitation probabilities are an exact solution of the Schrödinger equation for this array as the laser detuning Δ is swept through resonance. Rydberg blockade forbids neighbouring excitations, so the atoms settle into an alternating, crystal-like order: the many-body dynamics behind neutral-atom processors and Rydberg reservoirs.',
    source: { title: 'Quantum Reservoir Learning with Rydberg Lattice', venue: 'KICS Summer Conference, 2025', href: '#publications' },
    duration: 16, still: 0.92,
    view: { yaw: 0.5, pitch: 0.55, dist: 6.7, target: [0, -0.1, 0], sway: 0.3 },
    steps: [
        { at: 0, title: 'Trap', text: 'Each atom sits at the focus of an optical tweezer, in its ground state |g⟩.' },
        { at: 0.12, title: 'Drive', text: 'A laser of Rabi frequency Ω couples |g⟩ to the Rydberg state |r⟩. With Δ < 0 the atoms are barely excited.' },
        { at: 0.535, title: 'Sweep', text: 'As Δ crosses resonance, excitations grow, but an excited atom shifts its neighbours out of resonance: the blockade.' },
        { at: 0.86, title: 'Ordered phase', text: 'Excitations settle on alternating sites, and the atoms between them are held dark by the blockade: a crystal of Rydberg excitations.' }
    ],
    build(ctx) {
        const root = ctx.root, gap = 0.62, n = 9, dim = 1 << n;
        const V1 = 6, total = 16, dt = 0.02;
        ctx.ground(-1.0);

        // ---- Exact evolution under H = (Omega/2) sum X - Delta sum n + sum V n n
        const xy = [];
        for (let i = 0; i < n; i++) xy.push([i % 3, Math.floor(i / 3)]);
        const pop = new Float64Array(dim), inter = new Float64Array(dim);
        for (let s = 0; s < dim; s++) {
            for (let i = 0; i < n; i++) {
                if (!(s >> i & 1)) continue;
                pop[s]++;
                for (let j = i + 1; j < n; j++) {
                    if (s >> j & 1) inter[s] += V1 / Math.pow(Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]), 6);
                }
            }
        }
        const omegaAt = (tau) => smooth(0, 0.1 * total, tau) * (1 - smooth(0.9 * total, total, tau));
        const deltaAt = (tau) => -3 + 5.2 * clamp((tau / total - 0.1) / 0.8, 0, 1);
        const re = new Float64Array(dim), im = new Float64Array(dim);
        re[0] = 1;
        const buf = () => [new Float64Array(dim), new Float64Array(dim)];
        const k1 = buf(), k2 = buf(), k3 = buf(), k4 = buf(), work = buf();
        // d(psi)/dt = -i H psi
        const slope = (ar, ai, tau, out) => {
            const half = omegaAt(tau) / 2, delta = deltaAt(tau);
            for (let s = 0; s < dim; s++) {
                const diag = inter[s] - delta * pop[s];
                let hr = diag * ar[s], hi = diag * ai[s];
                for (let i = 0; i < n; i++) {
                    const f = s ^ (1 << i);
                    hr += half * ar[f];
                    hi += half * ai[f];
                }
                out[0][s] = hi;
                out[1][s] = -hr;
            }
        };
        const stepTo = (k, scale) => {
            for (let s = 0; s < dim; s++) {
                work[0][s] = re[s] + k[0][s] * scale;
                work[1][s] = im[s] + k[1][s] * scale;
            }
        };
        const frames = [];
        const record = () => {
            const occ = new Float32Array(n);
            for (let s = 0; s < dim; s++) {
                const w = re[s] * re[s] + im[s] * im[s];
                for (let i = 0; i < n; i++) if (s >> i & 1) occ[i] += w;
            }
            frames.push(occ);
        };
        const count = Math.round(total / dt);
        for (let k = 0; k < count; k++) {
            if (k % 4 === 0) record();
            const tau = k * dt;
            slope(re, im, tau, k1);
            stepTo(k1, dt / 2);
            slope(work[0], work[1], tau + dt / 2, k2);
            stepTo(k2, dt / 2);
            slope(work[0], work[1], tau + dt / 2, k3);
            stepTo(k3, dt);
            slope(work[0], work[1], tau + dt, k4);
            for (let s = 0; s < dim; s++) {
                re[s] += (dt / 6) * (k1[0][s] + 2 * k2[0][s] + 2 * k3[0][s] + k4[0][s]);
                im[s] += (dt / 6) * (k1[1][s] + 2 * k2[1][s] + 2 * k3[1][s] + k4[1][s]);
            }
        }
        record();

        // ---- The array
        const blockade = gap * Math.pow(V1, 1 / 6);
        const beam = K.soft(pal.indigo, pal.dark ? 0.16 : 0.13);
        const atoms = xy.map((q, i) => {
            const at = K.v((q[0] - 1) * gap, 0, (q[1] - 1) * gap);
            [1, -1].forEach((s) => {
                const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.78, 28, 1, true), beam);
                cone.position.set(at.x, s * 0.39, at.z);
                if (s > 0) cone.rotation.x = Math.PI;
                root.add(cone);
            });
            const ball = K.sphere(0.058, K.gloss(pal.indigo, 0.25));
            ball.material.emissive = pal.gold.clone();
            ball.position.copy(at);
            const halo = K.glow(pal.gold, 0.62, 0);
            halo.position.copy(at);
            const disc = new THREE.Mesh(new THREE.CircleGeometry(blockade, 64), K.soft(pal.gold, 0.14));
            disc.rotation.x = -Math.PI / 2;
            disc.position.copy(at).y -= 0.005 + i * 0.0004;
            const edge = K.path(K.circle(blockade), K.line(pal.gold, 0.8));
            edge.position.copy(at);
            root.add(ball, halo, disc, edge);
            return { at, ball, halo, disc, edge, sub: (q[0] + q[1]) % 2 === 0 };
        });
        const lR = ctx.label('|r⟩', 'gold'), lG = ctx.label('|g⟩');
        lR.pos.copy(atoms[6].at).y += 0.3;
        lG.pos.copy(atoms[1].at).y += 0.2;
        ctx.label('optical tweezers').pos.set(atoms[2].at.x + 0.1, 0.92, atoms[2].at.z);
        const lB = ctx.label('blockade radius', 'gold');
        lB.pos.set(atoms[6].at.x - blockade * 0.75, 0, atoms[6].at.z + blockade * 0.75);
        const state = { delta: -3, sum: 0, order: 0, omega: 0 };

        return {
            update(u, t) {
                const s = clamp((u - 0.12) / 0.74, 0, 1), tau = s * total;
                const x = s * (frames.length - 1), k = Math.min(frames.length - 2, Math.floor(x)), f = x - k;
                const reset = 1 - smooth(0.96, 1, u);
                let sum = 0, even = 0, odd = 0;
                atoms.forEach((a, i) => {
                    const occ = lerp(frames[k][i], frames[k + 1][i], f) * reset;
                    sum += occ;
                    if (a.sub) even += occ / 5; else odd += occ / 4;
                    a.ball.position.y = 0.015 * Math.sin(t * 1.4 + i);
                    a.ball.scale.setScalar(1 + 0.7 * occ);
                    a.ball.material.color.copy(pal.indigo).lerp(pal.gold, occ);
                    a.ball.material.emissiveIntensity = 1.3 * occ;
                    a.halo.material.opacity = 0.8 * occ;
                    a.disc.visible = a.edge.visible = occ > 0.04;
                    a.disc.scale.setScalar(Math.sqrt(occ));
                    a.edge.scale.setScalar(Math.sqrt(occ));
                    a.disc.material.opacity = 0.14 * occ;
                });
                lR.show = lerp(frames[k][6], frames[k + 1][6], f) * reset > 0.5 ? 1 : 0;
                lB.show = lR.show;
                state.delta = deltaAt(tau);
                state.omega = u < 0.12 ? 0 : omegaAt(tau);
                state.sum = sum;
                state.order = even - odd;
            },
            readout: () => [
                ['Ω', state.omega.toFixed(2)],
                ['Δ/Ω', `${state.delta >= 0 ? '+' : '−'}${Math.abs(state.delta).toFixed(2)}`],
                ['excitations', state.sum.toFixed(2), 'gold'],
                ['staggered order', state.order.toFixed(2), state.order > 0.4 ? 'gold' : '']
            ]
        };
    }
};

// --------------------------------------------------------------------------
// Player: keyword list, caption, steps, controls. Works before three.js loads.
// --------------------------------------------------------------------------

function main() {
    const tabs = Array.from(body.querySelectorAll('.interest-item'));
    const el = (id) => document.getElementById(id);
    const ui = {
        caption: el('interest-caption'), title: el('interest-caption-title'), count: el('interest-caption-count'),
        desc: el('interest-caption-desc'), note: el('interest-caption-note'), source: el('interest-caption-source'),
        steps: el('interest-steps'), stepText: el('interest-step-text'), play: el('interest-play'),
        readout: el('interest-readout'), param: el('interest-param'), paramLabel: el('interest-param-label'),
        paramInput: el('interest-param-input'), paramValue: el('interest-param-value')
    };

    const player = { key: null, def: null, time: 0, clock: 0, paused: false, step: -1, value: 0, held: false };
    const engine = { ready: false, failed: false, loading: false, renderer: null, camera: null, env: null, built: new Map(), inst: null };
    const orbit = { yaw: 0, pitch: 0 };
    let frame = 0, last = 0, onScreen = false, ticks = 0;

    // ---- Caption and controls -------------------------------------------

    function fillCaption(tab, def) {
        const text = (selector) => tab.querySelector(selector).textContent.trim();
        ui.title.textContent = text('.interest-name');
        ui.count.textContent = `${String(tabs.indexOf(tab) + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
        ui.desc.textContent = text('.interest-desc');
        ui.note.textContent = def.note;
        const link = document.createElement('a');
        link.href = def.source.href;
        link.textContent = def.source.title;
        if (/^https?:/.test(def.source.href)) {
            link.target = '_blank';
            link.rel = 'noopener';
        }
        ui.source.replaceChildren('Drawn from ', link, `, ${def.source.venue}.`);

        ui.steps.replaceChildren(...def.steps.map((s, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'interest-step';
            b.innerHTML = `<span>${i + 1}</span>`;
            b.append(s.title);
            b.addEventListener('click', () => jumpTo(i));
            return b;
        }));

        const p = def.param;
        ui.param.hidden = !p;
        if (p) {
            ui.paramLabel.textContent = p.label;
            ui.paramInput.min = p.min;
            ui.paramInput.max = p.max;
            ui.paramInput.step = p.step;
            ui.paramInput.value = p.value;
            ui.paramValue.textContent = p.format(p.value);
        }
        ui.readout.replaceChildren();
    }

    function setStep(index) {
        if (index === player.step) return;
        player.step = index;
        const s = player.def.steps[index];
        Array.from(ui.steps.children).forEach((b, i) => {
            b.classList.toggle('is-active', i === index);
            b.setAttribute('aria-current', i === index ? 'step' : 'false');
        });
        const strong = document.createElement('strong');
        strong.textContent = `${s.title}. `;
        ui.stepText.replaceChildren(strong, s.text);
    }

    function setPaused(paused) {
        player.paused = paused;
        ui.play.setAttribute('aria-pressed', paused ? 'true' : 'false');
        ui.play.setAttribute('aria-label', paused ? 'Play the animation' : 'Pause the animation');
        ui.play.title = paused ? 'Play' : 'Pause';
        ui.play.firstElementChild.className = paused ? 'fas fa-play' : 'fas fa-pause';
        wake();
    }

    function jumpTo(index) {
        const d = player.def.duration;
        player.time = Math.floor(player.time / d) * d + player.def.steps[index].at * d + 0.02;
        player.held = false;
        wake();
    }

    function select(tab, instant) {
        const key = tab.dataset.interest, def = SCENES[key];
        if (!def || key === player.key) return;
        tabs.forEach((other) => {
            const on = other === tab;
            other.setAttribute('aria-selected', on ? 'true' : 'false');
            other.tabIndex = on ? 0 : -1;
        });
        stage.setAttribute('aria-labelledby', tab.id);
        canvas.setAttribute('aria-label', `3D model: ${tab.querySelector('.interest-name').textContent.trim()}`);

        const swap = () => {
            player.key = key;
            player.def = def;
            player.time = reduceMotion.matches ? def.still * def.duration : 0;
            player.step = -1;
            player.held = false;
            player.value = def.param ? def.param.value : 0;
            orbit.yaw = orbit.pitch = 0;
            fillCaption(tab, def);
            setStep(0);
            setPaused(reduceMotion.matches);
            if (engine.ready) activate();
            stage.classList.remove('is-switching');
            wake();
        };
        if (instant || reduceMotion.matches) swap();
        else {
            stage.classList.add('is-switching');
            clearTimeout(select.timer);
            select.timer = setTimeout(swap, 190);
        }

        const list = tab.parentElement;
        if (list.scrollWidth > list.clientWidth) {
            list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
    }

    let hoverTimer = 0;
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('focus', () => select(tab));
        // A short dwell, so sweeping the pointer across the list does not flicker
        tab.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'mouse') return;
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => select(tab), 110);
        });
        tab.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
        tab.addEventListener('keydown', (event) => {
            const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
            let next = null;
            if (move) next = tabs[(index + move + tabs.length) % tabs.length];
            else if (event.key === 'Home') next = tabs[0];
            else if (event.key === 'End') next = tabs[tabs.length - 1];
            if (!next) return;
            event.preventDefault();
            next.focus();
        });
    });
    ui.play.addEventListener('click', () => {
        if (player.paused) player.held = false;
        setPaused(!player.paused);
    });
    ui.paramInput.addEventListener('input', () => {
        player.value = Number(ui.paramInput.value);
        player.held = true;
        ui.paramValue.textContent = player.def.param.format(player.value);
        wake();
    });

    // ---- Engine ---------------------------------------------------------

    function makeEnvironment() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(pal.dark ? '#0b1226' : '#dfe6f6');
        const panel = (x, y, z, size, color, power) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
            m.position.set(x, y, z);
            m.lookAt(0, 0, 0);
            scene.add(m);
        };
        panel(0, 7, 0, 9, '#ffffff', pal.dark ? 2.2 : 2.4);
        panel(7, 2.5, 5, 6, '#fff0d2', pal.dark ? 1.6 : 1.7);
        panel(-7, 2, -4, 6, '#c6d6ff', pal.dark ? 1.4 : 1.3);
        panel(0, -6, 0, 9, pal.dark ? '#10182e' : '#f1ede4', 1);
        const pmrem = new THREE.PMREMGenerator(engine.renderer);
        const map = pmrem.fromScene(scene, 0.04).texture;
        pmrem.dispose();
        return map;
    }

    function buildScene(def) {
        const root = new THREE.Scene();
        root.environment = engine.env;
        root.add(new THREE.HemisphereLight(pal.dark ? '#aebcff' : '#ffffff', pal.dark ? '#0a1024' : '#cfd6e6', pal.dark ? 0.55 : 0.62));
        const key = new THREE.DirectionalLight('#fff6e8', pal.dark ? 2.2 : 2.6);
        key.position.set(2.6, 5.2, 3.2);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.left = key.shadow.camera.bottom = -3.2;
        key.shadow.camera.right = key.shadow.camera.top = 3.2;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 14;
        key.shadow.bias = -0.0006;
        key.shadow.normalBias = 0.02;
        key.shadow.radius = 5;
        const rim = new THREE.DirectionalLight('#9fb4ff', pal.dark ? 1.1 : 0.7);
        rim.position.set(-3.5, 2, -3);
        root.add(key, rim);

        const layer = document.createElement('div');
        layer.className = 'interest-label-set';
        labelLayer.append(layer);
        const labels = [];
        const ctx = {
            root,
            /** Shadow-catching floor at height y. */
            ground(y) {
                const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: pal.dark ? 0.5 : 0.22 }));
                floor.rotation.x = -Math.PI / 2;
                floor.position.y = y;
                floor.receiveShadow = true;
                root.add(floor);
            },
            /** HTML label pinned to a point of the model; set .pos and .show. */
            label(text, tone) {
                const span = document.createElement('span');
                span.className = 'interest-label' + (tone ? ` is-${tone}` : '');
                span.textContent = text;
                layer.append(span);
                const l = { el: span, pos: new THREE.Vector3(), show: 1, shown: -1 };
                labels.push(l);
                return l;
            }
        };
        const inst = def.build(ctx);
        inst.root = root;
        inst.labels = labels;
        inst.layer = layer;
        return inst;
    }

    function activate() {
        if (engine.inst) engine.inst.layer.hidden = true;
        let inst = engine.built.get(player.key);
        if (!inst) {
            inst = buildScene(player.def);
            engine.built.set(player.key, inst);
        }
        inst.layer.hidden = false;
        engine.inst = inst;
        ticks = 0;
    }

    function disposeAll() {
        engine.built.forEach((inst) => {
            inst.root.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
            });
            inst.layer.remove();
        });
        engine.built.clear();
        engine.inst = null;
    }

    function resize() {
        if (!engine.ready) return;
        const box = wrap.getBoundingClientRect();
        if (!box.width || !box.height) return;
        engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        engine.renderer.setSize(box.width, box.height, false);
        engine.camera.aspect = box.width / box.height;
        engine.camera.updateProjectionMatrix();
        engine.size = box;
        draw(0);
    }

    const projected = { x: 0, y: 0 };
    function draw(dt) {
        const inst = engine.inst, def = player.def;
        if (!inst || !engine.size) return;
        if (!player.paused) {
            player.time += dt;
            player.clock += dt;
        }
        const u = (player.time % def.duration) / def.duration;
        if (def.param && def.param.auto && !player.held) {
            player.value = def.param.auto(u);
            ui.paramInput.value = player.value;
            ui.paramValue.textContent = def.param.format(player.value);
        }

        // Camera: resting view, a slow sway, and whatever the visitor dragged
        const view = def.view, cam = engine.camera;
        const yaw = view.yaw + orbit.yaw + (view.sway || 0) * Math.sin(player.clock * 0.25);
        const pitch = clamp(view.pitch + orbit.pitch, -0.2, 1.45);
        const dist = view.dist * Math.max(1, 1.22 / cam.aspect);
        cam.position.set(view.target[0] + dist * Math.sin(yaw) * Math.cos(pitch), view.target[1] + dist * Math.sin(pitch), view.target[2] + dist * Math.cos(yaw) * Math.cos(pitch));
        cam.lookAt(view.target[0], view.target[1], view.target[2]);
        cam.updateMatrixWorld();

        inst.update(u, player.clock, Math.floor(player.time / def.duration), player.value, cam);
        let step = 0;
        if (inst.stepAt) step = inst.stepAt(u, player.value);
        else def.steps.forEach((s, i) => { if (u >= s.at) step = i; });
        setStep(step);
        engine.renderer.render(inst.root, cam);

        const w = engine.size.width, h = engine.size.height;
        inst.labels.forEach((l) => {
            l.el.style.opacity = l.show;
            if (!l.show) return;
            const v = l.pos.clone().project(cam);
            l.el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
        });

        if (ticks++ % 6 === 0 || player.paused) {
            const rows = inst.readout();
            if (ui.readout.children.length !== rows.length) {
                ui.readout.replaceChildren(...rows.map(() => {
                    const chip = document.createElement('span');
                    chip.className = 'interest-chip';
                    chip.append(document.createElement('i'), document.createElement('b'));
                    return chip;
                }));
            }
            rows.forEach((row, i) => {
                const chip = ui.readout.children[i];
                chip.firstChild.textContent = row[0];
                chip.lastChild.textContent = row[1];
                chip.dataset.tone = row[2] || '';
            });
        }
    }

    function shouldRun() {
        return engine.ready && onScreen && !document.hidden && !player.paused;
    }

    function tick(now) {
        frame = 0;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        draw(dt);
        if (shouldRun()) frame = requestAnimationFrame(tick);
    }

    /** Start the loop if it may run; otherwise paint a single frame. */
    function wake() {
        if (frame || !engine.ready) return;
        if (shouldRun()) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        } else {
            draw(0);
        }
    }

    async function loadEngine() {
        if (engine.loading || engine.ready || engine.failed) return;
        engine.loading = true;
        try {
            THREE = await import('../vendor/three.module.min.js');
            engine.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch (error) {
            engine.failed = true;
            stage.classList.add('is-unavailable');
            stage.classList.remove('is-loading');
            return;
        }
        const r = engine.renderer;
        r.setClearColor(0x000000, 0);
        r.shadowMap.enabled = true;
        r.shadowMap.type = THREE.PCFSoftShadowMap;
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1;
        engine.camera = new THREE.PerspectiveCamera(30, 1.28, 0.1, 60);
        readPalette();
        K = makeKit();
        engine.env = makeEnvironment();
        engine.ready = true;
        activate();
        resize();
        stage.classList.remove('is-loading');
        wake();
    }

    // ---- Drag to rotate -------------------------------------------------

    let dragging = false, dragX = 0, dragY = 0;
    canvas.addEventListener('pointerdown', (event) => {
        dragging = true;
        dragX = event.clientX;
        dragY = event.clientY;
        canvas.classList.add('is-dragging');
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        orbit.yaw -= (event.clientX - dragX) * 0.008;
        orbit.pitch += (event.clientY - dragY) * 0.006;
        dragX = event.clientX;
        dragY = event.clientY;
        wake();
    });
    const endDrag = () => {
        dragging = false;
        canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('keydown', (event) => {
        const turn = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[event.key];
        if (!turn) return;
        event.preventDefault();
        orbit.yaw += turn[0];
        orbit.pitch += turn[1];
        wake();
    });

    // ---- Set-up ---------------------------------------------------------

    body.classList.add('is-ready');
    stage.classList.add('is-loading');
    select(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0], true);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap);
    else window.addEventListener('resize', resize);

    // The library is fetched when the model is about to come into view
    new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) loadEngine();
    }, { rootMargin: '700px' }).observe(wrap);
    new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        wake();
    }, { rootMargin: '60px' }).observe(wrap);

    document.addEventListener('visibilitychange', wake);
    new MutationObserver(() => {
        if (!engine.ready) return;
        // Materials are built from the theme's colours: rebuild for the new theme
        disposeAll();
        readPalette();
        K = makeKit();
        engine.env.dispose();
        engine.env = makeEnvironment();
        activate();
        wake();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

if (body && stage && wrap && canvas && labelLayer) main();
