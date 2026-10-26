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
		notarize: false,
	},
};
