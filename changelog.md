# v0.1.0

- the client can now rotate and fetch from multiple ldes feeds with different configurations. This means that you should use environment.getTargetGraph etc. to read the config instead of simply importing TARGET_GRAPH from the environment. If the LDES_BASE env var is not set, the settings are read from the config.ts file in the config directory.
