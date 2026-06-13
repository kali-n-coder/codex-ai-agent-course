const statusLabels = {
  draft: "下書き",
  "ready-for-video": "動画待ち",
  published: "公開中",
};

const statusOrder = {
  published: 0,
  "ready-for-video": 1,
  draft: 2,
};

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

function youtubeId(url = "") {
  const text = String(url).trim();
  if (!text) return "";
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return text.length <= 20 ? text : "";
}

function renderVideo(lesson) {
  const id = youtubeId(lesson.videoUrl);
  if (!id) {
    return `
      <div class="video-placeholder">
        <span>Video pending</span>
        <strong>${escapeHtml(lesson.title)}</strong>
        <p>動画ができたら管理画面でYouTube限定公開URLを登録します。</p>
      </div>
    `;
  }

  return `
    <div class="video-frame">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}"
        title="${escapeHtml(lesson.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  `;
}

function renderList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function lessonCard(lesson) {
  return `
    <article class="lesson-card" data-status="${escapeHtml(lesson.status)}">
      <div class="lesson-card__meta">
        <span>Lesson ${lesson.number}</span>
        <span class="status status--${escapeHtml(lesson.status)}">${statusLabels[lesson.status] ?? lesson.status}</span>
      </div>
      <h3>${escapeHtml(lesson.title)}</h3>
      <p>${escapeHtml(lesson.summary)}</p>
      <div class="lesson-card__footer">
        <span>${escapeHtml(lesson.duration)}</span>
        <a href="#${encodeURIComponent(lesson.id)}">詳細を見る</a>
      </div>
    </article>
  `;
}

function renderLesson(course, lesson) {
  return `
    <header class="page-header">
      <a class="back-link" href="#">講座トップへ</a>
      <span class="eyebrow">Lesson ${lesson.number}</span>
      <h1>${escapeHtml(lesson.title)}</h1>
      <p>${escapeHtml(lesson.summary)}</p>
    </header>

    <main class="lesson-layout">
      <section class="lesson-main">
        ${renderVideo(lesson)}

        <section class="content-section">
          <h2>このレッスンでできるようになること</h2>
          ${renderList(lesson.objectives)}
        </section>

        <section class="content-section">
          <h2>進め方</h2>
          ${renderList(lesson.steps)}
        </section>

        <section class="content-section">
          <h2>Codexへの依頼文</h2>
          <pre><code>${escapeHtml(lesson.prompt)}</code></pre>
        </section>

        <section class="content-section">
          <h2>演習</h2>
          <p>${escapeHtml(lesson.exercise)}</p>
        </section>
      </section>

      <aside class="side-panel">
        <h2>動画制作メモ</h2>
        <dl>
          <dt>状態</dt>
          <dd>${statusLabels[lesson.status] ?? escapeHtml(lesson.status)}</dd>
          <dt>目安時間</dt>
          <dd>${escapeHtml(lesson.duration)}</dd>
          <dt>テロップ案</dt>
          <dd>${escapeHtml(lesson.captionDraft)}</dd>
        </dl>
        <a class="button button--ghost" href="admin/">管理画面を開く</a>
      </aside>
    </main>
  `;
}

function renderHome(course) {
  const publishedCount = course.lessons.filter((lesson) => lesson.status === "published").length;
  const sortedLessons = [...course.lessons].sort((a, b) => a.number - b.number);

  return `
    <header class="hero">
      <nav class="top-nav">
        <strong>${escapeHtml(course.site.title)}</strong>
        <div>
          <a href="#lessons">レッスン</a>
          <a href="#workflow">公開フロー</a>
          <a href="admin/">管理</a>
        </div>
      </nav>
      <div class="hero__content">
        <span class="eyebrow">Codex App Course</span>
        <h1>${escapeHtml(course.site.title)}</h1>
        <p>${escapeHtml(course.site.description)}</p>
        <div class="hero__actions">
          <a class="button" href="#lessons">レッスンを見る</a>
          <a class="button button--ghost" href="admin/">動画を管理する</a>
        </div>
      </div>
      <div class="hero__stats" aria-label="講座状況">
        <div><strong>${course.lessons.length}</strong><span>Lessons</span></div>
        <div><strong>${publishedCount}</strong><span>Published</span></div>
        <div><strong>Free</strong><span>Stack</span></div>
      </div>
    </header>

    <main>
      <section class="band">
        <div class="section-heading">
          <span class="eyebrow">Learning Path</span>
          <h2>チャットAIから、作業を任せるAIへ</h2>
          <p>動画が未完成でも教材本文は先に公開できます。動画URLを入れると、各レッスンに自動で埋め込みます。</p>
        </div>
        <div class="tool-row">
          ${course.tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join("")}
        </div>
      </section>

      <section class="band" id="lessons">
        <div class="section-heading">
          <span class="eyebrow">Lessons</span>
          <h2>初期レッスン</h2>
        </div>
        <div class="lesson-grid">
          ${sortedLessons.map(lessonCard).join("")}
        </div>
      </section>

      <section class="band workflow" id="workflow">
        <div class="section-heading">
          <span class="eyebrow">Publish Workflow</span>
          <h2>動画ができたらすぐ公開</h2>
        </div>
        <div class="workflow-grid">
          <div><strong>1</strong><h3>録画</h3><p>OBSで画面録画し、YouTubeに限定公開でアップロードします。</p></div>
          <div><strong>2</strong><h3>登録</h3><p>管理画面に動画URL、公開状態、補足テキストを入力します。</p></div>
          <div><strong>3</strong><h3>公開</h3><p>JSONを書き出して data/course.json に反映し、Cloudflare Pagesへデプロイします。</p></div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span>Updated ${escapeHtml(course.site.updatedAt)}</span>
      <a href="admin/">Admin</a>
    </footer>
  `;
}

async function render() {
  const root = document.querySelector("#app");
  try {
    const course = await loadCourse();
    const lessonId = decodeURIComponent(location.hash.replace("#", ""));
    const lesson = course.lessons.find((item) => item.id === lessonId);
    root.innerHTML = lesson ? renderLesson(course, lesson) : renderHome(course);
    document.title = lesson ? `${lesson.title} | ${course.site.title}` : course.site.title;
  } catch (error) {
    root.innerHTML = `<main class="error-page"><h1>読み込みエラー</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

window.addEventListener("hashchange", render);
render();
