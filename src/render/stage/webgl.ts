import type { Boundary } from "../../core/defaults";
import { lampVector } from "../../core/shading";
import { GAIN, SHADOW, falloff, lampTint } from "./palette";
import type { ReliefPainter } from "./painter";

// One triangle that covers the viewport; no vertex buffers needed.
const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Lambert shading from forward differences (docs/SOLVER.md §1), then the palette from
// palette.ts. One fragment per facet; heights come from an R32F texture read with texelFetch.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uHeights;
uniform int uF;
uniform bool uPeriodic;
uniform vec3 uLamp;    // unit vector toward the lamp
uniform vec2 uDir;     // (cos az, sin az), for the falloff
uniform float uFall;
uniform vec3 uLit;     // lamp colour on plaster, 0–255
uniform vec3 uShadow;  // plaster in full shadow, 0–255
uniform float uGain;
out vec4 outColor;

int next(int i) {
  return i + 1 < uF ? i + 1 : (uPeriodic ? 0 : i);
}

void main() {
  int x = int(gl_FragCoord.x);
  int y = uF - 1 - int(gl_FragCoord.y); // row 0 of the field is the top of the canvas
  float h0 = texelFetch(uHeights, ivec2(x, y), 0).r;
  float hx = texelFetch(uHeights, ivec2(next(x), y), 0).r - h0;
  float hy = texelFetch(uHeights, ivec2(x, next(y)), 0).r - h0;
  float u = -uLamp.x * hx - uLamp.y * hy + uLamp.z;
  float s = max(u, 0.0) / sqrt(1.0 + hx * hx + hy * hy);
  float mid = float(uF) / 2.0;
  float p = ((float(x) - mid) * uDir.x + (float(y) - mid) * uDir.y) / mid;
  s = min(1.0, s * (1.0 - uFall + uFall * p) * uGain);
  outColor = vec4((uShadow + (uLit - uShadow) * s) / 255.0, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader did not compile: ${gl.getShaderInfoLog(shader) ?? ""}`);
  }
  return shader;
}

interface Resources {
  program: WebGLProgram;
  texture: WebGLTexture;
  uniforms: {
    lamp: WebGLUniformLocation | null;
    dir: WebGLUniformLocation | null;
    fall: WebGLUniformLocation | null;
    lit: WebGLUniformLocation | null;
  };
}

function setUp(gl: WebGL2RenderingContext, F: number, boundary: Boundary): Resources {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader program did not link: ${gl.getProgramInfoLog(program) ?? ""}`);
  }
  gl.useProgram(program);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // R32F is not filterable; NEAREST also keeps the texture complete without mipmaps.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, F, F);

  const at = (name: string) => gl.getUniformLocation(program, name);
  // Fixed for the life of the painter.
  gl.uniform1i(at("uHeights"), 0);
  gl.uniform1i(at("uF"), F);
  gl.uniform1i(at("uPeriodic"), boundary === "periodic" ? 1 : 0);
  gl.uniform3f(at("uShadow"), ...SHADOW);
  gl.uniform1f(at("uGain"), GAIN);
  gl.viewport(0, 0, F, F);
  // Set on every draw.
  const uniforms = { lamp: at("uLamp"), dir: at("uDir"), fall: at("uFall"), lit: at("uLit") };
  return { program, texture, uniforms };
}

/** The WebGL2 stage renderer, or null when the browser has no WebGL2. */
export function createWebGLPainter(
  canvas: HTMLCanvasElement,
  F: number,
  boundary: Boundary,
): ReliefPainter | null {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });
  if (!gl) return null;

  let resources: Resources | null = setUp(gl, F, boundary);
  let heights: Float32Array | null = null;
  let uploaded: Float32Array | null = null;
  let lamp: { az: number; el: number } | null = null;

  const render = () => {
    if (!resources || !heights || !lamp) return;
    if (uploaded !== heights) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, F, F, gl.RED, gl.FLOAT, heights);
      uploaded = heights;
    }
    const { az, el } = lamp;
    const a = (az * Math.PI) / 180;
    const { uniforms: u } = resources;
    gl.uniform3f(u.lamp, ...lampVector(az, el));
    gl.uniform2f(u.dir, Math.cos(a), Math.sin(a));
    gl.uniform1f(u.fall, falloff(el));
    gl.uniform3f(u.lit, ...lampTint(el));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // The GPU can drop the context (driver reset, too many tabs); rebuild and repaint when it returns.
  const onLost = (event: Event) => {
    event.preventDefault();
    resources = null;
    uploaded = null;
  };
  const onRestored = () => {
    resources = setUp(gl, F, boundary);
    render();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  return {
    kind: "webgl2",
    canvas,
    setHeights(next) {
      heights = next;
    },
    draw(az, el) {
      lamp = { az, el };
      render();
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
