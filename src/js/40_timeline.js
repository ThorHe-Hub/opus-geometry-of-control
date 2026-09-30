// Scene registry, subtitles, placeholders. A scene: { id, b0, b1, group, build(), update(lt, t), draw(lt, t), hud }.
const SCENES = [];
const ACT = { 0: '', 1: 'ACT I · THE IMAGINARY DIMENSION', 2: 'ACT II · STATE SPACE', 3: 'ACT III · FEEDBACK', 4: 'ACT IV · AUTONOMY' };
function scene(def) {
  const s = Object.assign({ fadeIn: 0.25, fadeOut: 0.2, group: new THREE.Group(), hud: {}, theme: 'cold', hudIn: 0.3 }, def);
  s.t0 = bars(s.b0); s.t1 = bars(s.b1);
  s.group.visible = false;
  root.add(s.group);
  SCENES.push(s);
  return s;
}
function sceneAt(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].t0) return SCENES[i];
  return SCENES[0];
}

// Bilingual subtitles [start, end, 中文, English] in absolute seconds.
const SUBS = [
  [2.6, 5.4, '所有不稳定的东西，终将倾倒。', 'Everything unstable eventually falls.'],
  [5.8, 8.9, '除非，它能感知自己的误差。', 'Unless it can sense its own error.'],
  [21.0, 24.2, '一切振荡，都是一次旋转的影子。', 'Every oscillation is the shadow of a rotation.'],
  [25.0, 28.6, '欧拉把旋转写成了一个指数。', 'Euler wrote rotation as an exponent.'],
  [29.4, 32.8, '让它衰减，整条信号就坍缩成 s 平面上的一个点。', 'Let it decay, and the whole signal collapses to one point on the s-plane.'],
  [33.3, 37.2, '左边，一切归于平静；右边，一切走向失控。', 'On the left, everything settles. On the right, everything runs away.'],
  [38.2, 42.2, '极点是曲面上的尖峰；沿虚轴切开，就是系统听见的频率。', 'Poles are peaks on a surface. Slice along jω and you hear the system’s frequencies.'],
  [45.0, 48.3, '1788 年，瓦特的飞球调速器让蒸汽机学会自己控制转速。', 'In 1788, Watt’s flyball governor let the steam engine regulate its own speed.'],
  [48.8, 52.3, '可它时常来回“振荡”，几十年里无人能解释。', 'Yet it would hunt back and forth, and for decades no one could say why.'],
  [53.2, 57.4, '1868 年，麦克斯韦用一个不等式回答了这个问题。', 'In 1868, Maxwell answered with a single inequality.'],
  [58.0, 62.0, '稳定，从此可以被计算。', 'From then on, stability could be computed.'],
  [63.2, 67.2, '把系统写成矩阵，空间本身开始流动。', 'Write the system as a matrix, and space itself begins to flow.'],
  [68.0, 72.2, '特征向量是它的骨架；一个正的特征值，就能把空间撕开。', 'Eigenvectors are its skeleton. One positive eigenvalue can tear space apart.'],
  [75.6, 79.6, '迹与行列式，画出了所有线性系统的命运地图。', 'Trace and determinant map the fate of every linear system.'],
  [80.2, 84.4, '螺旋、节点、鞍点、中心，每一种都是一种性格。', 'Spirals, nodes, saddles, centres: each one a temperament.'],
  [85.6, 89.2, '1963 年，洛伦兹发现：确定的方程，也可以不可预测。', 'In 1963, Lorenz found that deterministic equations can still be unpredictable.'],
  [89.6, 92.3, '差之毫厘，谬以千里。', 'A hair’s difference becomes a world apart.'],
  [98.4, 102.2, '1927 年，布莱克在渡轮上写下负反馈：用增益，换稳定。', 'In 1927, on a ferry, Black sketched negative feedback: trade gain for stability.'],
  [103.2, 107.4, '反馈是一把双刃剑：绕过 −1 一圈，系统就会失控。', 'Feedback cuts both ways: encircle −1 and the loop runs wild.'],
  [109.0, 114.2, '1948 年，根轨迹让人看见，增益如何把极点拉回安全的左侧。', 'In 1948, the root locus showed how gain drags poles back to the safe left.'],
  [115.6, 118.3, '倒立的杆会倒下，因为有一个极点在错误的一侧。', 'An inverted pole falls, because one pole sits on the wrong side.'],
  [118.8, 119.9, '除非——', 'Unless—'],
  [120.2, 123.6, 'u = −Kx。感知误差，施加反作用。', 'u = −Kx. Sense the error, push back.'],
  [127.7, 131.6, '李雅普诺夫的能量碗：每一条轨迹，只能向下。', 'Lyapunov’s bowl of energy: every trajectory can only go down.'],
  [131.9, 134.8, '稳定，不再是运气，而是被证明的必然。', 'Stability is no longer luck. It is proven.'],
  [135.6, 139.8, '1956 年，庞特里亚金：最快的控制，只有全力与反向全力。', '1956, Pontryagin: the fastest control is all or nothing.'],
  [140.4, 144.4, '在切换曲线上转向一次，直达原点。', 'One switch on the curve, straight to the origin.'],
  [145.6, 149.8, '1960 年，卡尔曼滤波：在噪声中估计真相。', '1960, the Kalman filter: estimating truth from noise.'],
  [150.6, 155.6, '九年后，它引导阿波罗 11 号降落在月球。', 'Nine years later, it guided Apollo 11 down to the Moon.'],
  [161.2, 165.4, '2015 年，第一枚轨道级火箭助推器垂直着陆。', '2015: the first orbital-class booster lands upright.'],
  [166.0, 170.4, '它每一瞬间都在预测未来，并重新选择。', 'At every instant it predicts the future, and chooses again.'],
  [173.2, 177.4, '没有指挥官。每架无人机只看它的邻居。', 'No commander. Each drone watches only its neighbours.'],
  [178.2, 184.2, '局部的规则，涌现出整体的秩序。它们重新画出了开篇的那个圆。', 'Local rules, global order. They redraw the circle we began with.'],
  [199.4, 203.6, '控制，是让不稳定的东西站起来。', 'Control is what makes the unstable stand.'],
];
