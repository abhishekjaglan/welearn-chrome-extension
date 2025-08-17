document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('typeSelect');
    const textInputSection = document.getElementById('textInputSection');
    const urlInputSection = document.getElementById('urlInputSection');
    const fileInputSection = document.getElementById('fileInputSection');
    const textInput = document.getElementById('textInput');
    const urlInput = document.getElementById('urlInput');
    const fileInput = document.getElementById('fileInput');
    const detailLevel = document.getElementById('detailLevel');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const status = document.getElementById('status');
    const loading = document.getElementById('loading');
    const summaryBox = document.getElementById('summaryBox');

    // Function to fetch and fill selected text using executeScript
    const fetchSelectedText = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id || !tab.url.startsWith('http')) {
            textInput.value = '';
            status.textContent = 'Cannot get selection from this tab (must be http/https page)';
            return;
        }
        try {
            const [{ result: selectedText }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString().trim()
            });
            textInput.value = selectedText || '';
            if (!textInput.value) {
                status.textContent = 'No text selected on the page. Select some text and reopen the popup.';
            } else {
                status.textContent = 'Ready';
            }
        } catch (err) {
            console.error(err);
            status.textContent = `Error getting selection: ${err.message}`;
            textInput.value = '';
        }
    };

    // Initial fetch if default type is text
    if (typeSelect.value === 'text') {
        fetchSelectedText();
    }

    // Switch input sections and fetch data based on type
    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        textInputSection.style.display = type === 'text' ? 'block' : 'none';
        urlInputSection.style.display = type === 'url' ? 'block' : 'none';
        fileInputSection.style.display = type === 'file' ? 'block' : 'none';

        status.textContent = 'Ready'; // Reset status

        if (type === 'text') {
            fetchSelectedText();
        } else if (type === 'url') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                urlInput.value = tabs[0].url || '';
            });
        } else {
            textInput.value = '';
            urlInput.value = '';
        }
    });

    // Summarize button handler
    summarizeBtn.addEventListener('click', async () => {
        const type = typeSelect.value;
        const level = detailLevel.value;
        let value;

        if (type === 'text') {
            value = textInput.value.trim();
            if (!value) {
                // Refetch in case selection changed
                await fetchSelectedText();
                value = textInput.value.trim();
                if (!value) return status.textContent = 'Please select or enter text.';
            }
        } else if (type === 'url') {
            value = urlInput.value;
            if (!value) return status.textContent = 'No URL available.';
        } else if (type === 'file') {
            if (!fileInput.files.length) return status.textContent = 'Please upload a file.';
        }

        status.textContent = 'Preparing...';
        summarizeBtn.disabled = true;
        loading.style.display = 'block';
        summaryBox.innerHTML = '';

        try {
            const formData = new FormData();
            formData.append('detailLevel', level);
            formData.append('type', type);

            if (type === 'text') {
                formData.append('text', value);
            } else if (type === 'url') {
                formData.append('url', value);
            } else if (type === 'file') {
                formData.append('file', fileInput.files[0]);
            }

            const response = await fetch('http://localhost:3001/api/summarize', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const { response: summary } = await response.json();

            summaryBox.innerHTML = `<strong>Summary (${level}):</strong><br>${summary}`;
            status.textContent = 'Done!';
        } catch (err) {
            status.textContent = `Error: ${err.message}`;
            summaryBox.innerHTML = '';
        } finally {
            summarizeBtn.disabled = false;
            loading.style.display = 'none';
        }
    });
});