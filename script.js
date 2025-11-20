// Configuration: Use the SAME URL as your upload site
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzfGvJ2LiJT1_iRsCsMHDVnCIQHt1RecjTj5aq14TswIyIg-1i5SsTxZFAd4F3-GXiqQA/exec";

const fileListEl = document.getElementById('fileList');

document.addEventListener('DOMContentLoaded', () => {
    fetchFiles();
});

function fetchFiles() {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            fileListEl.innerHTML = '';

            if (data.length === 0) {
                showEmptyState();
            } else {
                // Add small delay for staggered animation effect
                data.forEach((file, index) => {
                    setTimeout(() => {
                        renderFileCard(file);
                    }, index * 50);
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            fileListEl.innerHTML = `
                <div class="loading-state" style="color: #ff4444">
                    <span class="material-symbols-rounded">error</span>
                    <span>CONNECTION FAILED</span>
                </div>
            `;
        });
}

function renderFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';

    // Determine Icon
    let icon = 'description';
    const type = file.type.toLowerCase();
    if(type.includes('image')) icon = 'image';
    if(type.includes('video')) icon = 'movie';
    if(type.includes('audio')) icon = 'music_note';
    if(type.includes('pdf')) icon = 'picture_as_pdf';
    if(type.includes('zip') || type.includes('rar')) icon = 'folder_zip';
    if(type.includes('code') || type.includes('javascript') || type.includes('html')) icon = 'code';

    card.innerHTML = `
        <div class="file-icon-box">
            <span class="material-symbols-rounded">${icon}</span>
        </div>
        <div class="file-details">
            <span class="file-name" title="${file.name}">${file.name}</span>
            <div class="file-meta">
                <span>${file.size}</span>
            </div>
        </div>
        <div class="actions">
            <a href="${file.url}" target="_blank" class="action-btn" title="Open in New Tab">
                <span class="material-symbols-rounded">open_in_new</span>
            </a>
            <a href="${file.downloadUrl}" class="action-btn" title="Download">
                <span class="material-symbols-rounded">download</span>
            </a>
        </div>
    `;

    fileListEl.appendChild(card);
}

function showEmptyState() {
    fileListEl.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-rounded">folder_off</span>
            <span>NO DATA FOUND IN STREAM</span>
        </div>
    `;
}