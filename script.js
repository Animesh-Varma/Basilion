// CONFIGURATION
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzfGvJ2LiJT1_iRsCsMHDVnCIQHt1RecjTj5aq14TswIyIg-1i5SsTxZFAd4F3-GXiqQA/exec";

// Fake data to show behind the blur (2 Same, 1 Different)
const DUMMY_FILES = [
    { name: "sector_09_archive.dat", size: "128 MB", date: new Date().toISOString(), icon: "text_snippet" },
    { name: "sector_12_archive.dat", size: "442 MB", date: new Date().toISOString(), icon: "terminal" }, // Same type as above
    { name: "sys_boot_sequence.lock", size: "12 KB", date: new Date().toISOString(), icon: "lock" } // Different type
];

// DOM Elements
const fileListEl = document.getElementById('fileList');
const toastContainer = document.getElementById('toast-container');
const authOverlay = document.getElementById('authOverlay');
const systemStatus = document.getElementById('systemStatus');
const liveDot = document.querySelector('.live-dot');

let currentSessionHash = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for existing session first
    const storedHash = sessionStorage.getItem('board_auth_hash');
    if (storedHash) {
        performLogin(storedHash);
    } else {
        // 2. If no session, run the "fake" boot sequence
        initBootSequence();
    }
});

// --- Boot Sequence (Visual Only) ---

function initBootSequence() {
    // Step 1: Show Connecting
    fileListEl.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-rounded spin-icon">sync</span>
            <span>ESTABLISHING UPLINK...</span>
        </div>
    `;

    // Step 2: After 1.2s, show dummy files (Encrypted State)
    setTimeout(() => {
        renderDummyFiles();
        // Ensure the overlay is visible and blur is active
        authOverlay.classList.remove('unlocked');
        fileListEl.classList.add('blurred-content');
    }, 1200);
}

function renderDummyFiles() {
    fileListEl.innerHTML = '';

    DUMMY_FILES.forEach((file, index) => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'file-card';
            // Visuals for dummy files
            card.style.opacity = '0.5';

            card.innerHTML = `
                <div class="file-icon-box" style="color: #888; border-color: #333;">
                    <span class="material-symbols-rounded">${file.icon}</span>
                </div>
                <div class="file-details">
                    <span class="file-name" style="color: #888;">${file.name}</span>
                    <div class="file-meta">
                        <span>${file.size}</span>
                        <span>•</span>
                        <span>ENCRYPTED</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="action-btn" disabled style="border-style: dashed; opacity: 0.3;">
                        <span class="material-symbols-rounded">block</span>
                    </button>
                </div>
            `;
            fileListEl.appendChild(card);
        }, index * 100);
    });
}

// --- Authentication Logic ---

async function authenticate() {
    const input = document.getElementById('adminPassword');
    const password = input.value;

    if(!password) return;

    const hash = await hashString(password);
    performLogin(hash, input);
}

function performLogin(hash, inputElem = null) {
    // UI Feedback (Loading Spinner on Button)
    if(inputElem) {
        document.querySelector('.auth-btn').innerHTML = '<span class="material-symbols-rounded spin-icon">sync</span>';
    }

    loadJSONP('list', null, hash)
        .then(json => {
            if (json.status === "error") {
                throw new Error(json.message);
            }

            // Success!
            currentSessionHash = hash;
            sessionStorage.setItem('board_auth_hash', hash);

            if(inputElem) inputElem.value = '';

            // 1. Clear Dummies
            fileListEl.innerHTML = '';

            // 2. Unlock Interface (Removes Blur)
            unlockInterface();

            // 3. Render Real Files
            renderFiles(json.data);
        })
        .catch(error => {
            console.error(error);
            if(inputElem) {
                inputElem.classList.add('error');
                showToast("ACCESS DENIED");
                document.querySelector('.auth-btn').innerHTML = '<span class="material-symbols-rounded">arrow_forward</span>';
                setTimeout(() => inputElem.classList.remove('error'), 500);
            } else {
                sessionStorage.removeItem('board_auth_hash');
                initBootSequence(); // Revert to dummy state if auto-login fails
            }
        });
}

// Allow pressing Enter to submit
document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authenticate();
});

function unlockInterface() {
    authOverlay.classList.add('unlocked');
    fileListEl.classList.remove('blurred-content');

    systemStatus.innerText = "System Online";
    systemStatus.style.color = "#FFFFFF";
    liveDot.style.backgroundColor = "#FFFFFF";
    liveDot.style.boxShadow = "0 0 8px #FFFFFF";
}

window.logout = function(e) {
    if(e) e.preventDefault();
    sessionStorage.removeItem('board_auth_hash');
    location.reload();
}

async function hashString(msg) {
    const data = new TextEncoder().encode(msg);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadJSONP(action, id = null, authHash = null) {
    return new Promise((resolve, reject) => {
        const hashToSend = authHash || currentSessionHash;

        if (!hashToSend) {
            reject(new Error("No authentication hash available"));
            return;
        }

        const callbackName = 'cb_' + Date.now() + '_' + Math.round(Math.random() * 1000000);

        const targetUrl = new URL(WEB_APP_URL);

        targetUrl.searchParams.set("action", action);
        if (id) targetUrl.searchParams.set("id", id);

        // Send as 'p' to match your deployed script
        targetUrl.searchParams.set("p", hashToSend);

        targetUrl.searchParams.set("callback", callbackName);
        targetUrl.searchParams.set("t", Date.now());

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        function cleanup() {
            delete window[callbackName];
            if (script.parentNode) document.body.removeChild(script);
        }

        const script = document.createElement('script');
        script.src = targetUrl.toString();

        script.onerror = () => {
            cleanup();
            reject(new Error('Script load failed'));
        };

        document.body.appendChild(script);
    });
}

// --- Real File Rendering ---

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