const slides = [...document.querySelectorAll(".slide")];
const counter = document.querySelector("#counter");
let index = 0;

function show(nextIndex) {
  index = (nextIndex + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
  counter.textContent = `${index + 1} / ${slides.length}`;
  document.title = `${slides[index].dataset.title} | Codex入門講座`;
}

document.querySelector("#prev").addEventListener("click", () => show(index - 1));
document.querySelector("#next").addEventListener("click", () => show(index + 1));

window.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    show(index + 1);
  }
  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    show(index - 1);
  }
  if (event.key === "Home") show(0);
  if (event.key === "End") show(slides.length - 1);
});

show(0);
