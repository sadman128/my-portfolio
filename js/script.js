'use strict';

// ============================================================
// THEME TOGGLE
// ============================================================
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-theme', next);
  localStorage.setItem('portfolio-theme', next);
});

// ============================================================
// SIDEBAR TOGGLE (Profile Pic, Close Button & Overlay)
// ============================================================
const sidebar = document.querySelector('[data-sidebar]');
const avatarBtn = document.querySelector('[data-avatar-btn]');
const sidebarBtn = document.querySelector('[data-sidebar-btn]');
const sidebarCloseBtn = document.querySelector('[data-sidebar-close]');
const sidebarOverlay = document.querySelector('[data-sidebar-overlay]');

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('active');
  document.body.classList.remove('sidebar-open');
  if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'false');
  if (sidebarBtn) {
    const span = sidebarBtn.querySelector('span');
    if (span) span.textContent = 'Show Contacts';
  }
}

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('active');
  document.body.classList.add('sidebar-open');
  if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'true');
  if (sidebarBtn) {
    const span = sidebarBtn.querySelector('span');
    if (span) span.textContent = 'Hide Contacts';
  }
}

function toggleSidebar() {
  if (!sidebar) return;
  if (sidebar.classList.contains('active')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

if (avatarBtn) {
  avatarBtn.addEventListener('click', toggleSidebar);
  avatarBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSidebar();
    }
  });
}

if (sidebarBtn) {
  sidebarBtn.addEventListener('click', toggleSidebar);
}

if (sidebarCloseBtn) {
  sidebarCloseBtn.addEventListener('click', closeSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
  if (sidebar && sidebar.classList.contains('active')) {
    const isMobile = window.matchMedia('(max-aspect-ratio: 1/1), (max-width: 900px)').matches;
    if (isMobile && !sidebar.contains(e.target) && !e.target.closest('[data-avatar-btn]')) {
      closeSidebar();
    }
  }
});

// ============================================================
// PAGE NAVIGATION
// ============================================================
const navigationLinks = document.querySelectorAll('[data-nav-link]');
const pages = document.querySelectorAll('[data-page]');

navigationLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const targetPage = link.textContent.trim().toLowerCase();
    pages.forEach(page => {
      if (page.dataset.page === targetPage) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
    navigationLinks.forEach(nl => nl.classList.remove('active'));
    link.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ============================================================
// PORTFOLIO FILTER
// ============================================================
const selectBox = document.querySelector('[data-select]');
const selectItems = document.querySelectorAll('[data-select-item]');
const selectValueEl = document.querySelector('[data-select-value]');
const filterBtns = document.querySelectorAll('[data-filter-btn]');

if (selectBox) {
  selectBox.addEventListener('click', () => selectBox.classList.toggle('active'));
}

let currentFilter = 'all';

function applyFilter(value) {
  currentFilter = value.toLowerCase().trim();
  const items = document.querySelectorAll('[data-filter-item]');
  items.forEach(item => {
    if (currentFilter === 'all') {
      // "All" tab: locked repos always visible + any repo with ≥1 star
      const isLocked = item.dataset.locked === 'true';
      const stars    = parseInt(item.dataset.stars || '0', 10);
      item.classList.toggle('active', isLocked || stars >= 1);
    } else {
      // Category tabs: show every repo in that category (regardless of stars)
      const cat = (item.dataset.category || '').toLowerCase().trim();
      item.classList.toggle('active', cat === currentFilter);
    }
  });
  const emptyEl = document.getElementById('portfolio-empty');
  if (emptyEl) {
    const anyVisible = [...items].some(it => it.classList.contains('active'));
    emptyEl.style.display = anyVisible ? 'none' : 'flex';
  }
}

if (selectItems) {
  selectItems.forEach(item => {
    item.addEventListener('click', () => {
      const val = item.textContent.trim();
      if (selectValueEl) selectValueEl.textContent = val;
      if (selectBox) selectBox.classList.remove('active');
      applyFilter(val);
    });
  });
}

let lastFilterBtn = filterBtns[0];
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.textContent.trim();
    if (selectValueEl) selectValueEl.textContent = val;
    applyFilter(val);
    if (lastFilterBtn) lastFilterBtn.classList.remove('active');
    btn.classList.add('active');
    lastFilterBtn = btn;
  });
});

