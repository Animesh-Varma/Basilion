// Configuration: The specific Google Apps Script URL you provided
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzcvBp4jlad2lyLkFa_pIq1xw7QjHnD3kCcu72emxL7wzpscV267CNb-nYP4cExUNj2nw/exec";

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const logList = document.getElementById('logList');

// --- Event Listeners ---

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Drag & Drop Interaction
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
});

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// --- File Processing ---

function handleFiles(files) {
    ([...files]).forEach(uploadFile);
}

function uploadFile(file) {
    const fileId = Math.random().toString(36).substring(7);

    // 1. Create UI Entry in Log
    createLogEntry(file, fileId);

    // 2. Read File
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = function(e) {
        const rawData = reader.result.split(',')[1]; // Remove base64 prefix

        const payload = {
            file: rawData,
            filename: file.name,
            mimeType: file.type
        };

        // 3. Send to Backend
        performUpload(payload, fileId);
    };
}

function createLogEntry(file, id) {
    const card = document.createElement('div');
    card.className = 'log-card';
    card.id = `log-${id}`;

    let icon = 'draft';
    if(file.type.includes('image')) icon = 'image';
    if(file.type.includes('video')) icon = 'movie';
    if(file.type.includes('pdf')) icon = 'picture_as_pdf';

    card.innerHTML = `
        <div class="file-icon-box">
            <span class="material-symbols-rounded">${icon}</span>
        </div>
        <div class="file-details">
            <span class="file-name">${file.name}</span>
            <span class="file-status" id="status-${id}">ENCRYPTING...</span>
            <div class="progress-bar">
                <div class="progress-fill" id="prog-${id}"></div>
            </div>
        </div>
    `;

    // Prepend to list (newest top)
    logList.insertBefore(card, logList.firstChild);
}

function performUpload(payload, id) {
    const statusEl = document.getElementById(`status-${id}`);
    const progEl = document.getElementById(`prog-${id}`);
    const card = document.getElementById(`log-${id}`);

    statusEl.innerText = "TRANSMITTING...";

    // Fake progress animation (since no-cors hides real progress)
    let width = 0;
    const interval = setInterval(() => {
        if (width < 90) {
            width += Math.random() * 10;
            progEl.style.width = width + '%';
        }
    }, 200);

    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        clearInterval(interval);
        progEl.style.width = '100%';
        statusEl.innerText = "UPLOAD COMPLETE";
        statusEl.style.color = "#FFFFFF";
        card.classList.add('success');

        // Update Icon to Checkmark
        const iconBox = card.querySelector('.file-icon-box');
        iconBox.innerHTML = '<span class="material-symbols-rounded">check</span>';
        iconBox.style.background = '#FFFFFF';
        iconBox.style.color = '#000000';
    })
    .catch(err => {
        clearInterval(interval);
        statusEl.innerText = "TRANSMISSION ERROR";
        card.classList.add('error');
        console.error(err);
    });
}