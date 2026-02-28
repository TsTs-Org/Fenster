<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import * as THREE from "three";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg = await invoke("greet", { name });
  }

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
    orient = window.orientation || 0;
  }

  async function requestPermission() {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
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

  onMount(() => {
    if (
      typeof (DeviceOrientationEvent as unknown as any).requestPermission ===
      "function"
    ) {
      showPermissionButton = true;
    } else {
      permissionGranted = true;
    }

    orient = window.orientation || 0;
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
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
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

    // Red plane on the bottom
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -10;
    scene.add(plane);

    const gridHelper = new THREE.GridHelper(100, 100);
    gridHelper.position.y = -9.9;
    scene.add(gridHelper);

    // Add a simple box straight ahead for visual reference
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const boxMaterial = new THREE.MeshNormalMaterial({ wireframe: true });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 0, -10);
    scene.add(box);

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
      window.removeEventListener("orientationchange", onScreenOrientation);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (canvasContainer && canvasContainer.contains(renderer.domElement)) {
        canvasContainer.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div bind:this={canvasContainer}></div>

<main class="container">
  {#if showPermissionButton && !permissionGranted}
    <div style="margin-bottom: 2rem;">
      <button onclick={requestPermission}>Enable 3D Device Orientation</button>
    </div>
  {/if}

  <h1>Welcome to Tauri + Svelte</h1>

  <div class="row">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="logo svelte-kit" alt="SvelteKit Logo" />
    </a>
  </div>
  <p>Click on the Tauri, Vite, and SvelteKit logos to learn more.</p>

  <form class="row" onsubmit={greet}>
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button type="submit">Greet</button>
  </form>
  <p>{greetMsg}</p>
</main>

<style>
  .logo.vite:hover {
    filter: drop-shadow(0 0 2em #747bff);
  }

  .logo.svelte-kit:hover {
    filter: drop-shadow(0 0 2em #ff3e00);
  }

  :root {
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;

    color: #0f0f0f;
    background-color: #f6f6f6;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }

  .container {
    margin: 0;
    padding-top: 10vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: 0.75s;
  }

  .logo.tauri:hover {
    filter: drop-shadow(0 0 2em #24c8db);
  }

  .row {
    display: flex;
    justify-content: center;
  }

  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }

  a:hover {
    color: #535bf2;
  }

  h1 {
    text-align: center;
  }

  input,
  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    color: #0f0f0f;
    background-color: #ffffff;
    transition: border-color 0.25s;
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
  }

  button {
    cursor: pointer;
  }

  button:hover {
    border-color: #396cd8;
  }
  button:active {
    border-color: #396cd8;
    background-color: #e8e8e8;
  }

  input,
  button {
    outline: none;
  }

  #greet-input {
    margin-right: 5px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color: #f6f6f6;
      background-color: #2f2f2f;
    }

    a:hover {
      color: #24c8db;
    }

    input,
    button {
      color: #ffffff;
      background-color: #0f0f0f98;
    }
    button:active {
      background-color: #0f0f0f69;
    }
  }
</style>
