import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(1);
// WebGL (engraved 3D + metal sweeps) needs a real GPU path in headless Chrome
Config.setChromiumOpenGlRenderer("angle");