// ============================================================
// CONTACT FORM — Discord Webhook
// ============================================================
const form = document.querySelector('[data-form]');
const formInputs = document.querySelectorAll('[data-form-input]');
const formBtn = document.querySelector('[data-form-btn]');
const formStatus = document.getElementById('form-status');

function showFormStatus(msg, type) {
  if (!formStatus) return;
  formStatus.textContent = msg;
  formStatus.className = 'form-status ' + type;
  formStatus.style.display = 'block';
  setTimeout(() => {
    if (formStatus) formStatus.style.display = 'none';
  }, 5000);
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullnameInput = form.querySelector('[name="fullname"]');
    const emailInput = form.querySelector('[name="email"]');
    const messageInput = form.querySelector('[name="message"]');

    const fullname = fullnameInput ? fullnameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!fullname || !email || !message) {
      showFormStatus('Please fill in all fields.', 'error');
      if (!fullname && fullnameInput) fullnameInput.focus();
      else if (!email && emailInput) emailInput.focus();
      else if (!message && messageInput) messageInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFormStatus('Please enter a valid email address.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    let webhookUrl = '';
    if (typeof CONFIG !== 'undefined' && CONFIG.DISCORD_WEBHOOK_URL) {
      webhookUrl = CONFIG.DISCORD_WEBHOOK_URL.trim();
    }
    if (!webhookUrl) {
      const stored = localStorage.getItem('portfolio_discord_webhook');
      if (stored) webhookUrl = stored.trim();
    }

    const btnSpan = formBtn ? formBtn.querySelector('span') : null;
    const origText = btnSpan ? btnSpan.textContent : 'Send Message';
    if (formBtn) formBtn.setAttribute('disabled', '');
    if (btnSpan) btnSpan.textContent = 'Sending...';

    if (webhookUrl && webhookUrl.startsWith('http')) {
      const payload = {
        username: 'Portfolio Contact Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        embeds: [{
          title: '📬 New Contact Message Received!',
          color: 0x5865f2,
          fields: [
            { name: '👤 Sender Name', value: fullname, inline: true },
            { name: '📧 Sender Email', value: email, inline: true },
            { name: '💬 Message', value: message }
          ],
          footer: { text: 'Sadman Hossain Sajid — Portfolio' },
          timestamp: new Date().toISOString()
        }]
      };

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showFormStatus('Message sent successfully!', 'success');
          form.reset();
        } else {
          console.warn('Discord webhook status:', res.status);
          throw new Error('Webhook error ' + res.status);
        }
      } catch (err) {
        console.warn('Webhook delivery error:', err);
        showFormStatus('Message send failed', 'error');
      } finally {
        if (formBtn) formBtn.removeAttribute('disabled');
        if (btnSpan) btnSpan.textContent = origText;
      }
    } else {
      // No webhook configured
      showFormStatus('Message send failed', 'error');
      if (formBtn) formBtn.removeAttribute('disabled');
      if (btnSpan) btnSpan.textContent = origText;
    }
  });
}

// ============================================================
// CLOSE DROPDOWN ON OUTSIDE CLICK
// ============================================================
document.addEventListener('click', (e) => {
  if (selectBox && !selectBox.contains(e.target)) {
    selectBox.classList.remove('active');
  }
});

// ============================================================
// SKILL BAR ANIMATION (Intersection Observer)
// ============================================================
function animateSkillBars() {
  const fills = document.querySelectorAll('.skill-progress-fill');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const width = fill.style.width;
        fill.style.width = '0%';
        setTimeout(() => { fill.style.width = width; }, 100);
        observer.unobserve(fill);
      }
    });
  }, { threshold: 0.3 });
  fills.forEach(f => observer.observe(f));
}
animateSkillBars();
