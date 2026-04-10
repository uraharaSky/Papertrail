document.getElementById("summariseBtn").addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_DATA" }, (response) => {

        if (chrome.runtime.lastError) {
            alert("Refresh page and try again.");
            return;
        }

        if (!response || !response.text) {
            alert("No text found on this page.");
            return;
        }

        const summary = generateSummary(response.text);
        displaySummary(summary);
    });
});


function generateSummary(text) {

    if (!text || typeof text !== "string") {
        return ["No readable content found."];
    }

    // Limit text size
    text = text.slice(0, 3000);

    // Clean text
    text = text.toLowerCase();
    text = text.replace(/[^\w\s\.]/g, "");
    text = text.replace(/\s+/g, " ");
    text = text.replace(/â€¢/g, "");

    // Split into sentences
    const sentences = text.split(/[.!?]\s+/);

    // Remove very short sentences
    const cleanSentences = sentences.filter(s => s.length > 40);

    // Word frequency
    const wordFreq = {};
    const words = text.split(/\s+/);

    words.forEach(word => {
        if (word.length > 3) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    // Score sentences
    const scored = cleanSentences.map(sentence => {
        let score = 0;

        sentence.split(" ").forEach(word => {
            if (wordFreq[word]) {
                score += wordFreq[word];
            }
        });

        return { sentence, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return top 3 sentences
    return scored.slice(0, 3).map(s => s.sentence);
}


// Display summary
function displaySummary(summaryArray) {

    const resultsDiv = document.getElementById("results");

    resultsDiv.innerHTML = "<h3>Summary</h3>";

    summaryArray.forEach(sentence => {
        const p = document.createElement("p");
        p.innerText = "• " + sentence;
        resultsDiv.appendChild(p);
    });
}