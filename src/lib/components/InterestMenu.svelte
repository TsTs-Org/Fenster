<script lang="ts">
    // Props
    let { lat, lng, heightInMeters, onlocationsfetch } = $props<{
        lat: number;
        lng: number;
        heightInMeters: number;
        onlocationsfetch?: (
            locations: { lat: number; lng: number; name: string }[],
        ) => void;
    }>();

    // Hardcoded initial interests
    const initialInterests = [
        { label: "Nature", icon: "🌲" },
        { label: "History", icon: "🏛️" },
        { label: "Architecture", icon: "🏙️" },
        { label: "Sightseeing", icon: "🎭" },
        { label: "Food", icon: "🪨" },
    ];

    // Pin Colors matching DreiDeCanvas MapMarkers
    const pinColors = ["#ff9900", "#00ff88", "#00bfff"];

    // State
    type ViewState = "selection" | "loading" | "result";
    let view = $state<ViewState>("selection");
    let selectedTopic = $state("");
    let selectedIcon = $state("");

    // Result State
    let answerText = $state("");
    let followUpQuestions = $state<string[]>([]);
    let parsedLocations = $state<{ lat: number; lng: number; name: string }[]>(
        [],
    );
    let errorMessage = $state("");
    let errorDebugInfo = $state("");

    // Read API key
    const apiKey = import.meta.env.VITE_AUTH_KEY;

    async function fetchGeminiInfo(topicPrompt: string) {
        if (!apiKey) {
            errorMessage = "Missing VITE_AUTH_KEY in .env file.";
            errorDebugInfo =
                "The import.meta.env.VITE_AUTH_KEY value is undefined.";
            view = "result";
            return;
        }

        view = "loading";
        errorMessage = "";
        errorDebugInfo = "";

        try {
            const systemInstruction =
                "You are an expert tour guide in an airplane giving passengers interesting facts about the exact location they are currently flying over. You are given the passenger's current GPS coordinates, their altitude in meters, and a specific topic they want to learn about regarding that location. Keep your answers concise, engaging, and specifically tailored to the coordinates and altitude visual radius provided. Return a JSON object containing three keys: 'answer' (your response text), 'followUpQuestions' (an array of exactly 2 or 3 short string prompts the user can click to ask you next), and 'locations' (an array of up to 3 objects corresponding to specific places you mentioned in your answer. Each object MUST have 'lat', 'lng', and 'name'. If you didn't mention specific pinpointable locations, return an empty array []).";

            const promptText = `Current Location Coordinates: Latitude ${lat}, Longitude ${lng}. Viewer Altitude: ${heightInMeters} meters. The user is interested in learning about: "${topicPrompt}".`;

            const requestBody = {
                system_instruction: {
                    parts: { text: systemInstruction },
                },
                contents: [
                    {
                        parts: [{ text: promptText }],
                    },
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                },
            };

            console.log(
                "Gemini API Request Payload:",
                JSON.stringify(requestBody, null, 2),
            );

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                },
            );

            if (!response.ok) {
                const errText = await response.text();
                errorDebugInfo = `HTTP ${response.status} ${response.statusText}\n\nRaw Response:\n${errText}`;

                try {
                    const errData = JSON.parse(errText);
                    throw new Error(
                        errData.error?.message ||
                            "Failed to fetch from Gemini API",
                    );
                } catch (e) {
                    throw new Error(
                        `HTTP Error ${response.status}: Failed to ping Gemini.`,
                    );
                }
            }

            const data = await response.json();
            console.log(
                "Raw Gemini Response Data:",
                JSON.stringify(data, null, 2),
            );

            const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResult) {
                console.error(
                    "No text result parsed from the data candidate parts.",
                );
                throw new Error("No response generated");
            }

            console.log(
                "Raw Gemini Text Output to be JSON parsed:",
                textResult,
            );

            // Parse the guaranteed JSON
            const parsed = JSON.parse(textResult);
            console.log("Successfully parsed JSON:", parsed);

            let text = parsed.answer || "No answer provided.";

            const locs = parsed.locations || [];
            parsedLocations = locs;

            // Optional: Regex inject pin colors over mentioned location names
            locs.forEach((loc: { name: string }, index: number) => {
                if (!loc.name) return;
                const color = pinColors[index % pinColors.length];
                // Escape special regex characters in the place name just in case
                const safeName = loc.name.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                );
                // Global case-insensitive replacement wrapping the name in a colored pill
                const regex = new RegExp(`(${safeName})`, "gi");
                text = text.replace(
                    regex,
                    `<span style="background-color: ${color}44; border-bottom: 2px solid ${color}; padding: 0 4px; border-radius: 4px; white-space: nowrap;">📍 $1</span>`,
                );
            });

            answerText = text;
            followUpQuestions = parsed.followUpQuestions || [];

            if (onlocationsfetch) {
                onlocationsfetch(locs);
            }

            view = "result";
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            errorMessage = error.message || "An unexpected error occurred.";
            if (!errorDebugInfo) {
                errorDebugInfo = error.toString();
                if (error.stack) {
                    errorDebugInfo += `\n\nStack:\n${error.stack}`;
                }
            }
            view = "result";
        }
    }

    function handleInterestClick(interest: { label: string; icon: string }) {
        selectedTopic = interest.label;
        selectedIcon = interest.icon;
        fetchGeminiInfo(interest.label);
    }

    function handleFollowUpClick(question: string) {
        selectedTopic = question;
        fetchGeminiInfo(question);
    }

    function goBack() {
        view = "selection";
        selectedTopic = "";
        selectedIcon = "";
        answerText = "";
        followUpQuestions = [];
        parsedLocations = [];
        errorMessage = "";
        errorDebugInfo = "";

        if (onlocationsfetch) {
            onlocationsfetch([]);
        }
    }

    export function reset() {
        if (view !== "selection") {
            goBack();
        }
    }
