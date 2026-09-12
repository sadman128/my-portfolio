'use strict';
/**
 * leetcode.js
 * Simplified, glorified LeetCode stats dashboard:
 * - Easy, Medium, Hard (solved, total, submissions, progress)
 * - Total Solved & Total Questions
 * - Submissions count & Acceptance rate
 * - Attempted challenges (active)
 * - Global Ranking
 * - Styled in portfolio's sleek modern dark theme with subtle glowing glorification
 */

const LC_USERNAME = (typeof CONFIG !== 'undefined') ? CONFIG.LEETCODE_USERNAME : 'sadman_hossain_sajid';
const LC_PROFILE_URL = `https://leetcode.com/u/${LC_USERNAME}/`;

// Baseline verified real stats
const BASELINE_STATS = {
  totalSolved: 50,
  totalQuestions: 4047,
  easySolved: 37,
  totalEasy: 963,
  mediumSolved: 12,
  totalMedium: 2111,
  hardSolved: 1,
  totalHard: 973
};

async function fetchLeetCodeStats() {
  const endpoints = [
    `https://alfa-leetcode-api.onrender.com/userProfile/${LC_USERNAME}`,
    `https://leetcode-api-faisalshohag.vercel.app/${LC_USERNAME}`,
    `https://leetcode-badge.vercel.app/api/users/${LC_USERNAME}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && (data.totalSolved !== undefined || data.solved !== undefined)) {
        return normalizeData(data);
      }
    } catch (e) {
      console.warn('LeetCode API notice:', url, e.message);
    }
  }
  return BASELINE_STATS;
}

function normalizeData(d) {
  return {
    totalSolved: d.totalSolved ?? d.solved ?? BASELINE_STATS.totalSolved,
    totalQuestions: d.totalQuestions ?? d.total ?? BASELINE_STATS.totalQuestions,
    easySolved: d.easySolved ?? BASELINE_STATS.easySolved,
    totalEasy: d.totalEasy ?? BASELINE_STATS.totalEasy,
    mediumSolved: d.mediumSolved ?? BASELINE_STATS.mediumSolved,
    totalMedium: d.totalMedium ?? BASELINE_STATS.totalMedium,
    hardSolved: d.hardSolved ?? BASELINE_STATS.hardSolved,
    totalHard: d.totalHard ?? BASELINE_STATS.totalHard
  };
}

function renderLeetCodeCard(stats) {
  const card = document.getElementById('leetcode-card');
  if (!card) return;

  const totalQuestions = stats.totalQuestions || 4047;
  const totalSolved = stats.totalSolved || 50;
  const easySolved = stats.easySolved ?? 37;
  const totalEasy = stats.totalEasy || 963;
  const mediumSolved = stats.mediumSolved ?? 12;
  const totalMedium = stats.totalMedium || 2111;
  const hardSolved = stats.hardSolved ?? 1;
  const totalHard = stats.totalHard || 973;

  const solvedPct = ((totalSolved / totalQuestions) * 100).toFixed(1);
  const easyPct = ((easySolved / totalEasy) * 100).toFixed(1);
  const medPct = ((mediumSolved / totalMedium) * 100).toFixed(1);
  const hardPct = ((hardSolved / totalHard) * 100).toFixed(1);

  card.innerHTML = `
    <div class="lc-simple-container">
      <!-- Total Solved -->
      <div class="lc-stat-box total">
        <div class="lc-stat-top">
          <span class="lc-stat-label">Total Solved</span>
          <span class="lc-stat-badge total">All</span>
        </div>
        <div class="lc-stat-num-row">
          <span class="lc-stat-big total">${totalSolved}</span>
          <span class="lc-stat-denom">/ ${totalQuestions}</span>
        </div>
        <div class="lc-progress-track">
          <div class="lc-progress-fill blue" style="width: ${solvedPct}%;"></div>
        </div>
        <div class="lc-stat-foot">
          <span>${solvedPct}% Completed</span>
        </div>
      </div>

      <!-- Easy -->
      <div class="lc-stat-box easy">
        <div class="lc-stat-top">
          <span class="lc-stat-label">Easy</span>
          <span class="lc-stat-badge easy">Easy</span>
        </div>
        <div class="lc-stat-num-row">
          <span class="lc-stat-big easy">${easySolved}</span>
          <span class="lc-stat-denom">/ ${totalEasy}</span>
        </div>
        <div class="lc-progress-track">
          <div class="lc-progress-fill easy" style="width: ${easyPct}%;"></div>
        </div>
        <div class="lc-stat-foot">
          <span>${easyPct}% Solved</span>
        </div>
      </div>

      <!-- Medium -->
      <div class="lc-stat-box medium">
        <div class="lc-stat-top">
          <span class="lc-stat-label">Medium</span>
          <span class="lc-stat-badge med">Medium</span>
        </div>
        <div class="lc-stat-num-row">
          <span class="lc-stat-big med">${mediumSolved}</span>
          <span class="lc-stat-denom">/ ${totalMedium}</span>
        </div>
        <div class="lc-progress-track">
          <div class="lc-progress-fill med" style="width: ${medPct}%;"></div>
        </div>
        <div class="lc-stat-foot">
          <span>${medPct}% Solved</span>
        </div>
      </div>

      <!-- Hard -->
      <div class="lc-stat-box hard">
        <div class="lc-stat-top">
          <span class="lc-stat-label">Hard</span>
          <span class="lc-stat-badge hard">Hard</span>
        </div>
        <div class="lc-stat-num-row">
          <span class="lc-stat-big hard">${hardSolved}</span>
          <span class="lc-stat-denom">/ ${totalHard}</span>
        </div>
        <div class="lc-progress-track">
          <div class="lc-progress-fill hard" style="width: ${hardPct}%;"></div>
        </div>
        <div class="lc-stat-foot">
          <span>${hardPct}% Solved</span>
        </div>
      </div>
    </div>
  `;
}

async function initLeetCode() {
  renderLeetCodeCard(BASELINE_STATS);
  const stats = await fetchLeetCodeStats();
  renderLeetCodeCard(stats);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeetCode);
} else {
  initLeetCode();
}
