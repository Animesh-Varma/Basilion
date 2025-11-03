const header = document.getElementById('fullscreen-header');
const mainContent = document.getElementById('main-content');
let hasScrolled = false;
let touchStartY = 0;

function triggerScroll() {
    if (!hasScrolled) {
        hasScrolled = true;
        header.classList.add('shrink');
        document.body.style.overflowY = 'auto';

        setTimeout(() => {
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }
}

window.addEventListener('wheel', (event) => {
    if (event.deltaY > 0) {
        triggerScroll();
    }
});

window.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0].clientY;
});

window.addEventListener('touchmove', (event) => {
    const touchCurrentY = event.touches[0].clientY;
    if (touchStartY > touchCurrentY + 5) { // 5px threshold
        triggerScroll();
    }
});

window.addEventListener('scroll', () => {
    if (window.scrollY === 0 && hasScrolled) {
        hasScrolled = false;
        header.classList.remove('shrink');
        document.body.style.overflowY = 'hidden';
    }
});
