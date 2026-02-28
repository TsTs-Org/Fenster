<script lang="ts">
    import * as THREE from "three";
    import { onMount, onDestroy } from "svelte";

    let { scene, position } = $props<{
        scene: THREE.Scene;
        position: THREE.Vector3 | null;
    }>();

    let markerGroup: THREE.Group;

    onMount(() => {
        markerGroup = new THREE.Group();

        // Red plastic head
        const headMaterial = new THREE.MeshLambertMaterial({
            color: 0xff3333,
        });

        // Shiny metal needle
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.5,
        });

        // The needle part (pointing down)
        const actualConeGeom = new THREE.ConeGeometry(0.12, 2.0, 16);
        actualConeGeom.rotateX(Math.PI); // Tip is now at bottom of geometry
        actualConeGeom.translate(0, 1.0, 0); // Tip is exactly at (0,0,0)
        const finalConeMesh = new THREE.Mesh(actualConeGeom, metalMaterial);

        // Sphere sits on top of the flat base at Y=2.0
        const actualSphereGeom = new THREE.SphereGeometry(0.35, 16, 16);
        actualSphereGeom.translate(0, 2.0, 0);
        const finalSphereMesh = new THREE.Mesh(actualSphereGeom, headMaterial);

        markerGroup.add(finalConeMesh);
        markerGroup.add(finalSphereMesh);

        // Scale the whole thing down to 75% size
        markerGroup.scale.set(0.75, 0.75, 0.75);

        markerGroup.visible = false; // Hide until clicked
        scene.add(markerGroup);

        return () => {
            scene.remove(markerGroup);
            actualConeGeom.dispose();
            actualSphereGeom.dispose();
            headMaterial.dispose();
            metalMaterial.dispose();
        };
    });

    $effect(() => {
        if (markerGroup) {
            if (position) {
                markerGroup.position.copy(position);
                markerGroup.visible = true;
            } else {
                markerGroup.visible = false;
            }
        }
    });
</script>
