import {
  getFirebaseRuntime,
  loadDraftCourse,
  loadPublicCourse,
  publishCourse,
  saveDraftCourse,
  signInAdmin,
  signOutAdmin,
  waitForUser,
} from "./firebase-client.js";

const DATA_URL = "../data/course.json";
const DRAFT_KEY = "codex-course-admin-draft-v3";

const statusLabels = {
  draft: "下書き",
  published: "表示する",
  archived: "表示しない",
};

let course = null;
let selectedLessonId = "";
let message = "";
let firebase = null;
let currentUser = null;

async function loadInitialData() {
  if (firebase && currentUser) {
    const draft = await loadDraftCourse(firebase.db);
    if (draft) return draft;
    const publicCourse = await loadPublicCourse(firebase.db);
    if (publicCourse) return publicCourse;
  }

  const stored = localStorage.getItem(DRAFT_KEY);
  if (stored) return JSON.parse(stored);
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("講座データを読み込めませんでした");
  return response.json();
}

async function saveDraft() {
  course.site.updatedAt = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(course, null, 2));
  if (firebase && currentUser) {
    await saveDraftCourse(firebase.db, course);
  }
}

function setMessage(text) {
  message = text;
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
        <button id="applyLesson" class="button">レッスンを下書き保存</button>
        <button id="duplicateLesson" class="button button--ghost">複製</button>
        <button id="deleteLesson" class="button button--danger">削除</button>
      </div>
    </div>
  `;
}

function renderLogin() {
  document.querySelector("#admin").innerHTML = `
    <main class="login-shell">
      <section class="editor-section login-panel">
        <span class="eyebrow">Admin Login</span>
        <h1>講座管理</h1>
        <p class="note">レッスンを編集するには、管理者のGoogleアカウントでログインしてください。</p>
        <button id="signIn" class="button">Googleでログイン</button>
      </section>
    </main>
  `;

  document.querySelector("#signIn").addEventListener("click", async () => {
    try {
      await signInAdmin(firebase.auth);
      location.reload();
    } catch (error) {
      document.querySelector(".login-panel").insertAdjacentHTML(
        "beforeend",
        `<p class="note">${escapeHtml(error.message)}</p>`,
      );
    }
  });
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
        <span class="admin-user">${escapeHtml(currentUser?.email ?? "")}</span>
        <button id="saveDraft" class="button">下書き保存</button>
        <button id="publishCourse" class="button">公開する</button>
        <a class="button button--ghost" href="../?preview=draft" target="_blank" rel="noreferrer">下書きをプレビュー</a>
        <button id="signOut" class="button button--ghost">ログアウト</button>
      </div>
    </header>

    ${message ? `<div class="admin-message" role="status">${escapeHtml(message)}</div>` : ""}

    <main class="admin-shell">
      <aside class="admin-sidebar">
        <h2>レッスン</h2>
        <div class="admin-lesson-list">${renderLessonList()}</div>
        <button id="addLesson" class="button button--full button--ghost">レッスン追加</button>
        <button id="resetDraft" class="button button--full button--danger">下書きを破棄</button>
      </aside>

      <section class="admin-editor">
        <div class="editor-section admin-help">
          <h2>編集の流れ</h2>
          <p>この画面で保存した内容はFirestoreの下書きに入ります。サイトへ載せる内容が決まったら、公開します。</p>
        </div>

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

async function addLesson() {
  updateSiteFromForm();
  updateLessonFromForm();
  course.lessons = course.lessons ?? [];
  const lesson = emptyLesson();
  course.lessons.push(lesson);
  selectedLessonId = lesson.id;
  await saveDraft();
  setMessage("レッスンを追加しました。");
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", async () => {
      updateSiteFromForm();
      updateLessonFromForm();
      selectedLessonId = button.dataset.select;
      await saveDraft();
      render();
    });
  });

  document.querySelector("#addLesson")?.addEventListener("click", addLesson);
  document.querySelector("#addFirstLesson")?.addEventListener("click", addLesson);

  document.querySelector("#applyLesson")?.addEventListener("click", async () => {
    updateSiteFromForm();
    updateLessonFromForm();
    await saveDraft();
    setMessage("編集中のレッスンを下書きに保存しました。");
    render();
  });

  document.querySelector("#saveDraft").addEventListener("click", async () => {
    updateSiteFromForm();
    updateLessonFromForm();
    await saveDraft();
    setMessage("下書きを保存しました。");
    render();
  });

  document.querySelector("#publishCourse").addEventListener("click", async () => {
    updateSiteFromForm();
    updateLessonFromForm();
    await saveDraft();
    if (firebase && currentUser) {
      await publishCourse(firebase.db, course);
      setMessage("公開しました。表示状態が「表示する」のレッスンだけがサイトに出ます。");
    } else {
      setMessage("Firebaseに接続されていないため公開できません。");
    }
    render();
  });

  document.querySelector("#duplicateLesson")?.addEventListener("click", async () => {
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
    await saveDraft();
    setMessage("レッスンを複製しました。");
    render();
  });

  document.querySelector("#deleteLesson")?.addEventListener("click", async () => {
    course.lessons = (course.lessons ?? []).filter((lesson) => lesson.id !== selectedLessonId);
    selectedLessonId = course.lessons[0]?.id ?? "";
    await saveDraft();
    setMessage("レッスンを削除しました。");
    render();
  });

  document.querySelector("#resetDraft").addEventListener("click", () => {
    localStorage.removeItem(DRAFT_KEY);
    location.reload();
  });

  document.querySelector("#signOut").addEventListener("click", async () => {
    await signOutAdmin(firebase.auth);
    location.reload();
  });
}

async function init() {
  const root = document.querySelector("#admin");
  try {
    firebase = getFirebaseRuntime();
    if (firebase) {
      currentUser = await waitForUser(firebase.auth);
      if (!currentUser) {
        renderLogin();
        return;
      }
    }
    course = await loadInitialData();
    course.lessons = course.lessons ?? [];
    selectedLessonId = course.lessons[0]?.id ?? "";
    render();
  } catch (error) {
    root.innerHTML = `<main class="error-page"><h1>管理画面エラー</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

init();
