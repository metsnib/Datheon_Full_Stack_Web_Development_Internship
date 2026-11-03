/**
 * Metsnanat Berhanu - Personal Portfolio Website
 * Vanilla JavaScript: Theme Management, Scroll Reveal, Mobile Menu,
 * Scrollspy, Clipboard Utility, and Interactive Form
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollReveal();
  initNavigation();
  initBackToTop();
  initEmailCopy();
  initContactForm();
});

/* --------------------------------------------------------------------------
   1. Theme Management (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const html = document.documentElement;

  // Retrieve stored theme or default to 'dark'
  const storedTheme = localStorage.getItem('portfolio-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  if (storedTheme === 'light' || (!storedTheme && prefersLight && false)) {
    // We default to modern dark navy as requested, but if explicitly set to light we respect it
    setTheme('light');
  } else {
    setTheme('dark');
  }

  function setTheme(theme) {
    if (theme === 'light') {
      html.classList.add('light');
      localStorage.setItem('portfolio-theme', 'light');
      updateThemeIcons('light');
    } else {
      html.classList.remove('light');
      localStorage.setItem('portfolio-theme', 'dark');
      updateThemeIcons('dark');
    }
  }

  function updateThemeIcons(theme) {
    themeToggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        if (theme === 'light') {
          icon.className = 'fa-solid fa-moon text-blue-600 text-lg';
          btn.setAttribute('aria-label', 'Switch to dark theme');
        } else {
          icon.className = 'fa-solid fa-sun text-amber-400 text-lg';
          btn.setAttribute('aria-label', 'Switch to light theme');
        }
      }
    });
  }

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isCurrentlyLight = html.classList.contains('light');
      setTheme(isCurrentlyLight ? 'dark' : 'light');
      showToast(isCurrentlyLight ? 'Dark mode enabled' : 'Light mode enabled', 'fa-solid fa-circle-half-stroke');
    });
  });
}

/* --------------------------------------------------------------------------
   2. Scroll Reveal Animations (Intersection Observer)
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('active'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.12
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Unobserve after revealing once for smooth performance
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
}

/* --------------------------------------------------------------------------
   3. Navigation, Mobile Menu, and Scrollspy
   -------------------------------------------------------------------------- */
function initNavigation() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const sections = document.querySelectorAll('section[id]');
  const navbar = document.getElementById('main-navbar');

  // Toggle Mobile Menu
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target) && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  function openMobileMenu() {
    mobileMenu.classList.add('open');
    hamburgerBtn.classList.add('is-active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    hamburgerBtn.classList.remove('is-active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  // Scrollspy & Nav Shadow
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    // Navbar shadow on scroll
    if (navbar) {
      if (scrollY > 30) {
        navbar.classList.add('shadow-lg', 'shadow-black/20');
      } else {
        navbar.classList.remove('shadow-lg', 'shadow-black/20');
      }
    }

    // Determine current section in view
    let currentId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 140;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (currentId && link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   4. Back To Top Floating Button
   -------------------------------------------------------------------------- */
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 450) {
      backToTopBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      backToTopBtn.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
    } else {
      backToTopBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      backToTopBtn.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    }
  }, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* --------------------------------------------------------------------------
   5. Email Copy to Clipboard & Toast
   -------------------------------------------------------------------------- */
function initEmailCopy() {
  const copyEmailBtns = document.querySelectorAll('.copy-email-btn');
  const email = 'metsnib@gmail.com';

  copyEmailBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
        } else {
          // Fallback
          const textArea = document.createElement('textarea');
          textArea.value = email;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        showToast('Email copied to clipboard: ' + email, 'fa-solid fa-check-circle text-emerald-400');
      } catch (err) {
        showToast('Direct email: ' + email, 'fa-solid fa-envelope text-sky-400');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   6. Interactive Contact Form
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const subjectInput = document.getElementById('form-subject');
    const messageInput = document.getElementById('form-message');

    const name = nameInput ? nameInput.value.trim() : '';
    const senderEmail = emailInput ? emailInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : 'Portfolio Contact from ' + name;
    const message = messageInput ? messageInput.value.trim() : '';

    if (!name || !senderEmail || !message) {
      showToast('Please fill in all required fields.', 'fa-solid fa-triangle-exclamation text-amber-400');
      return;
    }

    // Construct mailto link so user's native email client opens with the prefilled message
    const mailtoUrl = `mailto:metsnib@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `Hi Metsnanat,\n\nName: ${name}\nEmail: ${senderEmail}\n\nMessage:\n${message}`
    )}`;

    // Open mail client
    window.location.href = mailtoUrl;

    showToast('Opening your email client to send message...', 'fa-solid fa-paper-plane text-sky-400');
    form.reset();
  });
}

/* --------------------------------------------------------------------------
   7. Reusable Toast Notification System
   -------------------------------------------------------------------------- */
let toastTimeout;
function showToast(message, iconClass = 'fa-solid fa-info-circle text-sky-400') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // Clear previous timer if active
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.innerHTML = `
    <i class="${iconClass} text-lg"></i>
    <span>${message}</span>
  `;

  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
