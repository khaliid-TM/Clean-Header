document.addEventListener('DOMContentLoaded', () => {
    // UI & Action Elements
    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const emailSource = document.getElementById('emailSource');
    const emailOutput = document.getElementById('emailOutput');
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const bulkResultsContainer = document.getElementById('bulkResultsContainer');
    const singleModeBtn = document.getElementById('singleModeBtn');
    const bulkModeBtn = document.getElementById('bulkModeBtn');
    const singleModeSection = document.getElementById('singleModeSection');
    const bulkModeSection = document.getElementById('bulkModeSection');
    const fileCountDiv = document.getElementById('fileCount');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Dynamic Tag Inputs
    const domainReplacementInput = document.getElementById('domainReplacementInput');
    const fromUserTagInput = document.getElementById('fromUserTagInput');
    const toReplacementInput = document.getElementById('toReplacementInput');
    const dateFormatInput = document.getElementById('dateFormatInput');

    const fromPreview = document.getElementById('fromPreview');
    const tagChips = document.querySelectorAll('.tag-chip');

    // Options Checkboxes
    const optToStarTo = document.getElementById('optToStarTo');
    const optKeepReceived = document.getElementById('optKeepReceived');
    const optKeepReplyTo = document.getElementById('optKeepReplyTo');
    const optAddCcIfMissing = document.getElementById('optAddCcIfMissing');
    const optAddDrDnsSubject = document.getElementById('optAddDrDnsSubject');
    const optAddDrDnsFrom = document.getElementById('optAddDrDnsFrom');

    // In-memory cache for bulk uploaded raw files
    let uploadedFiles = [];
    let activeCopyBtn = null;

    // Icons
    const COPY_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17M19 15V7C19 5.89543 18.1046 5 17 5H15M8 5V7C8 7.55228 8.44772 8 9 8H13C13.5523 8 14 7.55228 14 7V5M8 5C8 4.44772 8.44772 4 9 4H13C13.5523 4 14 4.44772 14 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const CHECK_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    if (copyBtn) copyBtn.innerHTML = COPY_ICON;

    // Theme Switcher Logic
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light' && toggleSwitch) toggleSwitch.checked = true;
    }

    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // Sub Navigation Switcher
    if (singleModeBtn && bulkModeBtn) {
        singleModeBtn.addEventListener('click', () => {
            singleModeBtn.classList.add('active');
            bulkModeBtn.classList.remove('active');
            singleModeSection.classList.remove('hidden');
            bulkModeSection.classList.add('hidden');
        });

        bulkModeBtn.addEventListener('click', () => {
            bulkModeBtn.classList.add('active');
            singleModeBtn.classList.remove('active');
            bulkModeSection.classList.remove('hidden');
            singleModeSection.classList.add('hidden');
        });
    }

    // Live From Header Preview Update
    function updateFromPreview() {
        const userTag = fromUserTagInput ? fromUserTagInput.value.trim() : '';
        const domain = domainReplacementInput ? domainReplacementInput.value.trim() : '';
        const domainPart = domain ? `@${domain}` : '';
        if (fromPreview) {
            fromPreview.innerHTML = `&rarr; From: no-reply${userTag}${domainPart}`;
        }
    }

    // Real-Time Output Re-Processor for Single and Bulk Modes
    function updateAllOutputs() {
        // Re-process Single Mode
        if (emailSource && emailSource.value.trim() && emailOutput) {
            emailOutput.value = processEmailContent(emailSource.value);
        }

        // Re-process Bulk Mode
        if (uploadedFiles.length > 0 && bulkResultsContainer) {
            bulkResultsContainer.innerHTML = '';
            for (const file of uploadedFiles) {
                const processedContent = processEmailContent(file.content);
                createResultCard(file.name, processedContent, bulkResultsContainer);
            }
        }
    }

    // Bind Real-Time Listeners to Input Fields & Checkboxes
    const settingsElements = [
        domainReplacementInput,
        fromUserTagInput,
        toReplacementInput,
        dateFormatInput,
        optToStarTo,
        optKeepReceived,
        optKeepReplyTo,
        optAddCcIfMissing,
        optAddDrDnsSubject,
        optAddDrDnsFrom
    ];

    settingsElements.forEach(element => {
        if (!element) return;
        const eventType = element.type === 'checkbox' ? 'change' : 'input';
        element.addEventListener(eventType, () => {
            if (element === domainReplacementInput || element === fromUserTagInput) {
                updateFromPreview();
            }
            updateAllOutputs();
        });
    });

    // Real-time input handling for Single Source Textarea
    if (emailSource) {
        emailSource.addEventListener('input', () => {
            if (emailOutput) {
                emailOutput.value = emailSource.value.trim() ? processEmailContent(emailSource.value) : '';
            }
        });
    }

    // Universal Tag Chip Click Handlers
    tagChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const targetId = chip.getAttribute('data-target');
            const value = chip.getAttribute('data-value');
            const input = document.getElementById(targetId);
            if (input) {
                input.value = value;
                if (targetId === 'domainReplacementInput' || targetId === 'fromUserTagInput') {
                    updateFromPreview();
                }
                updateAllOutputs();
            }
        });
    });

    updateFromPreview();

    // Process Button Action
    if (processBtn) {
        processBtn.addEventListener('click', () => {
            const sourceText = emailSource ? emailSource.value : '';
            if (!sourceText.trim()) return;
            if (emailOutput) emailOutput.value = processEmailContent(sourceText);
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            copyToClipboard(emailOutput ? emailOutput.value : '', copyBtn);
        });
    }

    // Dynamic Clear All Button Handler
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (fileInput) fileInput.value = '';
            uploadedFiles = [];
            if (fileCountDiv) fileCountDiv.textContent = '0 files selected';
            clearAllBtn.style.display = 'none';
            if (bulkResultsContainer) bulkResultsContainer.innerHTML = '';
        });
    }

    // File Drag-and-Drop & Upload
    if (fileInput) {
        fileInput.addEventListener('change', handleCleanFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length && fileInput) {
                fileInput.files = e.dataTransfer.files;
                handleCleanFileSelect({ target: fileInput });
            }
        });
    }

    async function handleCleanFileSelect(e) {
        const files = e.target.files;
        if (!files || !files.length) return;

        if (fileCountDiv) fileCountDiv.textContent = `Processing ${files.length} file(s)...`;
        uploadedFiles = [];

        for (const file of Array.from(files)) {
            try {
                const content = await file.text();
                uploadedFiles.push({ name: file.name, content: content });
            } catch (error) {
                console.error(`Error reading ${file.name}:`, error);
                uploadedFiles.push({ name: file.name, content: `Error processing file: ${error.message}` });
            }
        }

        if (fileCountDiv) fileCountDiv.textContent = `${uploadedFiles.length} file(s) cleaned`;
        if (clearAllBtn) clearAllBtn.style.display = 'block';

        updateAllOutputs();
        e.target.value = '';
    }

    // Core Header Processing Logic
    function processEmailContent(sourceText) {
        const parts = splitHeadersAndBody(sourceText);
        const parsedHeaders = parseHeaders(parts.headers);
        const newHeaders = processHeaders(parsedHeaders);
        return reconstructEmail(newHeaders, parts.body);
    }

    function splitHeadersAndBody(text) {
        const regex = /\r?\n\r?\n/;
        const match = regex.exec(text);
        if (match) {
            return {
                headers: text.substring(0, match.index),
                body: text.substring(match.index + match[0].length)
            };
        }
        return { headers: text, body: '' };
    }

    function parseHeaders(rawHeaders) {
        const lines = rawHeaders.split(/\r?\n/);
        const headers = [];
        let currentHeader = null;

        for (const line of lines) {
            if (line.match(/^\s+/) && currentHeader) {
                currentHeader.value += '\n' + line;
            } else {
                if (currentHeader) headers.push(currentHeader);
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const name = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1);
                    currentHeader = { name, value, originalLine: line };
                }
            }
        }
        if (currentHeader) headers.push(currentHeader);
        return headers;
    }

    function processHeaders(headers) {
        const processed = [];
        let hasCc = false;

        const replaceTo = optToStarTo ? optToStarTo.checked : true;
        const keepReceived = optKeepReceived ? optKeepReceived.checked : true;
        const keepReplyTo = optKeepReplyTo ? optKeepReplyTo.checked : true;
        const addCcIfMissing = optAddCcIfMissing ? optAddCcIfMissing.checked : false;
        const addDrDnsToSubject = optAddDrDnsSubject ? optAddDrDnsSubject.checked : true;
        const addDrDnsToFrom = optAddDrDnsFrom ? optAddDrDnsFrom.checked : true;

        const toTagVal = toReplacementInput ? toReplacementInput.value.trim() : '[*to]';

        for (const header of headers) {
            const nameLower = header.name.toLowerCase();

            if (nameLower === 'from') {
                processed.push({ name: header.name, value: transformFromHeader(header.value, addDrDnsToFrom) });
                continue;
            }

            if (nameLower === 'date') {
                processed.push({ name: header.name, value: transformDateHeader(header.value) });
                continue;
            }

            if (nameLower === 'subject') {
                processed.push({ name: header.name, value: transformSubjectHeader(header.value, addDrDnsToSubject) });
                continue;
            }

            if (nameLower === 'message-id') {
                processed.push({ name: header.name, value: transformMessageId(header.value) });
                continue;
            }

            if (nameLower === 'to') {
                processed.push({
                    name: header.name,
                    value: replaceTo ? (toTagVal ? ` ${toTagVal}` : header.value) : header.value
                });
                continue;
            }

            if (nameLower === 'cc') {
                hasCc = true;
                processed.push(header);
                continue;
            }

            if (nameLower === 'received') {
                if (keepReceived) processed.push(header);
                continue;
            }

            if (nameLower === 'reply-to') {
                if (keepReplyTo) processed.push(header);
                continue;
            }

            if (['mime-version', 'content-type', 'content-transfer-encoding'].includes(nameLower)) {
                processed.push(header);
            }
        }

        if (addCcIfMissing && !hasCc) {
            const ccVal = toTagVal || '[*to]';
            processed.push({ name: 'Cc', value: ` ${ccVal}` });
        }

        return processed;
    }

    function transformDateHeader(value) {
        const dateTagVal = dateFormatInput ? dateFormatInput.value.trim() : '[date]';
        return dateTagVal ? ` ${dateTagVal}` : value;
    }

    function transformSubjectHeader(value, addTag) {
        const trimmed = value.trim();
        return addTag ? ` [DRDNS_NAME]:${trimmed}` : ` ${trimmed}`;
    }

    function transformFromHeader(value, addTag) {
        const domainVal = domainReplacementInput ? domainReplacementInput.value.trim() : '[RDNS]';
        const userTagVal = fromUserTagInput ? fromUserTagInput.value.trim() : '[3W]';
        
        const prefix = addTag ? ' [DRDNS_NAME]' : '';
        const domainSuffix = domainVal ? `@${domainVal}` : '';

        if (value.includes('<') && value.includes('>')) {
            return value.replace(/^(.*?)\s*<([^@]+)@([^>]+)>/, (match, displayName, user) => {
                const namePart = displayName.trim();
                const userPart = user.trim();
                return namePart 
                    ? `${prefix} ${namePart} <${userPart}${userTagVal}${domainSuffix}>`
                    : `${prefix} <${userPart}${userTagVal}${domainSuffix}>`;
            });
        }

        if (value.includes('@')) {
            return value.replace(/([^@\s]+)@(\S+)/, (match, user) => `${prefix} ${user}${userTagVal}${domainSuffix}`);
        }
        return value;
    }

    function transformMessageId(value) {
        if (value.includes('<') && value.includes('>')) {
            return value.replace(/<([^@]+)@([^>]+)>/, (match, localPart, domain) => `<${localPart}[EID]@${domain}>`);
        }
        return value;
    }

    function reconstructEmail(headers, body) {
        let text = headers.map(h => `${h.name}:${h.value}`).join('\n');
        if (body) text += '\n\n' + body;
        return text;
    }

    function createResultCard(filename, content, targetContainer) {
        const card = document.createElement('div');
        card.className = 'result-card';

        const header = document.createElement('div');
        header.className = 'result-header';
        header.innerHTML = `<span>${filename}</span>`;

        const wrapper = document.createElement('div');
        wrapper.className = 'textarea-wrapper';

        const textarea = document.createElement('textarea');
        textarea.readOnly = true;
        textarea.value = content;
        textarea.style.minHeight = '200px';

        const cardCopyBtn = document.createElement('button');
        cardCopyBtn.className = 'icon-btn';
        cardCopyBtn.title = 'Copy Source';
        cardCopyBtn.innerHTML = COPY_ICON;
        cardCopyBtn.addEventListener('click', () => copyToClipboard(content, cardCopyBtn));

        wrapper.appendChild(textarea);
        wrapper.appendChild(cardCopyBtn);
        card.appendChild(header);
        card.appendChild(wrapper);
        targetContainer.appendChild(card);
    }

    function copyToClipboard(text, btnElement) {
        if (text) {
            navigator.clipboard.writeText(text);
            if (activeCopyBtn && activeCopyBtn !== btnElement) activeCopyBtn.innerHTML = COPY_ICON;
            btnElement.innerHTML = CHECK_ICON;
            activeCopyBtn = btnElement;
        }
    }
});
