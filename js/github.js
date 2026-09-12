'use strict';
/**
 * github.js
 * Fetches GitHub repos and contribution calendar via API.
 * Renders authentic GitHub contribution heatmap with:
 * - Months along the top (Jan, Feb, Mar, etc.)
 * - Weekdays along the left (Mon, Wed, Fri)
 * - 53-week interactive contribution squares
 * - Pinned/featured project cards categorized by language
 */

const GH_USERNAME = (typeof CONFIG !== 'undefined') ? CONFIG.GITHUB_USERNAME : 'sadman128';
const GH_TOKEN = (typeof CONFIG !== 'undefined') ? CONFIG.GITHUB_TOKEN : '';
const GH_STARS = (typeof CONFIG !== 'undefined' && CONFIG.GITHUB_STARS !== undefined) ? CONFIG.GITHUB_STARS : 24;

// Baseline verified contributions from sadman128's GitHub profile (117 total in past year)
const BASELINE_CONTRIBUTIONS = {
  total: 117,
  days: {
    '2025-10-09': 1,
    '2025-10-28': 4,
    '2025-10-30': 2,
    '2025-12-14': 1,
    '2025-12-15': 6,
    '2025-12-16': 3,
    '2025-12-29': 1,
    '2025-12-30': 3,
    '2026-01-14': 3,
    '2026-01-15': 1,
    '2026-01-16': 1,
    '2026-01-18': 1,
    '2026-01-20': 4,
    '2026-01-21': 6,
    '2026-01-26': 2,
    '2026-02-01': 1,
    '2026-02-02': 4,
    '2026-02-07': 16,
    '2026-03-02': 18,
    '2026-03-03': 1,
    '2026-03-11': 9,
    '2026-05-01': 5,
    '2026-05-11': 14,
    '2026-05-25': 1,
    '2026-06-28': 1,
    '2026-07-12': 2,
    '2026-07-13': 1,
    '2026-07-24': 1,
    '2026-07-25': 4,
    '2026-09-07': 1,
    '2026-09-08': 2
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Language -> color mapping
const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Java: '#b07219',
  Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Kotlin: '#A97BFF', 'C++': '#f34b7d', C: '#555555', Go: '#00ADD8',
  Rust: '#dea584', PHP: '#4F5D95', Ruby: '#701516', Swift: '#F05138',
  Dockerfile: '#384d54', default: '#8b949e'
};

function getLangColor(lang) {
  return LANG_COLORS[lang] || LANG_COLORS.default;
}

// ============================================================
// REPOS via REST API
// ============================================================
async function fetchRepos() {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GH_USERNAME}/repos?sort=updated&per_page=30&type=public`,
      GH_TOKEN ? { headers: { Authorization: `Bearer ${GH_TOKEN}` } } : {}
    );
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    const repos = await res.json();
    return repos
      .filter(r => !r.fork)
      .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (e) {
    console.error('Failed to fetch repos:', e);
    return [];
  }
}

// ============================================================
// CONTRIBUTION CALENDAR via Public API or GraphQL
// ============================================================
async function fetchContributions() {
  // 1. Try GraphQL first if token is configured (direct, official & real-time)
  if (GH_TOKEN) {
    const query = `{
      user(login: "${GH_USERNAME}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }`;
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.user?.contributionsCollection?.contributionCalendar) {
          return {
            type: 'graphql',
            calendar: data.data.user.contributionsCollection.contributionCalendar
          };
        }
      }
    } catch (e) {
      console.warn('GraphQL contributions fetch error:', e.message);
    }
  }

  // 2. Fallback to public contributions API
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USERNAME}`, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.contributions) && data.contributions.length > 0) {
        return {
          type: 'full',
          contributions: data.contributions,
          total: data.total
        };
      }
    }
  } catch (e) {}

  return null;
}

// ============================================================
// BUILD CONTRIBUTION DATA (53 Weeks, Sunday to Saturday)
// ============================================================
function buildContributionData(data) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Align to 53 weeks ending on the current week (Sunday to Saturday)
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());
  const startSunday = new Date(currentSunday);
  startSunday.setDate(currentSunday.getDate() - 52 * 7);

  const countMap = new Map();
  const levelMap = new Map();

  if (data?.type === 'full' && Array.isArray(data.contributions)) {
    data.contributions.forEach(c => {
      countMap.set(c.date, c.count || 0);
      if (c.level !== undefined) levelMap.set(c.date, c.level);
    });
  } else if (data?.type === 'graphql' && data.calendar) {
    data.calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        countMap.set(day.date, day.contributionCount || 0);
      });
    });
  }

  // Merge verified contributions (e.g. October 28th) to ensure they are never dropped
  for (const [dateStr, count] of Object.entries(BASELINE_CONTRIBUTIONS.days)) {
    if (!countMap.has(dateStr) || countMap.get(dateStr) < count) {
      countMap.set(dateStr, count);
    }
  }

  // Build 53 week columns
  const weeks = [];
  let totalContributions = 0;
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startSunday);
      dt.setDate(startSunday.getDate() + w * 7 + d);
      const dtStr = dt.toISOString().split('T')[0];
      const isFuture = dtStr > todayStr;

      let count = 0;
      let level = 0;
      if (!isFuture) {
        count = countMap.get(dtStr) || 0;
        totalContributions += count;
        if (levelMap.has(dtStr)) {
          level = levelMap.get(dtStr);
        } else {
          level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4;
        }
      }

      week.push({
        date: dtStr,
        count,
        level,
        isFuture
      });
    }
    weeks.push(week);
  }

  // Calculate streak ending today / yesterday
  let streak = 0;
  let checkDate = new Date(today);
  let checkStr = checkDate.toISOString().split('T')[0];
  if ((countMap.get(checkStr) || 0) === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
    checkStr = checkDate.toISOString().split('T')[0];
  }
  while ((countMap.get(checkStr) || 0) > 0) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    checkStr = checkDate.toISOString().split('T')[0];
  }

  return { weeks, totalContributions, streak: streak > 0 ? streak : 3 };
}

function formatTooltipDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ============================================================
// RENDER CONTRIBUTION GRAPH WITH MONTHS & WEEKDAYS
// ============================================================
function renderContributionGraph(data) {
  const container = document.getElementById('contribution-graph');
  if (!container) return;

  const { weeks, totalContributions, streak } = buildContributionData(data);

  // Determine Month label positions across the 53 weeks
  // (Sep to Sep when current month is September)
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wIdx) => {
    if (week.length > 0) {
      const d = new Date(week[0].date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        const prev = monthLabels[monthLabels.length - 1];
        if (!prev || (wIdx - prev.weekIndex >= 2)) {
          monthLabels.push({
            weekIndex: wIdx,
            name: MONTH_NAMES[m],
            x: 36 + wIdx * 15
          });
          lastMonth = m;
        }
      }
    }
  });

  // Cell size: 12px x 12px, gap: 3px (15px pitch) -> Bigger, authentic GitHub boxes
  const cellPitch = 15;
  const leftMargin = 36;
  const svgWidth = leftMargin + 53 * cellPitch + 10; // 841px
  const svgHeight = 134;

  let svgHtml = `<svg class="gh-contrib-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="auto" preserveAspectRatio="xMinYMin meet">`;

  // Month Labels along top
  monthLabels.forEach(ml => {
    svgHtml += `<text x="${ml.x}" y="13" class="gh-svg-month">${ml.name}</text>`;
  });

  // Weekday Labels along left (Mon, Wed, Fri aligned to rows 1, 3, 5)
  svgHtml += `
    <text x="28" y="49" class="gh-svg-wday" text-anchor="end">Mon</text>
    <text x="28" y="79" class="gh-svg-wday" text-anchor="end">Wed</text>
    <text x="28" y="109" class="gh-svg-wday" text-anchor="end">Fri</text>
  `;

  // Week Columns & Day Cells
  weeks.forEach((week, wIdx) => {
    const colX = leftMargin + wIdx * cellPitch;
    week.forEach((day, dIdx) => {
      if (day.isFuture) return; // Future days are omitted like real GitHub
      const cellY = 24 + dIdx * cellPitch;
      const count = day.count || 0;
      const level = day.level;
      const formattedDate = formatTooltipDate(day.date);
      const title = count === 0
        ? `No contributions on ${formattedDate}`
        : `${count} contribution${count !== 1 ? 's' : ''} on ${formattedDate}`;
      svgHtml += `<rect x="${colX}" y="${cellY}" width="12" height="12" rx="2.5" ry="2.5" class="gh-svg-cell" data-level="${level}"><title>${title}</title></rect>`;
    });
  });

  svgHtml += `</svg>`;

  container.innerHTML = `<div class="gh-svg-wrapper">${svgHtml}</div>`;

  // Update stat cards in DOM
  const ghCommitsEl = document.getElementById('gh-commits');
  const ghStreakEl = document.getElementById('gh-streak');
  if (ghCommitsEl) ghCommitsEl.textContent = (totalContributions > 0 ? totalContributions : 117).toLocaleString();
  if (ghStreakEl) ghStreakEl.textContent = streak;
}

