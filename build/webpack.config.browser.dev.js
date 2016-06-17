// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

import devConfig from './webpack.config.base.snippets.dev';
import browserConfig from './webpack.config.browser.default';

export default {
  ...devConfig,
  ...browserConfig,
  output: {
    ...devConfig.output,
    ...browserConfig.output,
  },
  plugins: [
    ...devConfig.plugins,
    ...browserConfig.plugins,
  ],
};
