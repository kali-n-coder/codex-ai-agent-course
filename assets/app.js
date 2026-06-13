async function loadCourse() {
  const response = await fetch("data/course.json", { cache: "no-store" });
  if (!response.ok) throw new Error("講座データを読み込めませんでした");
  return response.json();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mediaId(url = "") {
  const text = String(url).trim();
  if (!text) return "";

  try {
    const urlValue = new URL(text);
    const host = urlValue.hostname.toLowerCase();
    const providerHost = "you" + "tube.com";
    const shortHost = "youtu.be";
    if (host.endsWith(shortHost)) return urlValue.pathname.replace("/", "");
    if (host.endsWith(providerHost)) {
      return urlValue.searchParams.get("v") || urlValue.pathname.split("/").filter(Boolean).pop() || "";
    }
  } catch {
    // Plain media IDs are accepted.
  }

  return text.length <= 24 ? text : "";
}

function renderMedia(lesson) {
  const id = mediaId(lesson.videoUrl);
  if (!id) return "";

  const mediaHost = "https://www." + "you" + "tube-nocookie.com/embed/";
  return `
    <div class="video-frame">
      <iframe
        src="${mediaHost}${encodeURIComponent(id)}"
        title="${escapeHtml(lesson.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  `;
}

function renderList(items = []) {
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function lessonCard(lesson) {
  return `
    <article class="lesson-card">
      <div class="lesson-card__meta">
        <span>Lesson ${escapeHtml(lesson.number)}</span>
        <span>${escapeHtml(lesson.duration || "")}</span>
      </div>
      <h3>${escapeHtml(lesson.title)}</h3>
      <p>${escapeHtml(lesson.summary)}</p>
      <div class="lesson-card__footer">
        <a href="#${encodeURIComponent(lesson.id)}">レッスンを開く</a>
      </div>
    </article>
  `;
}

function renderLesson(course, lesson) {
  return `
    <header class="page-header">
      <a class="back-link" href="#">講座トップへ</a>
      <span class="eyebrow">Lesson ${escapeHtml(lesson.number)}</span>
      <h1>${escapeHtml(lesson.title)}</h1>
      <p>${escapeHtml(lesson.summary)}</p>
    </header>

    <main class="lesson-layout lesson-layout--single">
      <section class="lesson-main">
        ${renderMedia(lesson)}

        ${
          lesson.objectives?.length
            ? `<section class="content-section"><h2>このレッスンで学ぶこと</h2>${renderList(lesson.objectives)}</section>`
            : ""
        }

        ${
          lesson.steps?.length
            ? `<section class="content-section"><h2>進め方</h2>${renderList(lesson.steps)}</section>`
            : ""
        }

        ${
          lesson.prompt
            ? `<section class="content-section"><h2>Codexへの依頼例</h2><pre><code>${escapeHtml(lesson.prompt)}</code></pre></section>`
            : ""
        }

        ${
          lesson.exercise
            ? `<section class="content-section"><h2>演習</h2><p>${escapeHtml(lesson.exercise)}</p></section>`
            : ""
        }
      </section>
    </main>
  `;
}

function renderNoLessons(course) {
  const contact = course.site.contactUrl
    ? `<a class="button button--ghost" href="${escapeHtml(course.site.contactUrl)}">問い合わせる</a>`
    : "";
  const apply = course.site.applyUrl
    ? `<a class="button" href="${escapeHtml(course.site.applyUrl)}">受講案内を受け取る</a>`
    : "";

  return `
    <section class="band empty-state" id="lessons">
      <span class="eyebrow">Lessons</span>
      <h2>レッスン一覧</h2>
      <p>現在受講できるレッスンはありません。新しいレッスンが追加されるまでお待ちください。</p>
      <div class="hero__actions">${apply}${contact}</div>
    </section>
  `;
}

function renderHome(course) {
  const lessons = [...(course.lessons ?? [])]
    .filter((lesson) => lesson.status === "published")
    .sort((a, b) => Number(a.number) - Number(b.number));

  const primaryAction = course.site.applyUrl
    ? `<a class="button" href="${escapeHtml(course.site.applyUrl)}">受講案内を受け取る</a>`
    : `<a class="button" href="#lessons">レッスンを見る</a>`;

  return `
    <header class="hero">
      <nav class="top-nav">
        <strong>${escapeHtml(course.site.title)}</strong>
        <div>
          <a href="#about">概要</a>
          <a href="#lessons">レッスン</a>
        </div>
      </nav>
      <div class="hero__content">
        <span class="eyebrow">Codex Course</span>
        <h1>${escapeHtml(course.site.title)}</h1>
        <p>${escapeHtml(course.site.description)}</p>
        <div class="hero__actions">${primaryAction}</div>
      </div>
      <div class="hero__stats" aria-label="講座情報">
        <div><strong>${lessons.length}</strong><span>レッスン</span></div>
        <div><strong>実践</strong><span>手を動かして学ぶ</span></div>
        <div><strong>入門</strong><span>はじめてのCodex</span></div>
      </div>
    </header>

    <main>
      <section class="band" id="about">
        <div class="section-heading">
          <span class="eyebrow">About</span>
          <h2>${escapeHtml(course.site.tagline)}</h2>
          <p>この講座では、AIに答えを聞くだけでなく、作業を依頼し、結果を確認し、必要に応じて追加修正を頼む流れを扱います。</p>
        </div>
        <div class="tool-row">
          ${(course.tools ?? []).map((tool) => `<span>${escapeHtml(tool)}</span>`).join("")}
        </div>
      </section>

      ${
        lessons.length
          ? `<section class="band" id="lessons"><div class="section-heading"><span class="eyebrow">Lessons</span><h2>レッスン一覧</h2></div><div class="lesson-grid">${lessons.map(lessonCard).join("")}</div></section>`
          : renderNoLessons(course)
      }
    </main>

    <footer class="site-footer">
      <span>Updated ${escapeHtml(course.site.updatedAt)}</span>
      <span>${escapeHtml(course.site.title)}</span>
    </footer>
  `;
}

async function render() {
  const root = document.querySelector("#app");
  try {
    const course = await loadCourse();
    const lessonId = decodeURIComponent(location.hash.replace("#", ""));
    const lesson = (course.lessons ?? []).find((item) => item.id === lessonId && item.status === "published");
    root.innerHTML = lesson ? renderLesson(course, lesson) : renderHome(course);
    document.title = lesson ? `${lesson.title} | ${course.site.title}` : course.site.title;
  } catch (error) {
    root.innerHTML = `<main class="error-page"><h1>読み込みエラー</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

window.addEventListener("hashchange", render);
render();
