document.documentElement.classList.add("js");

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const profileImage = document.getElementById("profile-image");
if (profileImage) {
  const showFallback = () => profileImage.classList.add("is-missing");

  if (profileImage.complete && profileImage.naturalWidth === 0) {
    showFallback();
  }

  profileImage.addEventListener("error", showFallback, { once: true });
}

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}
