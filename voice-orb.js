(() => {
    const TAG_NAME = "voice-orb";
    const DEFAULT_SIZE = 200;
    const DEFAULT_COLORS = [
        [10, 124, 255],
        [170, 153, 255],
        [255, 255, 255],
    ];
    const DEFAULT_TRANSITION_MS = 1000;
    const DEFAULT_MORPH_SPEED = 1.0;
    const DEFAULT_RANDOMNESS = 0.25;
    const DEFAULT_ROTATION_SPEED = 0.25;
    const FRAME_STEP_MS = 16;


    function easeInOutCubic(t){
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }


    class VoiceOrbElement extends HTMLElement {
        #ctx;
        #colors = {
            current: DEFAULT_COLORS,
            target: [],
            start: []
        };
        #transition = {
            time: 0,
            elapsed: 0,
            startRotationSpeed: 0,
            targetRotationSpeed: 0
        };
        #morphSpeed = DEFAULT_MORPH_SPEED;
        #randomness = DEFAULT_RANDOMNESS;
        #rotationSpeed = DEFAULT_ROTATION_SPEED;
        #rotationAngle = 0;
        #t = 0;
        #running = false;
        #animate;

        constructor() {
            super();

            this.attachShadow({mode: "open"});

            const canvas = document.createElement("canvas");
            this.shadowRoot.appendChild(canvas);

            this.size = parseInt(this.getAttribute("size")) || DEFAULT_SIZE;
            canvas.width = this.size;
            canvas.height = this.size;

            this.#ctx = canvas.getContext("2d", {alpha: true});

            this.#animate = this.animate.bind(this);
        }

        connectedCallback() {
            this.#running = true;
            requestAnimationFrame(this.#animate);
        }

        disconnectedCallback() {
            this.#running = false;
        }

        animate() {
            if(!this.#running)return;

            const r = this.size / 2;
            const img = this.#ctx.createImageData(this.size, this.size);
            const d = img.data;

            // Morph transition interpolation
            this.#t += 0.02 * this.#morphSpeed;
            const nColors = this.#colors.current.length;

            // Color transition interpolation
            let p = 1;
            if(this.#transition.elapsed < this.#transition.time) {
                this.#transition.elapsed += FRAME_STEP_MS;
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
            const rotProgress = Math.min(this.#transition.elapsed / (this.#transition.time || 1), 1);
            const easedRot = easeInOutCubic(rotProgress);
            const effectiveRotationSpeed =
                this.#transition.startRotationSpeed +
                (this.#transition.targetRotationSpeed - this.#transition.startRotationSpeed) * easedRot;

            const durationScale = Math.max(0.25, Math.min(2.0, DEFAULT_TRANSITION_MS / (this.#transition.time || DEFAULT_TRANSITION_MS)));
            this.#rotationAngle += effectiveRotationSpeed * 0.02 * durationScale;

            // Asymmetry offsets
            const rx1 = Math.sin(this.#t * 0.7 + 13.7) * 3.5;
            const ry1 = Math.cos(this.#t * 0.5 + 4.2) * 3.5;
            const rx2 = Math.sin(this.#t * 0.9 + 8.9) * 2.7;
            const ry2 = Math.cos(this.#t * 0.8 + 2.8) * 2.7;

            for(let y = 0; y < this.size; y++) {
                for(let x = 0; x < this.size; x++) {
                    const dx0 = (x - r) / r;
                    const dy0 = (y - r) / r;
                    const dist = Math.sqrt(dx0 * dx0 + dy0 * dy0);
                    const i = (y * this.size + x) * 4;

                    if(dist > 1) {
                        d[i + 3] = 0;
                        continue;
                    }

                    const cosA = Math.cos(this.#rotationAngle);
                    const sinA = Math.sin(this.#rotationAngle);
                    const dxRot = dx0 * cosA + dy0 * sinA;
                    const dyRot = -dx0 * sinA + dy0 * cosA;

                    const t = Math.max(0, Math.min(1, (1 - dist) / 0.8));
                    const asym = t * t * (3 - 2 * t) * this.#randomness;

                    const dx = dxRot + asym * (Math.sin(dyRot * 3 + rx1) * 0.1 + Math.cos(dyRot * 5 + rx2) * 0.05);
                    const dy = dyRot + asym * (Math.sin(dxRot * 4 + ry1) * 0.1 + Math.cos(dxRot * 6 + ry2) * 0.05);

                    const angle = Math.atan2(dy, dx);
                    const radial =
                        Math.sin(dist * 10 - this.#t * 1.5) * 0.25 +
                        Math.cos(dist * 5.5 + this.#t * 1.2) * 0.25;
                    const swirl =
                        Math.sin(angle * 6 + this.#t * 0.8) +
                        Math.sin(angle * 12 - this.#t * 0.6) * 0.5;
                    const phase = 0.5 + 0.5 * Math.sin(swirl + radial * Math.PI * 2);

                    const idxColor = phase * (nColors - 1);
                    const low = Math.floor(idxColor);
                    const high = Math.min(low + 1, nColors - 1);
                    const mix = idxColor - low;

                    const c1 = this.#colors.current[low];
                    const c2 = this.#colors.current[high];
                    let rCol = c1[0] * (1 - mix) + c2[0] * mix;
                    let gCol = c1[1] * (1 - mix) + c2[1] * mix;
                    let bCol = c1[2] * (1 - mix) + c2[2] * mix;

                    const vignette = 1 - Math.pow(1 - dist, 2.5);
                    rCol *= vignette;
                    gCol *= vignette;
                    bCol *= vignette;

                    d[i] = rCol;
                    d[i + 1] = gCol;
                    d[i + 2] = bCol;
                    d[i + 3] = 255;
                }
            }

            this.#ctx.putImageData(img, 0, 0);
            requestAnimationFrame(this.#animate);
        }

        /**
         * Update orb configuration.
         * @param {Object} options
         * @param {number[][]} [options.colors]
         * @param {number} [options.transitionTime]
         * @param {number} [options.morphSpeed]
         * @param {number} [options.randomness]
         * @param {number} [options.rotationSpeed]
         */
        update(options = {}) {
            if(!Array.isArray(options.colors) || options.colors.length === 0)return;

            this.#colors.target = (options.colors ?? this.#colors.current)
                .map(c => Array.isArray(c) ? [...c.slice(0, 3)] : [0, 0, 0]);
            this.#colors.start = this.#colors.current.map(c => [...c]);

            this.#transition.time = options.transitionTime ?? DEFAULT_TRANSITION_MS;
            this.#transition.elapsed = 0;
            this.#morphSpeed = options.morphSpeed ?? this.#morphSpeed;
            this.#randomness = Math.max(0, Math.min(1, options.randomness ?? this.#randomness));

            this.#transition.startRotationSpeed = this.#rotationSpeed;
            this.#rotationSpeed = options.rotationSpeed ?? this.#rotationSpeed;
            this.#transition.targetRotationSpeed = this.#rotationSpeed;
        }
    }


    customElements.define(TAG_NAME, VoiceOrbElement);
})();