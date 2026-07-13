(function () {
  'use strict';

  /* ── Scroll Reveal (IntersectionObserver) ── */
  var revealObserver = null;

  function initRevealObserver() {
    if (revealObserver) return;
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('admin-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  function observeRevealElements(container) {
    initRevealObserver();
    var selectors = '.admin-reveal, .admin-reveal-left, .admin-reveal-right, .admin-reveal-scale, .admin-stagger-children';
    var els = container ? container.querySelectorAll(selectors) : document.querySelectorAll(selectors);
    els.forEach(function (el) {
      if (!el.classList.contains('admin-revealed')) {
        revealObserver.observe(el);
      }
    });
    // Also check the container itself if it matches
    if (container && container.matches && container.matches(selectors) && !container.classList.contains('admin-revealed')) {
      revealObserver.observe(container);
    }
  }

  /* ── Count-Up Animation ── */
  var countObserver = null;

  function initCountObserver() {
    if (countObserver) return;
    countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var target = parseInt(el.getAttribute('data-count-to'), 10);
            if (isNaN(target)) return;
            var suffix = el.getAttribute('data-count-suffix') || '';
            var prefix = el.getAttribute('data-count-prefix') || '';
            var duration = parseInt(el.getAttribute('data-count-duration') || '2000', 10);
            var startTime = performance.now();

            function countUp(now) {
              var elapsed = now - startTime;
              var progress = Math.min(elapsed / duration, 1);
              var eased = 1 - Math.pow(1 - progress, 3);
              var current = Math.floor(eased * target);
              el.textContent = prefix + current.toLocaleString() + suffix;
              if (progress < 1) {
                requestAnimationFrame(countUp);
              } else {
                el.textContent = prefix + target.toLocaleString() + suffix;
              }
            }

            requestAnimationFrame(countUp);
            countObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
  }

  function observeCountElements(container) {
    initCountObserver();
    var els = container ? container.querySelectorAll('[data-count-to]') : document.querySelectorAll('[data-count-to]');
    els.forEach(function (el) {
      countObserver.observe(el);
    });
    // Also check the container itself
    if (container && container.hasAttribute && container.hasAttribute('data-count-to')) {
      countObserver.observe(container);
    }
  }

  /* ── 3D Card Tilt (Event Delegation) ── */
  function init3DTilt(container) {
    var parent = container || document;
    parent.addEventListener('mousemove', function (e) {
      var card = e.target.closest('.admin-card-3d');
      if (!card) return;
      var inner = card.querySelector('.admin-card-3d-inner') || card;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = ((y - centerY) / centerY) * -6;
      var rotateY = ((x - centerX) / centerX) * 6;
      inner.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });

    parent.addEventListener('mouseleave', function (e) {
      var card = e.target.closest('.admin-card-3d');
      if (!card) return;
      var inner = card.querySelector('.admin-card-3d-inner') || card;
      inner.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  }

  /* ── Mouse Parallax on Background ── */
  function initMouseParallax() {
    var bgImg = document.querySelector('.admin-bg-img');
    if (!bgImg) return;

    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 2;
      var y = (e.clientY / window.innerHeight - 0.5) * 2;
      bgImg.style.transform = 'scale(1.04) translate(' + (x * -6) + 'px, ' + (y * -6) + 'px)';
    });
  }

  /* ── Shimmer Activation ── */
  function initShimmerButtons(container) {
    var btns = container ? container.querySelectorAll('.admin-shimmer') : document.querySelectorAll('.admin-shimmer');
    btns.forEach(function (btn) { btn.classList.add('admin-shimmer'); });
  }

  /* ── Run all animations on a container (for dynamic content) ── */
  function runAnimations(container) {
    observeRevealElements(container);
    observeCountElements(container);
    initShimmerButtons(container);
  }

  /* ── MutationObserver to detect dynamically rendered content ── */
  var pageContent = document.querySelector('[data-page-content]');
  var mutationObserver = null;

  function initMutationObserver() {
    if (mutationObserver || !pageContent) return;

    mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              runAnimations(node);
            }
          });
        }
      });
    });

    mutationObserver.observe(pageContent, {
      childList: true,
      subtree: true,
    });
  }

  /* ── Manual init for initial page load ── */
  function initialPageLoad() {
    runAnimations(document);
    init3DTilt(document);
    initMouseParallax();
    initMutationObserver();
  }

  /* ── Listen for page-ready events ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialPageLoad);
  } else {
    initialPageLoad();
  }

  /* ── Re-run when ia:user-ready fires (auth-guard finished) ── */
  document.addEventListener('ia:user-ready', function () {
    setTimeout(function () {
      runAnimations(document);
    }, 300);
  });

  console.log('🏛 BTU Admin Premium Animations active');
})();
