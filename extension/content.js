function getPageData() {
    return {
        title: document.title,
        url: window.location.href,
        text: document.body.innerText
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "GET_PAGE_DATA") {

        try {
            const title = document.title || "Untitled";
            const url = window.location.href;

            let text = document.body.innerText || "";
            text = text.replace(/\s+/g, " ").trim();

            sendResponse({
                title,
                url,
                text
            });

        } catch (err) {
            console.error("Error extracting page:", err);
            sendResponse(null);
        }
    }

    return true;
});