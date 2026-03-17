import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/packageUtils', () => ({
  setPackageDetectionCwd: vi.fn(),
}));

import { proxySharedModule } from '../pluginProxySharedModule_preBuild';
import { NormalizedShared } from '../../utils/normalizeModuleFederationOptions';

function makeShared(): NormalizedShared {
  return {
    react: {
      name: 'react',
      from: '',
      version: '19.2.4',
      scope: 'default',
      shareConfig: {
        singleton: true,
        requiredVersion: '^19.2.4',
        strictVersion: false,
      },
    },
    vue: {
      name: 'vue',
      from: '',
      version: '3.4.0',
      scope: 'default',
      shareConfig: {
        singleton: false,
        requiredVersion: '^3.4.0',
        strictVersion: false,
      },
    },
  };
}

describe('pluginProxySharedModule_preBuild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const testCase of [
    {
      name: 'does not proxy react through loadShare in serve mode',
      source: 'react',
      command: 'serve',
      aliasExpected: false,
      shouldProxy: false,
    },
    {
      name: 'proxies react through loadShare in build mode',
      source: 'react',
      command: 'build',
      aliasExpected: true,
      shouldProxy: true,
    },
    {
      name: 'proxies non-react shared modules through loadShare in serve mode',
      source: 'vue',
      command: 'serve',
      aliasExpected: true,
      shouldProxy: true,
    },
    {
      name: 'proxies non-react shared modules through loadShare in build mode',
      source: 'vue',
      command: 'build',
      aliasExpected: true,
      shouldProxy: true,
    },
  ]) {
    it(testCase.name, async () => {
      const plugins = proxySharedModule({ shared: makeShared() });
      const proxyPlugin = plugins[1];
      const config = {
        resolve: {
          alias: [] as Array<{
            find: RegExp;
            customResolver?: (source: string, importer: string) => unknown;
          }>,
        },
      };

      proxyPlugin.config?.call(
        {
          meta: {},
          resolve: async (id: string) => ({ id: `/resolved/${id}` }),
        },
        config as any,
        {
          command: testCase.command,
          mode: 'development',
        }
      );

      const alias = config.resolve.alias.find((entry) => entry.find.test(testCase.source));
      if (!testCase.aliasExpected) {
        expect(alias).toBeUndefined();
        return;
      }

      expect(alias).toBeDefined();

      if (testCase.shouldProxy) {
        expect(alias?.customResolver).toBeTypeOf('function');
        return;
      }

      const resolution = await alias?.customResolver?.call(
        {
          resolve: async (id: string) => ({ id: `/resolved/${id}` }),
        },
        testCase.source,
        '/src/main.ts'
      );
      expect(resolution).toBeUndefined();
    });
  }
});
