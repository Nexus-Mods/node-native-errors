const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function processVCVarsOutput(output) {
  const lines = output.split('\r\n');
  lines
    .filter(line => line.indexOf('=') !== -1)
    .forEach(line => {
      const [key, ...value] = line.split('=');
      process.env[key] = value.join(' ');
    });
}

function run(exe, args, cb) {
  let lastErr;

  let output = '';

  const proc = cp.spawn(exe, args, { shell: true });
  proc
    .on('close', code => {
      if (lastErr === undefined) {
        cb(null, output);
      } else {
        cb(lastErr);
      }
    })
    .on('error', err => {
      lastErr = err;
    });

  proc.stdout.on('data', data => output += data.toString());
  proc.stderr.on('data', data => console.error(data.toString()));
}

function runVCVars(exe, cb) {
  run('cmd.exe', ['/C', `""${exe}" && set"`], (err, output) => {
    if (output !== undefined) {
      processVCVarsOutput(output);
    }
    cb(err);
  });
}

function vcvars(cb) {
  let {vsInstallDir, VS140COMNTOOLS} = process.env;

  if (vsInstallDir === undefined) {
    vsInstallDir = path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2017', 'Community');
  }
  if (VS140COMNTOOLS === undefined) {
    VS140COMNTOOLS = path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio 14.0', 'Common7', 'Tools');
  }

  let vcvarsPath;
  try {
    const candidate = path.join(vsInstallDir, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
    fs.statSync(candidate);
    vcvarsPath = candidate;
  } catch (err) {
    try {
      const candidate = path.resolve(VS140COMNTOOLS, '..', '..', 'VC', 'bin', 'amd64', 'vcvars64.bat');
      fs.statSync(candidate);
      vcvarsPath = candidate;
    } catch (err) {
      console.error('installed visual studio version isn\'t supported, please update build_detours.js or install VS 2017', err);
      cb(err);
      return;
    }
  }
  runVCVars(vcvarsPath, cb);
}

vcvars(err => {
  if (err === null) {
    process.chdir('./Detours');
    run('nmake', [], (err, output) => {
      if (err !== null) {
        console.error('build failed', err);
        process.exit(1);
      }
      console.log('done')
      process.exit(0);
    });
  } else {
    console.error(err);
    process.exit(1);
  }
});

