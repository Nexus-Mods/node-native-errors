const util = require('util');
const cp = require('child_process');

async function spawn(command, args, options) {

  const proc = cp.spawn(command, args, {
    ...(options || {}),
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  return new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0) {
	resolve();
      } else {
	let err = new Error(`process failed`);
	err.code = code;
	reject(err);
      }
    });
  });
}

async function main() {
	// git clone --recurse-submodules -j8 https://github.com/Microsoft/Detours || echo \"detours already cloned\"
  try {
    await spawn('git', ['clone', '--recurse-submodules', '-j8', 'https://github.com/Microsoft/Detours']);
  } catch (err) {
    if (err.code === 128) {
      console.log('clone failed', err.message);
    } else {
      return 1;
    }
  }

  await spawn('node', ['build_detours.js']);
  await spawn('autogypi', []);
  await spawn('node-gyp', ['configure', 'build']);
  return 0;
}

if (process.platform === 'win32') {
  return main();
} else {
  return 0;
}

