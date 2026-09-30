// Reports which WebGL backend headless Chrome gets (GPU vs SwiftShader software).
import { launch } from './cdp.mjs';

const { session, close } = await launch({ width: 640, height: 360 });
try {
  const info = await session.eval(`(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return { webgl2: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: true,
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      pointRange: Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
      halfFloatRT: !!gl.getExtension('EXT_color_buffer_float'),
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));
} finally {
  await close();
}
