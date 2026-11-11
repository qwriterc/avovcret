import {Config} from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(17);
Config.setDelayRenderTimeoutInMilliseconds(240000);
