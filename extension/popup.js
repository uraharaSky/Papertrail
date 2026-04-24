// // Request page content from the active tab, then pass it to the runtime
// // process that generates the summary.
// document.getElementById("summariseBtn").addEventListener("click", async () => {
//
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//
//     chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_DATA" }, (response) => {
//
//         if (chrome.runtime.lastError) {
//             alert("Refresh page and try again.");
//             return;
//         }
//
//         if (!response || !response.text) {
//             alert("No text found on this page.");
//             return;
//         }
//         const output = document.getElementById("results");
//
//         output.innerText = "Reading page...";
//
//         // Briefly yield so the popup can paint the loading message first.
//         setTimeout(async () => {
//             output.innerText = "Understanding...";
//
//             chrome.runtime.sendMessage(
//                 { type: "SUMMARISE", text: response.text },
//                 (res) => {
//                     if (!res || !res.summary) {
//                         output.innerText = "Failed to generate summary.";
//                         return;
//                     }
//
//                     displaySummary(res.summary);
//                 }
//             );
//         }, 100);
//     });
// });
//
//
// // Save the current page to local extension storage and also try to persist it
// // to the local backend for server-side search.
// document.getElementById("SaveBtn").addEventListener("click", async () => {
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//
//     chrome.tabs.sendMessage(tab.id, {type: "GET_PAGE_DATA"}, async (response) => {
//         if (chrome.runtime.lastError || !response) {
//             alert("Couldn't read the page");
//             return;
//         }
//
//         const article = {
//             id: Date.now(),
//             title: response.title,
//             url: response.url,
//             text: response.text,
//             summary: null
//         };
//
//         chrome.storage.local.get(["articles"], (result) => {
//             const articles = result.articles || [];
//
//             articles.push(article);
//
//             chrome.storage.local.set({articles}, () => {
//                 alert("Successfully stored articles.");
//                 loadArticles();
//             });
//         });
//
//         try {
//             // This request is optional; the article is already stored locally.
//             await fetch("http://localhost:8000/save", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     title: response.title,
//                     text: response.text,
//                     url: response.url
//                 })
//             });
//         } catch (err) {
//             console.error("Backend save failed:", err);
//         }
//     });
// });
//
// // Submit a search query when the user presses Enter in the popup input.
// document.getElementById("searchInput").addEventListener("keydown", async (e) => {
//
//     if (e.key !== "Enter") return;
//
//     const query = e.target.value.trim();
//
//     if (!query) return;
//
//     console.log("🔍 Searching for:", query);
//
//     try {
//         const res = await fetch("http://localhost:8000/search", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ text: query })
//         });
//
//         const data = await res.json();
//
//         console.log("📦 Backend response:", data);
//
//         if (!data.match) {
//             document.getElementById("results").innerText = "Nothing found...";
//             return;
//         }
//
//         displaySearchResult(data.match);
//
//     } catch (err) {
//         console.error("❌ Search error:", err);
//         document.getElementById("results").innerText = "Search failed.";
//     }
// });
//
//
// function displaySearchResult(article) {
//     const resultsDiv = document.getElementById("results");
//
//     const domain = new URL(article.url).hostname;
//
//     resultsDiv.innerHTML = `
//         <h3>Found something 👀</h3>
//         <div class="article-card">
//             <strong>${article.title}</strong><br/>
//             <small>${domain}</small><br/>
//             <a href="${article.url}" target="_blank">Open</a>
//         </div>
//     `;
// }
//
// function loadArticles() {
//
//     // Rebuild the archive view from the locally saved articles list.
//     chrome.storage.local.get(["articles"], (result) => {
//         const articles = result.articles || [];
//         displayArticles(articles);
//     });
// }
//
// function generateSummary(text) {
//
//     // Simple extractive summariser kept as a local fallback utility.
//     if (!text || typeof text !== "string") {
//         return ["No readable content found."];
//     }
//
//     // Limit text size
//     text = text.slice(0, 3000);
//
//     // Clean text
//     text = text.toLowerCase();
//     text = text.replace(/[^\w\s\.]/g, "");
//     text = text.replace(/\s+/g, " ");
//     text = text.replace(/[^\x00-\x7F]/g, "");
//
//     // Split into sentences
//     const sentences = text.split(/[.!?]\s+/);
//
//     // Remove very short sentences
//     const cleanSentences = sentences.filter(s => s.length > 40);
//
//     // Word frequency
//     const wordFreq = {};
//     const words = text.split(/\s+/);
//
//     words.forEach(word => {
//         if (word.length > 3) {
//             wordFreq[word] = (wordFreq[word] || 0) + 1;
//         }
//     });
//
//     // Score sentences
//     const scored = cleanSentences.map(sentence => {
//         let score = 0;
//
//         sentence.split(" ").forEach(word => {
//             if (wordFreq[word]) {
//                 score += wordFreq[word];
//             }
//         });
//
//         return { sentence, score };
//     });
//
//     // Sort by score
//     scored.sort((a, b) => b.score - a.score);
//
//     // Return top 3 sentences
//     return scored.slice(0, 3).map(s => s.sentence);
// }
//
//
// // Render the summary section inside the popup results panel.
// function displaySummary(summaryText) {
//     const resultsDiv = document.getElementById("results");
//
//     resultsDiv.innerHTML = "<h3>Summary</h3>";
//
//     const formatted = formatSummary(summaryText);
//
//     const div = document.createElement("div");
//     div.className = "summary-item";
//     div.innerText = formatted;
//
//     resultsDiv.appendChild(div);
// }
//
// // Render each saved article as a compact archive card.
// function displayArticles(articles) {
//
//     const resultsDiv = document.getElementById("results");
//     resultsDiv.innerHTML = "<h3>Archive</h3>";
//
//     articles.forEach(article => {
//
//         const div = document.createElement("div");
//         div.className = "article-card";
//
//         const domain = new URL(article.url).hostname;
//         const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
//
//         div.innerHTML = `
//             <img src="${favicon}" />
//             <div class="article-content">
//                 <strong>${article.title}</strong>
//                 <small>${domain}</small><br/>
//                 <a href="${article.url}" target="_blank">Open</a>
//             </div>
//         `;
//
//         resultsDiv.appendChild(div);
//     });
// }
//
//
// function formatSummary(text) {
//     // Make backend section labels easier to scan in the popup UI.
//     return text
//         .replace("TLDR:", "\n📌 TLDR\n")
//         .replace("KEY POINTS:", "\n🔑 Key Points\n");
// }


