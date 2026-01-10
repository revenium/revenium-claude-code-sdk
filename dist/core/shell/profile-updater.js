"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShellProfile = updateShellProfile;
exports.getManualInstructions = getManualInstructions;
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const detector_js_1 = require("./detector.js");
const writer_js_1 = require("../config/writer.js");
/** Marker comment to identify our configuration block */
const CONFIG_MARKER_START = '# >>> revenium-claude-code-metering >>>';
const CONFIG_MARKER_END = '# <<< revenium-claude-code-metering <<<';
/**
 * Checks if the shell profile already has the Revenium source command.
 */
async function hasReveniumConfig(profilePath) {
    if (!(0, node_fs_1.existsSync)(profilePath)) {
        return false;
    }
    const content = await (0, promises_1.readFile)(profilePath, 'utf-8');
    return content.includes(CONFIG_MARKER_START);
}
/**
 * Generates the complete configuration block for the shell profile.
 */
function generateConfigBlock(shellType, configPath) {
    const sourceCmd = (0, detector_js_1.getSourceCommand)(shellType, configPath);
    return `\n${CONFIG_MARKER_START}\n${sourceCmd}\n${CONFIG_MARKER_END}\n`;
}
/**
 * Removes existing Revenium configuration from profile content.
 */
function removeExistingConfig(content) {
    const startIndex = content.indexOf(CONFIG_MARKER_START);
    const endIndex = content.indexOf(CONFIG_MARKER_END);
    if (startIndex === -1 || endIndex === -1) {
        return content;
    }
    const before = content.substring(0, startIndex).trimEnd();
    const after = content.substring(endIndex + CONFIG_MARKER_END.length).trimStart();
    return before + (after ? '\n' + after : '');
}
/**
 * Updates the shell profile to source the Revenium configuration file.
 * Returns details about the update operation.
 */
async function updateShellProfile() {
    const shellType = (0, detector_js_1.detectShell)();
    if (shellType === 'unknown') {
        return {
            success: false,
            shellType,
            message: 'Could not detect shell type. Please manually add the source command to your shell profile.',
        };
    }
    const profilePath = (0, detector_js_1.getProfilePath)(shellType);
    if (!profilePath) {
        return {
            success: false,
            shellType,
            message: `Could not determine profile path for ${shellType}.`,
        };
    }
    const configPath = (0, writer_js_1.getConfigFilePath)();
    // Check if already configured
    if (await hasReveniumConfig(profilePath)) {
        // Remove existing and re-add (in case config path changed)
        let content = await (0, promises_1.readFile)(profilePath, 'utf-8');
        content = removeExistingConfig(content);
        const configBlock = generateConfigBlock(shellType, configPath);
        await (0, promises_1.writeFile)(profilePath, content + configBlock, 'utf-8');
        return {
            success: true,
            shellType,
            profilePath,
            message: `Updated existing configuration in ${profilePath}`,
        };
    }
    // Add new configuration
    let content = '';
    if ((0, node_fs_1.existsSync)(profilePath)) {
        content = await (0, promises_1.readFile)(profilePath, 'utf-8');
    }
    const configBlock = generateConfigBlock(shellType, configPath);
    await (0, promises_1.writeFile)(profilePath, content + configBlock, 'utf-8');
    return {
        success: true,
        shellType,
        profilePath,
        message: `Added configuration to ${profilePath}`,
    };
}
/**
 * Gets instructions for manual shell profile configuration.
 */
function getManualInstructions(shellType) {
    const configPath = (0, writer_js_1.getConfigFilePath)();
    const sourceCmd = (0, detector_js_1.getSourceCommand)(shellType, configPath);
    const profilePath = (0, detector_js_1.getProfilePath)(shellType);
    return `Add the following to ${profilePath || 'your shell profile'}:\n\n${sourceCmd}`;
}
//# sourceMappingURL=profile-updater.js.map