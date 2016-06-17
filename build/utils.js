// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

import colors from 'colors/safe';
import os from 'os';
import path from 'path';
import fs from 'fs-promise';
import childProcess from 'child_process';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import dirsum from 'dirsum';
import webpack from 'webpack';
import { thenify } from 'thenify-all';
import manifest from '../package.json';
import { logger } from './logging';

export const IS_TRAVIS = process.env.TRAVIS === 'true';
export const IS_APPVEYOR = process.env.APPVEYOR === 'True';

export function getElectronExecutable() {
  return {
    win32: 'electron.exe',
    darwin: path.join('Electron.app', 'Contents', 'MacOS', 'Electron'),
    linux: 'electron',
  };
}

// We cache the download in a private place since these builds may not be
// official Electron builds.
export function getDownloadOptions() {
  return {
    mirror: manifest._electron.mirror,
    customDir: manifest._electron.revision,
    version: manifest._electron.version,
    cache: path.join(__dirname, '..', '.cache'),
    strictSSL: true,
  };
}

export function getAppVersion() {
  return manifest.version;
}

export function getRoot() {
  return path.dirname(__dirname);
}

export function safeGetBuildConfig() {
  try {
    return getBuildConfig();
  } catch (e) {
    return {};
  }
}

export function getBuildConfig() {
  const file = path.join(__dirname, '..', 'build-config.json');
  return fs.readJsonSync(file);
}

export function writeBuildConfig(obj) {
  const file = path.join(__dirname, '..', 'build-config.json');
  return fs.writeJsonSync(file, obj, { spaces: 2 });
}

export function getManifest() {
  return manifest;
}

export function getElectronRoot() {
  return path.join(__dirname, '..', '.electron');
}

export function getElectronPath() {
  return path.join(getElectronRoot(), getElectronExecutable()[os.platform()]);
}

// This intentionally throws an exception if electron hasn't been downloaded yet.
export function getElectronVersion() {
  const versionFile = path.join(getElectronRoot(), 'version');
  const version = fs.readFileSync(versionFile, { encoding: 'utf8' });

  // Trim off the leading 'v'.
  return version.trim().substring(1);
}

// Use a windows `.cmd` command if available.
export async function normalizeCommand(command) {
  if (os.type() === 'Windows_NT') {
    try {
      // Prefer a cmd version if available
      const testCommand = `${command}.cmd`;
      const stats = await fs.stat(testCommand);
      if (stats.isFile()) {
        command = testCommand;
      }
    } catch (e) {
      // Ignore missing files.
    }
  }
  return command;
}

export async function spawn(command, args, options = {}) {
  command = await normalizeCommand(command);
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, options);

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Child process ${command} exited with exit code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export function webpackBuild(config) {
  let incremental = false;

  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    const watcher = compiler.watch({}, (err, stats) => {
      if (err) {
        // Failed with a fatal error.
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        // Failed with a build error.
        const output = stats.toString({
          colors: true,
          hash: true,
          version: true,
          timings: true,
          assets: true,
          chunks: true,
          chunkModules: false,
          modules: true,
          children: true,
          cached: true,
          reasons: true,
          source: true,
          errorDetails: true,
          chunkOrigins: true,
        });
        // Rejecting immediately would result in garbled text if other
        // logging operations follow. Furthermore, if the process exits,
        // it will stop the logging midway, resulting in incomplete output.
        logger.error(`\n${output}\n`);
        process.stderr.once('drain', () => reject('Compilation unsuccessful.'));
        return;
      }

      /* eslint-disable no-shadow */
      resolve({
        close: () => new Promise(resolve => watcher.close(resolve)),
      });
      /* eslint-enable no-shadow */

      // Per webpack's documentation, this handler can be called multiple times,
      // e.g. when a build has been completed, or an error or warning has occurred.
      // It even can occur that handler is called for the same bundle multiple times.
      // So just keep that in mind.
      if (!incremental) {
        incremental = true;
        return;
      }

      const { time } = stats.toJson();
      logger.info(`Incremental build succeeded in ${time} ms.`);
    });
  });
}

export async function sourcesChanged(...sources) {
  const results = [];

  for (const [source, id] of sources) {
    const { changed, hash } = await sourceChanged([source, id]);
    if (changed) {
      results.push({ hash, id });
    }
  }

  return results;
}

export async function sourceChanged([source, id]) {
  logger.info(colors.gray('Checking source', source));

  const { hash } = await thenify(dirsum.digest)(source, 'sha1');
  const currentConfig = getBuildConfig();

   // The `built` property contains hashes of the previously built sources.
   // These are used to prevent redundant rebuilds.

  if (!('built' in currentConfig)) {
    logger.info(colors.yellow(`No previous '${id}' hash found.`));
    return { changed: true, hash };
  }
  if (!(id in currentConfig.built)) {
    logger.info(colors.yellow(`No previous '${id}' hash found.`));
    return { changed: true, hash };
  }
  if (currentConfig.built[id] !== hash) {
    logger.info(colors.yellow(`Source changed for '${id}'.`));
    return { changed: true, hash };
  }

  return { changed: false, hash };
}

export function buildConfigChanged() {
  const baseConfig = require('./base-config').default; // eslint-disable-line
  const currentConfig = getBuildConfig();
  const sanitizedConfig = pick(currentConfig, Object.keys(baseConfig));
  const previousConfig = currentConfig.prev;

  if (!isEqual(sanitizedConfig, previousConfig)) {
    logger.info(colors.yellow('Build config changed.'));
    return true;
  }

  return false;
}

export async function shouldRebuild(...sources) {
  const changedSources = await sourcesChanged(...sources);
  const currentConfig = getBuildConfig();

  for (const { hash, id } of changedSources) {
    currentConfig.built = currentConfig.built || {};
    currentConfig.built[id] = hash;
  }

  if (changedSources.length) {
    writeBuildConfig(currentConfig);
    return true;
  }

  // Even if the sources haven't changed, always rebuild if the
  // build configuration file has. Use `require` to import the base
  // configuration file to avoid a circular dependency.

  if (buildConfigChanged()) {
    return true;
  }

  return false;
}
