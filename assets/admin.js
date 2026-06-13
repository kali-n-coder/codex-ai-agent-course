const DATA_URL = "../data/course.json";
const DRAFT_KEY = "codex-course-admin-draft";

const statusLabels = {
  draft: "下書き",
  "ready-for-video": "動画待ち",
  published: "公開中",
};

let course = null;
let selectedLessonId = "";

async function loadInitialData() {
  const stored = localStorage.getItem(DRAFT_KEY);
  if (stored) return JSON.parse(stored);
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("講座データを読み込めませんでした");
  return response.json();
}

function saveDraft() {
  course.site.updatedAt = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(course, null, 2));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function field(label, id, value, options = {}) {
  const type = options.type ?? "text";
  if (type === "textarea") {
    return `
      <label class="field">
        <span>${label}</span>
        <textarea id="${id}" rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>
      </label>
    `;
  }
  return `
    <label class="field">
      <span>${label}</span>
      <input id="${id}" type="${type}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function splitLines(value) {
  return String(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function selectedLesson() {
  return course.lessons.find((lesson) => lesson.id === selectedLessonId) ?? course.lessons[0];
}

function render() {
  const lesson = selectedLesson();
  selectedLessonId = lesson.id;

  document.querySelector("#admin").innerHTML = `
    <header class="admin-shell__header">
      <div>
        <span class="eyebrow">Admin</span>
        <h1>講座管理</h1>
        <p>動画URL、公開状態、教材文を編集して、公開用JSONを書き出します。</p>
      </div>
      <div class="admin-actions">
        <button id="saveDraft" class="button">下書き保存</button>
        <button id="exportJson" class="button button--ghost">公開JSONを書き出す</button>
        <a class="button button--ghost" href="../">サイト確認</a>
      </div>
    </header>

    <main class="admin-shell">
      <aside class="admin-sidebar">
        <h2>レッスン</h2>
        <div class="admin-lesson-list">
          ${course.lessons
            .sort((a, b) => a.number - b.number)
            .map(
              (item) => `
                <button class="${item.id === lesson.id ? "is-active" : ""}" data-select="${escapeHtml(item.id)}">
                  <span>Lesson ${item.number}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                  <small>${statusLabels[item.status] ?? item.status}</small>
                </button>
              `,
            )
            .join("")}
        </div>
        <button id="addLesson" class="button button--full button--ghost">レッスン追加</button>
        <button id="resetDraft" class="button button--full button--danger">下書きを破棄</button>
      </aside>

      <section class="admin-editor">
        <div class="editor-section">
          <h2>サイト設定</h2>
          <div class="editor-grid">
            ${field("サイト名", "siteTitle", course.site.title)}
            ${field("タグライン", "siteTagline", course.site.tagline)}
            ${field("申込フォームURL", "siteApplyUrl", course.site.applyUrl)}
            ${field("提出フォームURL", "siteSubmitUrl", course.site.submitUrl)}
          </div>
          ${field("説明", "siteDescription", course.site.description, { type: "textarea", rows: 3 })}
        </div>

        <div class="editor-section">
          <h2>レッスン編集</h2>
          <div class="editor-grid">
            ${field("ID", "lessonId", lesson.id)}
            ${field("番号", "lessonNumber", lesson.number, { type: "number" })}
            ${field("タイトル", "lessonTitle", lesson.title)}
            ${field("目安時間", "lessonDuration", lesson.duration)}
          </div>

          <label class="field">
            <span>公開状態</span>
            <select id="lessonStatus">
              ${Object.entries(statusLabels)
                .map(([value, label]) => `<option value="${value}" ${lesson.status === value ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </label>

          ${field("YouTube URLまたは動画ID", "lessonVideoUrl", lesson.videoUrl)}
          ${field("概要", "lessonSummary", lesson.summary, { type: "textarea", rows: 3 })}
          ${field("到達目標（1行1項目）", "lessonObjectives", joinLines(lesson.objectives), { type: "textarea", rows: 5 })}
          ${field("進め方（1行1項目）", "lessonSteps", joinLines(lesson.steps), { type: "textarea", rows: 5 })}
          ${field("Codexへの依頼文", "lessonPrompt", lesson.prompt, { type: "textarea", rows: 5 })}
          ${field("演習", "lessonExercise", lesson.exercise, { type: "textarea", rows: 4 })}
          ${field("テロップ案", "lessonCaption", lesson.captionDraft, { type: "textarea", rows: 4 })}

          <div class="admin-actions">
            <button id="applyLesson" class="button">このレッスンを反映</button>
            <button id="duplicateLesson" class="button button--ghost">複製</button>
            <button id="deleteLesson" class="button button--danger">削除</button>
          </div>
        </div>

        <div class="editor-section">
          <h2>公開手順</h2>
          <ol class="publish-list">
            <li>編集後に「下書き保存」を押す</li>
            <li>「公開JSONを書き出す」で course.json をダウンロード</li>
            <li>data/course.json に置き換える</li>
            <li>Cloudflare Pagesにデプロイする</li>
          </ol>
          <p class="note">静的サイトなので、サーバーなしで無料公開できます。管理画面から本番へ直接保存したい場合は、次段階でSupabaseかGitHub連携を追加します。</p>
        </div>
      </section>
    </main>
  `;

  bindEvents();
}

function updateSiteFromForm() {
  course.site.title = document.querySelector("#siteTitle").value.trim();
  course.site.tagline = document.querySelector("#siteTagline").value.trim();
  course.site.description = document.querySelector("#siteDescription").value.trim();
  course.site.applyUrl = document.querySelector("#siteApplyUrl").value.trim();
  course.site.submitUrl = document.querySelector("#siteSubmitUrl").value.trim();
}

function updateLessonFromForm() {
  const lesson = selectedLesson();
  const newId = document.querySelector("#lessonId").value.trim() || lesson.id;
  lesson.id = newId;
  selectedLessonId = newId;
  lesson.number = Number(document.querySelector("#lessonNumber").value) || lesson.number;
  lesson.title = document.querySelector("#lessonTitle").value.trim();
  lesson.status = document.querySelector("#lessonStatus").value;
  lesson.duration = document.querySelector("#lessonDuration").value.trim();
  lesson.videoUrl = document.querySelector("#lessonVideoUrl").value.trim();
  lesson.summary = document.querySelector("#lessonSummary").value.trim();
  lesson.objectives = splitLines(document.querySelector("#lessonObjectives").value);
  lesson.steps = splitLines(document.querySelector("#lessonSteps").value);
  lesson.prompt = document.querySelector("#lessonPrompt").value.trim();
  lesson.exercise = document.querySelector("#lessonExercise").value.trim();
  lesson.captionDraft = document.querySelector("#lessonCaption").value.trim();
}

function downloadJson() {
  updateSiteFromForm();
  updateLessonFromForm();
  saveDraft();
  const blob = new Blob([JSON.stringify(course, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "course.json";
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      updateSiteFromForm();
      updateLessonFromForm();
      selectedLessonId = button.dataset.select;
      saveDraft();
      render();
    });
  });

  document.querySelector("#applyLesson").addEventListener("click", () => {
    updateSiteFromForm();
    updateLessonFromForm();
    saveDraft();
    render();
  });

  document.querySelector("#saveDraft").addEventListener("click", () => {
    updateSiteFromForm();
    updateLessonFromForm();
    saveDraft();
  });

  document.querySelector("#exportJson").addEventListener("click", downloadJson);

  document.querySelector("#addLesson").addEventListener("click", () => {
    updateSiteFromForm();
    updateLessonFromForm();
    const nextNumber = Math.max(...course.lessons.map((lesson) => lesson.number)) + 1;
    const id = `lesson-${String(nextNumber).padStart(2, "0")}`;
    course.lessons.push({
      id,
      number: nextNumber,
      title: "新しいレッスン",
      status: "draft",
      duration: "5分",
      videoUrl: "",
      summary: "",
      objectives: [],
      steps: [],
      prompt: "",
      exercise: "",
      captionDraft: "",
    });
    selectedLessonId = id;
    saveDraft();
    render();
  });

  document.querySelector("#duplicateLesson").addEventListener("click", () => {
    updateSiteFromForm();
    updateLessonFromForm();
    const source = selectedLesson();
    const nextNumber = Math.max(...course.lessons.map((lesson) => lesson.number)) + 1;
    const copy = structuredClone(source);
    copy.id = `lesson-${String(nextNumber).padStart(2, "0")}`;
    copy.number = nextNumber;
    copy.title = `${source.title} のコピー`;
    copy.status = "draft";
    course.lessons.push(copy);
    selectedLessonId = copy.id;
    saveDraft();
    render();
  });

  document.querySelector("#deleteLesson").addEventListener("click", () => {
    if (course.lessons.length <= 1) return;
    course.lessons = course.lessons.filter((lesson) => lesson.id !== selectedLessonId);
    selectedLessonId = course.lessons[0].id;
    saveDraft();
    render();
  });

  document.querySelector("#resetDraft").addEventListener("click", () => {
    localStorage.removeItem(DRAFT_KEY);
    location.reload();
  });
}

async function init() {
  const root = document.querySelector("#admin");
  try {
    course = await loadInitialData();
    selectedLessonId = course.lessons[0]?.id;
    render();
  } catch (error) {
    root.innerHTML = `<main class="error-page"><h1>管理画面エラー</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

init();