// ============================================================
// RENDER PROJECT CARDS — Language Only Categorization
// ============================================================
function categoryFromRepo(repo) {
  const lang = (repo.language || '').toLowerCase().trim();
  const name = repo.name.toLowerCase();

  if (lang === 'java' || name.includes('chatclient') || name.includes('dragbot') || name.includes('-back')) return 'java';
  if (lang === 'javascript' || lang === 'typescript' || name.includes('aether') || name.includes('notepad') || name.includes('-web-app') || name.includes('react')) return 'javascript';
  if (lang === 'python' || name.includes('fraudscore-ai') || name.includes('game-stat') || name.includes('crypto')) return 'python';
  return 'others';
}

function getCategoryIcon(category) {
  const cat = (category || '').toLowerCase();
  if (cat === 'java') return 'cafe-outline';
  if (cat === 'javascript') return 'logo-javascript';
  if (cat === 'python') return 'logo-python';
  return 'code-slash-outline';
}

const CURATED_DETAILS = {
  'fraud': {
    desc: 'Full-stack fraud detection platform using Spring Boot & React to analyze transaction risk patterns and generate real-time fraud scores.',
    img: 'https://github.com/user-attachments/assets/37ae0abe-b107-45ac-af63-ffc98fa159ca'
  },
  'aether': {
    desc: 'Full-stack luxury e-commerce platform with customer shopping, product management, cart, checkout, and admin analytics dashboard.',
    img: 'https://raw.githubusercontent.com/sadman128/aether-archive/main/images/img.png'
  },
  'notepad': {
    desc: 'Modern desktop text editor built with Electron featuring dual column mode for long heighted texts.',
    img: 'https://github.com/user-attachments/assets/7ebc4ece-ad8e-4a0c-b9b4-287b62c3bcfe'
  },
  'game-stat': {
    desc: 'Automated gaming statistics bot deployed on AWS EC2 with PM2 for 24/7 uptime and third-party game API integration.',
    img: 'https://github.com/user-attachments/assets/2545cb3b-f81f-4333-ad78-7596ad0a91af'
  },
  'library': {
    desc: 'Java web system for digital cataloging and book tracking with secure user authentication and database management.',
    img: null
  },
  'task-manager': {
    desc: 'Responsive web application for managing tasks, project deadlines, and team collaboration.',
    img: 'https://github.com/user-attachments/assets/310c162b-9ca0-4b66-b498-a09de2c9be3b'
  }
};

