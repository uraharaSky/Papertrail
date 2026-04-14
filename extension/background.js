import { API_KEY } from "./config.js";

async function summariseWithGroq(text) {
    const cleanText = text
        .replace(/\s+/g, " ")
        .slice(0, 6000);

    const prompt = `
Summarize the content clearly.

Return in this format:

TLDR:
...

KEY POINTS:
- ...
- ...
- ...

CONTENT:
${cleanText}
`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [
                    { role: "user", content: prompt }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (err) {
        const data = await response.json();
        console.log("Groq response:", data);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SUMMARISE") {
        summariseWithGroq(request.text).then(summary => {
            sendResponse({ summary });
        });

        return true; // VERY IMPORTANT (async response)
    }
});