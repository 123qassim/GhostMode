// --- CONFIGURATION ---
// The specific server endpoint for answers
const SERVER_URL = "https://autofill-site.onrender.com/answer"; 

// 1. INJECT THE GHOST BUTTON
const ghost = document.createElement('div');
ghost.id = "ghost-trigger-btn";
ghost.innerText = "👻";
document.body.appendChild(ghost);

// 2. CLICK LISTENER
ghost.addEventListener('click', async () => {
    
    // Visual: Start spinning
    ghost.classList.add('ghost-thinking');
    
    try {
        // A. SCRAPE: Find the question text
        const questionText = getQuestionFromPage();
        if (!questionText) throw new Error("No question found on this page.");
        
        console.log("GhostMode asking:", questionText);

        // B. FETCH: Send to server
        const answer = await getAnswerFromServer(questionText);
        console.log("GhostMode answer:", answer);

        // C. CLICK: Select the right option
        if (answer) {
            selectAnswerOnPage(answer);
        } else {
            alert("GhostMode couldn't find an answer.");
        }

    } catch (err) {
        console.error(err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        alert("Error: " + errorMsg);
    } finally {
        // Stop spinning
        ghost.classList.remove('ghost-thinking');
    }
});

// --- HELPER FUNCTIONS ---

function getQuestionFromPage() {
    // Strategy: Look for the longest text inside a header or question container
    let bestCandidate = "";
    
    // Common tags for questions
    const elements = document.querySelectorAll('h1, h2, h3, h4, .question-text, .prompt, legend');
    
    elements.forEach(el => {
        const text = el.innerText.trim();
        // Assume questions are usually longer than 10 chars
        if (text.length > 10 && text.length > bestCandidate.length) {
            bestCandidate = text;
        }
    });

    return bestCandidate;
}

// REPLACE THE OLD getAnswerFromServer FUNCTION WITH THIS:

function getAnswerFromServer(question) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject("Server request timed out after 30 seconds");
        }, 30000);

        // Send message to background.js
        chrome.runtime.sendMessage(
            { action: "fetchAnswer", question: question },
            (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    resolve(response.answer);
                } else if (response) {
                    reject(response.error || "Server returned an error");
                } else {
                    reject("No response from server. The API endpoint may be down.");
                }
            }
        );
    });
}

function selectAnswerOnPage(answerText) {
    // Normalize text (lowercase, remove punctuation) for better matching
    const cleanAnswer = answerText.toLowerCase().replace(/[^\w\s]/g, '');

    // Find all inputs (radios, checkboxes)
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    let found = false;

    for (let input of inputs) {
        // Check the label associated with the input
        let labelText = "";
        
        // Strategy 1: Look at the parent element text
        if (input.parentElement) labelText += input.parentElement.innerText;
        
        // Strategy 2: Look for a <label> tag specifically for this input ID
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) labelText += label.innerText;
        }

        // Clean the label text
        const cleanLabel = labelText.toLowerCase().replace(/[^\w\s]/g, '');

        // CHECK MATCH
        if (cleanLabel.includes(cleanAnswer) && cleanAnswer.length > 2) {
            input.click(); // CLICK IT!
            input.parentElement.style.border = "2px solid #00ff00"; // Highlight Green
            found = true;
            break; // Stop after first match
        }
    }

    if (!found) {
        alert(`Answer is: "${answerText}"\n(I couldn't find the button to click automatically)`);
    }
}