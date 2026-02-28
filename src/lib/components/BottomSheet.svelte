<script lang="ts">
    import { onMount, type Snippet } from "svelte";

    let { children }: { children?: Snippet } = $props();

    let containerElement: HTMLDivElement | undefined = $state();

    const HANDLE_HEIGHT = 50; // Height of the drag handle area

    // The current height of the shade in pixels
    let currentY = $state(HANDLE_HEIGHT);
    let isDragging = $state(false);
    let startY = $state(0);

    // snap points (percentages of remaining space above handle)
    const snapPercentages = [0.4, 1.0];
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
                // Start with just the handle showing
                currentY = HANDLE_HEIGHT;
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
        startY = currentY - e.clientY;

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(e: PointerEvent) {
        if (!isDragging) return;

        let newY = startY + e.clientY;
        // Clamp: at least the handle height, at most the container height
        currentY = Math.max(HANDLE_HEIGHT, Math.min(newY, containerHeight));
    }

    function onPointerUp(_e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        if (containerHeight > 0) {
            // Snapping options: exactly HANDLE_HEIGHT, or percentage-based
            const snapPoints = [
                HANDLE_HEIGHT,
                ...snapPercentages.map((p) => p * containerHeight),
            ];

            let closest = snapPoints[0];
            let minDiff = Math.abs(currentY - snapPoints[0]);

            for (let i = 1; i < snapPoints.length; i++) {
                const diff = Math.abs(currentY - snapPoints[i]);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = snapPoints[i];
                }
            }

            currentY = closest;
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
        position: fixed;
        top: 0;
        left: calc(0px - var(--border-width));
        width: calc(100% + 2 * var(--border-width));
        height: 100%;
        z-index: 101;
        border: var(--border-width) solid var(--frame-color);
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
    }

    /* Contains the shade inside the bounds of the window */
    .shade-container {
        position: fixed;
        top: var(--border-width);
        width: 100%;
        height: calc(100% - min(12vw, 72px));
        z-index: -100;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        overflow: hidden; /* Clips the shade */
        pointer-events: none; /* Let map clicks pass through container */
    }

    /* The actual pull-down shade */
    .window-shade {
        z-index: -1;
        background-color: #c9c9c0;
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
        /* border-bottom: 2px solid #dfded0; */

        border-radius: 0 0 var(--border-width) var(--border-width);
    }

    .content {
        flex: 1;
        overflow-y: auto;
        color: #333;
        scrollbar-width: thin;
        mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
        -webkit-mask-image: linear-gradient(
            to bottom,
            black 85%,
            transparent 100%
        );

        /* border-radius: 0 0 12px 12px; */
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
        /* background: red; */
        background: linear-gradient(to bottom, #e0dfd1, #d5d4c7);
        /* border-top: 1px solid rgba(255, 255, 255, 0.8); */
        border-radius: 0 0 12px 12px;
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
