(function (App) {
    'use strict';
    App.start();

    /* load all the things ! */
    var Q = require('q');
    var fs = require('fs');

    function loadLocalProviders() {
        var appPath = '';
        var providerPath = './src/app/lib/providers/';

        var files = fs.readdirSync(providerPath);

        return files.map(function (file) {
            if (!file.match(/\.js$/)) {
                return null;
            }

            if (file.match(/generic.js$/)) {
                return null;
            }

            console.log('loading local provider', file);

            var q = Q.defer();

            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');

            script.type = 'text/javascript';
            script.src = 'lib/providers/' + file;

            script.onload = function () {
                console.log('loaded', file);
                q.resolve(file);
            };

            head.appendChild(script);

            return q.promise;
        }).filter(function (q) {
            return q;
        });
    }

    function loadNpmProviders() {
        return loadFromPackageJSON(/butter-provider-/, App.Providers.install);
    }

    function loadNpmSettings() {
        return Q.all(loadFromPackageJSON(/butter-settings-/, function (settings) {
            Settings = _.extend(Settings, settings);
        }));
    }

    function loadFromPackageJSON(regex, fn) {
        var config = require('../../package.json');

        var packages = Object.keys(config.dependencies).filter(function (p) {
            return p.match(regex);
        });

        return packages.map(function (name) {
            console.log('loading npm', regex, name);
            return loadFromNPM(name, fn);
        });
    }

    function loadFromNPM(name, fn) {
        var P = require(name);

        return Q(fn(P));
    }

    function loadProviders() {
        return Q.all(loadLocalProviders().concat(loadNpmProviders()));
    }

    App.bootstrapPromise = loadNpmSettings()
        .then(loadProviders)
        .then(function (values) {
            return _.filter(_.keys(Settings.providers).map(function (type) {
                return {
                    provider: App.Config.getProviderForType(type),
                    type: type
                };
            }), function (p) {
                return p.provider;
            });
        })
        .then(function (providers) {
            App.TabTypes = {};

            _.each(providers, function (p) {
                var name = Settings.providers[p.type]
                if (name.name) {
                    name = name.name;
                } else {
                    console.error ('warning', 'provider', p,
                                   'did not declare a name in Settings',
                                   'will use type as name, but it\'s sub-ideal.');
                    name = p.type.capitalize();
                }

                App.TabTypes[p.type] = name;
            });

            return providers;
        })
        .then(function (providers) {
            console.log('loaded', providers);
        });

})(window.App);
