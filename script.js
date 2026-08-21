const STORAGE_KEY = "project-map-state-v4";

const MILESTONE_ICONS = {
  compass: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M29.5 18.5 26 26l-7.5 3.5L22 22z"/><circle cx="24" cy="24" r="2"/></svg>`,
  flag: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 39V10"/><path d="M16 11h18l-5 7 5 7H16z"/><path d="M10 39h12"/></svg>`,
  star: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 8 4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.6L24 32.3l-9.4 4.9 1.8-10.6-7.7-7.5 10.6-1.5z"/></svg>`
};

document.addEventListener("DOMContentLoaded", () => {
  restoreProjectState();
  normalizeTaskStatuses();
  setupRoadmapControls();
  refreshProject({ animate: false, center: true });
  requestAnimationFrame(() => document.getElementById("roadmap")?.classList.add("is-ready"));
  window.addEventListener("resize", () => centerCurrentMilestone(false));
});

function setupRoadmapControls() {
  const roadmap = document.getElementById("roadmap");
  roadmap?.addEventListener("click", (event) => {
    const milestoneButton = event.target.closest(".milestone-button");
    const task = event.target.closest(".task");
    const addTaskButton = event.target.closest(".add-task-button");

    if (milestoneButton) {
      const milestone = milestoneButton.closest(".milestone");
      toggleMilestone(milestoneButton, milestone?.querySelector(".task-branch"));
      centerMilestone(milestone);
    } else if (task) {
      openTaskStatusDialog(task);
    } else if (addTaskButton) {
      openAddTaskDialog(addTaskButton.closest(".milestone"));
    }
  });
  document.getElementById("add-milestone-button")?.addEventListener("click", openAddMilestoneDialog);
}

function toggleMilestone(button, branch) {
  if (!button || !branch) return;
  const willOpen = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) {
    branch.hidden = false;
    requestAnimationFrame(() => branch.classList.add("is-open"));
  } else {
    branch.classList.remove("is-open");
    setTimeout(() => {
      if (button.getAttribute("aria-expanded") === "false") branch.hidden = true;
    }, 400);
  }
  saveProjectState();
}

function centerMilestone(milestone, smooth = true) {
  const roadmap = document.getElementById("roadmap");
  if (!roadmap || !milestone) return;
  const left = milestone.offsetLeft - (roadmap.clientWidth - milestone.offsetWidth) / 2;
  roadmap.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
}

function centerCurrentMilestone(smooth = true) {
  const current = document.querySelector('.milestone[data-status="current"]') ||
    getMilestones().find((milestone) => milestone.dataset.status !== "complete");
  centerMilestone(current, smooth);
}

function openTaskStatusDialog(task) {
  const content = createElement("div", "task-status-options");
  [
    ["complete", "✓", "完了"],
    ["current", "●", "今やってる"],
    ["next", "○", "次にやる"],
    ["future", "○", "未着手"]
  ].forEach(([status, icon, label]) => {
    const button = createElement("button", `task-status-option status-${status}`);
    button.type = "button";
    button.innerHTML = `<span class="status-option-icon">${icon}</span><span>${label}</span>`;
    button.addEventListener("click", () => {
      changeTaskStatus(task, status);
      closeDialog();
    });
    content.appendChild(button);
  });
  openDialog({ label: "タスクの状態", title: getTaskName(task), content });
}

function changeTaskStatus(task, status) {
  const wasCurrent = getTaskStatus(task) === "current";
  renderTaskStatus(task, status);

  if (status === "current") {
    setFlowFromCurrent(task);
  } else if (status === "complete" && wasCurrent) {
    advanceFromCompletedTask(task);
  } else if (status === "next") {
    getAllTasks()
      .filter((item) => item !== task && getTaskStatus(item) === "next")
      .forEach((item) => renderTaskStatus(item, "future"));
  } else if (status === "future" && wasCurrent) {
    const nextIncomplete = getAllTasks().find((item) => getTaskStatus(item) !== "complete");
    if (nextIncomplete) setFlowFromCurrent(nextIncomplete);
  }

  refreshProject({ animate: true, center: true });
  saveProjectState();
}

