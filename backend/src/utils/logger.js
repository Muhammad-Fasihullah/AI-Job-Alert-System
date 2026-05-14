// ============================================
//  Logger Utility — colored console output
// ============================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const PLATFORM_COLORS = {
  fiverr: COLORS.green,
  upwork: COLORS.cyan,
  linkedin: COLORS.blue,
  gemini: COLORS.magenta,
  email: COLORS.yellow,
  system: COLORS.gray,
};

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function log(platform, message, type = 'info') {
  const color = PLATFORM_COLORS[platform.toLowerCase()] || COLORS.reset;
  const prefix = `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${color}[${platform.toUpperCase()}]${COLORS.reset}`;

  switch (type) {
    case 'success':
      console.log(`${prefix} ${COLORS.green}✓${COLORS.reset} ${message}`);
      break;
    case 'error':
      console.log(`${prefix} ${COLORS.red}✗${COLORS.reset} ${message}`);
      break;
    case 'warn':
      console.log(`${prefix} ${COLORS.yellow}⚠${COLORS.reset} ${message}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

function divider(label = '') {
  const line = '─'.repeat(50);
  if (label) {
    console.log(`\n${COLORS.gray}${line}${COLORS.reset}`);
    console.log(`${COLORS.bright} ${label}${COLORS.reset}`);
    console.log(`${COLORS.gray}${line}${COLORS.reset}`);
  } else {
    console.log(`${COLORS.gray}${line}${COLORS.reset}`);
  }
}

function banner() {
  console.log(`
${COLORS.cyan}${COLORS.bright}
     ╔══════════════════════════════════════════╗
     ║      🔍 JOB ALERT SYSTEM v1.0           ║
     ║   AI-Powered Freelance Job Hunter        ║
     ╚══════════════════════════════════════════╝
${COLORS.reset}`);
}

export { log, divider, banner };
