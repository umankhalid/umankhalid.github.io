/**
 * Research interest models (home page)
 *
 * One small 3D scene per research interest, all drawn on a single 2D canvas
 * with a hand-rolled perspective projection and a painter's sort: no WebGL
 * and no library, so the page gains one short script and nothing else.
 *
 * Each scene in SCENES draws a physical picture of its topic (see the `note`
 * of each entry, which is also the caption shown under the model). Selecting,
 * hovering or focusing a keyword in the list cross-fades to its scene; the
 * model can be dragged to rotate. Drawing stops while the canvas is off
 * screen or the tab is hidden, and with "reduce motion" set each scene is
 * shown as a still frame.
 */
(function () {
    'use strict';

    const body = document.getElementById('interests-body');
    const stage = document.getElementById('interest-stage');
    const canvas = document.getElementById('interest-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!body || !stage || !ctx) return;

    const TAU = Math.PI * 2;
    const STEP = 1 / 60;            // fixed step for the scenes that simulate
    const FADE = 0.55;              // seconds for the cross-fade between scenes
    const CAMERA = 6.5;             // camera distance, in scene units
    const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1], O = [0, 0, 0];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ----------------------------------------------------------------------
    // Small maths
    // ----------------------------------------------------------------------

    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, v) => {
        const t = clamp((v - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    };
    const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
    const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
    const mul = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
    const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const norm = (p) => mul(p, 1 / (Math.hypot(p[0], p[1], p[2]) || 1));
    const rotX = (p, a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    };
    const rotY = (p, a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
    };
    const rotZ = (p, a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
    };

    /** Seeded generator (mulberry32), so every visit lays the scenes out alike. */
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

    /** Points of a circle (or arc) of radius r about c, in the plane of u and v. */
    function circle(c, r, u, v, n, a0, a1) {
        const from = a0 === undefined ? 0 : a0;
        const to = a1 === undefined ? TAU : a1;
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const a = from + (to - from) * (i / n);
            const cs = Math.cos(a) * r, sn = Math.sin(a) * r;
            pts.push([c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]);
        }
        return pts;
    }

    function bezier(p0, p1, p2, p3, n) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const t = i / n, m = 1 - t;
            const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
            pts.push([
                a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
                a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2]
            ]);
        }
        return pts;
    }

    /** Point a fraction f of the way along a polyline. */
    function along(pts, f) {
        const x = clamp(f, 0, 1) * (pts.length - 1);
        const i = Math.min(pts.length - 2, Math.floor(x));
        return mix(pts[i], pts[i + 1], x - i);
    }

    // ----------------------------------------------------------------------
    // Palette, read from the site's CSS tokens so both themes follow along
    // ----------------------------------------------------------------------

    const P = { a: '44, 79, 168', b: '168, 116, 26', c: '15, 123, 120', ink: '18, 26, 43', mute: '104, 112, 131', bg: '246, 245, 241' };
    const shadeCache = new Map();

    function hexToRgb(hex, fallback) {
        const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
        if (!m) return fallback;
        const n = parseInt(m[1], 16);
        return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    }

    function readPalette() {
        const styles = getComputedStyle(document.documentElement);
        const read = (name) => (styles.getPropertyValue(name) || '').trim();
        P.a = read('--secondary-color-rgb') || P.a;
        P.b = read('--gold-color-rgb') || P.b;
        P.c = read('--teal-color-rgb') || P.c;
        P.ink = hexToRgb(read('--text-primary'), P.ink);
        P.mute = hexToRgb(read('--text-muted'), P.mute);
        P.bg = hexToRgb(read('--bg-primary'), P.bg);
        shadeCache.clear();
    }

    /** Opaque blend of colour c toward colour d by k (0 = c, 1 = d). */
    function shade(c, d, k) {
        const key = c + '|' + d + '|' + k;
        let out = shadeCache.get(key);
        if (!out) {
            const p = c.split(',').map(Number), q = d.split(',').map(Number);
            out = p.map((v, i) => Math.round(lerp(v, q[i], k))).join(', ');
            shadeCache.set(key, out);
        }
        return out;
    }

    // ----------------------------------------------------------------------
    // Renderer: scenes push primitives in scene coordinates; flush() sorts
    // them back to front and paints them, fading with distance.
    // ----------------------------------------------------------------------

    let width = 0, height = 0, ratio = 1;
    let items = [];
    const cam = { cx: 0, cy: 0, unit: 1, k: 1, cosYaw: 1, sinYaw: 0, cp: 1, sp: 0 };

    function setCamera(yaw, pitch, zoom) {
        cam.cx = width / 2;
        cam.cy = height / 2;
        cam.unit = Math.min(width, height * 1.25) * 0.27 * zoom;
        cam.k = clamp(cam.unit / 150, 0.6, 1.25);   // scales strokes and type
        cam.cosYaw = Math.cos(yaw); cam.sinYaw = Math.sin(yaw);
        cam.cp = Math.cos(pitch); cam.sp = Math.sin(pitch);
    }

    /** Scene point -> [screen x, screen y, depth (toward the viewer), scale]. */
    function project(p) {
        const x = p[0] * cam.cosYaw + p[2] * cam.sinYaw;
        const z0 = -p[0] * cam.sinYaw + p[2] * cam.cosYaw;
        const y = p[1] * cam.cp - z0 * cam.sp;
        const z = p[1] * cam.sp + z0 * cam.cp;
        const s = CAMERA / (CAMERA - z);
        return [cam.cx + x * s * cam.unit, cam.cy - y * s * cam.unit, z, s];
    }

    const G = {
        line(p, q, c, w, a) {
            const A = project(p), B = project(q);
            items.push({ t: 0, z: (A[2] + B[2]) / 2, pts: [A, B], c, w: w * cam.k, a });
        },
        /** Polyline. opts: closed, dash, chunk (split so parts sort separately). */
        path(pts, c, w, a, opts) {
            const o = opts || {};
            const pr = pts.map(project);
            const n = o.chunk || pr.length;
            for (let i = 0; i < pr.length - 1; i += n) {
                const part = pr.slice(i, i + n + 1);
                let z = 0;
                for (let j = 0; j < part.length; j++) z += part[j][2];
                items.push({ t: 0, z: z / part.length, pts: part, c, w: w * cam.k, a, closed: o.closed, dash: o.dash });
            }
        },
        /** Filled polygon. solid: keep full strength at any depth. */
        poly(pts, c, a, edge, solid) {
            const pr = pts.map(project);
            let z = 0;
            for (let j = 0; j < pr.length; j++) z += pr[j][2];
            items.push({ t: 1, z: z / pr.length, pts: pr, c, a, edge, flat: solid });
        },
        dot(p, r, c, a) {
            const A = project(p);
            items.push({ t: 2, z: A[2], x: A[0], y: A[1], r: r * A[3] * cam.unit, c, a });
        },
        ball(p, r, c, a) {
            const A = project(p);
            items.push({ t: 3, z: A[2], x: A[0], y: A[1], r: r * A[3] * cam.unit, c, a });
        },
        glow(p, r, c, a) {
            const A = project(p);
            items.push({ t: 4, z: A[2] - 0.01, x: A[0], y: A[1], r: r * A[3] * cam.unit, c, a });
        },
        /** Flat disc facing the viewer; used to veil the far side of a globe. */
        disc(p, r, c, a, stroke) {
            const A = project(p);
            items.push({ t: 5, z: A[2], x: A[0], y: A[1], r: r * A[3] * cam.unit, c, a, stroke, flat: true });
        },
        text(p, str, c, a, size) {
            const A = project(p);
            items.push({ t: 6, z: A[2], x: A[0], y: A[1], str, c, a, size: size || 11 });
        },
        /** Text pinned to the canvas: fx, fy are fractions of its width and height. */
        hud(str, fx, fy, c, a) {
            items.push({ t: 6, z: 1e6, x: width * fx, y: height * fy, str, c, a, size: 12, flat: true });
        }
    };

    function flush(alpha) {
        items.sort((p, q) => p.z - q.z);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const fog = it.flat ? 1 : clamp(0.72 + 0.2 * it.z, 0.4, 1);
            const a = clamp(it.a * fog * alpha, 0, 1);
            if (a < 0.004) continue;
            ctx.globalAlpha = a;

            if (it.t === 0 || it.t === 1) {
                const pts = it.pts;
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
                if (it.t === 1) {
                    ctx.closePath();
                    ctx.fillStyle = `rgb(${it.c})`;
                    ctx.fill();
                    if (it.edge) {
                        ctx.strokeStyle = `rgb(${it.edge})`;
                        ctx.lineWidth = cam.k;
                        ctx.stroke();
                    }
                } else {
                    if (it.closed) ctx.closePath();
                    if (it.dash) ctx.setLineDash([it.dash * cam.k, it.dash * cam.k]);
                    ctx.strokeStyle = `rgb(${it.c})`;
                    ctx.lineWidth = it.w;
                    ctx.stroke();
                    if (it.dash) ctx.setLineDash([]);
                }
            } else if (it.t === 2 || it.t === 5) {
                ctx.beginPath();
                ctx.arc(it.x, it.y, Math.max(0.5, it.r), 0, TAU);
                ctx.fillStyle = `rgb(${it.c})`;
                ctx.fill();
                if (it.stroke) {
                    ctx.globalAlpha = clamp(alpha * 0.55, 0, 1);
                    ctx.strokeStyle = `rgb(${it.stroke})`;
                    ctx.lineWidth = 1.2 * cam.k;
                    ctx.stroke();
                }
            } else if (it.t === 3) {
                const r = Math.max(1, it.r);
                const g = ctx.createRadialGradient(it.x - r * 0.35, it.y - r * 0.4, r * 0.08, it.x, it.y, r);
                g.addColorStop(0, `rgb(${shade(it.c, '255, 255, 255', 0.62)})`);
                g.addColorStop(0.55, `rgb(${it.c})`);
                g.addColorStop(1, `rgb(${shade(it.c, '0, 0, 0', 0.28)})`);
                ctx.beginPath();
                ctx.arc(it.x, it.y, r, 0, TAU);
                ctx.fillStyle = g;
                ctx.fill();
            } else if (it.t === 4) {
                const r = Math.max(1, it.r);
                const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, r);
                g.addColorStop(0, `rgba(${it.c}, 0.9)`);
                g.addColorStop(1, `rgba(${it.c}, 0)`);
                ctx.beginPath();
                ctx.arc(it.x, it.y, r, 0, TAU);
                ctx.fillStyle = g;
                ctx.fill();
            } else {
                const size = Math.max(10, Math.round(it.size * cam.k));
                ctx.font = `500 ${size}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
                ctx.fillStyle = `rgb(${it.c})`;
                ctx.fillText(it.str, it.x, it.y);
            }
        }
        items = [];
        ctx.globalAlpha = 1;
    }

    // ----------------------------------------------------------------------
    // Scenes
    //   yaw, pitch   resting view            spin   steady turn (rad/s)
    //   sway         slow side-to-side turn  zoom   fit, 1 = default
    //   init()       build state             step() fixed-step simulation
    //   draw()       push this frame         still  time shown when motion is reduced
    // ----------------------------------------------------------------------

    const SCENES = {};

    // 1. Quantum sensing: a collective spin on the Bloch sphere precesses and
    //    picks up the phase to be measured; squeezing narrows its uncertainty
    //    along the phase direction.
    SCENES.sensing = {
        note: 'A collective spin precesses on the Bloch sphere, accumulating the phase φ under measurement. As the probe is squeezed, its uncertainty cloud narrows along the phase direction and the wedge Δφ closes below the standard quantum limit.',
        source: { title: 'Metrologically resourceful multipartite entanglement under quantum many-body effects', venue: 'Quantum Science and Technology, 2021', href: 'https://doi.org/10.1088/2058-9565/abd893' },
        yaw: -0.45, pitch: 0.36, sway: 0.35, zoom: 0.9, still: 5.2,
        init() {
            const r = rng(11), cloud = [];
            for (let i = 0; i < 70; i++) {
                const m = Math.sqrt(-2 * Math.log(1 - r() * 0.999)), a = TAU * r();
                cloud.push([m * Math.cos(a), m * Math.sin(a)]);
            }
            return { cloud };
        },
        draw(t, st) {
            const R = 1.18;
            G.path(circle(O, R, X, Z, 72), P.a, 1.3, 0.6, { chunk: 4 });
            G.path(circle(O, R, X, Y, 72), P.a, 1, 0.3, { chunk: 4 });
            G.path(circle(O, R, Z, Y, 72), P.a, 1, 0.3, { chunk: 4 });
            [-0.52, 0.52].forEach((lat) => {
                G.path(circle([0, R * Math.sin(lat), 0], R * Math.cos(lat), X, Z, 60), P.a, 1, 0.16, { chunk: 4 });
            });
            G.line([0, -R * 1.16, 0], [0, R * 1.16, 0], P.mute, 1, 0.55);
            G.line([-R, 0, 0], [R, 0, 0], P.mute, 1, 0.3);
            G.line([0, 0, -R], [0, 0, R], P.mute, 1, 0.3);
            G.text([0, R * 1.3, 0], '|0⟩', P.mute, 0.9);
            G.text([0, -R * 1.3, 0], '|1⟩', P.mute, 0.9);

            const phi = (t * 0.5) % TAU;
            const squeeze = 0.5 - 0.5 * Math.cos(t * 0.42);
            const sPhi = lerp(0.2, 0.06, squeeze), sTheta = lerp(0.2, 0.34, squeeze);
            const dir = (a) => [Math.cos(a), 0, Math.sin(a)];
            const n = dir(phi), ePhi = [-Math.sin(phi), 0, Math.cos(phi)];

            // Accumulated phase, measured from the reference axis
            G.path(circle(O, R * 0.42, X, Z, 40, 0, phi), P.b, 2.2, 0.95);
            G.text(mul(dir(phi / 2), R * 0.56), 'φ', P.b, 1, 13);
            G.dot([R, 0, 0], 0.025, P.mute, 0.9);

            // Phase uncertainty of the estimate
            const wedge = [O];
            for (let i = 0; i <= 8; i++) wedge.push(mul(dir(phi - sPhi + (2 * sPhi * i) / 8), R));
            G.poly(wedge, P.b, 0.2);
            G.line(O, mul(dir(phi - sPhi), R), P.b, 1, 0.6);
            G.line(O, mul(dir(phi + sPhi), R), P.b, 1, 0.6);
            G.text(add(mul(n, R * 1.22), [0, 0.12, 0]), 'Δφ', P.b, 1);

            G.line(O, mul(n, R), P.ink, 2.2, 0.9);
            st.cloud.forEach((g) => {
                const p = norm(add(add(n, mul(ePhi, g[0] * sPhi)), mul(Y, g[1] * sTheta)));
                G.dot(mul(p, R), 0.02, P.b, 0.8);
            });
            G.ball(mul(n, R), 0.05, P.ink, 1);
            G.ball(O, 0.035, P.ink, 0.8);
        }
    };

    // 2. Quantum networking: entangled pairs are laid over two neighbouring
    //    links, then a Bell-state measurement at the middle node swaps them
    //    into one end-to-end link.
    SCENES.network = {
        note: 'Entangled photon pairs are distributed over two neighbouring links. A Bell-state measurement at the intermediate node then swaps them into a single end-to-end entangled link, the elementary step of a quantum repeater network.',
        source: { title: 'Quantum network engineering in the NISQ age: Principles, missions, and challenges', venue: 'IEEE Network, 2024', href: 'https://doi.org/10.1109/mnet.2023.3328892' },
        yaw: 0.2, pitch: 0.26, spin: 0.1, zoom: 1.08, still: 3.75,
        init() {
            return {
                nodes: [[-1.35, 0.25, 0.2], [-0.7, -0.45, -0.75], [-0.55, 0.62, 0.7], [0.1, -0.05, 0], [0.45, 0.75, -0.7], [0.75, -0.6, 0.65], [1.35, 0.1, -0.15], [0, -0.88, -0.1]],
                edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [1, 7], [5, 7], [2, 4]],
                routes: [[0, 1, 3], [2, 3, 5], [3, 4, 6], [1, 7, 5], [0, 2, 4], [3, 5, 6], [4, 3, 1]]
            };
        },
        draw(t, st) {
            const T = 5.5, u = (t % T) / T;
            const route = st.routes[Math.floor(t / T) % st.routes.length].map((i) => st.nodes[i]);
            const A = route[0], M = route[1], B = route[2];

            st.edges.forEach((e) => G.line(st.nodes[e[0]], st.nodes[e[1]], P.mute, 1, 0.4));
            st.nodes.forEach((p) => G.ball(p, 0.07, P.a, 1));

            // Pairs leave the middle of each hop and fly to its two ends
            const fly = smooth(0.04, 0.32, u);
            const linked = smooth(0.3, 0.38, u) * (1 - smooth(0.6, 0.72, u));
            [[A, M], [M, B]].forEach((hop) => {
                const mid = mix(hop[0], hop[1], 0.5);
                if (u < 0.36) {
                    G.glow(mid, 0.16, P.b, 0.6 * (1 - fly));
                    hop.forEach((end) => {
                        const p = mix(mid, end, fly);
                        G.glow(p, 0.11, P.b, 0.7);
                        G.dot(p, 0.028, P.b, 1);
                    });
                }
                if (linked > 0) {
                    const wave = [];
                    for (let i = 0; i <= 56; i++) {
                        const s = i / 56;
                        wave.push(add(mix(hop[0], hop[1], s), [0, 0.035 * Math.sin(s * TAU * 3 - t * 6) * Math.sin(Math.PI * s), 0]));
                    }
                    G.path(wave, P.b, 2, linked);
                }
            });

            // Bell-state measurement at the middle node
            const bsm = smooth(0.55, 0.72, u);
            if (bsm > 0 && bsm < 1) {
                G.path(circle(M, 0.1 + 0.28 * bsm, X, Y, 32), P.c, 2, 1 - bsm);
                G.path(circle(M, 0.1 + 0.28 * bsm, X, Z, 32), P.c, 2, 1 - bsm);
                G.text(add(M, [0, 0.3, 0]), 'BSM', P.c, 1 - bsm);
            }

            // End-to-end entanglement between the outer nodes
            const end = smooth(0.62, 0.76, u) * (1 - smooth(0.9, 1, u));
            if (end > 0) {
                const lift = add(mix(A, B, 0.5), [0, 0.7, 0]);
                const arc = bezier(A, mix(A, lift, 0.75), mix(B, lift, 0.75), B, 30);
                G.path(arc, P.b, 2.4, end);
                G.dot(along(arc, 0.5 + 0.5 * Math.sin(t * 2.4)), 0.03, P.b, end);
                [A, B].forEach((p) => {
                    G.glow(p, 0.24, P.b, 0.55 * end);
                    G.ball(p, 0.085, P.b, end);
                });
            }
        }
    };

    // 3. Quantum resources: the density matrix of a two-qubit Werner state as
    //    a tomography bar chart; its coherences cross the witness threshold
    //    at p = 1/3, where the state becomes entangled.
    SCENES.resource = {
        note: 'The density matrix of a two-qubit Werner state, drawn as a tomography bar chart. As the mixing parameter p grows, the coherences rise through the witness threshold at p = 1/3 and the state turns from separable to entangled, with concurrence C > 0.',
        source: { title: 'Entanglement detection with artificial neural networks', venue: 'Scientific Reports, 2023', href: 'https://doi.org/10.1038/s41598-023-28745-3' },
        yaw: 0.62, pitch: 0.5, sway: 0.3, still: 5.4,
        draw(t) {
            const p = 0.5 - 0.5 * Math.cos(t * 0.4);
            const C = Math.max(0, (3 * p - 1) / 2);
            const cell = 0.52, half = cell * 2, tall = 2.3, y0 = -0.6, w = cell * 0.36;
            const basis = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];

            for (let i = 0; i <= 4; i++) {
                const d = -half + i * cell;
                G.line([d, y0, -half], [d, y0, half], P.mute, 1, 0.3);
                G.line([-half, y0, d], [half, y0, d], P.mute, 1, 0.3);
            }
            for (let i = 0; i < 4; i++) {
                G.text([(i - 1.5) * cell, y0, half + 0.2], basis[i], P.mute, 0.95, 10);
                G.text([-half - 0.28, y0, (i - 1.5) * cell], basis[i], P.mute, 0.95, 10);
            }

            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const outer = (i === 0 || i === 3);
                    const coherence = (i === 0 && j === 3) || (i === 3 && j === 0);
                    let v = 0;
                    if (i === j) v = outer ? (1 + p) / 4 : (1 - p) / 4;
                    else if (coherence) v = p / 2;
                    const c = i === j ? P.a : (coherence && C > 0 ? P.b : P.mute);
                    const x = (j - 1.5) * cell, z = (i - 1.5) * cell;
                    const y1 = y0 + Math.max(v * tall, 0.012);
                    const k = [[x - w, z - w], [x + w, z - w], [x + w, z + w], [x - w, z + w]];
                    for (let f = 0; f < 4; f++) {
                        const a = k[f], b = k[(f + 1) % 4];
                        const tone = shade(c, P.bg, f % 2 ? 0.34 : 0.5);
                        G.poly([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], tone, 1, tone, true);
                    }
                    const top = shade(c, P.bg, 0.12);
                    G.poly(k.map((q) => [q[0], y1 + 0.001, q[1]]), top, 1, top, true);
                }
            }

            // Height the coherences must clear for the witness to fire
            const yw = y0 + tall / 6;
            G.path([[-half, yw, -half], [half, yw, -half], [half, yw, half], [-half, yw, half]], P.c, 1.4, 0.75, { closed: true, dash: 4 });
            G.text([half + 0.36, yw, -half], 'p = 1/3', P.c, 1, 10);

            G.hud(`p = ${p.toFixed(2)}   ·   ${C > 0 ? 'entangled, C = ' + C.toFixed(2) : 'separable, C = 0'}`, 0.5, 0.07, C > 0 ? P.b : P.mute, 1);
        }
    };

    // 4. Quantum semantic communication: a dense source is distilled to a few
    //    task-relevant features, carried as quantum states over an
    //    entanglement-assisted channel, and rebuilt as meaning, not bits.
    SCENES.semantic = {
        note: 'A semantic encoder distils a dense source into a few task-relevant features and carries them as quantum states over an entanglement-assisted channel. The receiver rebuilds the meaning of the message rather than every bit of it.',
        source: { title: 'Quantum semantic communications for Metaverse: Principles and challenges', venue: 'IEEE Wireless Communications, 2023', href: 'https://doi.org/10.1109/mwc.002.2200613' },
        yaw: 0, pitch: 0.24, sway: 0.3, zoom: 0.86, still: 4,
        init() {
            const r = rng(5);
            const torus = () => {
                const u = TAU * r(), v = TAU * r(), R = 0.42, q = 0.13;
                return rotX([(R + q * Math.cos(v)) * Math.cos(u), q * Math.sin(v), (R + q * Math.cos(v)) * Math.sin(u)], 0.95);
            };
            const src = [], dst = [], flow = [];
            for (let i = 0; i < 170; i++) src.push(torus());
            for (let i = 0; i < 48; i++) dst.push(torus());
            for (let i = 0; i < 44; i++) flow.push({ s: Math.floor(r() * src.length), d: Math.floor(r() * dst.length), off: r() });
            return { src, dst, flow };
        },
        draw(t, st) {
            const L = [-1.3, 0, 0], Rr = [1.3, 0, 0], inX = -0.58, outX = 0.58;
            const turn = t * 0.3;
            const at = (p, c) => add(rotY(p, turn), c);

            st.src.forEach((p) => G.dot(at(p, L), 0.014, P.c, 0.6));
            st.dst.forEach((p) => G.dot(at(p, Rr), 0.022, P.c, 0.9));
            // The receiver holds the structure: the outline of the same form
            G.path(circle(O, 0.42, X, Z, 40).map((p) => at(rotX(p, 0.95), Rr)), P.c, 1.2, 0.5, { chunk: 5 });

            // Channel: apertures, three carrier qubits, pre-shared entanglement
            G.line([inX, 0, 0], [outX, 0, 0], P.mute, 1, 0.45);
            [inX, outX].forEach((x) => G.path(circle([x, 0, 0], 0.17, Y, Z, 32), P.a, 1.6, 0.9, { chunk: 4 }));
            [-0.3, 0, 0.3].forEach((x, i) => {
                const a = t * 1.1 + i * 2.1;
                G.ball([x, 0, 0], 0.075, P.b, 1);
                G.path(circle([x, 0, 0], 0.13, rotX(Y, a), rotX(Z, a + 0.9), 28), P.b, 1.2, 0.7, { chunk: 4 });
            });
            G.path(bezier([inX, 0.17, 0], [inX, 0.85, 0], [outX, 0.85, 0], [outX, 0.17, 0], 30), P.b, 1.3, 0.6, { dash: 4 });
            G.text([0, 0.82, 0], 'shared entanglement', P.mute, 1, 10);
            G.text([-1.3, -0.82, 0], 'source', P.mute, 1, 10);
            G.text([0, -0.4, 0], 'quantum channel', P.mute, 1, 10);
            G.text([1.3, -0.82, 0], 'meaning', P.mute, 1, 10);

            st.flow.forEach((f) => {
                const u = (t * 0.16 + f.off) % 1;
                if (u < 0.38) {
                    G.dot(mix(at(st.src[f.s], L), [inX, 0, 0], smooth(0, 1, u / 0.38)), 0.017, P.c, 0.9);
                } else if (u < 0.62) {
                    const s = (u - 0.38) / 0.24, a = s * TAU * 2 + f.off * TAU;
                    const p = [lerp(inX, outX, s), 0.05 * Math.cos(a), 0.05 * Math.sin(a)];
                    G.dot(p, 0.02, P.b, 1);
                } else {
                    G.dot(mix([outX, 0, 0], at(st.dst[f.d], Rr), smooth(0, 1, (u - 0.62) / 0.38)), 0.02, P.c, 0.9);
                }
            });
        }
    };

    // 5. Quantum machine learning: a parameterised circuit on entangled
    //    qubits feeds a classical network, and the loss gradient returns to
    //    update the gate angles.
    SCENES.learning = {
        note: 'A parameterised quantum circuit encodes data on entangled qubits, and its measurements feed a classical network. The loss gradient returns along the lower path to update the gate angles: the training loop of a hybrid quantum-classical model.',
        source: { title: 'Quantum Machine Learning: Towards Hybrid Quantum-Classical Vision Models', venue: 'Mathematics, 2025', href: 'https://doi.org/10.3390/math13162645' },
        yaw: -0.3, pitch: 0.2, sway: 0.28, zoom: 0.9, still: 3,
        init() {
            const wires = [0.54, 0.18, -0.18, -0.54];
            const layerA = wires.map((y, i) => [0.9, y * 0.95, i % 2 ? -0.28 : 0.28]);
            const layerB = [[1.3, 0.4, -0.2], [1.3, 0, 0.26], [1.3, -0.4, -0.2]];
            const out = [1.66, 0, 0];
            const links = [];
            layerA.forEach((a) => layerB.forEach((b) => links.push([a, b])));
            layerB.forEach((b) => links.push([b, out]));
            return { wires, layerA, layerB, out, links, loop: bezier([1.66, -0.1, 0], [1.6, -1.3, 0.5], [-1.45, -1.3, 0.5], [-1.23, -0.72, 0], 40) };
        },
        draw(t, st) {
            const x0 = -1.63, x1 = 0.42;

            st.wires.forEach((y, i) => {
                G.line([x0, y, 0], [x1, y, 0], P.mute, 1.2, 0.6);

                // Rotation gates: the needle is the gate angle being trained
                [-1.23, -0.33].forEach((gx, l) => {
                    const h = 0.11, c = [gx, y, 0];
                    [-1, 1].forEach((s) => {
                        G.path([[gx - h, y - h, s * h], [gx + h, y - h, s * h], [gx + h, y + h, s * h], [gx - h, y + h, s * h]], P.a, 1.3, 0.85, { closed: true });
                        G.line([gx + s * h, y - h, -h], [gx + s * h, y - h, h], P.a, 1.3, 0.85);
                        G.line([gx + s * h, y + h, -h], [gx + s * h, y + h, h], P.a, 1.3, 0.85);
                    });
                    const a = 0.4 + i * 1.1 + l * 0.7 + 1.1 * Math.sin(t * 0.55 + i * 1.3 + l);
                    G.line(c, add(c, [0, 0.085 * Math.cos(a), 0.085 * Math.sin(a)]), P.b, 2, 1);
                    G.dot(c, 0.016, P.b, 1);
                });

                // Measurement
                G.path(circle([x1, y - 0.03, 0], 0.08, X, Y, 14, 0, Math.PI), P.ink, 1.3, 0.85);
                G.line([x1, y - 0.03, 0], [x1 + 0.05, y + 0.05, 0], P.ink, 1.3, 0.85);
                G.line([x1 + 0.1, y, 0], st.layerA[i], P.mute, 1, 0.45);

                const f = (t * 0.33 + i * 0.23) % 1, p = [lerp(x0, x1, f), y, 0];
                G.glow(p, 0.1, P.b, 0.6);
                G.dot(p, 0.024, P.b, 1);
            });

            // Entangling gates
            [[-0.78, 0, 1], [-0.78, 2, 3], [0.08, 1, 2]].forEach((g) => {
                const ya = st.wires[g[1]], yb = st.wires[g[2]];
                G.line([g[0], ya, 0], [g[0], yb - 0.06, 0], P.a, 1.4, 0.9);
                G.dot([g[0], ya, 0], 0.03, P.a, 1);
                G.path(circle([g[0], yb, 0], 0.06, X, Y, 20), P.a, 1.4, 0.9);
            });

            // Classical network
            st.links.forEach((l, i) => {
                G.line(l[0], l[1], P.c, 1, 0.3 + 0.18 * Math.sin(t * 0.8 + i));
                if (i % 3 === 0) G.dot(mix(l[0], l[1], (t * 0.45 + i * 0.37) % 1), 0.016, P.c, 0.95);
            });
            st.layerA.concat(st.layerB).forEach((p) => G.ball(p, 0.05, P.c, 1));
            G.ball(st.out, 0.068, P.c, 1);

            // Gradient returning to the gate angles
            G.path(st.loop, P.c, 1.3, 0.65, { dash: 4, chunk: 8 });
            const back = along(st.loop, (t * 0.22) % 1);
            G.glow(back, 0.1, P.c, 0.6);
            G.dot(back, 0.024, P.c, 1);
            G.dot(st.loop[st.loop.length - 1], 0.022, P.c, 1);

            G.text([-0.6, 0.86, 0], 'quantum circuit U(θ)', P.mute, 1, 10);
            G.text([1.3, 0.72, 0], 'classical network', P.mute, 1, 10);
            G.text([0.05, -1.28, 0.38], 'θ ← θ − η∇L', P.c, 1, 10);
        }
    };

    // 6. Quantum optimisation: a variational algorithm descends a cost
    //    landscape, restarting to escape local minima.
    SCENES.optimization = {
        note: 'A variational quantum algorithm searches a cost landscape. Each step measures the energy on a quantum processor, and a classical optimiser moves the parameters downhill, restarting to escape local minima on its way to the ground-state energy E₀.',
        source: { title: 'Quantum Computing for Intelligent Transportation Systems: VQE-Based Traffic Routing and EV Charging Scheduling', venue: 'Mathematics, 2025', href: 'https://doi.org/10.3390/math13172761' },
        yaw: 0.6, pitch: 0.6, spin: 0.08, zoom: 0.8, still: 2.4,
        energy(x, z) {
            return 0.3 * Math.sin(1.9 * x + 0.4) * Math.cos(1.6 * z - 0.3) + 0.2 * Math.sin(2.7 * z + 1.1) * Math.cos(1.1 * x) + 0.09 * (x * x + z * z) - 0.3;
        },
        init() {
            const E = this.energy, D = 1.45, n = 18, m = 26;
            const grid = [];
            for (let i = 0; i <= n; i++) {
                const d = -D + (2 * D * i) / n, a = [], b = [];
                for (let j = 0; j <= m; j++) {
                    const s = -D + (2 * D * j) / m;
                    a.push([d, E(d, s), s]);
                    b.push([s, E(s, d), d]);
                }
                grid.push(a, b);
            }
            let best = [0, 0], low = Infinity;
            for (let i = 0; i <= 80; i++) {
                for (let j = 0; j <= 80; j++) {
                    const x = -D + (2 * D * i) / 80, z = -D + (2 * D * j) / 80, e = E(x, z);
                    if (e < low) { low = e; best = [x, z]; }
                }
            }
            const st = { D, grid, best, low, r: rng(23), found: [] };
            this.restart(st);
            return st;
        },
        restart(st) {
            const edge = st.D * 0.92;
            st.x = lerp(-edge, edge, st.r());
            st.z = lerp(-edge, edge, st.r());
            st.vx = 0; st.vz = 0; st.rest = 0; st.age = 0; st.trail = [];
        },
        step(st, dt) {
            const E = this.energy, h = 0.01;
            const gx = (E(st.x + h, st.z) - E(st.x - h, st.z)) / (2 * h);
            const gz = (E(st.x, st.z + h) - E(st.x, st.z - h)) / (2 * h);
            st.vx = st.vx * 0.95 - gx * 0.0011;
            st.vz = st.vz * 0.95 - gz * 0.0011;
            st.x = clamp(st.x + st.vx, -st.D, st.D);
            st.z = clamp(st.z + st.vz, -st.D, st.D);
            st.age += dt;
            st.trail.push([st.x, E(st.x, st.z) + 0.02, st.z]);
            if (st.trail.length > 150) st.trail.shift();
            if (Math.hypot(st.vx, st.vz) < 0.0006 && st.age > 1) st.rest += dt;
            if (st.rest > 1.4 || st.age > 9) {
                st.found.push([st.x, E(st.x, st.z), st.z]);
                if (st.found.length > 5) st.found.shift();
                this.restart(st);
            }
        },
        draw(t, st) {
            const E = this.energy;
            st.grid.forEach((line) => G.path(line, P.a, 1, 0.42, { chunk: 3 }));

            const g = [st.best[0], st.low, st.best[1]];
            G.path(circle(add(g, [0, 0.02, 0]), 0.13, X, Z, 28), P.b, 1.6, 0.9);
            G.line(g, add(g, [0, 0.42, 0]), P.b, 1, 0.7);
            G.text(add(g, [0, 0.54, 0]), 'E₀', P.b, 1, 12);

            st.found.forEach((p) => G.dot(add(p, [0, 0.03, 0]), 0.028, P.c, 0.85));
            if (st.trail.length > 1) G.path(st.trail, P.b, 2, 0.9, { chunk: 6 });

            const e = E(st.x, st.z), p = [st.x, e + 0.07, st.z];
            const born = smooth(0, 0.4, st.age);
            G.glow(p, 0.2, P.b, 0.5 * born);
            G.ball(p, 0.065, P.b, born);
            G.hud(`⟨H⟩ = ${(e).toFixed(3)}   ·   E₀ = ${st.low.toFixed(3)}`, 0.5, 0.07, P.mute, 1);
        }
    };

    // 7. Satellite-ground networks: satellites on inclined orbits send
    //    entangled photons to whichever ground stations are in line of sight.
    SCENES.satellite = {
        note: 'Satellites on inclined orbits distribute entangled photons to ground stations as they rise into line of sight. Stations served by the same pass share a quantum link, joining distant terrestrial sensors into one integrated sensing network.',
        source: { title: 'Integrated satellite-ground variational quantum sensing networks', venue: 'IEEE Communications Magazine, 2024', href: 'https://doi.org/10.1109/mcom.005.2300844' },
        yaw: 0, pitch: 0.26, sway: 0.28, zoom: 0.94, still: 6,
        init() {
            const deg = Math.PI / 180;
            return {
                stations: [[37, 127], [48, 11], [40, -75], [-28, 25], [-15, -58], [26, 78], [-33, 148]].map((s) => [s[0] * deg, s[1] * deg]),
                sats: [
                    { inc: 0.9, node: 0, r: 1.3, w: 0.42, ph: 0 },
                    { inc: -0.62, node: 1.3, r: 1.38, w: 0.36, ph: 2 },
                    { inc: 1.25, node: 2.6, r: 1.24, w: 0.48, ph: 4 }
                ]
            };
        },
        draw(t, st) {
            const C = [0, -0.08, 0], R = 0.9, turn = t * 0.12;
            const surf = (lat, lon, r) => add(rotZ(rotY([r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)], turn), 0.41), C);

            G.disc(C, R, P.bg, 0.72, P.a);
            for (let i = -2; i <= 2; i++) {
                const lat = i * 0.52, pts = [];
                for (let j = 0; j <= 48; j++) pts.push(surf(lat, (j / 48) * TAU, R));
                G.path(pts, P.a, 1, i === 0 ? 0.6 : 0.36, { chunk: 4 });
            }
            for (let i = 0; i < 8; i++) {
                const pts = [];
                for (let j = 0; j <= 28; j++) pts.push(surf(-1.5 + (3 * j) / 28, (i / 8) * TAU, R));
                G.path(pts, P.a, 1, 0.28, { chunk: 4 });
            }

            const ground = st.stations.map((s) => surf(s[0], s[1], R));
            const seen = ground.map(() => 0);

            st.sats.forEach((s, k) => {
                const place = (a) => add(rotY(rotX([s.r * Math.cos(a), 0, s.r * Math.sin(a)], s.inc), s.node), C);
                const pos = place(s.ph + t * s.w);
                const wing = mul(rotY(rotX(Y, s.inc), s.node), 0.1);
                const orbit = [];
                for (let j = 0; j <= 64; j++) orbit.push(place((j / 64) * TAU));
                G.path(orbit, P.mute, 1, 0.3, { chunk: 4 });
                G.line(add(pos, wing), add(pos, mul(wing, -1)), P.a, 3, 1);
                G.ball(pos, 0.042, P.ink, 1);

                const up = norm(add(pos, mul(C, -1)));
                const served = [];
                ground.forEach((gp, i) => {
                    const vis = clamp((dot3(up, norm(add(gp, mul(C, -1)))) - 0.76) / 0.18, 0, 1);
                    if (vis <= 0) return;
                    seen[i] = Math.max(seen[i], vis);
                    served.push([i, vis]);
                    G.line(pos, gp, P.b, 1.4, 0.25 + 0.55 * vis);
                    for (let m = 0; m < 2; m++) {
                        G.dot(mix(pos, gp, (t * 0.9 + m * 0.5 + k * 0.3) % 1), 0.02, P.b, vis);
                    }
                });

                // Two stations under the same pass share an entangled link
                for (let i = 1; i < served.length; i++) {
                    const a = ground[served[0][0]], b = ground[served[i][0]];
                    const arc = [];
                    for (let j = 0; j <= 20; j++) {
                        const q = norm(add(mix(a, b, j / 20), mul(C, -1)));
                        arc.push(add(mul(q, R * 1.04), C));
                    }
                    G.path(arc, P.b, 1.8, 0.85 * Math.min(served[0][1], served[i][1]), { dash: 3 });
                }
            });

            ground.forEach((gp, i) => {
                G.glow(gp, 0.14, P.c, 0.7 * seen[i]);
                G.dot(gp, 0.03, seen[i] > 0 ? P.c : P.ink, 1);
            });
        }
    };

    // 8. Clock synchronisation: remote clocks drift apart, then time-
    //    correlated photon pairs from a shared source let each cancel its
    //    offset from the reference.
    SCENES.clock = {
        note: 'Three remote clocks drift away from the reference time, shown by the grey hand. A central source then shares time-correlated entangled photons, and comparing their arrival times lets every node estimate its offset Δt and cancel it.',
        source: { title: 'Quantum Clock Synchronization Networks: A Survey', venue: 'IEEE Communications Surveys & Tutorials, 2026', href: 'https://doi.org/10.1109/comst.2026.3694353' },
        yaw: 0.25, pitch: 0.32, spin: 0.12, zoom: 1.1, still: 2.6,
        draw(t) {
            const T = 6.5, cycle = Math.floor(t / T), u = (t % T) / T;
            const drift = smooth(0, 0.36, u) * (1 - smooth(0.6, 0.8, u));
            const synced = smooth(0.78, 0.84, u) * (1 - smooth(0.93, 1, u));
            const ref = t * 0.9, r = 0.44;

            G.glow(O, 0.2 + 0.06 * Math.sin(t * 3), P.b, 0.5);
            G.ball(O, 0.06, P.b, 1);

            for (let k = 0; k < 3; k++) {
                const a = (k * TAU) / 3 + 0.5;
                const c = [Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05];
                const side = [-Math.sin(a), 0, Math.cos(a)];
                const hand = (ang, len) => add(c, add(mul(Y, Math.cos(ang) * len), mul(side, Math.sin(ang) * len)));

                // Offset of this clock for this cycle, at least a fifth of a turn
                const h = Math.sin((cycle + 1) * 12.9898 + k * 78.233) * 43758.5453;
                const sign = (h - Math.floor(h)) > 0.5 ? 1 : -1;
                const offset = sign * (0.45 + 0.5 * Math.abs(Math.sin((cycle + 1) * 3.1 + k * 1.7))) * drift;

                G.line(O, c, P.mute, 1, 0.4);
                G.path(circle(c, r, Y, side, 44), P.a, 1.7, 0.9, { chunk: 4 });
                for (let i = 0; i < 12; i++) {
                    const ang = (i / 12) * TAU;
                    G.line(hand(ang, r * (i % 3 ? 0.9 : 0.82)), hand(ang, r), P.mute, 1, 0.8);
                }
                if (Math.abs(offset) > 0.01) {
                    const wedge = [c];
                    for (let i = 0; i <= 10; i++) wedge.push(hand(ref + (offset * i) / 10, r * 0.7));
                    G.poly(wedge, P.b, 0.34);
                    G.text(hand(ref + offset / 2, r * 1.34), 'Δt', P.b, clamp(Math.abs(offset) * 4, 0, 1), 10);
                }
                G.line(c, hand(ref, r * 0.84), P.mute, 1.4, 0.9);
                G.line(c, hand(ref + offset, r * 0.84), P.ink, 2.3, 1);
                G.dot(c, 0.024, P.ink, 1);
                if (synced > 0) G.path(circle(c, r * 1.14, Y, side, 44), P.c, 2, synced, { chunk: 4 });

                // Photons leave the source together and reach every clock
                for (let m = 0; m < 3; m++) {
                    const f = (u - 0.44 - m * 0.035) / 0.15;
                    if (f > 0 && f < 1) {
                        const p = mix(O, c, f);
                        G.glow(p, 0.1, P.b, 0.6);
                        G.dot(p, 0.024, P.b, 1);
                    }
                }
            }
        }
    };

    // 9. Neutral atoms: atoms in a tweezer array are driven to a Rydberg
    //    state; each excitation blockades its nearest neighbours, so the
    //    array settles toward an alternating, crystal-like order.
    SCENES.rydberg = {
        note: 'Atoms held in an optical-tweezer array are driven toward a Rydberg state. Each excitation is ringed by a blockade radius that keeps its nearest neighbours in the ground state, so excitations settle into an alternating order: the interaction that entangles neutral-atom qubits and drives a Rydberg reservoir.',
        source: { title: 'Quantum Reservoir Learning with Rydberg Lattice', venue: 'KICS Summer Conference, 2025', href: '#publications' },
        yaw: 0.5, pitch: 0.56, spin: 0.09, zoom: 0.92, still: 4.5,
        init() {
            const r = rng(41), atoms = [], gap = 0.52;
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    atoms.push({ x: (j - 2) * gap, z: (i - 2) * gap, e: 0, on: false, life: 0, ph: r() * TAU });
                }
            }
            return { atoms, r, timer: 0.2, block: 0.6 };
        },
        step(st, dt) {
            const near = (a, b) => a !== b && Math.hypot(a.x - b.x, a.z - b.z) <= st.block;
            st.timer -= dt;
            if (st.timer <= 0) {
                st.timer = 0.3;
                const free = st.atoms.filter((a) => !a.on && a.e < 0.05 && !st.atoms.some((b) => b.on && near(a, b)));
                if (free.length) {
                    const pick = free[Math.floor(st.r() * free.length)];
                    pick.on = true;
                    pick.life = 2 + 1.6 * st.r();
                }
            }
            st.atoms.forEach((a) => {
                if (a.on && (a.life -= dt) <= 0) a.on = false;
                a.e += ((a.on ? 1 : 0) - a.e) * Math.min(1, dt * 5);
            });
        },
        draw(t, st) {
            let labelled = false;
            st.atoms.forEach((a) => {
                const p = [a.x, 0.03 * Math.sin(t * 1.3 + a.ph), a.z];
                const blocked = st.atoms.some((b) => b !== a && b.e > 0.5 && Math.hypot(a.x - b.x, a.z - b.z) <= st.block);

                // Tweezer beam holding the atom
                G.line([a.x, -0.7, a.z], [a.x, 0.7, a.z], P.a, 1, 0.16);

                if (a.e > 0.03) {
                    const ring = circle(p, st.block * a.e, X, Z, 44);
                    G.glow(p, 0.22, P.b, 0.55 * a.e);
                    G.ball(p, 0.045 + 0.04 * a.e, shade(P.a, P.b, a.e), 1);
                    G.poly(ring, P.b, 0.1 * a.e);
                    G.path(ring, P.b, 1.5, 0.7 * a.e, { chunk: 4 });
                    if (!labelled && a.e > 0.6) {
                        labelled = true;
                        G.text(add(p, [0, 0.24, 0]), '|r⟩', P.b, a.e, 11);
                    }
                } else {
                    G.ball(p, 0.045, blocked ? P.mute : P.a, blocked ? 0.75 : 1);
                }
            });
        }
    };

    // ----------------------------------------------------------------------
    // Layers: the scene on show and, during a cross-fade, the one leaving
    // ----------------------------------------------------------------------

    let current = null, leaving = null, fade = 1;

    function makeLayer(scene) {
        return { scene, state: scene.init ? scene.init() : {}, t: 0, acc: 0, userYaw: 0, userPitch: 0 };
    }

    function advance(layer, dt) {
        layer.t += dt;
        if (!layer.scene.step) return;
        layer.acc += dt;
        while (layer.acc >= STEP) {
            layer.scene.step(layer.state, STEP);
            layer.acc -= STEP;
        }
    }

    function drawLayer(layer, alpha, zoom) {
        const s = layer.scene;
        const yaw = s.yaw + (s.spin || 0) * layer.t + (s.sway || 0) * Math.sin(layer.t * 0.33) + layer.userYaw;
        const pitch = clamp(s.pitch + layer.userPitch, -1.2, 1.35);
        setCamera(yaw, pitch, zoom * (s.zoom || 1));
        s.draw(layer.t, layer.state);
        flush(alpha);
    }

    function render() {
        if (!width || !height || !current) return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const e = smooth(0, 1, fade);
        if (leaving && fade < 1) drawLayer(leaving, 1 - e, 1 + 0.06 * e);
        drawLayer(current, leaving ? e : 1, leaving ? 0.94 + 0.06 * e : 1);
    }

    // ----------------------------------------------------------------------
    // Frame loop: runs only while the model is on screen and may move
    // ----------------------------------------------------------------------

    let frame = 0, last = 0, onScreen = false, dragging = false;

    function shouldRun() {
        return onScreen && !document.hidden && (!reduceMotion.matches || fade < 1);
    }

    function tick(now) {
        frame = 0;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!reduceMotion.matches) {
            advance(current, dt);
            if (leaving) advance(leaving, dt);
        }
        if (fade < 1) {
            fade = Math.min(1, fade + dt / FADE);
            if (fade >= 1) leaving = null;
        }
        render();
        if (shouldRun()) frame = requestAnimationFrame(tick);
    }

    /** Start the loop if it may run; otherwise paint a single frame. */
    function wake() {
        if (frame) return;
        if (shouldRun()) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        } else {
            render();
        }
    }

    // ----------------------------------------------------------------------
    // Keyword list (a vertical tablist) and caption
    // ----------------------------------------------------------------------

    const tabs = Array.from(body.querySelectorAll('.interest-item'));
    const caption = document.getElementById('interest-caption');
    const captionParts = {
        title: document.getElementById('interest-caption-title'),
        count: document.getElementById('interest-caption-count'),
        desc: document.getElementById('interest-caption-desc'),
        note: document.getElementById('interest-caption-note'),
        source: document.getElementById('interest-caption-source')
    };
    let captionTimer = 0;

    function fillCaption(tab, scene) {
        const text = (selector) => {
            const el = tab.querySelector(selector);
            return el ? el.textContent.trim() : '';
        };
        captionParts.title.textContent = text('.interest-name');
        captionParts.count.textContent = `${String(tabs.indexOf(tab) + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
        captionParts.desc.textContent = text('.interest-desc');
        captionParts.note.textContent = scene.note;

        const link = document.createElement('a');
        link.href = scene.source.href;
        link.textContent = scene.source.title;
        if (/^https?:/.test(scene.source.href)) {
            link.target = '_blank';
            link.rel = 'noopener';
        }
        captionParts.source.replaceChildren('Drawn from ', link, `, ${scene.source.venue}.`);
    }

    function select(tab, instant) {
        const scene = SCENES[tab.dataset.interest];
        if (!scene || (current && current.scene === scene)) return;

        tabs.forEach((other) => {
            const on = other === tab;
            other.setAttribute('aria-selected', on ? 'true' : 'false');
            other.tabIndex = on ? 0 : -1;
        });
        stage.setAttribute('aria-labelledby', tab.id);
        canvas.setAttribute('aria-label', `3D model: ${tab.querySelector('.interest-name').textContent.trim()}`);

        leaving = current;
        current = makeLayer(scene);
        const cut = instant || !leaving || reduceMotion.matches;
        if (cut) leaving = null;
        fade = cut ? 1 : 0;
        if (reduceMotion.matches) advance(current, scene.still || 3);

        clearTimeout(captionTimer);
        if (cut) {
            fillCaption(tab, scene);
        } else {
            caption.classList.add('is-changing');
            captionTimer = setTimeout(() => {
                fillCaption(tab, scene);
                caption.classList.remove('is-changing');
            }, 200);
        }

        // In the narrow layout the list is a strip: keep the choice in view
        const list = tab.parentElement;
        if (list.scrollWidth > list.clientWidth) {
            list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
        wake();
    }

    let hoverTimer = 0;
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('focus', () => select(tab));
        // A short dwell, so sweeping the pointer across the list does not flicker
        tab.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'mouse') return;
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => select(tab), 90);
        });
        tab.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
        tab.addEventListener('keydown', (event) => {
            const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
            let next = null;
            if (step) next = tabs[(index + step + tabs.length) % tabs.length];
            else if (event.key === 'Home') next = tabs[0];
            else if (event.key === 'End') next = tabs[tabs.length - 1];
            if (!next) return;
            event.preventDefault();
            next.focus();
        });
    });

    // ----------------------------------------------------------------------
    // Drag to rotate
    // ----------------------------------------------------------------------

    let dragX = 0, dragY = 0;
    canvas.addEventListener('pointerdown', (event) => {
        dragging = true;
        dragX = event.clientX;
        dragY = event.clientY;
        canvas.classList.add('is-dragging');
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!dragging || !current) return;
        current.userYaw += (event.clientX - dragX) * 0.008;
        current.userPitch += (event.clientY - dragY) * 0.006;
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

    // ----------------------------------------------------------------------
    // Set-up
    // ----------------------------------------------------------------------

    function resize() {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return;
        width = box.width;
        height = box.height;
        ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        render();
    }

    body.classList.add('is-ready');
    readPalette();
    select(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0], true);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    resize();

    new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        wake();
    }, { rootMargin: '80px' }).observe(canvas);

    document.addEventListener('visibilitychange', wake);
    reduceMotion.addEventListener('change', wake);
    new MutationObserver(() => {
        readPalette();
        wake();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // The caption labels use the site's mono face; repaint once it has loaded
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(wake);
})();
