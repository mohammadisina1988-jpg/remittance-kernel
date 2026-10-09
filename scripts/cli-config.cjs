// Select an account and StudioNet for this CLI process without changing global config.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const util = require('node:util');
const inspect = util.inspect;
util.inspect = function(value, options, ...args) {
  if (options?.depth === null && options?.colors === false) return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
  return inspect.call(this, value, options, ...args);
};
require('node:module').syncBuiltinESMExports();
const log = console.log;
console.log = (...values) => log(...values.map(value => value !== null && typeof value === 'object' ? JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item) : value));
const configPath = path.join(os.homedir(), '.genlayer', 'genlayer-config.json');
const read = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  const content = read.call(this, file, ...args);
  if (process.env.REMITTANCE_ACCOUNT && typeof file === 'string' && path.resolve(file) === configPath) {
    const config = JSON.parse(String(content));
    config.activeAccount = process.env.REMITTANCE_ACCOUNT;
    config.network = 'studionet';
    const text = JSON.stringify(config);
    return typeof content === 'string' ? text : Buffer.from(text);
  }
  return content;
};
