window.addEventListener("scroll", () => {
  const offset = window.scrollY * 0.15;
  document.documentElement.style.setProperty("--parallax", `${offset}px`);
});
