'use strict';
/**
 * discord.js
 * Simplified Discord default theme profile:
 * - Profile pic: circular (border-radius: 50%)
 * - Status icon: online / idle / dnd / offline indicator
 * - Display name, username, and pronouns
 * - All official badges
 * - Discord default dark theme
 * - About Me section
 * - Joined date (Member Since: Oct 19, 2019)
 * - Current Activity section (displayed dynamically if active)
 * - Direct Message button linking to Discord
 * - Live presence & status updates via Lanyard WebSocket + REST & dcdn profile
 */

const DISCORD_USER_ID = (typeof CONFIG !== 'undefined') ? CONFIG.DISCORD_USER_ID : '634826720293290004';
const LANYARD_WS = 'wss://api.lanyard.rest/socket';
const LANYARD_REST = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
const DCDN_PROFILE_REST = `https://dcdn.dstn.to/profile/${DISCORD_USER_ID}`;

// Ordered badges matching user account
const BADGE_ORDER = [
  '3aa41de486fa12454c3761e8e223442e', // HypeSquad Balance
  '51040c70d4f20a921ad6674ff86fc95c', // Server Booster
  '4f33c4a9c64ce221936bd256c356f91f', // Discord Nitro
  '6de6d34650760ba5551a79732e98ed60', // Legacy Username (#)
  'ca105ad9cfc8580c765101d17bbb2323', // Level 0 Reached
  '7d9ae358c8c5e118768335dbe68b4fb8', // Completed a Quest
  '83d8a1eb09a8d64e59233eec5d4d5c2d'  // Orb Profile Badge
];

// Fallback verified data
const DEFAULT_PROFILE = {
  id: '634826720293290004',
  username: 'kenji.xx',
  global_name: 'KENJI',
  pronouns: 'y = mx + c',
  member_since: 'Oct 19, 2019',
  avatar: 'ad221c0e4e85cda2975b92ae4cd380a2',
  status: 'idle',
  clan: {
    tag: 'BOGS',
    badge: '6473797948e6d36a991e425c8b7c353c',
    identity_guild_id: '1005146395004641460'
  },
  badges: [
    { icon: '3aa41de486fa12454c3761e8e223442e', title: 'HypeSquad Balance' },
    { icon: '51040c70d4f20a921ad6674ff86fc95c', title: 'Server Booster' },
    { icon: '4f33c4a9c64ce221936bd256c356f91f', title: 'Discord Nitro' },
    { icon: '6de6d34650760ba5551a79732e98ed60', title: 'Originally known as KENJI#7657' },
    { icon: 'ca105ad9cfc8580c765101d17bbb2323', title: 'Level 0 Reached' },
    { icon: '7d9ae358c8c5e118768335dbe68b4fb8', title: 'Completed a Quest' },
    { icon: '83d8a1eb09a8d64e59233eec5d4d5c2d', title: 'Orb Profile Badge' }
  ]
};

let ws = null;
let heartbeatInterval = null;
let cachedDcdnData = null;
let lastLanyardData = null;

// Parse Custom Status from Lanyard
function parseCustomStatus(activities) {
  if (!Array.isArray(activities)) return null;
  const custom = activities.find(a => a.type === 4 || a.name === 'Custom Status');
  if (!custom) return null;

  let text = '';
  if (custom.emoji && custom.emoji.name) text += custom.emoji.name + ' ';
  if (custom.state) text += custom.state;
  return text.trim() || null;
}

// Parse Current Active Activity (Game, Spotify, Coding, etc.)
function parseMainActivity(activities, spotify) {
  if (spotify && spotify.song) {
    return {
      type: 'Listening to Spotify',
      name: spotify.song,
      details: spotify.artist ? `by ${spotify.artist}` : '',
      state: spotify.album ? `on ${spotify.album}` : '',
      image: spotify.album_art_url || null,
      icon: 'musical-notes-outline'
    };
  }

  if (!Array.isArray(activities)) return null;
  const act = activities.find(a => a.type !== 4 && a.name !== 'Custom Status');
  if (!act) return null;

  let typeLabel = 'Playing';
  let iconName = 'game-controller-outline';
  if (act.type === 1) { typeLabel = 'Streaming'; iconName = 'videocam-outline'; }
  else if (act.type === 2) { typeLabel = 'Listening to'; iconName = 'musical-notes-outline'; }
  else if (act.type === 3) { typeLabel = 'Watching'; iconName = 'film-outline'; }
  else if (act.type === 5) { typeLabel = 'Competing in'; iconName = 'trophy-outline'; }

  let imgUrl = null;
  if (act.assets && act.assets.large_image) {
    if (act.assets.large_image.startsWith('mp:external/')) {
      imgUrl = 'https://media.discordapp.net/' + act.assets.large_image.replace('mp:', '');
    } else if (act.application_id) {
      imgUrl = `https://cdn.discordapp.com/app-assets/${act.application_id}/${act.assets.large_image}.png`;
    }
  }

  return {
    type: typeLabel,
    name: act.name,
    details: act.details || '',
    state: act.state || '',
    image: imgUrl,
    icon: iconName
  };
}

