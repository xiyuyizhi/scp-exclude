#!/usr/bin/env node

// process.env.NODE_ENV = "DEBUG";

const path = require("path");
const execa = require("execa");
const minimist = require("minimist");
const chalk = require("chalk");
const fs = require("fs-extra");
const semver = require("semver");
const DEV_DEBUG = ["DEVELOPMENT", "DEBUG"].includes(process.env.NODE_ENV);
const workPath = process.cwd();
const requiredVersion = require("../package.json").engines.node;
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
process.on("unhandledRejection", err => {
    if (DEV_DEBUG) {
        console.log(chalk.red(err.message));
    } else {
        console.log(err);
    }
    process.exit(1);
});

process.on("uncaughtException", err => {
    if (DEV_DEBUG) {
        console.log(chalk.red(err.message));
    } else {
        console.log(err);
    }
    process.exit(1);
});

if (args._.length < 2 || args.h || args.help) {
    geneMan();
    return;
}

function geneMan() {
    console.log(
        chalk.yellow(
            "similar to using scp command directly, except for the following differences"
        )
    );
    console.log(
        chalk.black.bgGreen(
            "1: you need list file path before other options,eg: scp-exclude  localPath root@host:remotePath -2 -P 8899"
        )
    );
    console.log(
        chalk.black.bgGreen(
            "2: you can ignore some file or directory by specified  -I or --ignore, eg:  scp-exclude test  root@host:remotePath --ignore node_modules"
        )
    );
    console.log(
        chalk.black.bgGreen(
            "3: you can see the more detail instruct at https://github.com/xiyuyizhi/scp-exclude.git"
        )
    );
}

if (checkIsUpload()) {
    const remoteAddress = args._[args._.length - 1];
    const localRootPath = args._.slice(0, args._.length - 1);
    const [remoteHost, remoteRootPath] = remoteAddress.split(":");

    localRootPath.forEach(localFile => {
        if (checkWithDot(localFile)) {
            throw new Error("not regular file");
            return;
        }
        if (checkPathToIgnore(localFile)) return;
        if (checkIsDir(localFile)) {
            uploadDir(localFile, remoteHost, remoteRootPath);
        } else {
            const newPathOnRemote = path.join(remoteRootPath, localFile);
            upload(localFile, [remoteHost, newPathOnRemote].join(":"));
        }
    });
} else {
    upload(...args._);
}

function checkIsUpload() {
    const lastArgPath = path.resolve(workPath, args._[args._.length - 1]);
    return !fs.existsSync(lastArgPath);
}

function checkWithDot(paths) {
    return new RegExp(`^\\.\\.\\${path.sep}?`).test(paths);
}

async function uploadDir(localDir, remoteHost, remoteRootPath) {
    const newPathOnRemote = path.join(remoteRootPath, localDir);
    const files = fs.readdirSync(localDir);
    if (!files.length) return;
    await mkdirRemote(newPathOnRemote, remoteHost);
    const filesBelowCurrentDir = files
        .map(file => path.join(localDir, file))
        .filter(file => !checkIsDir(file) && !checkPathToIgnore(file))
        .join(" ");
    const dirsBelowCurrentDir = files
        .map(file => path.join(localDir, file))
        .filter(file => checkIsDir(file) && !checkPathToIgnore(file));

    upload(filesBelowCurrentDir, [remoteHost, newPathOnRemote].join(":"));

    dirsBelowCurrentDir.forEach(file => {
        uploadDir(file, remoteHost, remoteRootPath);
    });
}

function upload(localPath, remote) {
    if (!localPath) return;
    const params = [...extractOptions(), ...localPath.split(" "), remote];
    if (DEV_DEBUG) {
        console.log(params);
    } else {
        execa.sync("scp", params, {
            stdio: "inherit"
        });
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
        await execa("ssh", [remoteHost, mkdirCommand]);
    }
}

function extractOptions() {
    const keys = Object.keys(args);
    const result = [];
    let noParamOption = "";
    keys.forEach(key => {
        if (key == "I" || key == "ignore") return;
        if (args[key] !== true && key !== "_") {
            result.push(`-${key}`);
            result.push(args[key]);
        }
        if (args[key] === true) {
            noParamOption = noParamOption
                ? "" + noParamOption + key
                : `-${key}`;
        }
    });
    noParamOption && result.push(noParamOption);
    return result;
}
