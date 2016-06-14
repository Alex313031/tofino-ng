// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

import { SRC_DIR } from './webpack.config.main.default';
import webpackProdConfig from './webpack.config.main.prod';
import webpackDevConfig from './webpack.config.main.dev';
import { shouldRebuild, getBuildConfig, webpackBuild } from './utils';
import { logger } from './logging';

export default async function() {
  const id = 'main process';

  if (!(await shouldRebuild(SRC_DIR, id))) {
    logger.info(`No changes in ${id}.`);
    return { close: () => {} };
  }

  logger.info(`Building ${id}...`);
  const { development } = getBuildConfig();
  return await webpackBuild(development ? webpackDevConfig : webpackProdConfig);
}
