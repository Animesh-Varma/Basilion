// --- Configuration & State ---
const SECTIONS = ['ongoing', 'planned', 'onhold', 'completed', 'scrapped'];
let isAuthenticated = false;

// Fake data for first load
const DEFAULT_DATA = [
    { id: '1', title: 'Lab Portfolio', link: 'https://lab.animeshvarma.dev', desc: 'The interface you are currently looking at.', section: 'ongoing' },
    { id: '2', title: 'Upload Service', link: 'https://upload.animeshvarma.dev', desc: 'Secure file transmission protocol.', section: 'completed' }
];

// Load from LocalStorage or use Default
let projects = JSON.parse(localStorage.getItem('lab_projects')) || DEFAULT_DATA;

// --- DOM Elements ---
const authModal = document.getElementById('authModal');
const projectModal = document.getElementById('projectModal');
const adminControls = document.getElementById('adminControls');
const systemStatus = document.getElementById('systemStatus');
const liveDot = document.querySelector('.live-dot');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderBoard();
    initDragAndDrop();

    // Check if previously logged in (optional session persistence)
    if(sessionStorage.getItem('lab_auth') === 'true') {
        enableAdminMode();
    }
});

// --- Rendering ---
function renderBoard() {
    // Clear columns
    SECTIONS.forEach(sec => document.getElementById(sec).innerHTML = '');

    projects.forEach(p => {
        const card = createCard(p);
        const container = document.getElementById(p.section);
        if(container) container.appendChild(card);
    });
}

function createCard(project) {
    const div = document.createElement('div');
    div.className = 'project-card';
    div.setAttribute('data-id', project.id);

    // Edit Button (Only visible if auth)
    const editBtn = isAuthenticated
        ? `<button class="card-edit-btn material-symbols-rounded" onclick="editProject(event, '${project.id}')">edit</button>`
        : '';

    const linkIcon = project.link ? '<span class="material-symbols-rounded card-link-icon">link</span>' : '';

    div.innerHTML = `
        ${editBtn}
        <span class="card-title">${project.title} ${linkIcon}</span>
        <div class="card-desc">${project.desc || 'No description available.'}</div>
    `;

    // Click event to open link (unless clicking edit)
    div.addEventListener('click', (e) => {
        if(e.target.tagName !== 'BUTTON' && project.link) {
            window.open(project.link, '_blank');
        }
    });

    return div;
}

// --- Drag & Drop (SortableJS) ---
function initDragAndDrop() {
    SECTIONS.forEach(secId => {
        new Sortable(document.getElementById(secId), {
            group: 'shared', // Allow dragging between lists
            animation: 150,
            disabled: !isAuthenticated, // Disable if not admin
            ghostClass: 'sortable-ghost',
            delay: 100, // Slight delay to prevent accidental drags on touch
            delayOnTouchOnly: true,
            onEnd: function (evt) {
                updateProjectStatus(evt.item.getAttribute('data-id'), evt.to.id);
            }
        });
    });
}

function updateProjectStatus(id, newSection) {
    const p = projects.find(x => x.id === id);
    if (p) {
        p.section = newSection;
        saveData();
    }
}

// --- Authentication ---
document.getElementById('authLink').addEventListener('click', (e) => {
    e.preventDefault();
    if(isAuthenticated) return;
    authModal.classList.remove('hidden');
});

function authenticate() {
    const input = document.getElementById('adminPassword');
    // Simple client-side check. Replace with real backend auth if needed.
    if(input.value === 'admin123') { // CHANGE THIS PASSWORD
        enableAdminMode();
        closeModals();
        input.value = '';
    } else {
        alert('ACCESS DENIED');
        input.classList.add('error');
    }
}

function enableAdminMode() {
    isAuthenticated = true;
    sessionStorage.setItem('lab_auth', 'true');

    document.body.classList.add('admin-view');
    adminControls.classList.remove('hidden');

    systemStatus.innerText = "ADMINISTRATOR";
    systemStatus.style.color = "#FFFFFF";
    liveDot.style.backgroundColor = "#00FF00"; // Green for admin
    liveDot.style.boxShadow = "0 0 8px #00FF00";

    // Re-init sortable to enable dragging
    initDragAndDrop();
    renderBoard(); // Re-render to show edit buttons
}

function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem('lab_auth');
    location.reload();
}

// --- Project Management ---

function openProjectModal(isEdit = false, id = null) {
    const titleInput = document.getElementById('pTitle');
    const linkInput = document.getElementById('pLink');
    const descInput = document.getElementById('pDesc');
    const idInput = document.getElementById('editId');
    const label = document.getElementById('modalTitle');

    if (isEdit && id) {
        const p = projects.find(x => x.id === id);
        titleInput.value = p.title;
        linkInput.value = p.link || '';
        descInput.value = p.desc || '';
        idInput.value = id;
        label.innerText = "Edit Protocol";

        // Add delete button logic if needed
    } else {
        titleInput.value = '';
        linkInput.value = '';
        descInput.value = '';
        idInput.value = '';
        label.innerText = "New Protocol";
    }

    projectModal.classList.remove('hidden');
}

function editProject(e, id) {
    e.stopPropagation();
    openProjectModal(true, id);
}

function saveProject() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('pTitle').value;
    const link = document.getElementById('pLink').value;
    const desc = document.getElementById('pDesc').value;

    if(!title) return alert("Title required");

    if (id) {
        // Update existing
        const p = projects.find(x => x.id === id);
        p.title = title;
        p.link = link;
        p.desc = desc;
    } else {
        // Create new
        projects.push({
            id: Math.random().toString(36).substr(2, 9),
            title: title,
            link: link,
            desc: desc,
            section: 'ongoing' // Default section
        });
    }

    saveData();
    closeModals();
    renderBoard();
}

// --- Utilities ---
function closeModals() {
    authModal.classList.add('hidden');
    projectModal.classList.add('hidden');
}

function saveData() {
    localStorage.setItem('lab_projects', JSON.stringify(projects));
    // Here you would add: fetch('YOUR_GOOGLE_SCRIPT_URL', { method: 'POST', body: ... })
}