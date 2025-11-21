// --- Configuration ---

// 1. Database URL
// Replaced by Cloudflare Build Command: sed -i "s|__DB_URL__|$DB_URL|g" script.js
const DB_URL = "__DB_URL__";

// 2. Admin Hash
// Replaced by Cloudflare Build Command: sed -i "s|__ADMIN_HASH__|$ADMIN_HASH|g" script.js
const TARGET_HASH = "__ADMIN_HASH__";

// 3. Fallback Data (If DB fails or is empty)
const EMBEDDED_DB = [
    { id: '101', title: 'Lab Interface', link: 'https://lab.animeshvarma.dev', desc: 'The Kanban interface you are viewing right now.', section: 'ongoing' },
    { id: '102', title: 'Upload Protocol', link: 'https://upload.animeshvarma.dev', desc: 'Secure file transmission protocol.', section: 'stable' }
];

// --- State ---
const SECTIONS = ['ongoing', 'planned', 'onhold', 'stable', 'discontinued'];
let projects = [];
let isAuthenticated = false;

const systemStatus = document.getElementById('systemStatus');
const liveDot = document.querySelector('.live-dot');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initDragAndDrop();
    checkSession();
});

// --- Data Synchronization ---

async function loadData() {
    // Only try to load if URL is replaced (not placeholder)
    if (DB_URL && DB_URL.startsWith('http')) {

        // Flash status so you know it's working
        systemStatus.innerText = "ESTABLISHING UPLINK...";

        try {
            // CACHE BUSTER: ?t=${Date.now()} forces a fresh request every time
            const response = await fetch(`${DB_URL}?t=${Date.now()}`);
            const json = await response.json();

            if (json.data && Array.isArray(json.data)) {
                projects = json.data;
                renderBoard();

                // Reset status after load
                systemStatus.innerText = isAuthenticated ? "ADMINISTRATOR" : "Viewing Mode";
                return;
            }
        } catch (e) {
            console.warn("Cloud Load Failed, using Embedded:", e);
            flashStatus("CONNECTION LOST", "#ff4444");
        }
    }

    // Fallback (Only runs if Cloud fails)
    projects = [...EMBEDDED_DB];
    renderBoard();
}

async function syncToCloud() {
    if (!DB_URL || !DB_URL.startsWith('http')) {
        return console.warn("No DB URL configured.");
    }

    flashStatus("TRANSMITTING...", "#FFFF00");

    try {
        // 'no-cors' is required for Google Apps Script POST requests from browser
        await fetch(DB_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projects)
        });

        // Since 'no-cors' returns an opaque response, we assume success if no network error
        setTimeout(() => flashStatus("SYNC COMPLETE", "#FFFFFF"), 500);

    } catch (e) {
        console.error(e);
        flashStatus("SYNC ERROR", "#ff4444");
    }
}

function flashStatus(text, color) {
    const originalText = isAuthenticated ? "ADMINISTRATOR" : "Viewing Mode";
    const originalColor = isAuthenticated ? "#00FF00" : "#FFFFFF";

    systemStatus.innerText = text;
    systemStatus.style.color = color;
    liveDot.style.backgroundColor = color;
    liveDot.style.boxShadow = `0 0 8px ${color}`;

    setTimeout(() => {
        systemStatus.innerText = originalText;
        systemStatus.style.color = "#888";
        liveDot.style.backgroundColor = originalColor;
        liveDot.style.boxShadow = `0 0 8px ${originalColor}`;
    }, 2000);
}

// --- Rendering ---
function renderBoard() {
    SECTIONS.forEach(sec => document.getElementById(sec).innerHTML = '');
    projects.forEach(createCardElement);
}

