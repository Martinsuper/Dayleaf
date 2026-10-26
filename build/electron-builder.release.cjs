// Keep local development builds available; distribution must fail closed.
const { build } = require('../package.json');

module.exports = {
	...build,
	forceCodeSigning: true,
	beforePack: './scripts/check-mac-release.cjs',
	mac: {
		...build.mac,
		identity: 'Developer ID Application',
	},
};
