# Changelog
## Unreleased

## v0.0.5
- [#4](https://github.com/lblod/ldes-client/pull/4) Support fetching from multiple LDES feeds with different configurations. This means that you should use environment.getTargetGraph etc. to read the config instead of simply importing TARGET_GRAPH from the environment. If the LDES_BASE env var is not set, the settings are read from the config.ts file in the config directory.
- [#5](https://github.com/lblod/ldes-client/pull/5) Bump service base image
- [#6](https://github.com/lblod/ldes-client/pull/6) and [#13](https://github.com/lblod/ldes-client/pull/13) Improve configuration for (multiple) streams
- [#9](https://github.com/lblod/ldes-client/pull/9) Support correct LDES namespace

## v0.0.4
- [#2](https://github.com/lblod/ldes-client/pull/2) Support fetching LDES feed at startup
- [#3](https://github.com/lblod/ldes-client/pull/3) Remove unneeded sorting of members
- Various bug fixes

## v0.0.3
- Fix: use use value `WORKING_GRAPH` environment variable

## v0.0.2
- Fix: require members to have generated time

## v0.0.1
- Initial release
