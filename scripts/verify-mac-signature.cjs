const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

module.exports = context => {
	if (context.electronPlatformName !== 'darwin') return;
	// Mac App Store builds use a separate trust and distribution path.
	if (context.targets.some(target => target.name === 'mas' || target.name === 'mas-dev')) return;
	const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
	const signature = spawnSync('codesign', ['-d', '--verbose=4', app], {
		encoding: 'utf8',
	});
	if (signature.status !== 0 || !signature.stderr.includes('Authority=Developer ID Application:')) {
		throw new Error('macOS distribution requires a Developer ID Application signature.');
	}
	execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
	execFileSync('xcrun', ['stapler', 'validate', app], { stdio: 'inherit' });
	execFileSync('spctl', ['--assess', '--type', 'execute', '--verbose=4', app], { stdio: 'inherit' });
};
