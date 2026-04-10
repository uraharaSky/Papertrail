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
        sendResponse(getPageData());
    }

});