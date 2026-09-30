#!/usr/bin/env bash
# Download three.js r128 and the postprocessing examples the film uses into tools/vendor/three (build.mjs inlines them,
# so index.html runs offline), and STIX Two Math (OFL) into tools/fonts-src for the operators STIX Two Text lacks.
set -e
cd "$(dirname "$0")"
mkdir -p vendor/three fonts-src
B=https://cdn.jsdelivr.net/npm/three@0.128.0
for f in build/three.min.js examples/js/shaders/CopyShader.js examples/js/shaders/LuminosityHighPassShader.js \
  examples/js/postprocessing/EffectComposer.js examples/js/postprocessing/RenderPass.js \
  examples/js/postprocessing/ShaderPass.js examples/js/postprocessing/UnrealBloomPass.js; do
  o="vendor/three/$(basename "$f")"
  [ -s "$o" ] || curl -sL --fail --max-time 180 -o "$o" "$B/$f"
done
# STIX Two Math from CTAN (stix2-otf); jsDelivr refuses the >50 MB GitHub repo. Keep only a real OpenType file.
M=fonts-src/STIXTwoMath-Regular.otf
for u in "https://mirrors.tuna.tsinghua.edu.cn/CTAN/fonts/stix2-otf/STIXTwoMath-Regular.otf" \
  "https://mirrors.ustc.edu.cn/CTAN/fonts/stix2-otf/STIXTwoMath-Regular.otf" \
  "https://mirrors.ctan.org/fonts/stix2-otf/STIXTwoMath-Regular.otf" \
  "https://raw.githubusercontent.com/stipub/stixfonts/master/fonts/static_otf/STIXTwoMath-Regular.otf"; do
  [ -s "$M" ] && break
  curl -sL --fail --max-time 180 -o "$M" "$u" || rm -f "$M"
  [ -s "$M" ] && { head -c 4 "$M" | grep -q OTTO || rm -f "$M"; }
done
wc -c vendor/three/* "$M"
