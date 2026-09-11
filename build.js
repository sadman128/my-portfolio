const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, 'js');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const content = `// Generated automatically during build
const CONFIG = {
  GITHUB_USERNAME:     '${process.env.GITHUB_USERNAME || 'sadman128'}',
  GITHUB_TOKEN:        '${process.env.GITHUB_TOKEN || ''}',
  DISCORD_WEBHOOK_URL: '${process.env.DISCORD_WEBHOOK_URL || ''}',
  DISCORD_USER_ID:     '${process.env.DISCORD_USER_ID || '634826720293290004'}',
  LEETCODE_USERNAME:   '${process.env.LEETCODE_USERNAME || 'sadman_hossain_sajid'}'
};
`;

//something big is coming, if PLANING goes well


if (process.env.VERCEL || !fs.existsSync(path.join(configDir, 'config.js'))) {
  fs.writeFileSync(path.join(configDir, 'config.js'), content, 'utf8');
  console.log('✅ Generated js/config.js from environment variables');
} else {
  console.log('ℹ️ Local js/config.js already exists, keeping existing config.');
}
