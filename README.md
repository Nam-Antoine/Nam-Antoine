<!--
  Liquid-glass edition. Layout still follows the four-section structure from
  https://dev.to/yuridevat/how-to-create-a-stunning-github-profile-2mh5
  (Header → My Projects → About Me → Footer), but every card is an animated
  SVG rendered by scripts/build-cards.mjs from live GitHub data and published
  to the `output` branch daily by .github/workflows/cards.yml.

  Each <picture> swaps to the dark or light card with the viewer's theme.
  GitHub strips CSS/JS from READMEs, so the "glass" is done inside the SVGs:
  blurred colour blobs drift behind translucent panels, a specular sheen
  sweeps across, text and chips rise in on load.
-->

<!-- ═══════════════════════════ HEADER ═══════════════════════════ -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/hero-dark.svg" />
    <img alt="Nam-Antoine — I build the tools I wish I had, then ship web apps end to end." width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/hero-light.svg" />
  </picture>
</p>

<p align="center">
  <a href="https://www.linkedin.com/in/nam-tr%E1%BA%A7n-0205a1395/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" /></a>
  &nbsp;
  <a href="https://github.com/Nam-Antoine/Nam-Antoine/discussions"><img alt="Say hi" src="https://img.shields.io/badge/Say%20hi-Discussions-1155BC?style=for-the-badge&logo=github&logoColor=white" /></a>
  &nbsp;
  <a href="https://github.com/Nam-Antoine?tab=followers"><img alt="Followers" src="https://img.shields.io/github/followers/Nam-Antoine?style=for-the-badge&logo=github&color=1155BC&labelColor=24292f" /></a>
  &nbsp;
  <img alt="Profile views" src="https://komarev.com/ghpvc/?username=Nam-Antoine&style=for-the-badge&color=1155BC&label=Views" />
</p>

<p align="center">
  <a href="#-my-projects">Projects</a> ·
  <a href="#-about-me">About me</a> ·
  <a href="#-tools--technologies">Tools</a> ·
  <a href="#-activity">Activity</a>
</p>

<br />

<!-- ═══════════════════════════ MY PROJECTS ═══════════════════════════ -->

## 🚀 My Projects

<table>
  <tr>
    <td width="50%">
      <a href="https://github.com/Nam-Antoine/Nmux">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-nmux-dark.svg" />
          <img alt="Nmux — a persistent desktop home for Claude Code" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-nmux-light.svg" />
        </picture>
      </a>
    </td>
    <td width="50%">
      <a href="https://github.com/Nam-Antoine/TKB">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-tkb-dark.svg" />
          <img alt="USTH Timetable — a tray app that watches the USTH portal and notifies you of timetable changes" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-tkb-light.svg" />
        </picture>
      </a>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-fleetview-dark.svg" />
        <img alt="FleetView — multi-cluster Kubernetes cost, drift and health dashboard (final-year project, private until submission)" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-fleetview-light.svg" />
      </picture>
    </td>
    <td width="50%">
      <a href="https://github.com/Nam-Antoine/ML1-project">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-ml1-dark.svg" />
          <img alt="ML1-project — can an AI assistant improve model building, evaluation and error analysis?" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/project-ml1-light.svg" />
        </picture>
      </a>
    </td>
  </tr>
</table>

<p align="center"><sub>Cards are re-rendered every day from live repo data — stars, releases and last-push dates stay current.</sub></p>

<br />

<!-- ═══════════════════════════ ABOUT ME ═══════════════════════════ -->

## 🙋 About Me

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎓 What I've done</h3>
      <ul>
        <li>Final-year ICT student at <a href="https://usth.edu.vn/">USTH</a>, Hanoi — thesis: <b>FleetView</b>, a multi-cluster Kubernetes cost &amp; drift dashboard.</li>
        <li>Shipped <b>USTH Timetable</b> to fellow students — a self-updating tray app that already has a release train.</li>
        <li>Built <b>Nmux</b> so that my Claude Code sessions survive closing the editor — my own daily driver.</li>
        <li>Ran an ML study on whether AI assistants actually improve model building, evaluation and error analysis.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🔭 What I'm doing now</h3>
      <ul>
        <li>🏫 Building <b>TL Education</b>, an online maths-tutoring platform for grades 9–12 in Vietnam: Next.js 15 front end, NestJS + Prisma API, Playwright suite that runs against the real backend in CI. Private for now.</li>
        <li>🛠️ Making my own workflow better: Nmux keeps my Claude Code sessions alive, USTH Timetable tells me when to go to class.</li>
        <li>🌱 Learning what it takes to run a small product end to end — design in Figma, tickets in Linear, CI that tests against a real backend.</li>
        <li>📍 Based in Hanoi 🇻🇳 (UTC+7).</li>
      </ul>
    </td>
  </tr>
</table>

### 🧰 Tools &amp; technologies

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/stack-dark.svg" />
    <img alt="Stack: TypeScript, Next.js, React, NestJS, Prisma, PostgreSQL, Tailwind, Playwright · Electron, Tauri, Rust · Python, Jupyter, scikit-learn, Docker, Kubernetes, GitHub Actions · Claude Code, pnpm, Figma, Linear" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/stack-light.svg" />
  </picture>
</p>

<br />

<!-- ═══════════════════════════ FOOTER ═══════════════════════════ -->

## 📈 Activity

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/activity-dark.svg" />
    <img alt="Contributions, streaks, last 12 weeks and language share" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/activity-light.svg" />
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/snake-dark.svg" />
    <img alt="A snake eating my contribution graph" width="100%" src="https://raw.githubusercontent.com/Nam-Antoine/Nam-Antoine/output/snake-light.svg" />
  </picture>
</p>

---

<p align="center">
  The fastest way to reach me is right here — open an issue on any repo above, or
  <a href="https://github.com/Nam-Antoine/Nam-Antoine/discussions">start a discussion</a>.
  <br />
  <sub>The cards on this page are generated by <a href="scripts/build-cards.mjs"><code>scripts/build-cards.mjs</code></a> — fork it if you want the same look ✨</sub>
</p>
