chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelection') {
        sendResponse({ text: window.getSelection().toString().trim() });
    }
});