/**
 * https://github.com/pixijs/pixijs/blob/v6.2.2/bundles/pixi.js/src/index.ts
 */

import { AccessibilityManager } from '@pixi/accessibility';
import { InteractionManager } from '@pixi/interaction';
import { Application } from '@pixi/app';
import { Renderer, BatchRenderer } from '@pixi/core';
import { Extract } from '@pixi/extract';
import { Loader, AppLoaderPlugin } from '@pixi/loaders';
import { CompressedTextureLoader, DDSLoader, KTXLoader } from '@pixi/compressed-textures';
import { ParticleRenderer } from '@pixi/particle-container';
import { Prepare } from '@pixi/prepare';
import { SpritesheetLoader } from '@pixi/spritesheet';
import { TilingSpriteRenderer } from '@pixi/sprite-tiling';
import { BitmapFontLoader } from '@pixi/text-bitmap';
import { TickerPlugin } from '@pixi/ticker';

// Install renderer plugins
Renderer.registerPlugin('accessibility', AccessibilityManager);
Renderer.registerPlugin('extract', Extract);
Renderer.registerPlugin('interaction', InteractionManager);
Renderer.registerPlugin('particle', ParticleRenderer);
Renderer.registerPlugin('prepare', Prepare);
Renderer.registerPlugin('batch', BatchRenderer);
Renderer.registerPlugin('tilingSprite', TilingSpriteRenderer);

// Install loader plugins
Loader.registerPlugin(BitmapFontLoader);
Loader.registerPlugin(CompressedTextureLoader);
Loader.registerPlugin(DDSLoader);
Loader.registerPlugin(KTXLoader);
Loader.registerPlugin(SpritesheetLoader);

// Install application plugins
Application.registerPlugin(TickerPlugin);
Application.registerPlugin(AppLoaderPlugin);

export {
  Renderer,
  Loader,
  Application,
}
