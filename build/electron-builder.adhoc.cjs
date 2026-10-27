const { build } = require('../package.json');

// Explicit identity avoids selecting a local development/revoked certificate.
// electron-builder signs Electron's nested binaries from the inside out.
module.exports = {
	...build,
	forceCodeSigning: false,
	afterSign: './scripts/verify-mac-adhoc.cjs',
	mac: {
		...build.mac,
		target: ['dmg'],
		identity: '-',
		// Ad-hoc signatures have no Team ID. Hardened runtime library validation
		// rejects Electron Framework at launch even when codesign --verify passes.
		// Developer ID releases keep hardened runtime enabled in the base config.
		hardenedRuntime: false,
		notarize: false,
	},
};
