import { beforeEach, describe, expect, it, vi } from 'vitest';

const { writeSyncSpy, writeTempSpy } = vi.hoisted(() => ({
  writeSyncSpy: vi.fn(),
  writeTempSpy: vi.fn(),
}));

vi.mock('../../utils/VirtualModule', () => {
  return {
    default: class MockVirtualModule {
      name: string;

      constructor(name: string) {
        this.name = name;
      }

      getPath() {
        return `/virtual/${this.name}.js`;
      }

      getImportId() {
        return `virtual:${this.name}`;
      }

      writeSync = writeSyncSpy;
    },
  };
});

vi.mock('../../utils/localSharedImportMap_temp', () => {
  return {
    getLocalSharedImportMapPath_temp: () => '/virtual/localSharedImportMap.js',
    writeLocalSharedImportMap_temp: writeTempSpy,
  };
});

vi.mock('../../utils/normalizeModuleFederationOptions', () => {
  return {
    getNormalizeModuleFederationOptions: () => ({
      name: 'host',
      filename: 'remoteEntry.js',
      remotes: {},
      shareScope: 'default',
      runtimePlugins: [],
      shareStrategy: 'version-first',
    }),
    getNormalizeShareItem: (pkg: string) => ({
      name: pkg,
      from: '',
      version: '19.2.4',
      scope: 'default',
      shareConfig: {
        singleton: true,
        requiredVersion: '^19.2.4',
        strictVersion: false,
      },
    }),
  };
});

vi.mock('../virtualRemotes', () => {
  return {
    getUsedRemotesMap: () => ({}),
  };
});

vi.mock('../virtualShared_preBuild', () => {
  return {
    getPreBuildLibImportId: (pkg: string) => `virtual:prebuild:${pkg}`,
  };
});

describe('virtualRemoteEntry', () => {
  beforeEach(async () => {
    writeSyncSpy.mockClear();
    writeTempSpy.mockClear();
    vi.resetModules();
  });

  for (const testCase of [
    {
      name: 'keeps react as a direct import in localSharedImportMap',
      pkg: 'react',
      expectedImport: 'let pkg = await import("react");',
      expectedExportShape: '? (res?.default ?? res)',
      unexpectedImport: 'virtual:shared-provider:react',
      expectedLoaded: 'loaded: true',
    },
    {
      name: 'uses prebuild import for non-react modules in localSharedImportMap',
      pkg: 'vue',
      expectedImport: 'virtual:prebuild:vue',
      expectedExportShape: ': {...res}',
      unexpectedImport: 'let pkg = await import("vue");',
      expectedLoaded: 'loaded: false',
    },
  ]) {
    it(testCase.name, async () => {
      const mod = await import('../virtualRemoteEntry');

      mod.getUsedShares().clear();
      mod.addUsedShares(testCase.pkg);

      const code = mod.generateLocalSharedImportMap();

      expect(code).toContain(testCase.expectedImport);
      expect(code).toContain(testCase.expectedExportShape);
      expect(code).toContain(testCase.expectedLoaded);
      expect(code).not.toContain(testCase.unexpectedImport);
    });
  }

  it('writes host auto init waiting on __tla before init', async () => {
    const mod = await import('../virtualRemoteEntry');

    mod.writeHostAutoInit('virtual:test-remote-entry');

    expect(writeSyncSpy).toHaveBeenCalled();
    const generatedCode = writeSyncSpy.mock.calls.at(-1)?.[0] as string;

    expect(generatedCode).toContain(
      'const remoteEntry = await import("virtual:test-remote-entry");'
    );
    expect(generatedCode).toContain('await remoteEntry.init();');
    expect(generatedCode).not.toContain('Promise.resolve(remoteEntry.__tla)');
    expect(generatedCode).not.toContain('.then(remoteEntry.init)');
    expect(generatedCode).not.toContain('.catch(remoteEntry.init)');
  });

  it('inlines a dedicated build-only initResolve bootstrap into remoteEntry', async () => {
    const mod = await import('../virtualRemoteEntry');

    const code = mod.generateRemoteEntry(
      {
        name: 'host',
        filename: 'remoteEntry.js',
        remotes: {},
        runtimePlugins: [],
        shareScope: 'default',
        shareStrategy: 'version-first',
      } as any,
      'virtual:exposes',
      'build'
    );

    expect(code).toContain('const __mfResolveGlobalKey =');
    expect(code).toContain('const initResolve = __mfResolveState.initResolve;');
    expect(code).not.toContain('import { initResolve } from');
  });
});
