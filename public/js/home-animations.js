(function () {
  'use strict';

  /* ── Reading Progress Bar ── */
  const progressBar = document.createElement('div');
  progressBar.className = 'auto-progress';
  document.body.prepend(progressBar);

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }
  window.addEventListener('scroll', updateProgress);

  /* ── Scroll Reveal (Intersection Observer) ── */
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  /* ── Navbar Scroll Effect ── */
  const nav = document.querySelector('.home-nav');
  let lastScroll = 0;

  function handleNavScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });

  /* ── Typewriter Effect ── */
  const typewriterTarget = document.querySelector('.typewriter-text');
  if (typewriterTarget) {
    var words;
    try { words = JSON.parse(typewriterTarget.getAttribute('data-words')); } catch (_) {}
    if (!words || !Array.isArray(words) || words.length === 0) words = ['Industrial Attachment'];
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
  const featureCards = document.querySelectorAll('.home-feature-card');
  if (featureCards.length > 0) {
    let currentFeatureIndex = 0;
    let rotateInterval;

    function highlightFeature(index) {
      featureCards.forEach((card, i) => {
        card.classList.toggle('active', i === index);
      });
    }

    function startFeatureRotation() {
      highlightFeature(0);
      rotateInterval = setInterval(() => {
        currentFeatureIndex = (currentFeatureIndex + 1) % featureCards.length;
        highlightFeature(currentFeatureIndex);
      }, 3000);
    }

    startFeatureRotation();

    featureCards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        clearInterval(rotateInterval);
        highlightFeature(index);
        currentFeatureIndex = index;
      });
      card.addEventListener('mouseleave', () => {
        rotateInterval = setInterval(() => {
          currentFeatureIndex = (currentFeatureIndex + 1) % featureCards.length;
          highlightFeature(currentFeatureIndex);
        }, 3000);
      });
    });
  }

  /* ── Count-Up Animation ── */
  const countUpElements = document.querySelectorAll('[data-count-to]');
  if (countUpElements.length > 0) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-count-to'), 10);
            const suffix = el.getAttribute('data-count-suffix') || '';
            const prefix = el.getAttribute('data-count-prefix') || '';
            const duration = parseInt(el.getAttribute('data-count-duration') || '2000', 10);
            let start = 0;
            const startTime = performance.now();

            function countUp(now) {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.floor(eased * target);
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

    countUpElements.forEach((el) => countObserver.observe(el));
  }

  /* ── 3D Card Tilt ── */
  const tiltCards = document.querySelectorAll('.card-3d');
  tiltCards.forEach((card) => {
    const inner = card.querySelector('.card-3d-inner') || card;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      inner.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  });

  /* ── Mouse Parallax on Background ── */
  const bgImg = document.querySelector('.home-bg-img');
  if (bgImg) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      bgImg.style.transform = `scale(1.05) translate(${x * -8}px, ${y * -8}px)`;
    });
  }

  /* ── Smooth Anchor Scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Hero Parallax on Scroll ── */
  const heroSection = document.querySelector('.home-hero');
  if (heroSection && bgImg) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroHeight = heroSection.offsetHeight;
      if (scrollY <= heroHeight) {
        const translateY = scrollY * 0.3;
        bgImg.style.transform = `scale(1.08) translateY(${translateY * 0.15}px)`;
      }
    }, { passive: true });
  }

  console.log('🏫 BTU Premium Animations & Automation active');
})();
