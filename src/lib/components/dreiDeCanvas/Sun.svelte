<script lang="ts">
    import * as THREE from "three";
    import { onMount, onDestroy } from "svelte";

    let { scene, brightness = 1.0 } = $props<{
        scene: THREE.Scene;
        brightness?: number;
    }>();

    let sunPosition = new THREE.Vector3(50, 100, 50);

    let directionalLight = $state<THREE.DirectionalLight>();
    let ambientLight = $state<THREE.AmbientLight>();

    $effect(() => {
        if (directionalLight) {
            directionalLight.intensity = brightness;
        }
    });

    onMount(() => {
        // Main directional light acting as the sun
        directionalLight = new THREE.DirectionalLight(0xffeedd, brightness);
        directionalLight.position.copy(sunPosition);
        scene.add(directionalLight);

        // Ambient light to fill in the shadows slightly
        ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        return () => {
            if (directionalLight) scene.remove(directionalLight);
            if (ambientLight) scene.remove(ambientLight);
            directionalLight?.dispose();
            ambientLight?.dispose();
        };
    });
</script>
