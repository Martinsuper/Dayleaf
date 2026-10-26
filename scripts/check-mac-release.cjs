module.exports = context => {
	if (context.electronPlatformName !== 'darwin') return;
	if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
		throw new Error('macOS release requires signing; remove CSC_IDENTITY_AUTO_DISCOVERY=false.');
	}
	const env = process.env;
	const hasAppleId = env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID;
	const hasApiKey = env.APPLE_API_KEY && env.APPLE_API_KEY_ID && env.APPLE_API_ISSUER;
	if (!hasAppleId && !hasApiKey && !env.APPLE_KEYCHAIN_PROFILE) {
		throw new Error('macOS release requires Apple notarization credentials. See docs/macos-release.md.');
	}
};