function createCardElement(p) {
    const container = document.getElementById(p.section);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'project-card';
    div.setAttribute('data-id', p.id);

    // Edit Button (Fixed Position & Click Handling)
    let editBtn = '';
    if (isAuthenticated) {
        editBtn = `<button class="card-edit-btn material-symbols-rounded" type="button">edit</button>`;
    }

    const linkIcon = p.link ? '<span class="material-symbols-rounded card-link-icon">link</span>' : '';

    div.innerHTML = `
        ${editBtn}
        <span class="card-title">${p.title} ${linkIcon}</span>
        <div class="card-desc-wrapper">
            <div class="card-desc-inner">
                ${p.desc || 'No details.'}
            </div>
        </div>
    `;

    // Link Click Logic
    div.addEventListener('click', (e) => {
        // If clicking the edit button, don't open link
        if (e.target.closest('.card-edit-btn')) {
            e.stopPropagation();
            editProject(p.id);
            return;
        }
        // If card has link, open it
        if (p.link) window.open(p.link, '_blank');
    });

    container.appendChild(div);
}

// --- Drag & Drop ---
function initDragAndDrop() {
    SECTIONS.forEach(secId => {
        new Sortable(document.getElementById(secId), {
            group: 'shared',
            animation: 150,
            disabled: !isAuthenticated, // Locked unless admin
            ghostClass: 'sortable-ghost',
            delay: 100, delayOnTouchOnly: true,
            onEnd: (evt) => {
                if(evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
                updateProjectStatus(evt.item.getAttribute('data-id'), evt.to.id);
            }
        });
    });
}

function updateProjectStatus(id, newSection) {
    const p = projects.find(x => x.id === id);
    if (p) {
        p.section = newSection;
        syncToCloud();
    }
}

// --- Authentication ---
document.getElementById('authLink').addEventListener('click', (e) => {
    e.preventDefault();
    if (!isAuthenticated) document.getElementById('authModal').classList.remove('hidden');
});

async function authenticate() {
    const input = document.getElementById('adminPassword');
    const hash = await hashString(input.value);

    // Check against Env Var or default to "admin" hash for testing
    const validHash = (!TARGET_HASH.includes("ADMIN_HASH"))
        ? TARGET_HASH
        : "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

    if (hash === validHash) {
        isAuthenticated = true;
        sessionStorage.setItem('lab_auth', 'true');
        enableAdminMode();
        closeModals();
        input.value = '';
    } else {
        alert('ACCESS DENIED');
        input.classList.add('error');
    }
}

async function hashString(msg) {
    const data = new TextEncoder().encode(msg);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkSession() {
    if (sessionStorage.getItem('lab_auth') === 'true') enableAdminMode();
}

function enableAdminMode() {
    isAuthenticated = true;
    document.body.classList.add('admin-view');
    document.getElementById('adminControls').classList.remove('hidden');

    // Visuals
    liveDot.style.backgroundColor = "#00FF00";
    liveDot.style.boxShadow = "0 0 8px #00FF00";
    systemStatus.innerText = "ADMINISTRATOR";
    systemStatus.style.color = "#FFFFFF";

    initDragAndDrop(); // Re-init to unlock dragging
    renderBoard(); // Re-render to show pencils
}

function logout() {
    sessionStorage.removeItem('lab_auth');
    location.reload();
}

// --- CRUD ---
function openProjectModal(isEdit = false, id = null) {
    const titleIn = document.getElementById('pTitle');
    const linkIn = document.getElementById('pLink');
    const descIn = document.getElementById('pDesc');
    const idIn = document.getElementById('editId');
    const label = document.getElementById('modalTitle');

    if (isEdit && id) {
        const p = projects.find(x => x.id === id);
        titleIn.value = p.title;
        linkIn.value = p.link || '';
        descIn.value = p.desc || '';
        idIn.value = id;
        label.innerText = "Edit Protocol";
    } else {
        titleIn.value = ''; linkIn.value = ''; descIn.value = ''; idIn.value = '';
        label.innerText = "New Protocol";
    }
    document.getElementById('projectModal').classList.remove('hidden');
}

function editProject(id) {
    openProjectModal(true, id);
}

function saveProject() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('pTitle').value;
    const link = document.getElementById('pLink').value;
    const desc = document.getElementById('pDesc').value;

    if (!title) return alert("Title required");

    if (id) {
        const p = projects.find(x => x.id === id);
        p.title = title; p.link = link; p.desc = desc;
    } else {
        projects.push({
            id: Math.random().toString(36).substr(2, 9),
            title, link, desc, section: 'ongoing'
        });
    }

    syncToCloud();
    closeModals();
    renderBoard();
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}