// Render status badge SVG
function renderStatusBadge(status) {
  if (status === 'idle') {
    return `
      <span class="discord-avatar-status idle" title="Status: Idle">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path fill="#f0b232" d="M11.5 9.8A5.5 5.5 0 0 1 4.2 2.5a6.5 6.5 0 1 0 7.3 7.3z"/>
        </svg>
      </span>`;
  }
  if (status === 'online') {
    return `<span class="discord-avatar-status online" title="Status: Online"></span>`;
  }
  if (status === 'dnd') {
    return `
      <span class="discord-avatar-status dnd" title="Status: Do Not Disturb">
        <span class="dnd-bar"></span>
      </span>`;
  }
  return `<span class="discord-avatar-status offline" title="Status: Offline"></span>`;
}

function formatDiscordBio(text) {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="discord-bio-link">$1</a>')
    .replace(/\n/g, '<br>');
}

// Render the simple Discord default profile
function renderDiscordProfile() {
  const card = document.getElementById('discord-card');
  if (!card) return;

  const dUser = cachedDcdnData?.user || {};
  const dProfile = cachedDcdnData?.user_profile || {};
  const lUser = lastLanyardData?.discord_user || {};

  // Real About Me from Discord profile (dcdn) or Lanyard KV — never fake text
  const rawBio = dProfile.bio || dUser.bio || lastLanyardData?.kv?.about_me || lastLanyardData?.kv?.bio || '';
  const aboutMe = (rawBio || '').trim();

  // Status
  const status = lastLanyardData?.discord_status || DEFAULT_PROFILE.status;

  // Custom status
  const customStatus = parseCustomStatus(lastLanyardData?.activities);

  // Current Activity (if any)
  const activity = parseMainActivity(lastLanyardData?.activities, lastLanyardData?.spotify);

  // Avatar
  const avatarHash = lUser.avatar || dUser.avatar || DEFAULT_PROFILE.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'png'}?size=256`
    : './dp.png';

  // Display Name
  const displayName = dUser.global_name || lUser.display_name || DEFAULT_PROFILE.global_name;

  // Username
  const username = dUser.username || lUser.username || DEFAULT_PROFILE.username;

  // Pronouns
  const pronouns = dProfile.pronouns || DEFAULT_PROFILE.pronouns;

  // Clan Tag
  const clan = dUser.clan || dUser.primary_guild || DEFAULT_PROFILE.clan;
  const clanTag = clan?.tag || 'BOGS';
  const clanBadgeHash = clan?.badge || DEFAULT_PROFILE.clan.badge;
  const clanGuildId = clan?.identity_guild_id || DEFAULT_PROFILE.clan.identity_guild_id;
  const clanBadgeUrl = clanBadgeHash
    ? `https://cdn.discordapp.com/clan-badges/${clanGuildId}/${clanBadgeHash}.png?size=32`
    : '';

  // Badges
  let badgesList = DEFAULT_PROFILE.badges;
  if (Array.isArray(cachedDcdnData?.badges) && cachedDcdnData.badges.length > 0) {
    const sorted = [...cachedDcdnData.badges].sort((a, b) => {
      const idxA = BADGE_ORDER.indexOf(a.icon);
      const idxB = BADGE_ORDER.indexOf(b.icon);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
    badgesList = sorted.map(b => ({
      icon: b.icon,
      title: b.description || b.id
    }));
  }

  const badgesHtml = badgesList.map(b => {
    const iconUrl = b.icon.startsWith('http')
      ? b.icon
      : `https://cdn.discordapp.com/badge-icons/${b.icon}.png`;
    return `<div class="discord-badge-item" title="${b.title}"><img src="${iconUrl}" alt="${b.title}"></div>`;
  }).join('');

  // Member Since date
  let memberSince = DEFAULT_PROFILE.member_since;
  if (cachedDcdnData?.user?.id) {
    try {
      const id = BigInt(cachedDcdnData.user.id);
      const ts = Number((id >> 22n) + 1420070400000n);
      memberSince = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch(e) {}
  }

  card.innerHTML = `
    <!-- Discord Default Banner -->
    <div class="discord-banner"></div>

    <div class="discord-profile-body">
      <!-- Avatar & Badges Top Row -->
      <div class="discord-top-row">
        <div class="discord-avatar-wrap">
          <img class="discord-avatar-img" src="${avatarUrl}" alt="${displayName}" onerror="this.src='./dp.png'">
          ${renderStatusBadge(status)}
        </div>

        <div class="discord-badges-container">
          ${badgesHtml}
        </div>
      </div>

      <!-- User Info Header -->
      <div class="discord-user-header">
        <div class="discord-name-row">
          <span class="discord-display-name">${displayName}</span>
          ${clanTag ? `
            <span class="discord-clan-pill" title="Clan ${clanTag}">
              ${clanBadgeUrl ? `<img src="${clanBadgeUrl}" alt="${clanTag}">` : ''}
              <span>${clanTag}</span>
            </span>
          ` : ''}
        </div>

        <div class="discord-handle-row">
          <span class="discord-username">${username}</span>
          <span class="discord-dot-sep">•</span>
          <span class="discord-pronouns">${pronouns}</span>
        </div>

        ${customStatus ? `
          <div class="discord-custom-status-row">
            <ion-icon name="chatbubble-outline"></ion-icon>
            <span>${customStatus}</span>
          </div>
        ` : ''}
      </div>

      <!-- Inner Card with About Me, Joined Date, Current Activity -->
      <div class="discord-inner-card">
        <!-- About Me (Show only if real bio exists, else skip) -->
        ${aboutMe ? `
          <div class="discord-section">
            <div class="discord-section-title">ABOUT ME</div>
            <div class="discord-section-desc">${formatDiscordBio(aboutMe)}</div>
          </div>
          <div class="discord-inner-divider"></div>
        ` : ''}

        <!-- Joined Date -->
        <div class="discord-section">
          <div class="discord-section-title">MEMBER SINCE</div>
          <div class="discord-section-desc">${memberSince}</div>
        </div>

        <!-- Current Activity (Displayed dynamically if any) -->
        ${activity ? `
          <div class="discord-inner-divider"></div>
          <div class="discord-section">
            <div class="discord-section-title">CURRENT ACTIVITY</div>
            <div class="discord-activity-card">
              ${activity.image
                ? `<img src="${activity.image}" alt="${activity.name}" class="discord-activity-img">`
                : `<div class="discord-activity-icon-box"><ion-icon name="${activity.icon}"></ion-icon></div>`
              }
              <div class="discord-activity-info">
                <span class="discord-act-type">${activity.type}</span>
                <span class="discord-act-name">${activity.name}</span>
                ${activity.details ? `<span class="discord-act-sub">${activity.details}</span>` : ''}
                ${activity.state ? `<span class="discord-act-sub">${activity.state}</span>` : ''}
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Direct Message Action Button -->
      <a href="https://discord.com/users/${DISCORD_USER_ID}" target="_blank" rel="noopener" class="discord-dm-btn">
        <ion-icon name="paper-plane-outline"></ion-icon>
        <span>Direct Message</span>
      </a>
    </div>
  `;
}

// Fetch Full Discord Profile from dcdn & Lanyard
async function fetchFullProfile() {
  try {
    const [lanyardRes, dcdnRes] = await Promise.all([
      fetch(LANYARD_REST, { signal: AbortSignal.timeout(4000) }).then(r => r.json()).catch(() => null),
      fetch(DCDN_PROFILE_REST, { signal: AbortSignal.timeout(4000) }).then(r => r.json()).catch(() => null)
    ]);

    if (dcdnRes && dcdnRes.user) {
      cachedDcdnData = dcdnRes;
    }
    if (lanyardRes && lanyardRes.success) {
      lastLanyardData = lanyardRes.data;
    }
  } catch (e) {
    console.warn('Profile fetch notice:', e);
  } finally {
    renderDiscordProfile();
  }
}

// WebSocket Connection to Lanyard for live status updates
function connectLanyard() {
  try {
    ws = new WebSocket(LANYARD_WS);
  } catch (e) {
    return;
  }

  ws.addEventListener('open', () => {});

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.op === 1) {
        const heartbeatMs = msg.d.heartbeat_interval;
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 3 }));
          }
        }, heartbeatMs);

        ws.send(JSON.stringify({
          op: 2,
          d: { subscribe_to_id: DISCORD_USER_ID }
        }));
      }

      if (msg.op === 0) {
        const presence = msg.d;
        if (presence && presence.discord_user) {
          lastLanyardData = presence;
          renderDiscordProfile();
        }
      }
    } catch (err) {}
  });

  ws.addEventListener('close', () => {
    clearInterval(heartbeatInterval);
    setTimeout(connectLanyard, 10000);
  });
}

function initDiscord() {
  renderDiscordProfile();
  fetchFullProfile().then(() => {
    connectLanyard();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDiscord);
} else {
  initDiscord();
}
