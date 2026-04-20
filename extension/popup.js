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
        const output = document.getElementById("results");

        output.innerText = "Reading page...";

        setTimeout(async () => {
            output.innerText = "Understanding...";

            chrome.runtime.sendMessage(
                { type: "SUMMARISE", text: response.text },
                (res) => {
                    if (!res || !res.summary) {
                        output.innerText = "Failed to generate summary.";
                        return;
                    }

                    displaySummary(res.summary);
                }
            );
        }, 100);
    });
});



document.getElementById("SaveBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, {type: "GET_PAGE_DATA"}, async (response) => {
        if (chrome.runtime.lastError || !response) {
            alert("Couldn't read the page");
            return;
        }

        const article = {
            id: Date.now(),
            title: response.title,
            url: response.url,
            text: response.text,
            summary: null
        };

        chrome.storage.local.get(["articles"], (result) => {
            const articles = result.articles || [];

            articles.push(article);

            chrome.storage.local.set({articles}, () => {
                alert("Successfully stored articles.");
                loadArticles();
            });
        });

        try {
            await fetch("http://localhost:8000/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: response.title,
                    text: response.text,
                    url: response.url
                })
            });
        } catch (err) {
            console.error("Backend save failed:", err);
        }
    });
});

document.getElementById("searchInput").addEventListener("keydown", async (e) => {

    if (e.key !== "Enter") return;

    const query = e.target.value.trim();

    if (!query) return;

    console.log("🔍 Searching for:", query);

    try {
        const res = await fetch("http://localhost:8000/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: query })
        });

        const data = await res.json();

        console.log("📦 Backend response:", data);

        if (!data.match) {
            document.getElementById("results").innerText = "Nothing found...";
            return;
        }

        displaySearchResult(data.match);

    } catch (err) {
        console.error("❌ Search error:", err);
        document.getElementById("results").innerText = "Search failed.";
    }
});


function displaySearchResult(article) {
    const resultsDiv = document.getElementById("results");

    const domain = new URL(article.url).hostname;

    resultsDiv.innerHTML = `
        <h3>Found something 👀</h3>
        <div class="article-card">
            <strong>${article.title}</strong><br/>
            <small>${domain}</small><br/>
            <a href="${article.url}" target="_blank">Open</a>
        </div>
    `;
}

function loadArticles() {

    chrome.storage.local.get(["articles"], (result) => {
        const articles = result.articles || [];
        displayArticles(articles);
    });
}

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
    text = text.replace(/[^\x00-\x7F]/g, "");

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
function displaySummary(summaryText) {
    const resultsDiv = document.getElementById("results");

    resultsDiv.innerHTML = "<h3>Summary</h3>";

    const formatted = formatSummary(summaryText);

    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerText = formatted;

    resultsDiv.appendChild(div);
}

//To Display articles
function displayArticles(articles) {

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h3>Archive</h3>";

    articles.forEach(article => {

        const div = document.createElement("div");
        div.className = "article-card";

        const domain = new URL(article.url).hostname;
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;

        div.innerHTML = `
            <img src="${favicon}" />
            <div class="article-content">
                <strong>${article.title}</strong>
                <small>${domain}</small><br/>
                <a href="${article.url}" target="_blank">Open</a>
            </div>
        `;

        resultsDiv.appendChild(div);
    });
}


function formatSummary(text) {
    return text
        .replace("TLDR:", "\n📌 TLDR\n")
        .replace("KEY POINTS:", "\n🔑 Key Points\n");
}