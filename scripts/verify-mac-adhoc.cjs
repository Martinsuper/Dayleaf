const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

module.exports = context => {
	if (context.electronPlatformName !== 'darwin') return;
	if (context.targets.some(target => target.name === 'mas' || target.name === 'mas-dev')) {
		throw new Error('Ad-hoc signing cannot be used for Mac App Store builds.');
	}
	const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
	const signature = spawnSync('codesign', ['-d', '--verbose=4', app], {
		encoding: 'utf8',
	});
	if (signature.status !== 0 || !/^Signature=adhoc$/m.test(signature.stderr || '') ||
		/^Authority=/m.test(signature.stderr || '')) {
		throw new Error('Expected a complete ad-hoc signature without a certificate authority.');
	}
	execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], {
		stdio: 'inherit',
	});
	// Gatekeeper trust rejection is expected for ad-hoc; it is not an integrity check.
};