</script>

<div class="interest-menu">
    {#if view === "selection"}
        <div class="fade-in">
            <h2 class="center-text">What are you exploring?</h2>
            <p class="subtitle center-text">
                Select an interest to learn about the area below you.
            </p>

            <div class="circle-container">
                <div class="center-logo">✈️</div>
                {#each initialInterests as interest, i}
                    {@const angle = (i * 360) / initialInterests.length - 90}
                    {@const rad = (angle * Math.PI) / 180}
                    {@const radius = 135}
                    {@const x = Math.cos(rad) * radius}
                    {@const y = Math.sin(rad) * radius}
                    <button
                        class="circle-item"
                        style="transform: translate({x}px, {y}px);"
                        onclick={() => handleInterestClick(interest)}
                    >
                        <span class="circle-icon">{interest.icon}</span>
                        <span class="circle-label">{interest.label}</span>
                    </button>
                {/each}
            </div>
        </div>
    {:else if view === "loading"}
        <div class="fade-in loading-view relative-view">
            {#if selectedIcon}
                <div class="top-left-icon">{selectedIcon}</div>
            {/if}
            <div class="spinner"></div>
            <p>
                Asking Gemini about {selectedTopic} at {lat.toFixed(2)}, {lng.toFixed(
                    2,
                )}...
            </p>
        </div>
    {:else if view === "result"}
        <div class="fade-in result-view relative-view">
            {#if selectedIcon}
                <div class="top-left-icon">{selectedIcon}</div>
            {/if}
            {#if errorMessage}
                <div class="error-box">
                    <h3>Error</h3>
                    <p>{errorMessage}</p>

                    {#if errorDebugInfo}
                        <details class="debug-details">
                            <summary>Show Debug Information</summary>
                            <pre>{errorDebugInfo}</pre>
                        </details>
                    {/if}
                </div>
            {:else}
                <div class="answer-box">
                    <h3>About {selectedTopic}</h3>
                    <p class="answer-text" style="line-height: 1.6;">
                        {@html answerText}
                    </p>
                </div>

                {#if followUpQuestions.length > 0}
                    <div class="follow-ups">
                        <h4>Dive Deeper</h4>
                        <div class="follow-up-list">
                            {#each followUpQuestions as question}
                                <button
                                    class="p-button outline-btn"
                                    onclick={() =>
                                        handleFollowUpClick(question)}
                                >
                                    {question}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if parsedLocations.length > 0}
                    <div
                        class="locations-debug"
                        style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 8px; font-size: 0.9em;"
                    >
                        <h4>Extracted Locations</h4>
                        <ul style="margin: 5px 0 0 20px; padding: 0;">
                            {#each parsedLocations as loc}
                                <li>
                                    <strong>{loc.name}:</strong>
                                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            {/if}

            <button class="p-button text-btn back-btn" onclick={goBack}>
                &larr; Choose another interest
            </button>
        </div>
    {/if}
</div>

<style>
    .interest-menu {
        font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
        color: #333;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 1.5rem;
        font-weight: 600;
        color: #222;
    }

    h3 {
        margin-top: 0;
        font-size: 1.2rem;
        color: #222;
        margin-bottom: 12px;
    }

    h4 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1rem;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .subtitle {
        color: #666;
        margin-top: 0;
        margin-bottom: 24px;
        font-size: 0.95rem;
    }

    /* Animations */
    .fade-in {
        animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Buttons Component Styles */
    .p-button {
        border: none;
        border-radius: 12px;
        padding: 14px 20px;
        font-size: 1rem;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        line-height: 1.3;
        width: 100%;
    }

    .p-button:active {
        transform: scale(0.98);
    }

    .outline-btn {
        background: transparent;
        color: #444;
        border: 2px solid #ddd;
        padding: 12px 18px;
    }

    .outline-btn:hover {
        border-color: #bbb;
        background: rgba(0, 0, 0, 0.02);
    }

    .text-btn {
        background: transparent;
        color: #555;
        text-align: center;
        padding: 10px;
        margin-top: 16px;
    }

    .text-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #222;
    }

    /* Layouts */
    .center-text {
        text-align: center;
    }

    .relative-view {
        position: relative;
    }

    .top-left-icon {
        position: absolute;
        top: 0px;
        left: 0px;
        font-size: 3rem;
        opacity: 0.9;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    .circle-container {
        position: relative;
        width: 360px;
        height: 360px;
        margin: 20px auto 40px auto;
        border-radius: 50%;
    }

    .center-logo {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100px;
        height: 100px;
        margin-top: -50px;
        margin-left: -50px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 4.5rem;
        pointer-events: none;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
    }

    .circle-item {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 86px;
        height: 86px;
        margin-top: -43px;
        margin-left: -43px;
        border-radius: 50%;
        background: #f0eedf;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition:
            transform 0.2s,
            background-color 0.2s,
            box-shadow 0.2s;
        padding: 0;
    }

    .circle-item:hover {
        background: #e8e7d8;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        z-index: 10;
    }

    .circle-item:active {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .circle-icon {
        font-size: 2.2rem;
        margin-bottom: 4px;
    }

    .circle-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #444;
    }

    .follow-up-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* Loading State */
    .loading-view {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 0 40px 0;
        text-align: center;
        color: #666;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #555;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    /* Result State */
    .result-view {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding-top: 65px;
    }

    .answer-box {
        background: rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.4);
    }

    .answer-text {
        margin: 0;
        line-height: 1.6;
        color: #333;
        font-size: 1.05rem;
    }

    .error-box {
        background: #fff0f0;
        border-left: 4px solid #ff6b6b;
        padding: 16px;
        border-radius: 8px;
    }

    .error-box h3 {
        color: #c92a2a;
    }

    .debug-details {
        margin-top: 16px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 6px;
        padding: 8px 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
    }
    .debug-details summary {
        cursor: pointer;
        font-weight: 600;
        color: #c92a2a;
        font-size: 0.85rem;
        outline: none;
        user-select: none;
    }
    .debug-details pre {
        margin-top: 12px;
        font-size: 0.75rem;
        color: #444;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: monospace;
    }
</style>
