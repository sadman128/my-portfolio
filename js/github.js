'use strict';

const GH_USERNAME = (typeof CONFIG !== 'undefined') ? CONFIG.GITHUB_USERNAME : 'sadman128';
const GH_TOKEN    = (typeof CONFIG !== 'undefined') ? CONFIG.GITHUB_TOKEN    : '';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LANG_COLORS = {
  JavaScript:'#f7df1e', TypeScript:'#3178c6', Java:'#b07219',
  Python:'#3572A5', HTML:'#e34c26', CSS:'#563d7c', Shell:'#89e051',
  Kotlin:'#A97BFF', 'C++':'#f34b7d', C:'#555555', Go:'#00ADD8',
  Rust:'#dea584', PHP:'#4F5D95', Ruby:'#701516', Swift:'#F05138',
  Lua:'#000080', Dockerfile:'#384d54', default:'#8b949e'
};
const getLangColor = lang => LANG_COLORS[lang] || LANG_COLORS.default;

// Curated per-repo — exact repo names as keys.
// Images: static hosted screenshots. Descs: handwritten (API descriptions are commit messages).
const CURATED = {
  'fraudscore-web-app':        { img: 'https://github.com/user-attachments/assets/37ae0abe-b107-45ac-af63-ffc98fa159ca',  desc: 'Real-time fraud scoring web app built with React.js and Tailwind CSS for evaluating transaction risks.' },
  'notepad-gg':                { img: 'https://github.com/user-attachments/assets/7ebc4ece-ad8e-4a0c-b9b4-287b62c3bcfe',  desc: 'Modern desktop text editor built with Electron featuring dual-column reading mode for long documents.' },
  'library-management-system': { img: null, desc: 'Comprehensive library management system with book cataloging, circulation tracking, and member administration.' },
  'aether-archive':            { img: 'https://raw.githubusercontent.com/sadman128/aether-archive/main/images/img.png',   desc: 'Full-stack luxury e-commerce platform with product catalog, cart, checkout, and admin analytics.' },
  'game-stat-bot':             { img: 'https://github.com/user-attachments/assets/2545cb3b-f81f-4333-ad78-7596ad0a91af', desc: 'Automated Discord stats bot for gamers deployed on AWS EC2 with PM2 and third-party game API integration.' },
  'fraudscore-back':           { img: null, desc: 'Spring Boot backend with JWT authentication and RESTful APIs for fraud pattern scoring.' },
  'fraudscore-ai':             { img: null, desc: 'Machine learning pipeline in Python for real-time transaction risk scoring and anomaly detection.' },
  'Task-Manager':              { img: 'https://github.com/user-attachments/assets/310c162b-9ca0-4b66-b498-a09de2c9be3b', desc: 'Task and project tracking system built with Spring Boot, REST APIs, and database persistence.' },
  'qb_cargodelivery':          { img: null, desc: 'Cargo delivery and logistics gameplay script built in Lua for FiveM and QBCore framework.' },
  'final-ar-glass':            { img: null, desc: 'Augmented reality web app for virtual glasses fitting using real-time computer vision tracking.' },
  'digital-appointment-system':{ img: null, desc: 'Patient appointment scheduling and healthcare management system with automated confirmations.' },
  'stable-diffusion-training': { img: null, desc: 'Jupyter notebooks and training pipeline for fine-tuning Stable Diffusion models on custom image datasets.' },
  'leetcode-solve':            { img: null, desc: 'Optimized data structures and algorithmic solutions in Python for competitive programming.' },
  'unix-learner-website':      { img: null, desc: 'Interactive cheat-sheet guide for mastering Unix command-line utilities and shell scripting.' }
};

// ── GraphQL fetch ──────────────────────────────────────────────────────────────
async function gql(query) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  return res.json();
}

// ── Repos ──────────────────────────────────────────────────────────────────────
async function fetchRepos() {
  const data = await gql(`{
    user(login:"${GH_USERNAME}") {
      repositories(first:100, privacy:PUBLIC, isFork:false, ownerAffiliations:[OWNER], orderBy:{field:CREATED_AT,direction:DESC}) {
        nodes {
          name
          stargazerCount
          createdAt
          description
          url
          forkCount
          primaryLanguage { name }
          defaultBranchRef { name }
        }
      }
    }
  }`);
  return data.data.user.repositories.nodes;
}

// ── Contributions ──────────────────────────────────────────────────────────────
async function fetchContributions() {
  const data = await gql(`{
    user(login:"${GH_USERNAME}") {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`);
  return data.data.user.contributionsCollection.contributionCalendar;
}

