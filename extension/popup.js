// DOM rendering helpers.
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

            const favicon =
                `https://www.google.com/s2/favicons?domain=${domain}`;

            const tagHTML = (article.tags || [])
                .map(tag => `<span class="pt-tag">${tag}</span>`)
                .join("");

            div.innerHTML = `
            <img src="${favicon}" />

            <div class="article-content">

                <strong>${article.title}</strong>

                <small>${domain}</small><br/>

                <div class="pt-tag-wrap">
                    ${tagHTML}
                </div>

                <a href="${article.url}" target="_blank">
                    Open
                </a>

            </div>
        `;

            resultsDiv.appendChild(div);
        });
        UI.updateSavedCount(articles.length);
    },

    renderSearchResults(matches) {

        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (!matches.length) {
            resultsDiv.innerHTML =
                "Nothing relevant found.";
            return;
        }

        matches.forEach(article => {
            const domain =
                new URL(article.url).hostname;

            const favicon =
                `https://www.google.com/s2/favicons?domain=${domain}`;

            const div = document.createElement("div");

            div.className = "article-card";

            div.innerHTML = `
            <img src="${favicon}" />

            <div class="article-content">

                <strong>${article.title}</strong>

                <small>
                    ${domain}
                    •
                    similarity:
                    ${article.score.toFixed(2)}
                </small>

                <p class="search-snippet">
                    ${(article.text || "").slice(0, 140)}...
                </p>

                <a href="${article.url}" target="_blank">
                    Open
                </a>

            </div>
        `;

            resultsDiv.appendChild(div);
        });
    },


    updateSavedCount(count) {
        document.getElementById("savedCount").innerText = `${count} saved`;
    }
};


// Extension-local article storage helpers.
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

// User actions and extension messaging.
const Actions = {

    bindEvents() {

        // Save the active page.
        document.getElementById("SaveBtn").addEventListener("click", this.saveArticle);

        // Summarise the active page.
        document.getElementById("summariseBtn").addEventListener("click", this.summarisePage);

        // Search the saved archive on Enter.
        document.getElementById("searchInput").addEventListener("keydown", this.search);

        //Search button click
        document.getElementById("searchBtn").addEventListener("click", this.search);
    },

    async getActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    },


        async getPageData() {
            const tab = await this.getActiveTab();

            return new Promise((resolve, reject) => {

                chrome.tabs.sendMessage(
                    tab.id,
                    { type: "GET_PAGE_DATA" },
                    (res) => {

                        if (chrome.runtime.lastError || !res) {
                            reject("Failed to read page");
                        } else {
                            resolve(res);
                        }

                    }
                );

            });
        },

    async renderPagePreview(data){
      if (!data) return;

      //Title
      document.getElementById("pageTitle").innerText = data.title;

      //Domain
        const domain = new URL(data.url).hostname;
        document.getElementById("pageDomain").innerText = domain;

      //Favicon
      const favicon =  `https://www.google.com/s2/favicons?domain=${domain}`;
        document.getElementById("faviconEl").innerHTML =
            `<img src="${favicon}" />`;

    // Read time
    const words = data.text.split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 220));
    document.getElementById("readTime").innerText = `${mins} min read`;
    },


    async saveArticle() {
        try {
            const data = await Actions.getPageData();

            const rawTags = document.getElementById("tagInput").value;

            const tags = rawTags
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);



            const article = {
                id: Date.now(),
                title: data.title,
                url: data.url,
                text: data.text,
                tags: tags,
                summary: null
            };

            await Storage.saveArticle(article);
            UI.showToast();
            Storage.loadArticles();

            await fetch("http://localhost:8000/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: article.title,
                    url: article.url,
                    text: article.text
                })
            });

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

        // Allow both Enter key and button click
        if (
            e.type === "keydown" &&
            e.key !== "Enter"
        ) {
            return;
        }

        const query =
            document
                .getElementById("searchInput")
                .value
                .trim();

        if (!query) return;

        try {

            const res = await fetch(
                "http://localhost:8000/search",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        text: query
                    })
                }
            );

            const data = await res.json();

            if (
                !data.matches ||
                !data.matches.length
            ) {

                document
                    .getElementById("results")
                    .innerText =
                    "Nothing relevant found.";

                return;
            }

            UI.renderSearchResults(data.matches);

        } catch (err) {

            console.error(err);

            document
                .getElementById("results")
                .innerText =
                "Search failed.";
        }
    }
};

// Small text-formatting helpers.
const Formatter = {

    summary(text) {
        return text
            .replace("TLDR:", "\n TLDR\n")
            .replace("KEY POINTS:", "\n Key Points\n");
    }
};

const App = {
    async init() {
        UI.initTabs();
        Actions.bindEvents();
        Storage.loadArticles();

        const data = await Actions.getPageData();
        Actions.renderPagePreview(data); //  put it HERE
    }
};

// Start once the popup DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
