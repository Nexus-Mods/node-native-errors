const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function processVCVarsOutput(output) {
  const lines = output.split('\r\n');
  console.log(lines);
  lines
    .filter(line => line.indexOf('=') !== -1)
    .forEach(line => {
      const [key, value] = line.split('=', 2);
      process.env[key] = value;
    })
  /*
  const pathLine = lines.find(line => line.toLowerCase().startsWith('path='))
  process.env.PATH = pathLine.slice(5);
  */
}

function run(exe, args, cb) {
  console.log('run', exe, args);
  let lastErr;

  let output = '';

  const proc = cp.spawn(exe, args, { shell: true });
  proc
    .on('close', code => {
      console.log('close', code, lastErr);
      if (lastErr === undefined) {
        cb(null, output);
      } else {
        cb(lastErr);
      }
    })
    .on('error', err => {
      console.log('err', err);
      lastErr = err;
    });

  proc.stdout.on('data', data => output += data.toString());
  proc.stderr.on('data', data => console.error(data.toString()));
  console.log('started');
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
  const {vsInstallDir} = process.env;
  let vcvarsPath
  try {
    const candidate = path.join(vsInstallDir, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
    fs.statSync(candidate);
    vcvarsPath = candidate;
  } catch (err) {
    console.error('installed visual studio version isn\'t supported, please update build_detours.js or install VS 2017', err);
    cb(err);
    return;
  }
  runVCVars(vcvarsPath, cb);
}

vcvars(err => {
  if (err === null) {
    console.log(process.env);
    process.chdir('./Detours');
    run('nmake', [], (err, output) => {
      console.log('done', err, output);
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

