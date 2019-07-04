if (process.platform !== 'win32') {
  module.exports = {
    InitHook: () => undefined,
  };
  return;
}

let winapi;

try {
  winapi = require('./build/Debug/native-errors');
} catch (err) {
  winapi = require('./build/Release/native-errors');
}

module.exports = winapi;
