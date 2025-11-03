const header = document.getElementById('fullscreen-header');
const mainContent = document.getElementById('main-content');
let hasScrolled = false;

window.addEventListener('wheel', (event) => {
    if (event.deltaY > 0 && !hasScrolled) {
        hasScrolled = true;
        header.classList.add('shrink');
        document.body.style.overflowY = 'auto';

        // Wait for the header animation to finish before scrolling
        setTimeout(() => {
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }, 500); // 500ms is the duration of the CSS transition
    }
});