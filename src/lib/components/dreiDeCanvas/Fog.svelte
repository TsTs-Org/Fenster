<script lang="ts">
    import * as THREE from "three";

    let { scene } = $props<{ scene: THREE.Scene }>();

    let radius = $state(40);
    let smooth = $state(20);

    // This effect ensures that whenever radius or smooth change,
    // we find the map plane in the scene and update its material uniforms.
    $effect(() => {
        if (!scene) return;
        const mesh = scene.getObjectByName("mapPlane") as THREE.Mesh;
        if (mesh && mesh.material) {
            const mat = mesh.material as any;
            if (mat.userData && mat.userData.uniforms) {
                mat.userData.uniforms.radius.value = radius;
                mat.userData.uniforms.smoothness.value = smooth;
            }
        }
    });
</script>

<div class="fog-controls">
    <div class="control-group">
        <label for="fog-radius">Fog Distance: {radius}</label>
        <input
            id="fog-radius"
            type="range"
            min="10"
            max="100"
            step="1"
            bind:value={radius}
        />
    </div>
    <div class="control-group">
        <label for="fog-smooth">Fog Softness: {smooth}</label>
        <input
            id="fog-smooth"
            type="range"
            min="1"
            max="50"
            step="1"
            bind:value={smooth}
        />
    </div>
</div>

<style>
    .fog-controls {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: sans-serif;
    }
    .control-group {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        white-space: nowrap;
    }
    input[type="range"] {
        width: 150px;
    }
</style>
