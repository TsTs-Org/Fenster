<script lang="ts">
    // Props
    let { lat, lng } = $props<{ lat: number; lng: number }>();

    // Hardcoded initial interests
    const initialInterests = [
        "Nature",
        "History",
        "Architecture",
        "Culture",
        "Geology",
    ];

    // State
    type ViewState = "selection" | "loading" | "result";
    let view = $state<ViewState>("selection");
    let selectedTopic = $state("");

    // Result State
    let answerText = $state("");
    let followUpQuestions = $state<string[]>([]);
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
                "You are an expert tour guide in an airplane giving passengers interesting facts about the exact location they are currently flying over. You are given the passenger's current GPS coordinates and a specific topic they want to learn about regarding that location. Keep your answers concise, engaging, and specifically tailored to the coordinates provided. Return a JSON object containing two keys: 'answer' (your response text) and 'followUpQuestions' (an array of exactly 2 or 3 short string prompts the user can click to ask you next, diving deeper into the topic).";

            const promptText = `Current Location Coordinates: Latitude ${lat}, Longitude ${lng}. The user is interested in learning about: "${topicPrompt}".`;

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
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

            answerText = parsed.answer || "No answer provided.";
            followUpQuestions = parsed.followUpQuestions || [];

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

    function handleInterestClick(interest: string) {
        selectedTopic = interest;
        fetchGeminiInfo(interest);
    }

    function handleFollowUpClick(question: string) {
        selectedTopic = question;
        fetchGeminiInfo(question);
    }

    function goBack() {
        view = "selection";
        selectedTopic = "";
        answerText = "";
        followUpQuestions = [];
        errorMessage = "";
    }
</script>

<div class="interest-menu">
    {#if view === "selection"}
        <div class="fade-in">
            <h2>What would you like to know?</h2>
            <p class="subtitle">
                Select an interest to learn about the area below you.
            </p>

            <div class="button-grid">
                {#each initialInterests as interest}
                    <button
                        class="p-button primary-btn"
                        onclick={() => handleInterestClick(interest)}
                    >
                        {interest}
                    </button>
                {/each}
            </div>
        </div>
    {:else if view === "loading"}
        <div class="fade-in loading-view">
            <div class="spinner"></div>
            <p>
                Asking Gemini about {selectedTopic} at {lat.toFixed(2)}, {lng.toFixed(
                    2,
                )}...
            </p>
        </div>
    {:else if view === "result"}
        <div class="fade-in result-view">
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
                    <p class="answer-text">{answerText}</p>
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

    .primary-btn {
        background: #f0f0f0;
        color: #222;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .primary-btn:hover {
        background: #e8e8e8;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
    .button-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
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
        padding: 40px 0;
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
