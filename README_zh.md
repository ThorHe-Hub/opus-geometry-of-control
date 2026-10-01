# 控制的几何 · The Geometry of Control

[English](README.md) · **中文**

[![控制的几何](docs/cover.jpg)](BILIBILI_URL)

▶ 观看：[https://b23.tv/1owXVPJ](BILIBILI_URL) · [https://m.youtube.com/watch?v=mGLhVaXlIyg](YOUTUBE_URL)

*所有不稳定的东西，终将倾倒。除非，它能感知自己的误差。*

一部 3 分半的控制理论短片：蒸汽机怎么学会自己稳住转速，火箭怎么竖着落回地面，一群无人机怎么在没有指挥的情况下排好队形。片子里没有一个视频、图片或音频文件，每一帧画面、每一个音符都是代码在你的浏览器里实时生成的，整部片子就是一个 `index.html`。

> Co-created and fully implemented by Claude Opus 5.5 under human direction.
>
> 由 Claude Opus 5.5 在人类主导下共同创作，并完成全部实现。

## 在浏览器里看

下载 `index.html`，用电脑上的 Chrome 或 Edge 打开，等大约 25 秒让它把配乐"作"出来，然后点播放。

- `空格` 播放 / 暂停 · `←` `→` 快进快退 · `0`–`9` 跳章节 · `H` 隐藏数据面板 · `F` 全屏 · `M` 静音
- 在 RTX 4060 上能跑满 60 帧，个别重场景刚开始时会卡一下。电脑比较吃力的话，在地址后面加上 `?q=low`。

## 讲了什么

一支立在笔尖上的笔倒了下去。整部片子讲的，就是怎样让它重新站起来。

- **I · 虚数维度**：所有的振荡，其实都是一次旋转；一整条信号，可以坍缩成一个点。
- **II · 状态空间**：瓦特的蒸汽调速器来回晃，麦克斯韦解释了原因，洛伦兹撞见了混沌。
- **III · 反馈**：感知误差，施加反作用。倒下的杆被接住，阿波罗 11 号被一路引导着降落在月球上。
- **IV · 自主**：火箭助推器竖着落地，无人机群没有指挥官也能自己排好队。

## 一些小彩蛋

- **只有一个反派。** 全片的"坏蛋"是同一个数：s = +2。笔会倒、空间会被撕开、杆会倒下，都是它干的，终章里它还有最后一次登场。
- **数学是听得见的。** 第一幕扫过曲面的那段滑音，走的就是画面上那条曲线；杆被接住的那一帧，铜管和弦正好砸下来。
- **没有一帧是手调的动画。** 调速器、倒立摆、火箭都是真的在做物理仿真，片子只是架了台摄像机在拍。
- **一个手滑引出的混沌。** 两条混沌轨迹的起点只差 0.000127，正是当年洛伦兹重新输入数字时省掉的那几位，他就是这样发现了混沌。
- **踩着节拍的控制。** 火箭每过一个十六分音符，就重新规划一次着陆路线。
- **会"稳定下来"的标题。** 终章里 15000 个粒子自己飞向标题，冲过头一点再稳住，和真实的控制器一模一样。
- **封面也来自片子本身**，像长曝光照片那样拍下来的。

## 给开发者

需要 Node 22 以上、Chrome 或 Edge、Python 3（Windows 上用 Git Bash 运行 `.sh` 脚本）。

```bash
bash tools/fetch_fonts.sh && bash tools/fetch_vendor.sh   # 下载源字体
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # macOS / Linux 用 .venv/bin/pip
node tools/build.mjs                          # src/ → index.html
node tools/test_math.mjs                      # 检查数学
node tools/export.mjs --w 2560 --sub 4        # 把整部片子渲染成 MP4
node tools/cover.mjs --yt                     # 渲染封面（不加 --yt 是 B站 版）
```

片子的代码在 `src/js/` 里，是一串按编号排好的文件，由 `build.mjs` 依次拼起来：先是引擎，然后是音乐，然后一场接一场。`tools/test_math.mjs` 里有 41 项检查，确保画面里的物理是对的。目前只在 Windows 上测试过。

## 许可

代码采用 [MIT 许可](LICENSE)。附带的 three.js 和字体沿用各自的开源许可（按许可要求，有两个字体改了名），详见 [LICENSES/](LICENSES/)。
