(() => {
    const TAG_NAME = "voice-orb";
    const DEFAULT_SIZE = 200;
    const DEFAULT_COLORS = [
        [255, 255, 255],
        [255, 255, 255],
        [255, 255, 255],
    ];
    const DEFAULT_TRANSITION_MS = 1000;
    const DEFAULT_MORPH_SPEED = 1.0;
    const DEFAULT_RANDOMNESS = 0.25;
    const DEFAULT_ROTATION_SPEED = 0.25;
    const MAX_COLORS = 8;
    const INSTANT_TRANSITION_DELAY_MS = 50;
    const HOST_CSS = `
        display: block;
        border-radius: 100%;
        overflow: hidden;
    `;

    const VERTEX_SHADER = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const FRAGMENT_SHADER = `
        precision highp float;
        varying vec2 v_uv;

        uniform float u_t;
        uniform float u_rotation;
        uniform float u_randomness;
        uniform int u_nColors;
        uniform vec3 u_colors[${MAX_COLORS}];
        uniform vec2 u_resolution;

        vec3 sampleGradient(float phase) {
            float idx = phase * float(u_nColors - 1);
            float lowF = floor(idx);
            float mixF = idx - lowF;
            int low = int(lowF);
            int high = low + 1;
            if(high > u_nColors - 1) high = u_nColors - 1;
            vec3 c1 = u_colors[0];
            vec3 c2 = u_colors[0];
            for(int i = 0; i < ${MAX_COLORS}; i++) {
                if(i == low) c1 = u_colors[i];
                if(i == high) c2 = u_colors[i];
            }
            return mix(c1, c2, mixF);
        }

        float folds(vec2 p, float t, float rot, float asym, vec2 r1, vec2 r2) {
            float dist = length(p);
            float angle = atan(p.y, p.x);

            float aw = sin(angle * 2.0 + t * 0.3 + rot * 0.4 + r1.x * 0.4) * 0.4
                     + sin(angle * 3.0 - t * 0.22 - rot * 0.7 + r2.x * 0.4) * 0.25;
            float rw = sin(dist * 2.5 - t * 0.35 + r1.y * 0.4) * 0.3
                     + cos(dist * 4.0 + t * 0.28 + r2.y * 0.4) * 0.18;

            float angle2 = angle + rw * (0.5 + asym * 0.6);
            float dist2 = dist + aw * (0.2 + asym * 0.4);

            float a = sin(angle2 * 3.0 + dist2 * 4.0 - t * 0.6 + rot * 0.9);
            float b = sin(angle2 * 5.0 - dist2 * 2.5 + t * 0.45 - rot * 1.4 + a * 1.2);
            float c = sin(dist2 * 7.0 + t * 0.4 + b * 0.7 + rot * 0.3);

            float h = a * 0.5 + b * 0.4 + c * 0.25;
            return h / (1.0 + abs(h) * 0.6);
        }

        float patches(vec2 p, float t, float rot, vec2 r1, vec2 r2) {
            float dist = length(p);
            float angle = atan(p.y, p.x);

            float w1 = sin(angle * 1.0 + t * 0.18 + rot * 0.5 + r1.x * 0.5) * 0.6
                     + sin(angle * 2.0 - t * 0.13 - rot * 0.3 + r2.x * 0.5) * 0.35;
            float w2 = cos(dist * 1.8 + t * 0.15 + r1.y * 0.5) * 0.45
                     + sin(dist * 3.2 - t * 0.22 + r2.y * 0.5) * 0.25;

            float angle2 = angle + w2 * 0.7;
            float dist2 = dist + w1 * 0.3;

            float a = sin(angle2 * 2.0 + dist2 * 2.0 - t * 0.25 - rot * 0.6);
            float b = sin(angle2 * 3.0 - dist2 * 1.2 + t * 0.18 + rot * 1.1 + a * 1.4);
            float c = sin(dist2 * 3.5 + t * 0.2 + b * 0.9);

            return a * 0.55 + b * 0.45 + c * 0.3;
        }

        void main() {
            vec2 p = v_uv * 2.0 - 1.0;
            float dist = length(p);

            if(dist > 1.0) {
                gl_FragColor = vec4(0.0);
                return;
            }

            float aa = fwidth(dist) * 1.5;
            float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, dist);

            float rx1 = sin(u_t * 0.7 + 13.7) * 3.5;
            float ry1 = cos(u_t * 0.5 + 4.2) * 3.5;
            float rx2 = sin(u_t * 0.9 + 8.9) * 2.7;
            float ry2 = cos(u_t * 0.8 + 2.8) * 2.7;

            float cosA = 1.0;
            float sinA = 0.0;
            vec2 pRot = p;

            float t = clamp((1.0 - dist) / 0.8, 0.0, 1.0);
            float asym = t * t * (3.0 - 2.0 * t) * u_randomness;

            float h = folds(pRot, u_t, -u_rotation, asym, vec2(rx1, ry1), vec2(rx2, ry2));
            float phase = 0.5 + 0.5 * patches(pRot, u_t, -u_rotation, vec2(rx1, ry1), vec2(rx2, ry2));

            vec3 col = sampleGradient(phase);

            float e = 0.0035;
            float hx = folds(pRot + vec2(e, 0.0), u_t, -u_rotation, asym, vec2(rx1, ry1), vec2(rx2, ry2));
            float hy = folds(pRot + vec2(0.0, e), u_t, -u_rotation, asym, vec2(rx1, ry1), vec2(rx2, ry2));
            vec2 grad = vec2(hx - h, hy - h) / e;

            float curve = sqrt(max(0.0, 1.0 - dist * dist));
            vec3 nSphere = vec3(p, curve);
            vec3 nDetail = normalize(vec3(-grad * 0.18, 1.0));
            vec3 N = normalize(nSphere * 0.7 + nDetail * 0.7);

            vec3 V = vec3(0.0, 0.0, 1.0);
            vec3 L1 = normalize(vec3(-0.5, 0.7, 0.7));

            vec3 H1 = normalize(L1 + V);
            float spec1 = pow(max(dot(N, H1), 0.0), 56.0);

            vec3 T = normalize(vec3(-pRot.y, pRot.x, 0.0));
            float TdotH = dot(T, H1);
            float aniso = pow(max(0.0, 1.0 - TdotH * TdotH), 18.0) * 0.22;

            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

            float diff = max(dot(N, L1), 0.0) * 0.7 + 0.4;

            col = col * diff;
            col += vec3(255.0) * spec1 * 0.4;
            col += vec3(255.0) * aniso * 0.7;
            col += sampleGradient(fract(phase + 0.5)) * fres * 0.35;

            float coreGlow = 1.0 - smoothstep(0.0, 0.55, dist);
            col += sampleGradient(fract(phase + 0.25)) * coreGlow * 0.35;

            float vignette = 1.0 - pow(1.0 - dist, 2.5) * 0.55;
            col *= vignette;

            gl_FragColor = vec4(col / 255.0, alpha);
        }
    `;


    function easeInOutCubic(t){
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }


    class VoiceOrbElement extends HTMLElement {
        static observedAttributes = [ "size" ];

        #canvas;
        #gl;
        #program;
        #uniforms = {};
        #colors = {
            current: DEFAULT_COLORS,
            target: [],
            start: []
        };
        #transition = {
            time: 0,
            elapsed: 0,
            startRotationSpeed: DEFAULT_ROTATION_SPEED,
            targetRotationSpeed: DEFAULT_ROTATION_SPEED,
            startMorphSpeed: DEFAULT_MORPH_SPEED,
            targetMorphSpeed: DEFAULT_MORPH_SPEED,
            startRandomness: DEFAULT_RANDOMNESS,
            targetRandomness: DEFAULT_RANDOMNESS
        };
        #morphSpeed = DEFAULT_MORPH_SPEED;
        #randomness = DEFAULT_RANDOMNESS;
        #rotationSpeed = DEFAULT_ROTATION_SPEED;
        #rotationAngle = 0;
        #t = 0;
        #running = false;
        #animate;
        #lastFrameTime = 0;
        #startTime = 0;

        connectedCallback() {
            this.style.cssText = HOST_CSS;

            this.attachShadow({mode: "open"});

            this.#canvas = document.createElement("canvas");
            this.#canvas.style.transform = "scale(1.025)";
            this.#canvas.style.display = "block";
            this.shadowRoot.appendChild(this.#canvas);

            this.#resize(this.getAttribute("size"));

            this.#gl = this.#canvas.getContext("webgl", {alpha: true, premultipliedAlpha: false, antialias: true})
                || this.#canvas.getContext("experimental-webgl", {alpha: true, premultipliedAlpha: false, antialias: true});
            this.#initGL();

            this.#animate = this.animate.bind(this);

            this.#running = true;
            this.#lastFrameTime = performance.now();
            this.#startTime = this.#lastFrameTime;

            requestAnimationFrame(this.#animate);
        }

        disconnectedCallback() {
            this.#running = false;
        }

        attributeChangedCallback(name, _, newValue) {
            if(name !== "size") return;

            this.#resize(parseInt(newValue));
        }

        #resize(size) {
            if(!this.#canvas) return;

            const dpr = window.devicePixelRatio || 1;
            this.size = size || DEFAULT_SIZE;

            this.style.width = this.size + "px";
            this.style.height = this.size + "px";
            this.#canvas.style.width = this.size + "px";
            this.#canvas.style.height = this.size + "px";
            this.#canvas.width = this.size * dpr;
            this.#canvas.height = this.size * dpr;

            if(this.#gl) {
                this.#gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
            }
        }

        #initGL() {
            const gl = this.#gl;
            gl.getExtension("OES_standard_derivatives");

            const compile = (type, src) => {
                const s = gl.createShader(type);
                gl.shaderSource(s, "#extension GL_OES_standard_derivatives : enable\n" + src);
                gl.compileShader(s);
                return s;
            };

            const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
            const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            gl.useProgram(program);
            this.#program = program;

            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1,  1, -1,  -1, 1,
                -1,  1,  1, -1,   1, 1
            ]), gl.STATIC_DRAW);

            const aPos = gl.getAttribLocation(program, "a_position");
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            this.#uniforms = {
                t: gl.getUniformLocation(program, "u_t"),
                rotation: gl.getUniformLocation(program, "u_rotation"),
                randomness: gl.getUniformLocation(program, "u_randomness"),
                nColors: gl.getUniformLocation(program, "u_nColors"),
                colors: gl.getUniformLocation(program, "u_colors"),
                resolution: gl.getUniformLocation(program, "u_resolution")
            };

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
        }

        animate() {
            if(!this.#running)return;

            const now = performance.now();
            const dt = Math.min(64, now - this.#lastFrameTime);
            this.#lastFrameTime = now;

            const gl = this.#gl;

            const rotProgress = Math.min(this.#transition.elapsed / (this.#transition.time || 1), 1);
            const easedRot = easeInOutCubic(rotProgress);

            // Morph transition interpolation
            const effectiveMorphSpeed =
                this.#transition.startMorphSpeed +
                (this.#transition.targetMorphSpeed - this.#transition.startMorphSpeed) * easedRot;
            this.#t += 0.02 * effectiveMorphSpeed * (dt / 16);
            const nColors = this.#colors.current.length;

            // Color transition interpolation
            let p = 1;
            if(this.#transition.elapsed < this.#transition.time) {
                this.#transition.elapsed += dt;
                const linear = Math.min(this.#transition.elapsed / this.#transition.time, 1);
                p = easeInOutCubic(linear);
                this.#colors.current = this.#colors.current.map((c, i) => {
                    const tcol = this.#colors.target[i % this.#colors.target.length];
                    const scol = this.#colors.start[i % this.#colors.start.length];
                    return [
                        scol[0] + (tcol[0] - scol[0]) * p,
                        scol[1] + (tcol[1] - scol[1]) * p,
                        scol[2] + (tcol[2] - scol[2]) * p
                    ];
                });
            }

            // Rotation transition interpolation
            const effectiveRotationSpeed =
                this.#transition.startRotationSpeed +
                (this.#transition.targetRotationSpeed - this.#transition.startRotationSpeed) * easedRot;

            this.#rotationAngle += effectiveRotationSpeed * 0.02 * (dt / 16);

            const effectiveRandomness =
                this.#transition.startRandomness +
                (this.#transition.targetRandomness - this.#transition.startRandomness) * easedRot;

            const flatColors = new Float32Array(MAX_COLORS * 3);
            for(let i = 0; i < nColors && i < MAX_COLORS; i++) {
                flatColors[i * 3] = this.#colors.current[i][0];
                flatColors[i * 3 + 1] = this.#colors.current[i][1];
                flatColors[i * 3 + 2] = this.#colors.current[i][2];
            }

            gl.useProgram(this.#program);
            gl.uniform1f(this.#uniforms.t, this.#t);
            gl.uniform1f(this.#uniforms.rotation, this.#rotationAngle);
            gl.uniform1f(this.#uniforms.randomness, effectiveRandomness);
            gl.uniform1i(this.#uniforms.nColors, Math.min(nColors, MAX_COLORS));
            gl.uniform3fv(this.#uniforms.colors, flatColors);
            gl.uniform2f(this.#uniforms.resolution, this.#canvas.width, this.#canvas.height);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            requestAnimationFrame(this.#animate);
        }

        /**
         * Update orb configuration.
         * @param {Object} options
         * @param {number[][]} [options.colors] Arbitrary amount of morphed orb colors.
         * @param {number} [options.transitionTime] Time transitioning from the current to the updated orb configuration.
         * @param {number} [options.morphSpeed]
         * @param {number} [options.randomness]
         * @param {number} [options.rotationSpeed]
         */
        update(options = {}) {
            if(!Array.isArray(options.colors) || options.colors.length === 0)return;

            const incomingColors = options.colors
                .map(c => Array.isArray(c) ? [...c.slice(0, 3)] : [0, 0, 0]);

            const sinceStart = performance.now() - this.#startTime;
            const applyInstantly = sinceStart < INSTANT_TRANSITION_DELAY_MS;

            if(applyInstantly) {
                this.#colors.current = incomingColors.map(c => [...c]);
                this.#colors.start = incomingColors.map(c => [...c]);
                this.#colors.target = incomingColors;

                this.#morphSpeed = options.morphSpeed ?? this.#morphSpeed;
                this.#randomness = Math.max(0, Math.min(1, options.randomness ?? this.#randomness));
                this.#rotationSpeed = options.rotationSpeed ?? this.#rotationSpeed;

                this.#transition.time = 0;
                this.#transition.elapsed = 0;
                this.#transition.startMorphSpeed = this.#morphSpeed;
                this.#transition.targetMorphSpeed = this.#morphSpeed;
                this.#transition.startRandomness = this.#randomness;
                this.#transition.targetRandomness = this.#randomness;
                this.#transition.startRotationSpeed = this.#rotationSpeed;
                this.#transition.targetRotationSpeed = this.#rotationSpeed;
                return;
            }

            this.#colors.target = incomingColors;
            this.#colors.start = this.#colors.current.map(c => [...c]);

            this.#transition.time = options.transitionTime ?? DEFAULT_TRANSITION_MS;
            this.#transition.elapsed = 0;

            this.#transition.startMorphSpeed = this.#morphSpeed;
            this.#morphSpeed = options.morphSpeed ?? this.#morphSpeed;
            this.#transition.targetMorphSpeed = this.#morphSpeed;

            this.#transition.startRandomness = this.#randomness;
            this.#randomness = Math.max(0, Math.min(1, options.randomness ?? this.#randomness));
            this.#transition.targetRandomness = this.#randomness;

            this.#transition.startRotationSpeed = this.#rotationSpeed;
            this.#rotationSpeed = options.rotationSpeed ?? this.#rotationSpeed;
            this.#transition.targetRotationSpeed = this.#rotationSpeed;
        }
    }


    customElements.define(TAG_NAME, VoiceOrbElement);
})();