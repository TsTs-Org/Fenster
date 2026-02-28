<script lang="ts">
    // NAME DER DATEI DOOF WILL KEINE ZAHL DRIN HAM

    import { onMount } from "svelte";
    import * as THREE from "three";
    import { getMapUrl } from "./util";
    import Skybox from "./Skybox.svelte";
    import FogConfig from "./FogConfig.svelte";

    const apiKey = import.meta.env.VITE_AUTH_KEY;

    let canvasContainer: HTMLDivElement;
    let permissionGranted = $state(false);
    let showPermissionButton = $state(false);
    let alpha = 0,
        beta = 0,
        gamma = 0;
    let orient = 0;

    let timeOfDay = $state(12);
    let sceneObj = $state<THREE.Scene>();

    // Fog Vignette Settings
    let fogRadius = $state(40.0);
    let fogSmooth = $state(20.0);
    let planeUniforms = $state({
        map: { value: null as THREE.Texture | null },
        get radius() {
            return { value: fogRadius };
        },
        get smoothness() {
            return { value: fogSmooth };
        },
    });

    function onDeviceOrientation(event: DeviceOrientationEvent) {
        alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
        beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
        gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    }

    function onScreenOrientation() {
        orient = (window as any).orientation || 0;
    }

    async function requestPermission() {
        if (
            typeof (DeviceOrientationEvent as any).requestPermission ===
            "function"
        ) {
            try {
                const permissionState = await (
                    DeviceOrientationEvent as any
                ).requestPermission();
                if (permissionState === "granted") {
                    permissionGranted = true;
                    showPermissionButton = false;
                } else {
                    alert("Permission to access device orientation was denied");
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    // Usage Example:
    const heightInMeters = 5000; // 5km up
    const map_size = 2000;

    const lat = 53.55;
    const lng = 10.0;

    const mapUrl = getMapUrl(lat, lng, heightInMeters, apiKey, map_size);

    onMount(() => {
        if (
            typeof (DeviceOrientationEvent as unknown as any)
                .requestPermission === "function"
        ) {
            showPermissionButton = true;
        } else {
            permissionGranted = true;
        }

        orient = (window as any).orientation || 0;
        window.addEventListener("orientationchange", onScreenOrientation);
        window.addEventListener("deviceorientation", onDeviceOrientation);

        const scene = new THREE.Scene();
        scene.background = null;
        sceneObj = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100,
        );
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = "fixed";
        renderer.domElement.style.top = "0";
        renderer.domElement.style.left = "0";
        renderer.domElement.style.zIndex = "-1";
        renderer.domElement.style.pointerEvents = "none";

        if (canvasContainer) {
            canvasContainer.appendChild(renderer.domElement);
        }

        // Map plane on the bottom
        const lat = 52.52; // Example: Berlin
        const lng = 13.405;
        const zoom = 14;
        const mapSize = 640;

        const textureLoader = new THREE.TextureLoader();

        const vertexShader = `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                // vPosition will be interpolated across the plane. 
                // Since the plane is 100x100 and centered at 0,0,0 initially, 
                // we can just use the local coordinates to measure distance from center.
                vPosition = position; 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D map;
            uniform float radius;
            uniform float smoothness;
            
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                vec4 texColor = texture2D(map, vUv);
                
                // Calculate horizontal distance from center of plane (0,0)
                float dist = length(vPosition.xy);
                
                // Calculate alpha: 1.0 inside radius, soft falloff across smoothness, 0.0 outside
                float alpha = 1.0 - smoothstep(radius - smoothness, radius, dist);

                // Use the map color, but apply the derived transparency for the vignette
                gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
            }
        `;

        // We use a custom shader material to apply the circular fade
        const planeMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: planeUniforms,
            transparent: true,
            side: THREE.DoubleSide,
        });

        textureLoader.load(
            mapUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;

                planeUniforms.map.value = texture;
                planeMaterial.needsUpdate = true;
            },
            undefined,
            (err) => {
                console.error(
                    "Error loading map texture (check API key):",
                    err,
                );
            },
        );

        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -10;
        scene.add(plane);

        const resize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", resize);

        const euler = new THREE.Euler(0, 0, 0, "YXZ");
        const q0 = new THREE.Quaternion();
        const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around x-axis
        const zee = new THREE.Vector3(0, 0, 1);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (permissionGranted) {
                euler.set(beta, alpha, -gamma, "YXZ");
                camera.quaternion.setFromEuler(euler);
                camera.quaternion.multiply(q1);
                camera.quaternion.multiply(
                    q0.setFromAxisAngle(zee, -orient * THREE.MathUtils.DEG2RAD),
                );
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener(
                "orientationchange",
                onScreenOrientation,
            );
            window.removeEventListener(
                "deviceorientation",
                onDeviceOrientation,
            );
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            if (
                canvasContainer &&
                canvasContainer.contains(renderer.domElement)
            ) {
                canvasContainer.removeChild(renderer.domElement);
            }
        };
    });
</script>

<div bind:this={canvasContainer}></div>

{#if sceneObj}
    <Skybox scene={sceneObj} time={timeOfDay} />
{/if}

<!-- Fog settings UI -->
<FogConfig bind:radius={fogRadius} bind:smooth={fogSmooth} />

<div class="time-controls">
    <label for="time"
        >Time: {Math.floor(timeOfDay).toString().padStart(2, "0")}:{Math.floor(
            (timeOfDay % 1) * 60,
        )
            .toString()
            .padStart(2, "0")}</label
    >
    <input
        id="time"
        type="range"
        min="0"
        max="24"
        step="0.1"
        bind:value={timeOfDay}
    />
</div>

{#if showPermissionButton && !permissionGranted}
    <div class="permission-overlay">
        <button onclick={requestPermission}>Enable 3D Device Orientation</button
        >
    </div>
{/if}

<style>
    .permission-overlay {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
    }

    .time-controls {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: sans-serif;
    }
</style>
