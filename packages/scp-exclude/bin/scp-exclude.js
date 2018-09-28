#!/usr/bin/env node

const path = require('path');
const execa = require('execa');
const minimist = require('minimist');
const chalk = require('chalk');
const fs = require('fs-extra');
const semver = require('semver');
const DEV_DEBUG = ['DEVELOPMENT', 'DEBUG'].includes(process.env.NODE_ENV);
const workPath = process.cwd();
const requiredVersion = require('../package.json').engines.node;
const args = minimist(process.argv.slice(2));
args.ignore = args.ignore || args.I;
const ignorePatternList = args.ignore
  ? args.ignore.split(/(,|，)/).map(x => new RegExp(x))
  : [];

if (!semver.satisfies(process.version, requiredVersion)) {
  console.log(
    chalk.red(
      `scp-exclude require node version ${requiredVersion},but the node version on you machine is ${
        process.version
      }`
    )
  );
  return;
}
process.on('unhandledRejection', err => {
  console.log(chalk.red(err.message));
  process.exit(1);
});

process.on('uncaughtException', err => {
  console.log(chalk.red(err.message));
  process.exit(1);
});

if (args._.length !== 2 || args.h || args.help) {
  geneMan();
  return;
}

function geneMan() {
  console.log(
    chalk.yellow(
      'similar to using scp command directly, except for the following differences'
    )
  );
  console.log(
    chalk.black.bgGreen(
      '1: you need list file path before other options,eg: scp-exclude  localPath root@host:remotePath -2 -P 8899'
    )
  );
  console.log(
    chalk.black.bgGreen(
      '2: you can ignore some file or directory by specified  -I or --ignore, eg:  scp-exclude test  root@host:remotePath --ignore node_modules'
    )
  );
  console.log(
    chalk.black.bgGreen(
      '3: you can see the more detail instruct at https://github.com/xiyuyizhi/scp-exclude.git'
    )
  );
}

if (checkIsUpload()) {
  const remoteAddress = args._[1];
  const localRootPath = args._[0];
  const [remoteHost, remoteRootPath] = remoteAddress.split(':');
  if (checkWithDot(localRootPath)) {
    throw new Error('not regular file');
    return;
  }
  scp(remoteHost, remoteRootPath, localRootPath);
} else {
  upload(...args._);
}

function checkIsUpload() {
  const lastArgPath = path.resolve(workPath, args._[1]);
  return !fs.existsSync(lastArgPath);
}

function checkWithDot(paths) {
  return new RegExp(`^\\.\\.\\${path.sep}?`).test(paths);
}

async function scp(remoteHost, remoteRootPath, localDir) {
  const newPathOnRemote = path.join(remoteRootPath, localDir);
  if (checkPathToIgnore(localDir)) return;

  if (checkIsDir(localDir)) {
    const files = fs.readdirSync(localDir);
    if (!files.length) return;
    await mkdirRemote(newPathOnRemote, remoteHost);
    files.forEach(file => {
      const currentLocalPath = path.join(localDir, file);
      scp(remoteHost, remoteRootPath, currentLocalPath);
    });
  } else {
    await upload(localDir, [remoteHost, newPathOnRemote].join(':'));
  }
}

function checkPathToIgnore(path) {
  for (reg of ignorePatternList) {
    if (reg.test(path)) return true;
  }
  return;
}

function checkIsDir(path) {
  return fs.statSync(path).isDirectory();
}

async function mkdirRemote(dir, remoteHost) {
  const mkdirCommand = `mkdir -p ${dir}`;
  if (DEV_DEBUG) {
    console.log(`${remoteHost} --- ${mkdirCommand}`);
  } else {
    await execa('ssh', [remoteHost, mkdirCommand]);
  }
}

function upload(...a) {
  const params = [...extractOptions(), ...a];
  if (DEV_DEBUG) {
    console.log(params);
  } else {
    execa.sync('scp', params, {
      stdio: 'inherit'
    });
  }
}

function extractOptions() {
  const keys = Object.keys(args);
  const result = [];
  let noParamOption = '';
  keys.forEach(key => {
    if (key == 'I' || key == 'ignore') return;
    if (args[key] !== true && key !== '_') {
      result.push(`-${key}`);
      result.push(args[key]);
    }
    if (args[key] === true) {
      noParamOption = noParamOption ? '' + noParamOption + key : `-${key}`;
    }
  });
  noParamOption && result.push(noParamOption);
  return result;
}
