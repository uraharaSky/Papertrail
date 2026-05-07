import { API_KEY } from "./config.js";

async function summariseWithGroq(text) {
    try {
        const cleanText = text.slice(0, 6000);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "user",
                        content: `Summarize the following article in a concise way.

                Give:
                - A short TLDR (2-3 lines)
                - 3-5 key bullet points
                
                Article:
                ${cleanText}`
                    }
                ]
            })
        });

        const data = await response.json(); // ✅ now response exists

        if (!data || typeof data !== "object") {
            console.log("Invalid response format:", data);
            return "Error: Invalid API response";
        }

        if (data.error) {
            console.log("Groq API Error:", data.error);
            return `Error: ${data.error.message || "Unknown API error"}`;
        }

        if (!data.choices || !Array.isArray(data.choices)) {
            console.log("Missing choices in response:", data);
            return "Error generating summary (no choices)";
        }
        return data.choices[0].message.content;



    } catch (err) {
        console.error(err);
        return "API error";
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SUMMARISE") {
        summariseWithGroq(request.text).then(summary => {
            sendResponse({ summary });
        });

        return true;
    }
});