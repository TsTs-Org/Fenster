<script lang="ts">
    // NAME DER DATEI DOOF WILL KEINE ZAHL DRIN HAM

    import { onMount } from "svelte";
    import * as THREE from "three";
    import { getMapUrl } from "./util";
    const apiKey = import.meta.env.VITE_AUTH_KEY;

    let canvasContainer: HTMLDivElement;
    let permissionGranted = $state(false);
    let showPermissionButton = $state(false);
    let alpha = 0,
        beta = 0,
        gamma = 0;
    let orient = 0;

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
        // We use a fallback gray color if the map fails to load or while it's loading
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x555555,
            side: THREE.DoubleSide,
        });

        textureLoader.load(
            mapUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;

                planeMaterial.map = texture;
                planeMaterial.color.setHex(0xffffff); // Clear the fallback color once loaded
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
</style>
