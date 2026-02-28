<script lang="ts">
    import { onMount, type Snippet } from "svelte";

    let { children }: { children?: Snippet } = $props();

    let containerElement: HTMLDivElement | undefined = $state();

    // The current height of the shade in pixels
    let currentY = $state(0);
    let isDragging = $state(false);
    let startY = $state(0);

    // 10%, 40%, 100%
    const snapPercentages = [0.1, 0.4, 1.0];
    let containerHeight = $state(0);
    let initialRender = $state(true);

    onMount(() => {
        const updateHeight = () => {
            const oldHeight = containerHeight;
            containerHeight =
                containerElement?.clientHeight || window.innerHeight;

            if (oldHeight > 0) {
                currentY = (currentY / oldHeight) * containerHeight;
            } else {
                // Start mostly open (10% shaded)
                currentY = containerHeight * 0.1;
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);

        requestAnimationFrame(() => {
            initialRender = false;
        });

        return () => {
            window.removeEventListener("resize", updateHeight);
        };
    });

    function onPointerDown(e: PointerEvent) {
        if (!containerElement) return;
        isDragging = true;

        // currentY is the height of the shade.
        // e.clientY is the vertical mouse position.
        startY = currentY - e.clientY;

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(e: PointerEvent) {
        if (!isDragging) return;

        let newY = startY + e.clientY;
        currentY = Math.max(0, Math.min(newY, containerHeight));
    }

    function onPointerUp(_e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        if (containerHeight > 0) {
            const currentPercentage = currentY / containerHeight;

            let closestPercent = snapPercentages[0];
            let minDiff = Math.abs(currentPercentage - snapPercentages[0]);

            for (let i = 1; i < snapPercentages.length; i++) {
                const diff = Math.abs(currentPercentage - snapPercentages[i]);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestPercent = snapPercentages[i];
                }
            }

            currentY = closestPercent * containerHeight;
        }
    }

    export function open(percentage = 0.4) {
        if (containerHeight > 0) {
            currentY = percentage * containerHeight;
        }
    }

    let sheetStyle = $derived(
        `height: ${currentY}px; transition: ${isDragging || initialRender ? "none" : "height 0.4s cubic-bezier(0.25, 1, 0.5, 1)"};`,
    );
</script>

<div class="window">
    <div class="window-frame"></div>
    <div class="shade-container" bind:this={containerElement}>
        <div class="window-shade" style={sheetStyle}>
            <div class="content">
                {@render children?.()}
            </div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="drag-handle-area"
                onpointerdown={onPointerDown}
                aria-label="Pull airplane shade handle"
            >
                <div class="drag-handle">
                    <div class="ridge"></div>
                    <div class="ridge"></div>
                    <div class="ridge"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .window {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100;
        --frame-color: #ecebdc;
        --border-width: min(6vw, 36px);
    }

    /* The outer plane window frame overlay */
    .window-frame {
        /* background-color: red; */

        position: fixed;
        top: 0;
        left: calc(0px - var(--border-width));
        width: calc(100% + 2 * var(--border-width));
        height: 100%;
        z-index: 101;
        /* border: min(6vw, 36px) solid #ecebdc; */
        border: var(--border-width) solid var(--frame-color);
        /* border-inline: none; */
        border-radius: min(15vw, 100px);
        box-sizing: border-box;
        pointer-events: none;
    }

    .window-frame::after {
        content: "";
        position: fixed;
        top: 0;
        left: calc(0px - var(--border-width));
        width: calc(100% + 2 * var(--border-width));
        box-sizing: border-box;
        border: var(--border-width) solid var(--frame-color);
        height: 100%;
        z-index: 100;
        /* background-color: rgba(255, 255, 255, 0.5); */
    }

    /* Contains the shade inside the bounds of the window */
    .shade-container {
        position: fixed;
        /* top: min(5vw, 32px); */
        top: var(--border-width);
        /* left: min(6vw, 36px); */
        /* width: calc(100% - min(12vw, 72px)); */
        width: 100%;
        height: calc(100% - min(12vw, 72px));
        z-index: -100;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        /* border-radius: min(10vw, 70px); Inner curve matching frame */
        overflow: hidden; /* Clips the shade */
        pointer-events: none; /* Let map clicks pass through container */
    }

    /* The actual pull-down shade */
    .window-shade {
        z-index: -1;
        /* background: #f0eedf; */
        background-color: red;
        background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 19px,
            rgba(0, 0, 0, 0.02) 20px,
            rgba(255, 255, 255, 0.4) 21px
        );
        width: 100%;
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
        pointer-events: auto; /* Catch events on the shade itself */
        display: flex;
        flex-direction: column;
        overflow: hidden;
        will-change: height;
        border-bottom: 2px solid #dfded0;
    }

    .content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        color: #333;
        scrollbar-width: thin;
        mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        -webkit-mask-image: linear-gradient(
            to bottom,
            black 90%,
            transparent 100%
        );
    }

    .drag-handle-area {
        width: 100%;
        height: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: grab;
        touch-action: none;
        flex-shrink: 0;
        background: linear-gradient(to bottom, #f0eedf, #e8e7d8);
        border-top: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
    }

    .drag-handle-area:active {
        cursor: grabbing;
    }

    /* The plastic indent/grip area */
    .drag-handle {
        width: 80px;
        height: 24px;
        background-color: #d8d7c9;
        border-radius: 12px;
        box-shadow:
            inset 0 3px 8px rgba(0, 0, 0, 0.2),
            0 1px 0px rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
    }

    /* Grip ridges inside the indent */
    .ridge {
        width: 46px;
        height: 2px;
        background: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 1px;
    }

    /* Minimal beige-friendly scrollbar */
    .content::-webkit-scrollbar {
        width: 6px;
    }
    .content::-webkit-scrollbar-track {
        background: transparent;
    }
    .content::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.15);
        border-radius: 10px;
    }
</style>
