import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { ShellType } from '../../types/index.js';

/**
 * Detects the current shell type based on environment variables.
 */
export function detectShell(): ShellType {
  const shell = process.env.SHELL || '';

  if (shell.includes('zsh')) {
    return 'zsh';
  }
  if (shell.includes('fish')) {
    return 'fish';
  }
  if (shell.includes('bash')) {
    return 'bash';
  }

  // Fallback: check for rc files
  const home = homedir();
  if (existsSync(join(home, '.zshrc'))) {
    return 'zsh';
  }
  if (existsSync(join(home, '.config', 'fish', 'config.fish'))) {
    return 'fish';
  }
  if (existsSync(join(home, '.bashrc'))) {
    return 'bash';
  }

  return 'unknown';
}

/**
 * Gets the profile file path for a given shell type.
 */
export function getProfilePath(shellType: ShellType): string | null {
  const home = homedir();

  switch (shellType) {
    case 'zsh':
      return join(home, '.zshrc');
    case 'bash':
      // Prefer .bashrc, fallback to .bash_profile
      if (existsSync(join(home, '.bashrc'))) {
        return join(home, '.bashrc');
      }
      return join(home, '.bash_profile');
    case 'fish':
      return join(home, '.config', 'fish', 'config.fish');
    default:
      return null;
  }
}

/**
 * Generates the source command for a given shell type.
 */
export function getSourceCommand(shellType: ShellType, configPath: string): string {
  switch (shellType) {
    case 'fish':
      // Fish uses a different syntax for sourcing env files
      return `# Source Revenium Claude Code metering config\nif test -f ${configPath}\n    export (cat ${configPath} | grep -v '^#' | xargs -L 1)\nend`;
    default:
      // Bash and Zsh use the same syntax
      return `# Source Revenium Claude Code metering config\nif [ -f "${configPath}" ]; then\n    source "${configPath}"\nfi`;
  }
}
