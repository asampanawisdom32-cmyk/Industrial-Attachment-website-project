(function () {
  'use strict';

  /* ── Typewriter Effect on Brand Panel Heading ── */
  const typewriterTarget = document.querySelector('.auth-typewriter-text');
  if (typewriterTarget) {
    const words = JSON.parse(typewriterTarget.getAttribute('data-words') || '["internship journey","attachment tracking","career growth"]');
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let currentText = '';

    function typeTick() {
      const fullWord = words[wordIndex];
      if (isDeleting) {
        currentText = fullWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        currentText = fullWord.substring(0, charIndex + 1);
        charIndex++;
      }

      typewriterTarget.textContent = currentText;

      if (!isDeleting && charIndex === fullWord.length) {
        isDeleting = true;
        setTimeout(typeTick, 2000);
        return;
      }

      if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(typeTick, 500);
        return;
      }

      const delay = isDeleting ? 40 : 80;
      setTimeout(typeTick, delay);
    }

    typeTick();
  }

  /* ── Auto-Rotate Feature Highlights ── */
  const featureItems = document.querySelectorAll('.login-feature');
  if (featureItems.length > 0) {
    let currentFeatureIndex = 0;
    let rotateInterval;

    function highlightFeature(index) {
      featureItems.forEach((item, i) => {
        item.classList.toggle('auth-highlight', i === index);
      });
    }

    function startFeatureRotation() {
      highlightFeature(0);
      rotateInterval = setInterval(function () {
        currentFeatureIndex = (currentFeatureIndex + 1) % featureItems.length;
        highlightFeature(currentFeatureIndex);
      }, 2500);
    }

    startFeatureRotation();

    featureItems.forEach(function (item, index) {
      item.addEventListener('mouseenter', function () {
        clearInterval(rotateInterval);
        highlightFeature(index);
        currentFeatureIndex = index;
      });
      item.addEventListener('mouseleave', function () {
        rotateInterval = setInterval(function () {
          currentFeatureIndex = (currentFeatureIndex + 1) % featureItems.length;
          highlightFeature(currentFeatureIndex);
        }, 2500);
      });
    });
  }

  /* ── 3D Tilt on Login Wrapper ── */
  const wrapper = document.querySelector('.login-wrapper');
  if (wrapper) {
    wrapper.classList.add('auth-3d');
    var inner = wrapper.querySelector('.login-wrapper-inner');

    wrapper.addEventListener('mousemove', function (e) {
      if (!inner) inner = wrapper.querySelector('.login-wrapper-inner') || wrapper;
      var rect = wrapper.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = ((y - centerY) / centerY) * -4;
      var rotateY = ((x - centerX) / centerX) * 4;
      inner.style.transform = 'perspective(1200px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });

    wrapper.addEventListener('mouseleave', function () {
      if (!inner) inner = wrapper.querySelector('.login-wrapper-inner') || wrapper;
      inner.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)';
    });
  }

  /* ── Scroll Reveal ── */
  var revealEls = document.querySelectorAll('.auth-reveal');
  if (revealEls.length > 0) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('auth-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ── Mouse Parallax on Background ── */
  var authBgImg = document.querySelector('.auth-bg-img');
  if (authBgImg) {
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 2;
      var y = (e.clientY / window.innerHeight - 0.5) * 2;
      authBgImg.style.transform = 'scale(1.05) translate(' + (x * -6) + 'px, ' + (y * -6) + 'px)';
    });
  }

  /* ── Input Auto-Focus Animation ── */
  var firstInput = document.querySelector('.premium-input-wrap input, .premium-input-wrap select');
  if (firstInput) {
    setTimeout(function () {
      firstInput.focus({ preventScroll: true });
    }, 1000);
  }

  /* ── Form Submit Button Shimmer ── */
  var submitBtn = document.querySelector('.btn-login[type="submit"]');
  if (submitBtn) {
    submitBtn.classList.add('auth-shimmer');
  }

  console.log('🔐 BTU Auth Premium Animations & Automation active');
})();
