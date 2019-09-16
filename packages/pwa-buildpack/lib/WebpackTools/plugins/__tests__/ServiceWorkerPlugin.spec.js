jest.mock('workbox-webpack-plugin');
jest.mock('write-file-webpack-plugin');

jest.mock('../../../Utilities/fileHash');

const WorkboxPlugin = require('workbox-webpack-plugin');
const WriteFileWebpackPlugin = require('write-file-webpack-plugin');

const createFileHash = require('../../../Utilities/fileHash');

const FAKE_FILE_HASH = '1234';

createFileHash.mockReturnValue(Promise.resolve(FAKE_FILE_HASH));

const ServiceWorkerPlugin = require('../ServiceWorkerPlugin');

let fakeCompiler = {};

beforeAll(() => {
    const tap = jest.fn();
    fakeCompiler = {
        hooks: {
            compilation: {
                tap
            }
        }
    };
});

beforeEach(() => {
    WorkboxPlugin.GenerateSW.mockReset();
});

test('throws if options are missing', () => {
    expect(() => new ServiceWorkerPlugin({})).toThrow(
        'mode must be of type string'
    );
    expect(
        () =>
            new ServiceWorkerPlugin({
                mode: 'development'
            })
    ).toThrow('paths.output must be of type string');
});

test('returns a valid Webpack plugin', () => {
    expect(
        new ServiceWorkerPlugin({
            mode: 'development',
            runtimeCacheAssetPath: 'https://location/of/assets',
            paths: {
                output: 'path/to/assets'
            }
        })
    ).toHaveProperty('apply', expect.any(Function));
});

test('.apply calls WorkboxPlugin.GenerateSW in prod', () => {
    const plugin = new ServiceWorkerPlugin({
        mode: 'production',
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });
    const workboxApply = jest.fn();
    const fakeCompiler = {};
    WorkboxPlugin.GenerateSW.mockImplementationOnce(() => ({
        apply: workboxApply
    }));

    plugin.apply(fakeCompiler);

    expect(WriteFileWebpackPlugin).not.toHaveBeenCalled();
    expect(WorkboxPlugin.GenerateSW).toHaveBeenCalledWith(
        expect.objectContaining({
            globDirectory: 'path/to/assets',
            globPatterns: expect.arrayContaining([expect.any(String)]),
            swDest: `sw.${FAKE_FILE_HASH}.js`
        })
    );
    expect(workboxApply).toHaveBeenCalledWith(fakeCompiler);
});

test('.apply calls nothing but warns in console in dev when enableServiceWorkerDebugging is set to false', () => {
    const plugin = new ServiceWorkerPlugin({
        mode: 'development',
        enableServiceWorkerDebugging: false,
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });

    jest.spyOn(console, 'warn').mockImplementationOnce(() => {});

    plugin.apply(fakeCompiler);

    expect(WriteFileWebpackPlugin).not.toHaveBeenCalled();
    expect(WorkboxPlugin.GenerateSW).not.toHaveBeenCalled();

    expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
            `Emitting no ServiceWorker in development mode.`
        )
    );

    console.warn.mockRestore();
});

test('.apply generates and writes out a serviceworker when enableServiceWorkerDebugging is set', () => {
    const plugin = new ServiceWorkerPlugin({
        mode: 'development',
        enableServiceWorkerDebugging: true,
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });
    const workboxApply = jest.fn();
    const writeFileApply = jest.fn();
    WorkboxPlugin.GenerateSW.mockImplementationOnce(() => ({
        apply: workboxApply
    }));
    WriteFileWebpackPlugin.mockImplementationOnce(() => ({
        apply: writeFileApply
    }));

    plugin.apply(fakeCompiler);

    expect(WriteFileWebpackPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
            test: new RegExp(`sw.${FAKE_FILE_HASH}.js$`),
            log: true
        })
    );

    expect(writeFileApply).toHaveBeenCalledWith(fakeCompiler);

    expect(WorkboxPlugin.GenerateSW).toHaveBeenCalledWith(
        expect.objectContaining({
            globDirectory: 'path/to/assets',
            globPatterns: expect.arrayContaining([expect.any(String)]),
            swDest: `sw.${FAKE_FILE_HASH}.js`
        })
    );
});

test('.apply uses `InjectManifest` when `injectManifest` is `true`', () => {
    const injectManifestConfig = {
        swSrc: 'path/to/sw',
        swDest: 'path/to/dest'
    };
    const plugin = new ServiceWorkerPlugin({
        mode: 'development',
        enableServiceWorkerDebugging: true,
        injectManifest: true,
        paths: {
            output: 'path/to/assets'
        },
        injectManifestConfig
    });

    const fakeCompiler = {};
    const workboxApply = jest.fn();
    WorkboxPlugin.InjectManifest.mockImplementationOnce(() => ({
        apply: workboxApply
    }));

    plugin.apply(fakeCompiler);

    expect(WorkboxPlugin.InjectManifest).toHaveBeenCalledWith(
        expect.objectContaining(injectManifestConfig)
    );
});
