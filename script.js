// CONFIGURATION
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzfGvJ2LiJT1_iRsCsMHDVnCIQHt1RecjTj5aq14TswIyIg-1i5SsTxZFAd4F3-GXiqQA/exec";
const fileListEl = document.getElementById('fileList');
const toastContainer = document.getElementById('toast-container');

document.addEventListener('DOMContentLoaded', () => {
    initLoad();
});

function initLoad() {
    fileListEl.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-rounded spin-icon">sync</span>
            <span>ESTABLISHING CONNECTION...</span>
        </div>
    `;

    // Load the list via JSONP
    loadJSONP('list')
        .then(json => {
            if (json.status === "error") throw new Error(json.message);
            renderFiles(json.data);
        })
        .catch(error => {
            console.error(error);
            showError("Connection Failed", "Server returned invalid data");
        });
}

function loadJSONP(action, id = null) {
    return new Promise((resolve, reject) => {
        // Create unique callback name
        const callbackName = 'cb_' + Date.now() + '_' + Math.round(Math.random() * 1000000);

        // Define the global callback
        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        // Cleanup helper
        function cleanup() {
            delete window[callbackName];
            if (script.parentNode) document.body.removeChild(script);
        }

        // Create script tag
        const script = document.createElement('script');
        // Added &t= timestamp to prevent caching of old JSON responses
        script.src = `${WEB_APP_URL}?action=${action}&id=${id || ''}&callback=${callbackName}&t=${Date.now()}`;

        script.onerror = () => {
            cleanup();
            reject(new Error('Script load failed'));
        };

        document.body.appendChild(script);
    });
}

function renderFiles(files) {
    fileListEl.innerHTML = '';

    if (!files || files.length === 0) {
        fileListEl.innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-rounded">folder_off</span>
                <span>NO FILES FOUND</span>
            </div>`;
        return;
    }

    files.forEach((file, index) => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'file-card';

            let icon = 'description';
            const t = (file.type || "").toLowerCase();
            const isTextFile = isText(t, file.name);

            if(t.includes('image')) icon = 'image';
            else if(t.includes('video')) icon = 'movie';
            else if(t.includes('pdf')) icon = 'picture_as_pdf';
            else if(t.includes('zip') || t.includes('compressed')) icon = 'folder_zip';
            else if(isTextFile) icon = 'code';

            let actions = '';

            if (isTextFile) {
                actions += `
                <button class="action-btn copy-btn" onclick="triggerCopy('${file.id}', this)" title="Extract Text">
                    <span class="material-symbols-rounded">content_copy</span>
                </button>`;
            }

            actions += `
            <a href="${file.url}" target="_blank" class="action-btn link-btn">
                <span class="material-symbols-rounded">visibility</span>
            </a>
            <a href="${file.download}" class="action-btn link-btn">
                <span class="material-symbols-rounded">download</span>
            </a>`;

            card.innerHTML = `
                <div class="file-icon-box"><span class="material-symbols-rounded">${icon}</span></div>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <div class="file-meta">
                        <span>${file.size}</span>
                        <span>•</span>
                        <span>${new Date(file.date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="actions">${actions}</div>
            `;
            fileListEl.appendChild(card);
        }, index * 50);
    });
}

window.triggerCopy = function(id, btn) {
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-rounded spin-icon">sync</span>';
    btn.disabled = true;

    loadJSONP('read', id)
        .then(json => {
            if(json.status === "error") throw new Error(json.message);

            navigator.clipboard.writeText(json.content).then(() => {
                showToast("EXTRACTED & COPIED");
                btn.innerHTML = '<span class="material-symbols-rounded">check</span>';
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.disabled = false;
                }, 2000);
            });
        })
        .catch(e => {
            console.error(e);
            showToast("EXTRACTION ERROR");
            btn.innerHTML = '<span class="material-symbols-rounded">error</span>';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.disabled = false;
            }, 2000);
        });
}

function isText(mime, filename) {
    if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript')) return true;
    if (filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const textExts = ['txt', 'md', 'js', 'html', 'css', 'json', 'py', 'c', 'cpp', 'h', 'java', 'gs', 'xml', 'csv', 'log', 'ini', 'env', 'sh', 'bat'];
        return textExts.includes(ext);
    }
    return false;
}

function showError(title, detail) {
    fileListEl.innerHTML = `
        <div class="loading-state" style="color: #ff4444; flex-direction: column; gap: 8px;">
            <span class="material-symbols-rounded" style="font-size: 32px;">wifi_off</span>
            <span style="font-weight: 700">${title}</span>
            <span style="font-size: 0.8rem; opacity: 0.7; max-width: 300px; text-align: center;">${detail}</span>
            <button onclick="initLoad()" style="margin-top:10px; background:none; border:1px solid #333; color:#fff; padding:5px 10px; border-radius:5px; cursor:pointer;">RETRY</button>
        </div>
    `;
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="material-symbols-rounded">terminal</span> ${msg}`;
    toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(20px)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}