function setFlowFromCurrent(currentTask) {
  const tasks = getAllTasks();
  const currentIndex = tasks.indexOf(currentTask);
  tasks.forEach((task) => {
    if (task !== currentTask && ["current", "next"].includes(getTaskStatus(task))) {
      renderTaskStatus(task, "future");
    }
  });
  renderTaskStatus(currentTask, "current");
  const next = tasks.slice(currentIndex + 1).find((task) => getTaskStatus(task) !== "complete");
  if (next) renderTaskStatus(next, "next");
}

function advanceFromCompletedTask(completedTask) {
  const tasks = getAllTasks();
  const next = tasks
    .slice(tasks.indexOf(completedTask) + 1)
    .find((task) => getTaskStatus(task) !== "complete");
  tasks
    .filter((task) => ["current", "next"].includes(getTaskStatus(task)))
    .forEach((task) => renderTaskStatus(task, "future"));
  if (next) setFlowFromCurrent(next);
}

function renderTaskStatus(task, status) {
  const name = getTaskName(task);
  task.dataset.status = status;
  task.classList.remove("task-complete", "task-current", "task-next");
  task.replaceChildren();

  if (status === "complete") {
    task.classList.add("task-complete");
    task.append(createElement("span", "task-check", "✓"), createElement("span", "task-name", name));
  } else if (status === "current" || status === "next") {
    const isCurrent = status === "current";
    task.classList.add(isCurrent ? "task-current" : "task-next");
    const text = createElement("div", "task-text");
    text.append(createElement("span", "task-name", name), createElement("span", "task-badge", isCurrent ? "今やってる" : "次はこれ"));
    task.append(createElement("span", "task-marker", isCurrent ? "●" : "○"), text);
  } else {
    task.append(createElement("span", "task-marker", "○"), createElement("span", "task-name", name));
  }
}

function refreshProject({ animate = true, center = false } = {}) {
  refreshMilestoneStatuses();
  refreshRoadmapLines(animate);
  refreshProgressPanel();
  if (center) requestAnimationFrame(() => centerCurrentMilestone(animate));
}

