// Main app script for Restroom Flow

(function () {
  const fadeDurationMs = 400;

  function fadeIn() {
    document.body.classList.add('visible');
  }

  function fadeOutAndNavigate(url) {
    document.body.classList.remove('visible');
    setTimeout(() => {
      window.location.href = url;
    }, fadeDurationMs);
  }

  function setupLinkTransitions() {
    document.querySelectorAll('a.link[href]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        fadeOutAndNavigate(link.href);
      });
    });
  }

  function initButter() {
    if (window.butter && typeof window.butter.init === 'function') {
      window.butter.init({
        cancelOnTouch: true,
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initButter();
    fadeIn();
    setupLinkTransitions();
  });
})();
