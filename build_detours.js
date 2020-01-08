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

function testDirsForVcvars64Bat(dirs) {
  let lastError;
  for (const dir of dirs) {
    try {
      const candidate = path.join(dir, "vcvars64.bat");
      fs.statSync(candidate);
      return candidate;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError !== undefined) {
    throw lastError;
  }
}

function vcvars(cb) {
  // search locations: VS 2017 Community Edition, VS 2017 Build Tools and VS 14
  const {
    vsInstallDir = path.join(
      process.env["ProgramFiles(x86)"],
      "Microsoft Visual Studio",
      "2017",
      "Community",
      "VC",
      "Auxiliary",
      "Build"
    ),
    VSBUILDTOOLSDIR = path.join(
      process.env["ProgramFiles(x86)"],
      "Microsoft Visual Studio",
      "2017",
      "BuildTools",
      "VC",
      "Auxiliary",
      "Build"
    ),
    VS140COMNTOOLS = path.join(
      process.env["ProgramFiles(x86)"],
      "Microsoft Visual Studio 14.0",
      "VC",
      "bin",
      "amd64"
    )
  } = process.env;

  try {
    const vsvarsPath = testDirsForVcvars64Bat([
      vsInstallDir,
      VSBUILDTOOLSDIR,
      VS140COMNTOOLS
    ]);
    runVCVars(vsvarsPath, cb);
  } catch (err) {
    console.error(
      "installed visual studio version isn't supported, please update build_detours.js or install VS 2017",
      err
    );
    cb(err);
  }
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