function refreshMilestoneStatuses() {
  document.querySelectorAll(".current-label").forEach((label) => label.remove());
  getMilestones().forEach((milestone) => {
    const tasks = [...milestone.querySelectorAll(".task")];
    const allComplete = tasks.length > 0 && tasks.every((task) => getTaskStatus(task) === "complete");
    const hasCurrent = tasks.some((task) => getTaskStatus(task) === "current");
    const status = allComplete ? "complete" : hasCurrent ? "current" : "future";
    milestone.dataset.status = status;
    milestone.classList.remove("milestone-complete", "milestone-current", "milestone-future");
    milestone.classList.add(`milestone-${status}`);
    const statusText = milestone.querySelector(".milestone-status");
    if (statusText) {
      statusText.textContent = status === "complete" ? "完了" : status === "current" ? "進行中" : milestone.dataset.milestoneId === "complete" ? "ゴール" : "未着手";
    }
    if (status === "current") {
      milestone.insertBefore(createElement("div", "current-label", "今ここ"), milestone.querySelector(".milestone-button"));
      const branch = milestone.querySelector(".task-branch");
      const button = milestone.querySelector(".milestone-button");
      if (branch && button) {
        branch.hidden = false;
        branch.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    }
  });
}

function refreshRoadmapLines(animate) {
  const milestones = getMilestones();
  let pathIsComplete = true;
  document.querySelectorAll(".roadmap-line").forEach((line, index) => {
    const complete = pathIsComplete && milestones[index]?.dataset.status === "complete";
    pathIsComplete = complete;
    const wasComplete = line.classList.contains("is-complete");
    line.classList.remove("roadmap-line-complete", "roadmap-line-future", "is-advancing", "is-retreating");
    line.classList.toggle("is-complete", complete);
    line.classList.add(complete ? "roadmap-line-complete" : "roadmap-line-future");
    if (animate && complete !== wasComplete) line.classList.add(complete ? "is-advancing" : "is-retreating");
  });
}

function refreshProgressPanel() {
  const tasks = getAllTasks();
  const currentTask = tasks.find((task) => getTaskStatus(task) === "current");
  const nextTask = tasks.find((task) => getTaskStatus(task) === "next");
  const currentMilestone = document.querySelector('.milestone[data-status="current"]') || getMilestones().find((item) => item.dataset.status !== "complete");
  const completed = tasks.filter((task) => getTaskStatus(task) === "complete").length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  setText("#progress-percent", `${percent}%`);
  setText(".current-task-box strong", currentTask ? getTaskName(currentTask) : "現在のタスクはありません");
  setText(".next-task-box strong", nextTask ? getTaskName(nextTask) : "次のタスクはありません");
  setText(".current-milestone strong", currentMilestone?.querySelector(".milestone-name")?.textContent.trim() || "完了");
  document.querySelector(".progress-bar")?.setAttribute("aria-valuenow", String(percent));
  const fill = document.querySelector(".progress-bar-fill");
  if (fill) fill.style.width = `${percent}%`;
  const panelIcon = document.querySelector(".current-milestone-icon");
  const sourceIcon = currentMilestone?.querySelector(".milestone-icon");
  if (panelIcon && sourceIcon) panelIcon.innerHTML = sourceIcon.innerHTML;
}

function openAddTaskDialog(milestone) {
  if (!milestone) return;
  const input = createTextInput("追加するタスク名");
  const content = createFormContent(input, "タスクを追加", () => {
    const name = input.value.trim();
    if (!name) return showInputError(input, "タスク名を入力してくれ。");
    milestone.querySelector(".task-list")?.appendChild(createTask(name));
    closeDialog();
    refreshProject({ animate: false, center: true });
    saveProjectState();
  });
  openDialog({ label: "ADD TASK", title: "タスクを追加", content, focus: input });
}

function openAddMilestoneDialog() {
  const nameInput = createTextInput("マイルストーン名");
  const taskInput = createTextInput("最初のタスク名");
  const picker = createIconPicker();
  const fields = createElement("div", "dialog-fields");
  fields.append(nameInput, taskInput, picker.element);
  const content = createFormContent(fields, "マイルストーンを追加", () => {
    const name = nameInput.value.trim();
    const firstTask = taskInput.value.trim();
    if (!name) return showInputError(nameInput, "マイルストーン名を入力してくれ。");
    if (!firstTask) return showInputError(taskInput, "最初のタスク名を入力してくれ。");
    appendMilestone({ name, firstTask, iconKey: picker.getValue() });
    closeDialog();
    refreshProject({ animate: false });
    saveProjectState();
  });
  openDialog({ label: "ADD MILESTONE", title: "マイルストーンを追加", content, focus: nameInput });
}

function appendMilestone({ name, firstTask, iconKey }) {
  const roadmap = document.getElementById("roadmap");
  const goal = getMilestones().find((item) => item.dataset.milestoneId === "complete");
  const milestone = createMilestone({ id: `milestone-${Date.now()}`, name, iconKey, tasks: [{ name: firstTask, status: "future" }] });
  const line = createElement("div", "roadmap-line roadmap-line-future");
  line.setAttribute("aria-hidden", "true");
  if (goal) {
    roadmap.insertBefore(milestone, goal);
    roadmap.insertBefore(line, goal);
  } else {
    if (getMilestones().length) roadmap.appendChild(line);
    roadmap.appendChild(milestone);
  }
  requestAnimationFrame(() => centerMilestone(milestone));
}

function createMilestone({ id, name, iconKey, iconHtml, tasks, expanded = false }) {
  const milestone = createElement("article", "milestone milestone-future");
  milestone.dataset.milestoneId = id;
  milestone.dataset.status = "future";
  milestone.dataset.iconKey = iconKey || "";
  const button = createElement("button", "milestone-button");
  button.type = "button";
  button.setAttribute("aria-expanded", String(expanded));
  button.innerHTML = `<span class="milestone-icon">${iconKey ? MILESTONE_ICONS[iconKey] : iconHtml || "🧭"}</span><span class="milestone-name"></span><span class="milestone-status">未着手</span>`;
  button.querySelector(".milestone-name").textContent = name;
  const branch = createElement("div", expanded ? "task-branch is-open" : "task-branch");
  branch.hidden = !expanded;
  const list = createElement("div", "task-list");
  tasks.forEach((task) => list.appendChild(createTask(task.name, task.status)));
  const addButton = createElement("button", "add-task-button", "＋ タスクを追加");
  addButton.type = "button";
  branch.append(list, addButton);
  milestone.append(button, branch);
  return milestone;
}

function createTask(name, status = "future") {
  const task = createElement("div", "task");
  task.dataset.status = status;
  task.appendChild(createElement("span", "task-name", name));
  renderTaskStatus(task, status);
  return task;
}

function openDialog({ label, title, content, focus }) {
  closeDialog(true);
  const overlay = createElement("div", "task-status-overlay");
  const dialog = createElement("div", "task-status-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.append(createElement("p", "task-status-dialog-label", label), createElement("h3", "", title), content);
  const cancel = createElement("button", "task-status-cancel", "キャンセル");
  cancel.type = "button";
  cancel.addEventListener("click", () => closeDialog());
  dialog.appendChild(cancel);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeDialog(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.classList.add("is-visible"); focus?.focus(); });
}

function closeDialog(immediate = false) {
  const overlay = document.querySelector(".task-status-overlay");
  if (!overlay) return;
  overlay.classList.remove("is-visible");
  if (immediate) overlay.remove(); else setTimeout(() => overlay.remove(), 200);
}

function createFormContent(field, label, onSubmit) {
  const form = createElement("form", "dialog-form");
  form.appendChild(field);
  const submit = createElement("button", "dialog-submit", label);
  submit.type = "submit";
  form.appendChild(submit);
  form.addEventListener("submit", (event) => { event.preventDefault(); onSubmit(); });
  return form;
}

function createTextInput(placeholder) {
  const input = createElement("input", "dialog-input");
  input.type = "text";
  input.placeholder = placeholder;
  input.maxLength = 40;
  return input;
}

function createIconPicker() {
  const element = createElement("fieldset", "icon-picker");
  element.appendChild(createElement("legend", "", "アイコンを選ぶ"));
  Object.entries(MILESTONE_ICONS).forEach(([key, svg], index) => {
    const label = createElement("label", "icon-choice");
    const input = createElement("input");
    input.type = "radio";
    input.name = "milestone-icon";
    input.value = key;
    input.checked = index === 0;
    const preview = createElement("span", "icon-choice-preview");
    preview.innerHTML = svg;
    label.append(input, preview);
    element.appendChild(label);
  });
  return { element, getValue: () => element.querySelector('input:checked')?.value || "compass" };
}

function showInputError(input, message) {
  input.setCustomValidity(message);
  input.reportValidity();
  input.addEventListener("input", () => input.setCustomValidity(""), { once: true });
}

function saveProjectState() {
  const state = getMilestones().map((milestone) => ({
    id: milestone.dataset.milestoneId,
    name: milestone.querySelector(".milestone-name")?.textContent.trim() || "マイルストーン",
    iconKey: milestone.dataset.iconKey || "",
    iconHtml: milestone.querySelector(".milestone-icon")?.innerHTML || "🧭",
    expanded: milestone.querySelector(".milestone-button")?.getAttribute("aria-expanded") === "true",
    tasks: [...milestone.querySelectorAll(".task")].map((task) => ({ name: getTaskName(task), status: getTaskStatus(task) }))
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreProjectState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const state = JSON.parse(saved);
    if (!Array.isArray(state) || !state.length) return;
    const roadmap = document.getElementById("roadmap");
    roadmap.replaceChildren();
    state.forEach((item, index) => {
      if (index) {
        const line = createElement("div", "roadmap-line roadmap-line-future");
        line.setAttribute("aria-hidden", "true");
        roadmap.appendChild(line);
      }
      roadmap.appendChild(createMilestone(item));
    });
  } catch (error) {
    console.warn("保存したプロジェクト状態を読み込めませんでした。", error);
  }
}

function normalizeTaskStatuses() { getAllTasks().forEach((task) => renderTaskStatus(task, getTaskStatus(task))); }
function getMilestones() { return [...document.querySelectorAll(".milestone")]; }
function getAllTasks() { return [...document.querySelectorAll(".task")]; }
function getTaskName(task) { return task.querySelector(".task-name")?.textContent.trim() || "タスク"; }
function getTaskStatus(task) {
  if (task.dataset.status) return task.dataset.status;
  if (task.classList.contains("task-complete")) return "complete";
  if (task.classList.contains("task-current")) return "current";
  if (task.classList.contains("task-next")) return "next";
  return "future";
}
function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
function setText(selector, text) { const element = document.querySelector(selector); if (element) element.textContent = text; }

window.refreshProjectProgress = () => refreshProject({ animate: true, center: true });

