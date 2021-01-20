let scrollToTopBtn = document.querySelector(".scrollToTopBtn");
let rootElement = document.documentElement;

function handleScroll() {
    // Do something on scroll
    let scrollTotal = rootElement.scrollHeight - rootElement.clientHeight;
    if ((rootElement.scrollTop / scrollTotal ) > 0.75) {
        // Show button
        scrollToTopBtn.classList.add("showBtn");
    } else {
        // Hide button
        scrollToTopBtn.classList.remove("showBtn");
    }
}

function scrollToTop() {
    // Scroll to top logic
    rootElement.scrollTo({
        top: 0,
        behavior: "smooth"
    })
}
scrollToTopBtn.addEventListener("click", scrollToTop);
document.addEventListener("scroll", handleScroll);