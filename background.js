// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchAnswer") {
        
        // This runs in the background, so CORS won't block it!
        fetch("https://autofill-site.onrender.com/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: request.question })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text().then(text => {
                // Try to parse as JSON if there's content
                if (!text || text.trim() === "") {
                    throw new Error("Server returned an empty response. The API endpoint may be down or not responding.");
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
                }
            });
        })
        .then(data => {
            if (!data) {
                throw new Error("Server returned empty response");
            }
            // Send the answer back to the content script
            sendResponse({ success: true, answer: data.answer || data.result });
        })
        .catch(error => {
            console.error("Background fetch error:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            sendResponse({ success: false, error: errorMsg });
        });

        return true; // Keep the message channel open for async response
    }
});