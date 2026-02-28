<script lang="ts">
    import * as THREE from "three";
    import { onMount, onDestroy } from "svelte";

    let {
        scene,
        position,
        color = "#ff3333",
    } = $props<{
        scene: THREE.Scene;
        position: THREE.Vector3 | null;
        color?: string | number;
    }>();

    let markerGroup: THREE.Group;

    onMount(() => {
        markerGroup = new THREE.Group();

        // Plastic head
        const headMaterial = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
        });

        // Shiny metal needle
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
        });

        const patchShader = (shader: THREE.Shader) => {
            const mapPlane = scene.getObjectByName("mapPlane") as THREE.Mesh;
            let planeUniforms;
            if (
                mapPlane &&
                mapPlane.material &&
                mapPlane.material.userData &&
                mapPlane.material.userData.uniforms
            ) {
                planeUniforms = mapPlane.material.userData.uniforms;
                shader.uniforms.radius = planeUniforms.radius;
                shader.uniforms.smoothness = planeUniforms.smoothness;
            } else {
                shader.uniforms.radius = { value: 40.0 };
                shader.uniforms.smoothness = { value: 20.0 };
            }

            shader.vertexShader = `
                varying vec3 vPosWorld;
                ${shader.vertexShader}
            `.replace(
                "#include <worldpos_vertex>",
                `
                #include <worldpos_vertex>
                vPosWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
                `,
            );

            shader.fragmentShader = `
                uniform float radius;
                uniform float smoothness;
                varying vec3 vPosWorld;
                ${shader.fragmentShader}
            `.replace(
                "#include <dithering_fragment>",
                `
                #include <dithering_fragment>
                float dist = length(vPosWorld.xz);
                float alpha = 1.0 - smoothstep(radius - smoothness, radius, dist);
                gl_FragColor = vec4(gl_FragColor.rgb, gl_FragColor.a * alpha);
                `,
            );
        };

        headMaterial.onBeforeCompile = patchShader;
        metalMaterial.onBeforeCompile = patchShader;

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

    $effect(() => {
        if (markerGroup && markerGroup.children.length > 1) {
            const sphereMesh = markerGroup.children[1] as THREE.Mesh;
            const mat = sphereMesh.material as THREE.MeshLambertMaterial;
            if (mat && mat.color) {
                mat.color.set(color as THREE.ColorRepresentation);
            }
        }
    });
</script>
