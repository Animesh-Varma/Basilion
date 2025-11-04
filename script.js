const header = document.getElementById('fullscreen-header');
let isShrunk = false;

window.addEventListener('scroll', () => {
    if (window.scrollY > 0 && !isShrunk) {
        header.classList.add('shrink');
        isShrunk = true;
    } else if (window.scrollY === 0 && isShrunk) {
        header.classList.remove('shrink');
        isShrunk = false;
    }
});
