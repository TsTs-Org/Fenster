<script lang="ts">
    // NAME DER DATEI DOOF WILL KEINE ZAHL DRIN HAM

    import { onMount } from "svelte";
    import * as THREE from "three";
    import { getMapUrl, planeToLatLng, latLngToPlane } from "./util";
    import Skybox from "./Skybox.svelte";
    import Fog from "./Fog.svelte";
    import Sun from "./Sun.svelte";
    import MapMarker from "./MapMarker.svelte";

    // const apiKey = import.meta.env.VITE_AUTH_KEY;

    const apiKey = "AIzaSyBOUd36mrL1xjiQqQLEdwBTxDrIm4Vw_5I";
    let {
        lat,
        lng,
        heightInMeters,
        onmapclick,
        interestLocs = [],
    } = $props<{
        lat: number;
        lng: number;
        heightInMeters: number;
        onmapclick?: (lat: number, lng: number) => void;
        interestLocs?: { lat: number; lng: number; name: string }[];
    }>();

    let canvasContainer: HTMLDivElement;
    let permissionGranted = $state(false);
    let showPermissionButton = $state(false);
    let alpha = 0,
        beta = 0,
        gamma = 0;
    let orient = 0;

    let timeOfDay = $state(12);
    let sunBrightness = $state(1.5);
    let sceneObj = $state<THREE.Scene>();

    let clickedCoords = $state<{ lat: number; lng: number } | null>(null);
    let markerPosition = $state<THREE.Vector3 | null>(null);

    // We need to keep a reference to the plane to map lat/lng -> 3D Space
    let mapPlaneMesh = $state<THREE.Mesh>();

    let pinColors = ["#ff9900", "#00ff88", "#00bfff"]; // Orange, Green, Blue

    let calculatedInterestPins = $derived.by(() => {
        if (!mapPlaneMesh || interestLocs.length === 0) return [];

        return interestLocs.map(
            (
                loc: { lat: number; lng: number; name: string },
                index: number,
            ) => {
                const localCoords = latLngToPlane(
                    loc.lat,
                    loc.lng,
                    lat,
                    lng,
                    heightInMeters,
                    100,
                );

                // localPoint is on the plane
                let localPoint = new THREE.Vector3(
                    localCoords.x,
                    localCoords.y,
                    0,
                );

                // convert to world space
                let worldPoint = mapPlaneMesh!.localToWorld(localPoint.clone());

                return {
                    position: worldPoint,
                    color: pinColors[index % pinColors.length],
                };
            },
        );
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
    const map_size = 2000;

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
        renderer.domElement.style.zIndex = "1";

        if (canvasContainer) {
            canvasContainer.appendChild(renderer.domElement);
        }

        // Map plane on the bottom
        const textureLoader = new THREE.TextureLoader();

        // Define fog uniforms locally and attach to userData so Fog component can find them
        const planeUniforms = {
            radius: { value: 40.0 },
            smoothness: { value: 20.0 },
        };

        // We use a Lambert material so it reacts to the Sun light.
        // We hook into it to add the vignette via onBeforeCompile.
        const planeMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
        });

        planeMaterial.userData.uniforms = planeUniforms;

        planeMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.radius = planeUniforms.radius;
            shader.uniforms.smoothness = planeUniforms.smoothness;

            shader.vertexShader = `
                varying vec3 vPositionLocal;
                ${shader.vertexShader}
            `.replace(
                "#include <begin_vertex>",
                `
                #include <begin_vertex>
                vPositionLocal = position;
                `,
            );

            shader.fragmentShader = `
                uniform float radius;
                uniform float smoothness;
                varying vec3 vPositionLocal;
                ${shader.fragmentShader}
            `.replace(
                "#include <dithering_fragment>",
                `
                #include <dithering_fragment>
                float dist = length(vPositionLocal.xy);
                float alpha = 1.0 - smoothstep(radius - smoothness, radius, dist);
                gl_FragColor = vec4(gl_FragColor.rgb, gl_FragColor.a * alpha);
                `,
            );
        };

        textureLoader.load(
            mapUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;

                // Directly setting the map configures the Shader chunks internally
                planeMaterial.map = texture;
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
        plane.name = "mapPlane";
        scene.add(plane);

        // Save the mesh to state so our derived function can map Gemini locations from it
        mapPlaneMesh = plane;

        // Raycasting for click-to-coordinate
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onClick = (event: MouseEvent | TouchEvent) => {
            let clientX: number, clientY: number;
            if ("touches" in event) {
                if (event.touches.length === 0) return;
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }

            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(plane);

            if (intersects.length > 0) {
                const hit = intersects[0];

                // Update marker position state so the MapMarker component reacts
                markerPosition = hit.point.clone();

                // Get the intersection point in the plane's local coordinate space
                const localPoint = plane.worldToLocal(hit.point.clone());

                const coords = planeToLatLng(
                    localPoint.x,
                    localPoint.y,
                    lat,
                    lng,
                    heightInMeters,
                );

                clickedCoords = coords;
                console.log(
                    `Clicked: lat=${coords.lat.toFixed(6)}, lng=${coords.lng.toFixed(6)}`,
                );

                if (onmapclick) {
                    onmapclick(coords.lat, coords.lng);
                }
            }
        };

        renderer.domElement.addEventListener("click", onClick);

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
            renderer.domElement.removeEventListener("click", onClick);
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

<!-- {#if clickedCoords}
    <div class="coord-display">
        📍 {clickedCoords.lat.toFixed(6)}, {clickedCoords.lng.toFixed(6)}
    </div>
{/if} -->

{#if sceneObj}
    <Skybox scene={sceneObj} time={timeOfDay} />
    <Sun scene={sceneObj} brightness={sunBrightness} />
    <Fog scene={sceneObj} />
    <MapMarker scene={sceneObj} position={markerPosition} />
    {#each calculatedInterestPins as pin}
        <MapMarker scene={sceneObj} position={pin.position} color={pin.color} />
    {/each}
{/if}

<!-- <div class="time-controls">
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

    <label for="sun" style="margin-left: 15px;"
        >Sun Brightness: {sunBrightness.toFixed(1)}</label
    >
    <input
        id="sun"
        type="range"
        min="0"
        max="5"
        step="0.1"
        bind:value={sunBrightness}
        style="width: 100px;"
    />
</div> -->

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

    .coord-display {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #00ff88;
        padding: 8px 16px;
        border-radius: 8px;
        z-index: 1000;
        font-family: monospace;
        font-size: 14px;
        pointer-events: none;
    }
</style>
