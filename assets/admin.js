const DATA_URL = "../data/course.json";
const DRAFT_KEY = "codex-course-admin-draft-v3";

const statusLabels = {
  draft: "下書き",
  published: "表示する",
  archived: "表示しない",
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
      <input id="${id}" type="${type}" value="${escapeHtml(value ?? "")}" />
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

function emptyLesson() {
  const nextNumber = Math.max(0, ...(course.lessons ?? []).map((lesson) => Number(lesson.number) || 0)) + 1;
  return {
    id: `lesson-${String(nextNumber).padStart(2, "0")}`,
    number: nextNumber,
    title: "",
    status: "draft",
    duration: "",
    videoUrl: "",
    summary: "",
    objectives: [],
    steps: [],
    prompt: "",
    exercise: "",
  };
}

function selectedLesson() {
  return (course.lessons ?? []).find((lesson) => lesson.id === selectedLessonId) ?? null;
}

function renderLessonList() {
  const lessons = [...(course.lessons ?? [])].sort((a, b) => Number(a.number) - Number(b.number));
  if (!lessons.length) {
    return `<p class="note">まだレッスンはありません。</p>`;
  }

  return lessons
    .map(
      (item) => `
        <button class="${item.id === selectedLessonId ? "is-active" : ""}" data-select="${escapeHtml(item.id)}">
          <span>Lesson ${escapeHtml(item.number)}</span>
          <strong>${escapeHtml(item.title || "無題のレッスン")}</strong>
          <small>${statusLabels[item.status] ?? item.status}</small>
        </button>
      `,
    )
    .join("");
}

function renderLessonEditor(lesson) {
  if (!lesson) {
    return `
      <div class="editor-section">
        <h2>レッスン</h2>
        <p class="note">レッスンを追加して、タイトル、本文、教材URLを入力してください。</p>
        <button id="addFirstLesson" class="button">レッスンを追加</button>
      </div>
    `;
  }

  return `
    <div class="editor-section">
      <h2>レッスン編集</h2>
      <div class="editor-grid">
        ${field("ID", "lessonId", lesson.id)}
        ${field("番号", "lessonNumber", lesson.number, { type: "number" })}
        ${field("タイトル", "lessonTitle", lesson.title)}
        ${field("目安時間", "lessonDuration", lesson.duration)}
      </div>

      <label class="field">
        <span>表示状態</span>
        <select id="lessonStatus">
          ${Object.entries(statusLabels)
            .map(([value, label]) => `<option value="${value}" ${lesson.status === value ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </label>

      ${field("教材URLまたは埋め込みID", "lessonVideoUrl", lesson.videoUrl)}
      ${field("概要", "lessonSummary", lesson.summary, { type: "textarea", rows: 3 })}
      ${field("このレッスンで学ぶこと（1行1項目）", "lessonObjectives", joinLines(lesson.objectives), { type: "textarea", rows: 5 })}
      ${field("進め方（1行1項目）", "lessonSteps", joinLines(lesson.steps), { type: "textarea", rows: 5 })}
      ${field("Codexへの依頼例", "lessonPrompt", lesson.prompt, { type: "textarea", rows: 5 })}
      ${field("演習", "lessonExercise", lesson.exercise, { type: "textarea", rows: 4 })}

      <div class="admin-actions">
        <button id="applyLesson" class="button">変更を反映</button>
        <button id="duplicateLesson" class="button button--ghost">複製</button>
        <button id="deleteLesson" class="button button--danger">削除</button>
      </div>
    </div>
  `;
}

function render() {
  const lesson = selectedLesson();

  document.querySelector("#admin").innerHTML = `
    <header class="admin-shell__header">
      <div>
        <span class="eyebrow">Content Admin</span>
        <h1>講座管理</h1>
        <p>サイト情報とレッスン内容を編集します。</p>
      </div>
      <div class="admin-actions">
        <button id="saveDraft" class="button">下書き保存</button>
        <button id="exportJson" class="button button--ghost">データを書き出す</button>
        <a class="button button--ghost" href="../">サイトを見る</a>
      </div>
    </header>

    <main class="admin-shell">
      <aside class="admin-sidebar">
        <h2>レッスン</h2>
        <div class="admin-lesson-list">${renderLessonList()}</div>
        <button id="addLesson" class="button button--full button--ghost">レッスン追加</button>
        <button id="resetDraft" class="button button--full button--danger">下書きを破棄</button>
      </aside>

      <section class="admin-editor">
        <div class="editor-section">
          <h2>サイト設定</h2>
          <div class="editor-grid">
            ${field("サイト名", "siteTitle", course.site.title)}
            ${field("タグライン", "siteTagline", course.site.tagline)}
            ${field("受講案内URL", "siteApplyUrl", course.site.applyUrl)}
            ${field("問い合わせURL", "siteContactUrl", course.site.contactUrl)}
          </div>
          ${field("説明", "siteDescription", course.site.description, { type: "textarea", rows: 3 })}
          ${field("使用ツール（1行1項目）", "siteTools", joinLines(course.tools), { type: "textarea", rows: 4 })}
        </div>

        ${renderLessonEditor(lesson)}
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
  course.site.contactUrl = document.querySelector("#siteContactUrl").value.trim();
  course.tools = splitLines(document.querySelector("#siteTools").value);
}

function updateLessonFromForm() {
  const lesson = selectedLesson();
  if (!lesson) return;

  const oldId = lesson.id;
  const newId = document.querySelector("#lessonId").value.trim() || oldId;
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
}

function addLesson() {
  updateSiteFromForm();
  updateLessonFromForm();
  course.lessons = course.lessons ?? [];
  const lesson = emptyLesson();
  course.lessons.push(lesson);
  selectedLessonId = lesson.id;
  saveDraft();
  render();
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

  document.querySelector("#addLesson")?.addEventListener("click", addLesson);
  document.querySelector("#addFirstLesson")?.addEventListener("click", addLesson);

  document.querySelector("#applyLesson")?.addEventListener("click", () => {
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

  document.querySelector("#duplicateLesson")?.addEventListener("click", () => {
    updateSiteFromForm();
    updateLessonFromForm();
    const source = selectedLesson();
    if (!source) return;
    const copy = structuredClone(source);
    const nextNumber = Math.max(0, ...(course.lessons ?? []).map((lesson) => Number(lesson.number) || 0)) + 1;
    copy.id = `lesson-${String(nextNumber).padStart(2, "0")}`;
    copy.number = nextNumber;
    copy.title = `${source.title || "無題のレッスン"} のコピー`;
    copy.status = "draft";
    course.lessons.push(copy);
    selectedLessonId = copy.id;
    saveDraft();
    render();
  });

  document.querySelector("#deleteLesson")?.addEventListener("click", () => {
    course.lessons = (course.lessons ?? []).filter((lesson) => lesson.id !== selectedLessonId);
    selectedLessonId = course.lessons[0]?.id ?? "";
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
    course.lessons = course.lessons ?? [];
    selectedLessonId = course.lessons[0]?.id ?? "";
    render();
  } catch (error) {
    root.innerHTML = `<main class="error-page"><h1>管理画面エラー</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

init();
