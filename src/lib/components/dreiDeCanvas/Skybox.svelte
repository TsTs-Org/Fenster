<script lang="ts">
    import * as THREE from "three";
    import { onMount } from "svelte";

    let { scene, time } = $props<{ scene: THREE.Scene; time: number }>();

    let material = $state<THREE.ShaderMaterial>();
    let mesh: THREE.Mesh | undefined;
    let geometry: THREE.SphereGeometry | undefined;

    const skyColors = [
        {
            time: 0,
            top: new THREE.Color(0x000005),
            bottom: new THREE.Color(0x000010),
        }, // Midnight
        {
            time: 5,
            top: new THREE.Color(0x000010),
            bottom: new THREE.Color(0x000020),
        }, // Pre-dawn
        {
            time: 6,
            top: new THREE.Color(0x1a2b4c),
            bottom: new THREE.Color(0xff8b5e),
        }, // Sunrise
        {
            time: 7,
            top: new THREE.Color(0x2a5b8c),
            bottom: new THREE.Color(0xffb36e),
        }, // Early Morning
        {
            time: 9,
            top: new THREE.Color(0x4287f5),
            bottom: new THREE.Color(0x87ceeb),
        }, // Morning
        {
            time: 12,
            top: new THREE.Color(0x2b7ced),
            bottom: new THREE.Color(0xa3d5ff),
        }, // Noon
        {
            time: 16,
            top: new THREE.Color(0x3060a6),
            bottom: new THREE.Color(0xb3d0ff),
        }, // Afternoon
        {
            time: 18,
            top: new THREE.Color(0x2a5b8c),
            bottom: new THREE.Color(0xffb36e),
        }, // Late Afternoon
        {
            time: 19,
            top: new THREE.Color(0x1a2b4c),
            bottom: new THREE.Color(0xff6b4a),
        }, // Sunset
        {
            time: 20,
            top: new THREE.Color(0x050a1f),
            bottom: new THREE.Color(0x1a0b1c),
        }, // Dusk
        {
            time: 24,
            top: new THREE.Color(0x000005),
            bottom: new THREE.Color(0x000010),
        }, // Midnight
    ];

    function getColorsForTime(t: number) {
        t = ((t % 24) + 24) % 24;
        for (let i = 0; i < skyColors.length - 1; i++) {
            if (t >= skyColors[i].time && t <= skyColors[i + 1].time) {
                const range = skyColors[i + 1].time - skyColors[i].time;
                const progress =
                    range === 0 ? 0 : (t - skyColors[i].time) / range;

                const top = skyColors[i].top
                    .clone()
                    .lerp(skyColors[i + 1].top, progress);
                const bottom = skyColors[i].bottom
                    .clone()
                    .lerp(skyColors[i + 1].bottom, progress);

                return { top, bottom };
            }
        }
        return { top: skyColors[0].top, bottom: skyColors[0].bottom };
    }

    $effect(() => {
        if (material && time !== undefined) {
            const { top, bottom } = getColorsForTime(time);
            material.uniforms.topColor.value = top;
            material.uniforms.bottomColor.value = bottom;
            material.needsUpdate = true;
        }
    });

    onMount(() => {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec2 vUv;
            void main() {
                // Smooth the gradient slightly
                float h = smoothstep(0.0, 1.0, vUv.y);
                gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
            }
        `;

        material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                topColor: { value: new THREE.Color() },
                bottomColor: { value: new THREE.Color() },
            },
            side: THREE.BackSide,
            depthWrite: false,
        });

        const { top, bottom } = getColorsForTime(time);
        material.uniforms.topColor.value = top;
        material.uniforms.bottomColor.value = bottom;

        // Use a sphere that fits within the camera's far plane (100)
        geometry = new THREE.SphereGeometry(90, 32, 15);
        mesh = new THREE.Mesh(geometry, material);

        scene.add(mesh);

        return () => {
            if (mesh) scene.remove(mesh);
            geometry?.dispose();
            material?.dispose();
        };
    });
</script>