// ── Contribution heatmap ───────────────────────────────────────────────────────
// Use local date to avoid UTC offset shifting today's cell to yesterday
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderHeatmap(calendar) {
  const container = document.getElementById('contribution-graph');
  if (!container) return;

  const today    = new Date();
  const todayStr = localDateStr(today);
  const sunday   = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const start    = new Date(sunday);
  start.setDate(sunday.getDate() - 52 * 7);

  // Build date→count map from API
  const counts = new Map();
  calendar.weeks.forEach(w => w.contributionDays.forEach(d => counts.set(d.date, d.contributionCount)));

  // Build 53-week grid
  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt  = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const str = localDateStr(dt);
      const n   = str > todayStr ? 0 : (counts.get(str) || 0);
      const lvl = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : 4;
      week.push({ date: str, count: n, level: lvl, future: str > todayStr });
    }
    weeks.push(week);
  }

  // Month labels
  const monthLabels = [];
  let lastM = -1;
  weeks.forEach((wk, wi) => {
    const m = new Date(wk[0].date).getMonth();
    if (m !== lastM) {
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || wi - prev.wi >= 2) { monthLabels.push({ wi, name: MONTH_NAMES[m], x: 36 + wi * 15 }); }
      lastM = m;
    }
  });

  const W = 36 + 53 * 15 + 10;
  let svg = `<svg class="gh-contrib-svg" viewBox="0 0 ${W} 134" width="100%" height="auto" preserveAspectRatio="xMinYMin meet">`;
  monthLabels.forEach(ml => { svg += `<text x="${ml.x}" y="13" class="gh-svg-month">${ml.name}</text>`; });
  svg += `<text x="28" y="49"  class="gh-svg-wday" text-anchor="end">Mon</text>
          <text x="28" y="79"  class="gh-svg-wday" text-anchor="end">Wed</text>
          <text x="28" y="109" class="gh-svg-wday" text-anchor="end">Fri</text>`;

  weeks.forEach((wk, wi) => wk.forEach((day, di) => {
    if (day.future) return;
    const label = day.count === 0
      ? `No contributions on ${new Date(day.date + 'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`
      : `${day.count} contribution${day.count !== 1 ? 's' : ''} on ${new Date(day.date + 'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;
    svg += `<rect x="${36 + wi * 15}" y="${24 + di * 15}" width="12" height="12" rx="2.5" ry="2.5" class="gh-svg-cell" data-level="${day.level}"><title>${label}</title></rect>`;
  }));

  svg += '</svg>';
  container.innerHTML = `<div class="gh-svg-wrapper">${svg}</div>`;

  // Streak
  let streak = 0;
  let chk = new Date(today);
  let cs  = chk.toISOString().split('T')[0];
  if (!counts.get(cs)) { chk.setDate(chk.getDate() - 1); cs = chk.toISOString().split('T')[0]; }
  while (counts.get(cs)) { streak++; chk.setDate(chk.getDate() - 1); cs = chk.toISOString().split('T')[0]; }

  const el = id => document.getElementById(id);
  if (el('gh-commits')) el('gh-commits').textContent = calendar.totalContributions.toLocaleString();
  if (el('gh-streak'))  el('gh-streak').textContent  = streak;
}

// ── Category helpers ──────────────────────────────────────────────────────────
function category(repo) {
  const lang = (repo.primaryLanguage?.name || '').toLowerCase();
  const name = repo.name.toLowerCase();
  if (lang === 'java'       || name.includes('-back') || name.includes('library') || name.includes('task-manager')) return 'java';
  if (lang === 'javascript' || lang === 'typescript'  || name.includes('aether')  || name.includes('notepad')      || name.includes('-web-app') || name.includes('ar-glass')) return 'javascript';
  if (lang === 'python'     || lang === 'jupyter notebook' || name.includes('fraudscore-ai') || name.includes('game-stat') || name.includes('leetcode')) return 'python';
  return 'others';
}
const catIcon = cat => ({ java:'cafe-outline', javascript:'logo-javascript', python:'logo-python' }[cat] || 'layers-outline');

// ── Project cards ─────────────────────────────────────────────────────────────
function renderProjects(repos) {
  const list    = document.getElementById('project-list');
  const loading = document.getElementById('portfolio-loading');
  if (!list) return;
  if (loading) loading.style.display = 'none';

  // Locked order on top
  const LOCKED = ['fraudscore-web-app','notepad-gg','library-management-system','aether-archive','game-stat-bot','fraudscore-back'];
  const byName  = Object.fromEntries(repos.map(r => [r.name, r]));
  const locked  = LOCKED.map(n => byName[n]).filter(Boolean);
  const usedSet = new Set(locked.map(r => r.name));

  // All remaining repos — no star filter here; "All" tab handles that in applyFilter
  const rest = repos
    .filter(r => !usedSet.has(r.name))
    .sort((a, b) => (b.stargazerCount - a.stargazerCount) || (new Date(b.createdAt) - new Date(a.createdAt)));

  const ordered = [...locked, ...rest];

  // Total stars across ALL owned repos (not just the displayed ones)
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazerCount || 0), 0);

  list.innerHTML = '';
  ordered.forEach((repo, idx) => {
    const stars      = repo.stargazerCount || 0;
    const isLocked   = usedSet.has(repo.name);
    const cat        = category(repo);
    const lang       = repo.primaryLanguage?.name || null;
    const color      = getLangColor(lang);
    const icon       = catIcon(cat);
    const curated    = CURATED[repo.name] || null;
    const img        = curated?.img || null;
    const desc       = curated?.desc || (lang ? `${lang} project by Sadman Hossain Sajid.` : 'Project by Sadman Hossain Sajid.');
    const cardId     = `pc-${idx}`;
    const href       = repo.url;
    const displayLang = lang || (cat === 'javascript' ? 'JavaScript' : cat === 'java' ? 'Java' : cat === 'python' ? 'Python' : null);

    const li = document.createElement('li');
    // "All" tab: show locked + ≥1 star. Category tabs: show all in that category.
    li.className = (isLocked || stars >= 1) ? 'project-item active' : 'project-item';
    li.setAttribute('data-filter-item', '');
    li.setAttribute('data-category', cat);
    li.setAttribute('data-stars', stars);
    li.setAttribute('data-locked', isLocked ? 'true' : 'false');
    li.innerHTML = `
      <div class="project-card" id="${cardId}">
        <div class="project-img-box">
          ${img ? `<img src="${img}" alt="${repo.name}" loading="lazy" class="project-preview-img">` : `<div class="project-img-placeholder"><ion-icon name="${icon}"></ion-icon></div>`}
        </div>
        <div class="project-card-header">
          <div class="project-name"><a href="${href}" target="_blank" rel="noopener">${repo.name.replace(/[-_]/g,' ')}</a></div>
          <a href="${href}" target="_blank" rel="noopener" class="project-link" title="View on GitHub"><ion-icon name="open-outline"></ion-icon></a>
        </div>
        <div class="project-card-body"><p class="project-desc">${desc}</p></div>
        <div class="project-card-footer"><div class="project-meta">
          ${displayLang ? `<span class="project-lang"><span class="lang-dot" style="background:${color};"></span>${displayLang}</span>` : ''}
          <span class="project-stars" style="${stars > 0 ? 'display:inline-flex;' : 'display:none;'}">
            <ion-icon name="star-outline"></ion-icon><span>${stars}</span>
          </span>
          ${repo.forkCount > 0 ? `<span class="project-forks"><ion-icon name="git-branch-outline"></ion-icon>${repo.forkCount}</span>` : ''}
        </div></div>
      </div>`;
    list.appendChild(li);

    // Fetch README image for cards without a static one
    if (!img) {
      const branch = repo.defaultBranchRef?.name || 'main';
      fetch(`https://raw.githubusercontent.com/${GH_USERNAME}/${repo.name}/${branch}/README.md`, { signal: AbortSignal.timeout(3500) })
        .then(r => r.ok ? r.text() : null)
        .then(md => {
          if (!md) return;
          const card = document.getElementById(cardId);
          if (!card) return;
          const imgs = [...md.matchAll(/!\[.*?\]\((.*?)\)/g), ...md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
            .map(m => m[1])
            .filter(s => !/(shields\.io|badge|travis|workflow|github-actions)/i.test(s));
          if (imgs.length) {
            let src = imgs[0].trim().replace(/^\.?\//, '');
            if (!/^https?:\/\//.test(src)) src = `https://raw.githubusercontent.com/${GH_USERNAME}/${repo.name}/${branch}/${src}`;
            card.querySelector('.project-img-box').innerHTML = `<img src="${src}" alt="${repo.name}" loading="lazy" class="project-preview-img">`;
          }
        }).catch(() => {});
    }
  });

  // Set stats from full repos array
  const el = id => document.getElementById(id);
  if (el('gh-repos'))  el('gh-repos').textContent  = repos.length;
  if (el('gh-stars'))  el('gh-stars').textContent  = totalStars;
}

// ── Init ───────────────────────────────────────────────────────────────────────
fetchRepos().then(renderProjects).catch(console.error);
fetchContributions().then(renderHeatmap).catch(console.error);