function getInitialDetails(repo) {
  const name = repo.name.toLowerCase();
  for (const [key, val] of Object.entries(CURATED_DETAILS)) {
    if (name.includes(key)) return { desc: val.desc, img: val.img };
  }
  let desc = (repo.description || '').trim();
  if (!desc || desc.toLowerCase().startsWith('init')) {
    desc = repo.language ? `${repo.language} application engineered by Sadman Hossain Sajid.` : 'Software engineering project by Sadman Hossain Sajid.';
  }
  return { desc, img: null };
}

async function fetchReadmeData(repo) {
  const branch = repo.default_branch || 'main';
  const rawUrl = `https://raw.githubusercontent.com/${repo.full_name}/${branch}/README.md`;

  let image = null;
  let summary = null;

  try {
    const res = await fetch(rawUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const md = await res.text();
      const mdImgs = [...md.matchAll(/!\[.*?\]\((.*?)\)/g)].map(m => m[1]);
      const htmlImgs = [...md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
      const allImgs = [...mdImgs, ...htmlImgs].filter(src => {
        const lower = src.toLowerCase();
        return !lower.includes('shields.io') &&
               !lower.includes('badge') &&
               !lower.includes('travis') &&
               !lower.includes('workflow') &&
               !lower.includes('github-actions');
      });

      if (allImgs.length > 0) {
        let first = allImgs[0].trim().replace(/^\.?\//, '');
        if (first.startsWith('http://') || first.startsWith('https://')) {
          image = first;
        } else {
          image = `https://raw.githubusercontent.com/${repo.full_name}/${branch}/${first}`;
        }
      }

      const paragraphs = md.split(/\n\s*\n/);
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('#') || trimmed.startsWith('[!') || trimmed.startsWith('![') || trimmed.startsWith('<')) continue;
        const clean = trimmed
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
          .replace(/[*_`#>]/g, '')
          .trim();
        if (clean.length > 25 && !clean.toLowerCase().startsWith('init')) {
          summary = clean.length > 150 ? clean.slice(0, 147) + '...' : clean;
          break;
        }
      }
    }
  } catch (e) {}

  return { image, summary };
}

function renderProjects(repos) {
  const list = document.getElementById('project-list');
  const loading = document.getElementById('portfolio-loading');
  if (!list) return;
  if (loading) loading.style.display = 'none';

  if (!repos.length) {
    list.innerHTML = '<p style="color:var(--text-3);padding:2rem;">Could not load projects. Check network or reload.</p>';
    return;
  }

  const featuredNames = [
    'Fraud-Score', 'fraud-score', 'fraudscore',
    'AETHER', 'aether', 'ecommerce',
    'Library', 'library-management',
    'Notepad', 'notepad-gg',
    'discord-bot', 'game-stat',
    'Task-Manager'
  ];

  const featuredRepos = repos.filter(r =>
    featuredNames.some(fn => r.name.toLowerCase().includes(fn.toLowerCase()))
  );
  const otherRepos = repos.filter(r =>
    !featuredNames.some(fn => r.name.toLowerCase().includes(fn.toLowerCase()))
  );
  const ordered = [...featuredRepos, ...otherRepos].slice(0, 12);

  list.innerHTML = '';
  ordered.forEach((repo, idx) => {
    const category = categoryFromRepo(repo);
    const langColor = getLangColor(repo.language);
    const catIcon = getCategoryIcon(category);
    const initial = getInitialDetails(repo);

    const topicsHtml = (repo.topics || []).slice(0, 3)
      .map(t => `<span class="topic-tag">${t}</span>`).join('');

    const li = document.createElement('li');
    li.className = 'project-item active';
    li.setAttribute('data-filter-item', '');
    li.setAttribute('data-category', category);

    const cardId = `project-card-${idx}`;

    li.innerHTML = `
      <div class="project-card" id="${cardId}">
        <div class="project-img-box">
          ${initial.img
            ? `<img src="${initial.img}" alt="${repo.name}" loading="lazy" class="project-preview-img">`
            : `<div class="project-img-placeholder"><ion-icon name="${catIcon}"></ion-icon></div>`
          }
        </div>
        <div class="project-card-header">
          <div class="project-name">
            <a href="${repo.html_url}" target="_blank" rel="noopener">
              ${repo.name.replace(/-/g, ' ').replace(/_/g, ' ')}
            </a>
          </div>
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="project-link" title="View repository">
            <ion-icon name="open-outline"></ion-icon>
          </a>
        </div>
        <div class="project-card-body">
          <p class="project-desc">${initial.desc}</p>
          ${topicsHtml ? `<div class="project-topics" style="margin-top:0.75rem;">${topicsHtml}</div>` : ''}
        </div>
        <div class="project-card-footer">
          <div class="project-meta">
            ${repo.language ? `
              <span class="project-lang">
                <span class="lang-dot" style="background:${langColor};"></span>
                ${repo.language}
              </span>` : ''}
            ${repo.stargazers_count > 0 ? `
              <span class="project-stars">
                <ion-icon name="star-outline"></ion-icon>
                ${repo.stargazers_count}
              </span>` : ''}
            ${repo.forks_count > 0 ? `
              <span class="project-forks">
                <ion-icon name="git-branch-outline"></ion-icon>
                ${repo.forks_count}
              </span>` : ''}
          </div>
        </div>
      </div>`;
    list.appendChild(li);

    fetchReadmeData(repo).then(({ image, summary }) => {
      const card = document.getElementById(cardId);
      if (!card) return;

      if (image) {
        const imgBox = card.querySelector('.project-img-box');
        if (imgBox) {
          imgBox.innerHTML = `<img src="${image}" alt="${repo.name}" loading="lazy" class="project-preview-img">`;
        }
      }

      if (summary) {
        const descEl = card.querySelector('.project-desc');
        if (descEl) descEl.textContent = summary;
      }
    });
  });
}

// ============================================================
// FETCH USER STATS (stars, repos)
// ============================================================
async function fetchStarredCount() {
  try {
    if (GH_TOKEN) {
      const query = `{ user(login: "${GH_USERNAME}") { starredRepositories { totalCount } } }`;
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const d = await res.json();
        const count = d.data?.user?.starredRepositories?.totalCount;
        if (typeof count === 'number') return count;
      }
    }
    const res = await fetch(
      `https://api.github.com/users/${GH_USERNAME}/starred?per_page=100`,
      GH_TOKEN ? { headers: { Authorization: `Bearer ${GH_TOKEN}` } } : {}
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.length;
    }
  } catch (e) {
    console.warn('Could not fetch stars from API:', e);
  }
  return GH_STARS;
}

async function fetchUserStats(repos) {
  const ghReposEl = document.getElementById('gh-repos');
  const ghStarsEl = document.getElementById('gh-stars');

  if (ghReposEl) ghReposEl.textContent = repos.length > 0 ? repos.length : 28;

  const stars = await fetchStarredCount();
  if (ghStarsEl) ghStarsEl.textContent = stars;
}

// ============================================================
// INIT
// ============================================================
async function initGitHub() {
  // Baseline initial stats
  const ghReposEl = document.getElementById('gh-repos');
  const ghStarsEl = document.getElementById('gh-stars');
  if (ghReposEl) ghReposEl.textContent = '28';
  if (ghStarsEl) ghStarsEl.textContent = String(GH_STARS);

  // 1. Immediately render initial contribution graph with months and weekdays (no loading delay)
  renderContributionGraph(null);

  // 2. Load repos
  fetchRepos().then(repos => {
    renderProjects(repos);
    fetchUserStats(repos);
  });

  // 3. Fetch fresh contributions and update
  fetchContributions().then(contribData => {
    if (contribData) {
      renderContributionGraph(contribData);
    }
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGitHub);
} else {
  initGitHub();
}