// ===============================
// 🧠 APP CONTROLLER
// ===============================
const App = {
    init() {
        UI.initTabs();
        Actions.bindEvents();
        Storage.loadArticles();
    }
};


// ===============================
// 🎨 UI LAYER (ONLY DOM)
// ===============================
const UI = {

    initTabs() {
        document.querySelectorAll(".pt-tab").forEach(tab => {
            tab.addEventListener("click", () => {

                document.querySelectorAll(".pt-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");

                const target = tab.dataset.tab;

                document.querySelectorAll(".pt-panel").forEach(panel => {
                    panel.classList.remove("active");
                });

                document.getElementById(`tab-${target}`).classList.add("active");
            });
        });
    },

    showToast() {
        const toast = document.getElementById("saveToast");
        toast.style.opacity = "1";
        setTimeout(() => toast.style.opacity = "0", 2000);
    },

    showSummaryLoading() {
        document.getElementById("summaryText").style.display = "none";
        document.getElementById("summarySkeleton").style.display = "block";
    },

    renderSummary(text) {
        const skeleton = document.getElementById("summarySkeleton");
        const summaryEl = document.getElementById("summaryText");

        skeleton.style.display = "none";
        summaryEl.style.display = "block";
        summaryEl.innerText = Formatter.summary(text);
    },

    renderSearchResult(article) {
        const resultsDiv = document.getElementById("results");

        const domain = new URL(article.url).hostname;

        resultsDiv.innerHTML = `
            <div class="article-card">
                <strong>${article.title}</strong><br/>
                <small>${domain}</small><br/>
                <a href="${article.url}" target="_blank">Open</a>
            </div>
        `;
    },

    renderArticles(articles) {
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (!articles.length) {
            document.getElementById("emptyState").style.display = "block";
            return;
        }

        document.getElementById("emptyState").style.display = "none";

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

        UI.updateSavedCount(articles.length);
    },

    updateSavedCount(count) {
        document.getElementById("savedCount").innerText = `${count} saved`;
    }
};


// ===============================
// 💾 STORAGE LAYER
// ===============================
const Storage = {

    async getArticles() {
        return new Promise(resolve => {
            chrome.storage.local.get(["articles"], (res) => {
                resolve(res.articles || []);
            });
        });
    },

    async saveArticle(article) {
        const articles = await this.getArticles();
        articles.push(article);

        return new Promise(resolve => {
            chrome.storage.local.set({ articles }, resolve);
        });
    },

    async loadArticles() {
        const articles = await this.getArticles();
        UI.renderArticles(articles);
    }
};


// ===============================
// ⚙️ ACTIONS (BUSINESS LOGIC)
// ===============================
const Actions = {

    bindEvents() {

        // Save
        document.getElementById("SaveBtn").addEventListener("click", this.saveArticle);

        // Summarise
        document.getElementById("summariseBtn").addEventListener("click", this.summarisePage);

        // Search
        document.getElementById("searchInput").addEventListener("keydown", this.search);
    },

    async getActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    },

    async getPageData() {
        const tab = await this.getActiveTab();

        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_DATA" }, (res) => {

                if (chrome.runtime.lastError || !res) {
                    reject("Failed to read page");
                } else {
                    resolve(res);
                }
            });
        });
    },

    async saveArticle() {
        try {
            const data = await Actions.getPageData();

            const article = {
                id: Date.now(),
                title: data.title,
                url: data.url,
                text: data.text,
                summary: null
            };

            await Storage.saveArticle(article);
            UI.showToast();
            Storage.loadArticles();

        } catch (err) {
            alert(err);
        }
    },

    async summarisePage() {
        try {
            UI.showSummaryLoading();

            const data = await Actions.getPageData();

            chrome.runtime.sendMessage(
                { type: "SUMMARISE", text: data.text },
                (res) => {

                    if (!res || !res.summary) {
                        UI.renderSummary("Failed to generate summary.");
                        return;
                    }

                    UI.renderSummary(res.summary);
                }
            );

        } catch (err) {
            alert("Error summarising page");
        }
    },

    async search(e) {
        if (e.key !== "Enter") return;

        const query = e.target.value.trim();
        if (!query) return;

        try {
            const res = await fetch("http://localhost:8000/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: query })
            });

            const data = await res.json();

            if (!data.match) {
                document.getElementById("results").innerText = "Nothing found...";
                return;
            }

            UI.renderSearchResult(data.match);

        } catch (err) {
            document.getElementById("results").innerText = "Search failed.";
        }
    }
};


// ===============================
// ✨ FORMATTERS
// ===============================
const Formatter = {

    summary(text) {
        return text
            .replace("TLDR:", "\n📌 TLDR\n")
            .replace("KEY POINTS:", "\n🔑 Key Points\n");
    }
};


// ===============================
// 🚀 INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});