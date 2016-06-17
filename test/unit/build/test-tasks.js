// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

import expect from 'expect';
import fs from 'fs-promise';
import omit from 'lodash/omit';

import { autoFailingAsyncTest } from '../../utils/async.js';
import BASE_CONFIG from '../../../build/base-config.js';
import { overwriteConfig } from '../../../build/task-config-builder.js';
import clean from '../../../build/task-clean-package.js';
import * as utils from '../../../build/utils.js';
import * as BuildConst from '../../../build/const.js';

describe('build tasks', () => {
  // Tests might be running on both production and development builds, so
  // there's no guarantee as to what `development` flag is set in the config.
  const baseConfigToCheckAgainst = omit(BASE_CONFIG, 'development');

  it('should have a proper `build-config.json` while testing', () => {
    expect(utils.getBuildConfig()).toContain(baseConfigToCheckAgainst);
  });

  it('should have a working `config` task', autoFailingAsyncTest(async function() {
    const initialConfig = utils.getBuildConfig();
    expect(initialConfig.foo).toNotExist();

    await overwriteConfig({ foo: 'bar' });

    const loadedConfig = utils.getBuildConfig();
    expect(loadedConfig.foo).toBe('bar');
    expect(loadedConfig).toContain(baseConfigToCheckAgainst);

    utils.writeBuildConfig(initialConfig);
    const reloadedConfig = utils.getBuildConfig();
    expect(reloadedConfig.foo).toNotExist();
    expect(reloadedConfig).toContain(baseConfigToCheckAgainst);
  }));

  it('should have a working `clean` task', autoFailingAsyncTest(async function() {
    fs.ensureDir(BuildConst.PACKAGED_DIST_DIR);

    let cleaned = false;
    await clean();
    try {
      await fs.stat(BuildConst.PACKAGED_DIST_DIR);
    } catch (err) {
      cleaned = err;
    }
    expect(cleaned).toMatch(/no such file or directory/);
  }));
});
