'use strict';

const LC_USERNAME = (typeof CONFIG !== 'undefined') ? CONFIG.LEETCODE_USERNAME : 'sadman_hossain_sajid';

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
      const d = await res.json();
      if (d && (d.totalSolved !== undefined || d.solved !== undefined)) return d;
    } catch (e) {}
  }
  return null;
}

function renderLeetCodeCard(d) {
  const card = document.getElementById('leetcode-card');
  if (!card) return;

  const totalSolved   = d.totalSolved   ?? d.solved       ?? 0;
  const totalQuestions= d.totalQuestions?? d.total        ?? 0;
  const easySolved    = d.easySolved    ?? 0;
  const totalEasy     = d.totalEasy     ?? 0;
  const mediumSolved  = d.mediumSolved  ?? 0;
  const totalMedium   = d.totalMedium   ?? 0;
  const hardSolved    = d.hardSolved    ?? 0;
  const totalHard     = d.totalHard     ?? 0;

  const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

  card.innerHTML = `
    <div class="lc-simple-container">
      <div class="lc-stat-box total">
        <div class="lc-stat-top"><span class="lc-stat-label">Total Solved</span><span class="lc-stat-badge total">All</span></div>
        <div class="lc-stat-num-row"><span class="lc-stat-big total">${totalSolved}</span><span class="lc-stat-denom">/ ${totalQuestions}</span></div>
        <div class="lc-progress-track"><div class="lc-progress-fill blue" style="width:${pct(totalSolved,totalQuestions)}%;"></div></div>
        <div class="lc-stat-foot"><span>${pct(totalSolved,totalQuestions)}% Completed</span></div>
      </div>
      <div class="lc-stat-box easy">
        <div class="lc-stat-top"><span class="lc-stat-label">Easy</span><span class="lc-stat-badge easy">Easy</span></div>
        <div class="lc-stat-num-row"><span class="lc-stat-big easy">${easySolved}</span><span class="lc-stat-denom">/ ${totalEasy}</span></div>
        <div class="lc-progress-track"><div class="lc-progress-fill easy" style="width:${pct(easySolved,totalEasy)}%;"></div></div>
        <div class="lc-stat-foot"><span>${pct(easySolved,totalEasy)}% Solved</span></div>
      </div>
      <div class="lc-stat-box medium">
        <div class="lc-stat-top"><span class="lc-stat-label">Medium</span><span class="lc-stat-badge med">Medium</span></div>
        <div class="lc-stat-num-row"><span class="lc-stat-big med">${mediumSolved}</span><span class="lc-stat-denom">/ ${totalMedium}</span></div>
        <div class="lc-progress-track"><div class="lc-progress-fill med" style="width:${pct(mediumSolved,totalMedium)}%;"></div></div>
        <div class="lc-stat-foot"><span>${pct(mediumSolved,totalMedium)}% Solved</span></div>
      </div>
      <div class="lc-stat-box hard">
        <div class="lc-stat-top"><span class="lc-stat-label">Hard</span><span class="lc-stat-badge hard">Hard</span></div>
        <div class="lc-stat-num-row"><span class="lc-stat-big hard">${hardSolved}</span><span class="lc-stat-denom">/ ${totalHard}</span></div>
        <div class="lc-progress-track"><div class="lc-progress-fill hard" style="width:${pct(hardSolved,totalHard)}%;"></div></div>
        <div class="lc-stat-foot"><span>${pct(hardSolved,totalHard)}% Solved</span></div>
      </div>
    </div>`;
}

async function initLeetCode() {
  // Leave loading spinner until API responds; if API fails, spinner stays
  const stats = await fetchLeetCodeStats();
  if (stats) renderLeetCodeCard(stats);
  // else: card keeps its loading state (no error shown in HTML)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeetCode);
} else {
  initLeetCode();
}
