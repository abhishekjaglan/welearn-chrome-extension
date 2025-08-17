chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'summarizeSelection',
        title: 'Summarize Selected Text',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizeSelection') {
        try {
            const [{ result: selectedText }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString().trim()
            });
            if (!selectedText) {
                alert('No text selected.');
                return;
            }

            // Store and open popup
            await chrome.storage.local.set({ selectedText });
            chrome.action.openPopup(); // MV3 limited; may not work, fallback to direct API call

            // Direct API call with default level
            const formData = new FormData();
            formData.append('detailLevel', 'medium');
            formData.append('type', 'text');
            formData.append('text', selectedText);

            const res = await fetch('http://localhost:3001/api/summarize', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('API error');
            const { response: summary } = await res.json();
            alert(`Summary: ${summary}`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }
});