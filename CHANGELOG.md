### Changelog

#### [9.0.0](https://github.com/aptoma/hapi-log/compare/8.1.2...9.0.0) 2023-08-22

- Remove prepended tag "log" on server.log [`e96f935`](https://github.com/aptoma/hapi-log/commit/e96f935720d6cc886391bd0a2583ac0aebe5cb5f)

#### [8.1.2](https://github.com/aptoma/hapi-log/compare/8.1.1...8.1.2) 2022-05-11

- Fix filename for auto-changelog config [`ebb13b8`](https://github.com/aptoma/hapi-log/commit/ebb13b88c11dfaf61b103e69ac381d6cb1425088)

#### [8.1.1](https://github.com/aptoma/hapi-log/compare/8.1.0...8.1.1) 2022-05-11

- Add auto-changelog and upgrade release-it [`f1c3cb2`](https://github.com/aptoma/hapi-log/commit/f1c3cb21196e33e55a5709b6ae2b5df23f70b5e0)

#### [8.1.0](https://github.com/aptoma/hapi-log/compare/8.0.0...8.1.0) 2022-05-11

- Add option ignoreMethods [`feb3a1a`](https://github.com/aptoma/hapi-log/commit/feb3a1a1b1714c2094efa32d94f694c113462d7c)

### [8.0.0](https://github.com/aptoma/hapi-log/compare/7.1.1...8.0.0) 2022-03-03

- Add option ignorePaths [`af09855`](https://github.com/aptoma/hapi-log/commit/af0985531c54c5a27c23df606106e9a20fc4c8f1)
- Require node 16 and update deps [`079952e`](https://github.com/aptoma/hapi-log/commit/079952e04d93db5907ca9df2976080d2b63d2a71)

#### [7.1.1](https://github.com/aptoma/hapi-log/compare/7.1.0...7.1.1) 2022-01-20

- Update hoek to get rid of deprecation warnings [`1e5c252`](https://github.com/aptoma/hapi-log/commit/1e5c252e466a1fcd8a5b02fd45e8d57c78fb0466)

#### [7.1.0](https://github.com/aptoma/hapi-log/compare/7.0.1...7.1.0) 2020-06-24

- Colorize log lines based on tag values [`734d099`](https://github.com/aptoma/hapi-log/commit/734d099b48a1c04036b51a2f9cdbd50e504f2b82)
- Move moment back to a regular dependency [`5104ccd`](https://github.com/aptoma/hapi-log/commit/5104ccdfad3e37cb584dfca99a6124f2f8688d8a)

#### [7.0.1](https://github.com/aptoma/hapi-log/compare/7.0.0...7.0.1) 2020-05-12

- Fix default date formatter that used day as hour. [`6233423`](https://github.com/aptoma/hapi-log/commit/6233423d33e0c5f123935e87d9f802a80939a8b1)

### [7.0.0](https://github.com/aptoma/hapi-log/compare/6.0.0...7.0.0) 2020-04-24

- Remove sonic-boom, use process.stdout.write as default [`3eb452b`](https://github.com/aptoma/hapi-log/commit/3eb452b33b0a5da0f16c36ef8b0038a58f42dfea)

### [6.0.0](https://github.com/aptoma/hapi-log/compare/5.0.1...6.0.0) 2020-04-20

- Improve performance [`9f9c1c2`](https://github.com/aptoma/hapi-log/commit/9f9c1c2a20042299180032afc080fd3c8130ee67)

#### [5.0.1](https://github.com/aptoma/hapi-log/compare/5.0.0...5.0.1) 2020-02-24

- Handle pretty printing of console.log of unexpected format [`1ddf053`](https://github.com/aptoma/hapi-log/commit/1ddf053a3972322d6149420bb62ebbe5df8d3744)

### [5.0.0](https://github.com/aptoma/hapi-log/compare/4.3.0...5.0.0) 2019-07-02

- Update deps [`70edf5c`](https://github.com/aptoma/hapi-log/commit/70edf5c8d9b61e5f1e9236e3025320c5af4e49b5)

#### [4.3.0](https://github.com/aptoma/hapi-log/compare/4.2.1...4.3.0) 2018-10-02

- Don’t log handled errors when using onPreResponse [`6454508`](https://github.com/aptoma/hapi-log/commit/645450815cb2890c87a2be7511e0c7c3e8f7afdc)

#### [4.2.1](https://github.com/aptoma/hapi-log/compare/4.2.0...4.2.1) 2018-04-11

- Fix bug with logged errors not showing in log output [`89e95d4`](https://github.com/aptoma/hapi-log/commit/89e95d4b13841e6d1978d419eddcc8701bf7c0e5)
- Update changelog [`068586d`](https://github.com/aptoma/hapi-log/commit/068586ddad0088222c6dd8246100e4c79f1f99a8)

#### [4.2.0](https://github.com/aptoma/hapi-log/compare/4.1.0...4.2.0) 2018-01-09

- Add support for filtering logged request info [`2ef630f`](https://github.com/aptoma/hapi-log/commit/2ef630ff868bde17a0b9026f04708bd1ba5e7cc9)

#### [4.1.0](https://github.com/aptoma/hapi-log/compare/4.0.0...4.1.0) 2017-12-06

- Use first entry in x-forwarded-for as remoteAdress in response logs [`a787dc9`](https://github.com/aptoma/hapi-log/commit/a787dc992a23c2cedb8c7d5d2964a167e33fe114)

### [4.0.0](https://github.com/aptoma/hapi-log/compare/3.1.1...4.0.0) 2017-12-06

- Hapi 17 support. Hapi Plugin is now exported as `plugin` [`aaaedae`](https://github.com/aptoma/hapi-log/commit/aaaedaef1db0ac725fb7006eee9cf11cc2aeeb75)

#### [3.1.1](https://github.com/aptoma/hapi-log/compare/3.1.0...3.1.1) 2017-01-18

- Fix error logging an array [`a36a951`](https://github.com/aptoma/hapi-log/commit/a36a9518e5185ccbbdecfb9e0670805e9ab0ee69)

#### [3.1.0](https://github.com/aptoma/hapi-log/compare/3.0.1...3.1.0) 2016-11-01

- Update all dependencies. [`64997d0`](https://github.com/aptoma/hapi-log/commit/64997d07b035e9340a4b25d250f00354970d3331)
- ES6 rewrite [`bcaedd8`](https://github.com/aptoma/hapi-log/commit/bcaedd81f4643b796f560f1adba506bf0b71847a)
- Remove shrinkwrap [`c2e7249`](https://github.com/aptoma/hapi-log/commit/c2e7249fe164107efd4022d2c273338d2edac487)
- Add pretty-hapi-log bin for outputting a coloured developer friendly log output [`5759093`](https://github.com/aptoma/hapi-log/commit/5759093df23314a35bb60cb28038f59384c1e6ab)

#### [3.0.1](https://github.com/aptoma/hapi-log/compare/3.0.0...3.0.1) 2015-11-30

- Fix #6 Cannot read property 'headers' of null in handleResponse. [`#6`](https://github.com/aptoma/hapi-log/issues/6)

### [3.0.0](https://github.com/aptoma/hapi-log/compare/2.0.0...3.0.0) 2015-11-25

- Add contentLength for response logs using json format. [`67cc410`](https://github.com/aptoma/hapi-log/commit/67cc410c210aa31cece4eb5229b7f3843c2de488)

### [2.0.0](https://github.com/aptoma/hapi-log/compare/1.1.0...2.0.0) 2015-11-25

- Update dev dep, nsp@2.0.2 [`85e2583`](https://github.com/aptoma/hapi-log/commit/85e2583273dd14ec4c2ba042956196e2490f9dcc)
- Add json output format. (enabled by default) [`ecac013`](https://github.com/aptoma/hapi-log/commit/ecac0132cbeffa961c7ff52a85c588383b21b03e)

#### [1.1.0](https://github.com/aptoma/hapi-log/compare/1.0.0...1.1.0) 2015-10-06

- Allow multiple arguments that gets formatted in log(), fixes #1. [`#1`](https://github.com/aptoma/hapi-log/issues/1) [`#2`](https://github.com/aptoma/hapi-log/issues/2)

#### 1.0.0 2015-09-29

- Update build status badge. [`6a2b04a`](https://github.com/aptoma/hapi-log/commit/6a2b04a3ac8849c53d519d3ac89f970f35d12b27)
- First commit [`5c4a152`](https://github.com/aptoma/hapi-log/commit/5c4a152a617d38a3cf5835b830d1c1d3de575541)
