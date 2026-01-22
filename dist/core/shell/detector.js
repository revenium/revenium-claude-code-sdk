"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectShell = detectShell;
exports.getProfilePath = getProfilePath;
exports.validateConfigPath = validateConfigPath;
exports.getSourceCommand = getSourceCommand;
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
/**
 * Detects the current shell type based on environment variables.
 */
function detectShell() {
    const shell = process.env.SHELL || "";
    if (shell.includes("zsh")) {
        return "zsh";
    }
    if (shell.includes("fish")) {
        return "fish";
    }
    if (shell.includes("bash")) {
        return "bash";
    }
    // Fallback: check for rc files
    const home = (0, node_os_1.homedir)();
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(home, ".zshrc"))) {
        return "zsh";
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(home, ".config", "fish", "config.fish"))) {
        return "fish";
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(home, ".bashrc"))) {
        return "bash";
    }
    return "unknown";
}
/**
 * Gets the profile file path for a given shell type.
 */
function getProfilePath(shellType) {
    const home = (0, node_os_1.homedir)();
    switch (shellType) {
        case "zsh":
            return (0, node_path_1.join)(home, ".zshrc");
        case "bash":
            // Prefer .bashrc, fallback to .bash_profile
            if ((0, node_fs_1.existsSync)((0, node_path_1.join)(home, ".bashrc"))) {
                return (0, node_path_1.join)(home, ".bashrc");
            }
            return (0, node_path_1.join)(home, ".bash_profile");
        case "fish":
            return (0, node_path_1.join)(home, ".config", "fish", "config.fish");
        default:
            return null;
    }
}
/**
 * Validates that a config path contains only safe characters.
 * Throws an error if the path contains potentially dangerous characters.
 * Allows spaces since paths are properly quoted in shell commands.
 */
function validateConfigPath(path) {
    const unsafeCharsRegex = /[;|&$`"'\\<>(){}[\]!*?#\n\r\t]/;
    if (unsafeCharsRegex.test(path)) {
        throw new Error(`Invalid config path: contains unsafe characters. Path must not contain shell metacharacters like semicolons, pipes, backticks, or quotes.`);
    }
}
/**
 * Generates the source command for a given shell type.
 * Validates the config path before generating the command.
 */
function getSourceCommand(shellType, configPath) {
    validateConfigPath(configPath);
    switch (shellType) {
        case "fish":
            // Fish uses a different syntax for sourcing env files
            return `# Source Revenium Claude Code metering config\nif test -f "${configPath}"\n    export (cat "${configPath}" | grep -v '^#' | xargs -L 1)\nend`;
        default:
            // Bash and Zsh use the same syntax
            return `# Source Revenium Claude Code metering config\nif [ -f "${configPath}" ]; then\n    source "${configPath}"\nfi`;
    }
}
//# sourceMappingURL=detector.js.map