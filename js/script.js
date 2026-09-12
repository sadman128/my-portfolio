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
// SIDEBAR TOGGLE
// ============================================================
const sidebar = document.querySelector('[data-sidebar]');
const sidebarBtn = document.querySelector('[data-sidebar-btn]');

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    const span = sidebarBtn.querySelector('span');
    if (span) {
      span.textContent = sidebar.classList.contains('active') ? 'Hide Contacts' : 'Show Contacts';
    }
  });
}

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
      item.classList.add('active');
    } else {
      const cats = (item.dataset.category || '').toLowerCase().trim().split(/\s+/);
      item.classList.toggle('active', cats.includes(currentFilter));
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
