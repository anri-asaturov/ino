import { execSync } from 'child_process';

export function generateVersion() {
  try {
    // Get short git commit hash
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

    // Get current UTC timestamp in MMDDhhmm format
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    const second = String(now.getUTCSeconds()).padStart(2, '0');

    const timestamp = `${month}${day}${hour}${minute}${second}`;

    // Combine git hash and timestamp
    const version = `${gitHash}_${timestamp}`;

    // Set environment variable
    process.env.VITE_APP_VERSION = version;

    console.log(`Generated version: ${version}`);
    return version;
  } catch (error) {
    console.error('Error generating version:', error);
    // Fallback version if git is not available
    const fallbackVersion = `fallback${Date.now()}`;
    process.env.VITE_APP_VERSION = fallbackVersion;
    return fallbackVersion;
  }
}
