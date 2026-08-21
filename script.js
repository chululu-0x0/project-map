const STORAGE_KEY = "project-map-state-v4";

let selectedMilestone = null;

// ========================================
// ▼ 誤クリック防止用
//
// タスク並び替え直後や、
// PCでロードマップをドラッグした直後に
// 編集画面が誤って開かないようにする。
// ========================================

let suppressTaskClickUntil = 0;
let suppressRoadmapClickUntil = 0;

// ========================================
// ▼ マイルストーンの順番ごとの色
//
// アイコン自身が色を持つのではなく、
// 「今何番目にいるか」で色を決める。
//
// そのためマイルストーンを並び替えると、
// 移動先の順位に合わせて自動で色が変わる。
// ========================================

const MILESTONE_ORDER_COLORS = [
  {
    main: "#f29ab2",   // 1番目：ピンク
    soft: "#fff1f5"
  },
  {
    main: "#8fcde8",   // 2番目：水色
    soft: "#eef9fe"
  },
  {
    main: "#9bd7b0",   // 3番目：緑
    soft: "#effaf3"
  },
  {
    main: "#c9afe8",   // 4番目：紫
    soft: "#f7f1fc"
  },
  {
    main: "#f2c887",   // 5番目：黄色
    soft: "#fff8e9"
  },
  {
    main: "#f2a79a",   // 6番目：コーラル
    soft: "#fff2ef"
  }
];

const MILESTONE_ICONS = {
  compass: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M29.5 18.5 26 26l-7.5 3.5L22 22z"/><circle cx="24" cy="24" r="2"/></svg>`,
  flag: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 39V10"/><path d="M16 11h18l-5 7 5 7H16z"/><path d="M10 39h12"/></svg>`,
  star: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 8 4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.6L24 32.3l-9.4 4.9 1.8-10.6-7.7-7.5 10.6-1.5z"/></svg>`
};

document.addEventListener("DOMContentLoaded", () => {

  restoreProjectState();

  normalizeTaskStatuses();

  ensureMilestoneControls();

  setupRoadmapControls();

  // タスクの長押し上下移動
  setupTaskReordering();

  // ========================================
  // ▼ PC用
  // マウスでロードマップを掴んで
  // 左右へスライドできるようにする
  // ========================================
  setupRoadmapDragging();

  refreshProject({
    animate: false,
    center: true
  });

  requestAnimationFrame(() => {
    document
      .getElementById("roadmap")
      ?.classList.add("is-ready");
  });

  window.addEventListener(
    "resize",
    () => centerCurrentMilestone(false)
  );
});

// ========================================
// ▼ ロードマップ内のクリック操作
//
// 【基本ルール】
//
// 中央にないマイルストーン
//   → 1回目は中央へ移動するだけ
//
// 中央にあるマイルストーン
//   → クリックで編集画面
//
// 中央にないマイルストーンのタスク
//   → 1回目は親マイルストーンを中央へ
//
// 中央にあるマイルストーンのタスク
//   → クリックでタスク編集
//
// 「何かを変更する前に、まず中央へ」
// というルールで統一する。
// ========================================

function setupRoadmapControls() {

  const roadmap =
    document.getElementById("roadmap");

  roadmap?.addEventListener(
    "click",
    (event) => {

      // PCドラッグ直後のクリックなら無視
      if (
        Date.now() <
        suppressRoadmapClickUntil
      ) {
        return;
      }


      const task =
        event.target.closest(".task");

      const addTaskButton =
        event.target.closest(
          ".add-task-button"
        );

      const milestoneButton =
        event.target.closest(
          ".milestone-button"
        );


      // ========================================
      // ▼ タスク
      // ========================================

      if (task) {

        // 長押し並び替え直後の
        // 誤クリックを防ぐ
        if (
          Date.now() <
          suppressTaskClickUntil
        ) {
          return;
        }


        const milestone =
          task.closest(".milestone");


        // ----------------------------------------
        // まだ中央ではない
        // → 編集せず中央へ移動
        // ----------------------------------------

        if (
          !isMilestoneCentered(milestone)
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        // ----------------------------------------
        // すでに中央
        // → 選択状態も合わせてから編集
        // ----------------------------------------

        selectMilestone(
          milestone,
          false
        );

        openTaskStatusDialog(task);

        return;
      }


      // ========================================
      // ▼ タスク追加
      //
      // これも「変更操作」なので
      // 中央にあるときだけ開く
      // ========================================

      if (addTaskButton) {

        const milestone =
          addTaskButton.closest(
            ".milestone"
          );


        if (
          !isMilestoneCentered(milestone)
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        selectMilestone(
          milestone,
          false
        );

        openAddTaskDialog(milestone);

        return;
      }


      // ========================================
      // ▼ マイルストーン
      // ========================================

      if (milestoneButton) {

        const milestone =
          milestoneButton.closest(
            ".milestone"
          );


        // ----------------------------------------
        // 中央にいない
        // → まず中央へ
        // ----------------------------------------

        if (
          !isMilestoneCentered(milestone)
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        // ----------------------------------------
        // すでに中央
        // → 2回目の操作として編集
        // ----------------------------------------

        selectMilestone(
          milestone,
          false
        );

        openMilestoneEditDialog(
          milestone
        );

        return;
      }
    }
  );


  // ========================================
  // ▼ マイルストーン追加
  //
  // これはロードマップ全体の追加機能なので
  // 中央判定の対象外。
  // ========================================

  document
    .getElementById(
      "add-milestone-button"
    )
    ?.addEventListener(
      "click",
      openAddMilestoneDialog
    );
}

function toggleMilestone(button, branch) {
  if (!button || !branch) return;
  const willOpen = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(willOpen));
  button.closest(".milestone")?.querySelector(".milestone-button")?.setAttribute("aria-expanded", String(willOpen));
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
  if (!milestone) return;
  milestone.scrollIntoView({
    behavior: smooth ? "smooth" : "auto",
    block: "nearest",
    inline: "center"
  });
}

function centerCurrentMilestone(smooth = true) {
  const current = (selectedMilestone?.isConnected ? selectedMilestone : null) ||
    document.querySelector('.milestone[data-status="current"]') ||
    getMilestones().find((milestone) => milestone.dataset.status !== "complete");
  if (!selectedMilestone && current) selectMilestone(current, false);
  centerMilestone(current, smooth);
}

// ========================================
// ▼ マイルストーンの補助UI準備
//
// ・タスクは常時展開
// ・開閉ボタンは廃止
// ・左右矢印も廃止
// ・アイコン単独編集も廃止
//
// マイルストーン本体を
// 一つの操作領域として扱う。
// ========================================

function ensureMilestoneControls(
  root = document
) {

  const milestones =
    root.matches?.(".milestone")
      ? [root]
      : [
          ...root.querySelectorAll(
            ".milestone"
          )
        ];


  milestones.forEach(
    (milestone) => {

      const milestoneButton =
        milestone.querySelector(
          ".milestone-button"
        );

      const branch =
        milestone.querySelector(
          ".task-branch"
        );

      const icon =
        milestone.querySelector(
          ".milestone-icon"
        );


      // ========================================
      // ▼ 古い直接編集処理を解除
      // ========================================

      milestoneButton
        ?.removeAttribute("onclick");


      // ========================================
      // ▼ タスクは常時展開
      // ========================================

      if (branch) {

        branch.hidden = false;

        branch.classList.add(
          "is-open"
        );
      }


      if (milestoneButton) {

        milestoneButton.setAttribute(
          "aria-expanded",
          "true"
        );
      }


      // ========================================
      // ▼ アイコン単独編集は廃止
      //
      // 前回付けたtitle等も削除する
      // ========================================

      if (icon) {

        icon.removeAttribute("title");

        icon.removeAttribute(
          "aria-label"
        );
      }


      // ========================================
      // ▼ 古いタスク開閉ボタン削除
      // ========================================

      milestone
        .querySelector(
          ".milestone-toggle"
        )
        ?.remove();


      // ========================================
      // ▼ 前回追加した左右矢印を削除
      // ========================================

      milestone
        .querySelector(
          ".milestone-navigation"
        )
        ?.remove();
    }
  );


  // 順番による色だけは継続
  applyMilestoneOrderColors();
}

// ========================================
// ▼ マイルストーンの順番で色を決める
//
// マイルストーン自身には固定色を保存しない。
// 現在の並び順を見て毎回色を割り当て直す。
// ========================================

function applyMilestoneOrderColors() {

  const milestones =
    getMilestones();


  milestones.forEach(
    (milestone, index) => {

      const color =
        MILESTONE_ORDER_COLORS[
          index % MILESTONE_ORDER_COLORS.length
        ];


      // CSSで使える変数として設定
      milestone.style.setProperty(
        "--milestone-order-color",
        color.main
      );

      milestone.style.setProperty(
        "--milestone-order-soft",
        color.soft
      );
    }
  );
}


// ========================================
// ▼ 左右矢印の有効・無効
//
// 一番左では「左」を押せない。
// 一番右では「右」を押せない。
// ========================================

function updateMilestoneNavigationState() {

  const milestones =
    getMilestones();


  milestones.forEach(
    (milestone, index) => {

      const left =
        milestone.querySelector(
          '.milestone-nav-button[data-direction="-1"]'
        );

      const right =
        milestone.querySelector(
          '.milestone-nav-button[data-direction="1"]'
        );


      if (left) {

        left.disabled =
          index === 0;
      }


      if (right) {

        right.disabled =
          index === milestones.length - 1;
      }
    }
  );
}


// ========================================
// ▼ 左右矢印を押したときのぽよん
//
// 同じボタンを連続で押しても
// アニメーションを最初から再生できるように、
// 一度クラスを外してから付け直す。
// ========================================

function animateNavigationButton(button) {

  button.classList.remove(
    "is-nav-popping"
  );

  // アニメーションを再スタートさせるため
  // 一度ブラウザに状態を確定させる
  void button.offsetWidth;

  button.classList.add(
    "is-nav-popping"
  );


  setTimeout(() => {

    button.classList.remove(
      "is-nav-popping"
    );

  }, 430);
}

// ========================================
// ▼ 本当に中央に表示されているか判定
//
// selectedMilestoneだけでは判断しない。
//
// 実際の画面上の位置を測って、
// マイルストーンの中心と
// ロードマップ表示領域の中心が
// 近ければ「中央」と判断する。
// ========================================

function isMilestoneCentered(
  milestone
) {

  if (!milestone) {
    return false;
  }


  const roadmap =
    document.getElementById(
      "roadmap"
    );

  const button =
    milestone.querySelector(
      ".milestone-button"
    );


  if (!roadmap || !button) {
    return false;
  }


  const roadmapRect =
    roadmap.getBoundingClientRect();

  const buttonRect =
    button.getBoundingClientRect();


  // ロードマップ表示領域の中央
  const roadmapCenter =
    roadmapRect.left +
    roadmapRect.width / 2;


  // マイルストーン本体の中央
  const milestoneCenter =
    buttonRect.left +
    buttonRect.width / 2;


  // ========================================
  // 完全に1px単位で一致させると
  // スクロール終了位置の小さな誤差で
  // 判定に失敗することがある。
  //
  // そのため±36pxまでは
  // 「中央」とみなす。
  // ========================================

  return (
    Math.abs(
      roadmapCenter -
      milestoneCenter
    ) <= 36
  );
}

// ========================================
// ▼ PC用ロードマップ横ドラッグ
//
// マウスの左ボタンを押したまま
// 左右へシュッと動かすことで
// ロードマップを移動できる。
//
// iPhoneのタッチスクロールには
// ブラウザ標準の操作をそのまま使う。
// ========================================

function setupRoadmapDragging() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  let drag = null;


  // ========================================
  // ▼ マウスを押した
  // ========================================

  roadmap.addEventListener(
    "pointerdown",
    (event) => {

      // PCマウス専用
      // iPhoneの指操作には介入しない
      if (
        event.pointerType !== "mouse"
      ) {
        return;
      }


      // 左クリックだけ
      if (event.button !== 0) {
        return;
      }


      // ----------------------------------------
      // タスク上では
      // 「タスク並び替え」を優先する
      // ----------------------------------------

      if (
        event.target.closest(".task")
      ) {
        return;
      }


      // ----------------------------------------
      // タスク追加ボタン等の操作も
      // 横ドラッグには使わない
      // ----------------------------------------

      if (
        event.target.closest(
          ".add-task-button"
        )
      ) {
        return;
      }


      drag = {

        pointerId:
          event.pointerId,

        startX:
          event.clientX,

        startY:
          event.clientY,

        startScrollLeft:
          roadmap.scrollLeft,

        dragging:
          false
      };


      roadmap.setPointerCapture?.(
        event.pointerId
      );
    }
  );


  // ========================================
  // ▼ 押したまま移動
  // ========================================

  roadmap.addEventListener(
    "pointermove",
    (event) => {

      if (
        !drag ||
        drag.pointerId !==
          event.pointerId
      ) {
        return;
      }


      const moveX =
        event.clientX -
        drag.startX;

      const moveY =
        event.clientY -
        drag.startY;


      // ----------------------------------------
      // 少し動いただけなら
      // 普通のクリック扱い
      // ----------------------------------------

      if (!drag.dragging) {

        if (
          Math.abs(moveX) < 7
        ) {
          return;
        }


        // 縦方向の動きの方が大きい場合は
        // 横ドラッグを開始しない
        if (
          Math.abs(moveY) >
          Math.abs(moveX)
        ) {
          return;
        }


        drag.dragging = true;

        roadmap.classList.add(
          "is-pointer-dragging"
        );
      }


      event.preventDefault();


      // ========================================
      // マウスを右へ動かしたら
      // 内容は左へ移動。
      //
      // マウスを左へ動かしたら
      // 内容は右へ移動。
      // ========================================

      roadmap.scrollLeft =
        drag.startScrollLeft -
        moveX;
    }
  );


  // ========================================
  // ▼ ドラッグ終了
  // ========================================

  const finishDrag = (event) => {

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }


    const wasDragging =
      drag.dragging;


    roadmap.classList.remove(
      "is-pointer-dragging"
    );


    roadmap.releasePointerCapture?.(
      event.pointerId
    );


    drag = null;


    // ----------------------------------------
    // 普通のクリックだった場合は
    // 何もしない
    // ----------------------------------------

    if (!wasDragging) {
      return;
    }


    // ========================================
    // ドラッグ直後に発生するclickを
    // 編集操作として認識させない
    // ========================================

    suppressRoadmapClickUntil =
      Date.now() + 350;


    // ========================================
    // 現在最も中央に近い
    // マイルストーンを探す
    // ========================================

    const roadmapRect =
      roadmap.getBoundingClientRect();

    const center =
      roadmapRect.left +
      roadmapRect.width / 2;


    let nearest = null;

    let nearestDistance =
      Infinity;


    getMilestones().forEach(
      (milestone) => {

        const button =
          milestone.querySelector(
            ".milestone-button"
          );

        if (!button) {
          return;
        }


        const rect =
          button.getBoundingClientRect();

        const itemCenter =
          rect.left +
          rect.width / 2;

        const distance =
          Math.abs(
            center -
            itemCenter
          );


        if (
          distance <
          nearestDistance
        ) {

          nearestDistance =
            distance;

          nearest =
            milestone;
        }
      }
    );


    // ========================================
    // 一番近かったものを
    // 最後にきれいに中央へ吸着させる
    // ========================================

    if (nearest) {

      selectMilestone(
        nearest,
        true
      );
    }
  };


  roadmap.addEventListener(
    "pointerup",
    finishDrag
  );

  roadmap.addEventListener(
    "pointercancel",
    finishDrag
  );
}

function selectMilestone(milestone, center = true) {
  if (!milestone) return;
  getMilestones().forEach((item) => item.classList.remove("is-selected"));
  milestone.classList.add("is-selected");
  selectedMilestone = milestone;
  if (center) centerMilestone(milestone);
}

function navigateMilestone(direction) {
  const milestones = getMilestones();
  const current = selectedMilestone && milestones.includes(selectedMilestone)
    ? selectedMilestone
    : document.querySelector(".milestone-current");
  const target = milestones[milestones.indexOf(current) + direction];
  if (target) selectMilestone(target);
}

function setupTaskReordering() {
  const roadmap = document.getElementById("roadmap");
  if (!roadmap) return;

  let drag = null;

roadmap.addEventListener(
  "pointerdown",
  (event) => {

    const task =
      event.target.closest(".task");


    if (
      !task ||
      event.button !== 0
    ) {
      return;
    }


    const milestone =
      task.closest(".milestone");


    // ========================================
    // ▼ 中央にないタスク
    //
    // 長押ししても並び替えは開始しない。
    // まず親マイルストーンを中央へ移動。
    // ========================================

    if (
      !isMilestoneCentered(
        milestone
      )
    ) {

      // pointerdown後にclickも発生するので、
      // そのclickで編集画面が開かないようにする
      suppressTaskClickUntil =
        Date.now() + 500;


      selectMilestone(
        milestone,
        true
      );

      return;
    }


    // ========================================
    // ▼ 中央にある
    //
    // この時点で初めて
    // 長押し並び替えを許可する。
    // ========================================

    selectMilestone(
      milestone,
      false
    );


    drag = {

      task,

      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      lastY:
        event.clientY,

      dragging:
        false,

      timer:
        setTimeout(
          () =>
            startTaskDrag(task),
          360
        )
    };
  }
);

  roadmap.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance > 8) {
      clearTimeout(drag.timer);
      drag = null;
      return;
    }
    if (!drag.dragging) return;

    event.preventDefault();
    drag.lastY = event.clientY;
    drag.task.style.transform = `translateY(${event.clientY - drag.startY}px) scale(1.03)`;
    maybeSwapTask(drag, event.clientY);
  });

  const finish = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    clearTimeout(drag.timer);
    if (drag.dragging) finishTaskDrag(drag.task);
    drag = null;
  };
  roadmap.addEventListener("pointerup", finish);
  roadmap.addEventListener("pointercancel", finish);

  function startTaskDrag(task) {
    if (!drag || drag.task !== task) return;
    drag.dragging = true;
    suppressTaskClickUntil = Date.now() + 600;
    task.classList.add("is-dragging");
    task.closest(".task-list")?.classList.add("is-reordering");
    navigator.vibrate?.(18);
  }

  function maybeSwapTask(state, pointerY) {
    const task = state.task;
    const list = task.closest(".task-list");
    const siblings = [...list.querySelectorAll(":scope > .task")];
    const index = siblings.indexOf(task);
    const previous = siblings[index - 1];
    const next = siblings[index + 1];

    if (next) {
      const rect = next.getBoundingClientRect();
      if (pointerY > rect.top + rect.height * 0.25) {
        animateTaskSwap(list, task, () => next.after(task));
        state.startY = pointerY;
        task.style.transform = "translateY(0) scale(1.03)";
        return;
      }
    }
    if (previous) {
      const rect = previous.getBoundingClientRect();
      if (pointerY < rect.bottom - rect.height * 0.25) {
        animateTaskSwap(list, task, () => previous.before(task));
        state.startY = pointerY;
        task.style.transform = "translateY(0) scale(1.03)";
      }
    }
  }
}

function animateTaskSwap(list, draggedTask, move) {
  const tasks = [...list.querySelectorAll(":scope > .task")];
  const before = new Map(tasks.map((task) => [task, task.getBoundingClientRect().top]));
  move();
  tasks.forEach((task) => {
    if (task === draggedTask) return;
    const distance = before.get(task) - task.getBoundingClientRect().top;
    if (distance) {
      task.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }],
        { duration: 240, easing: "cubic-bezier(0.2, 0.9, 0.35, 1)" }
      );
    }
  });
}

function finishTaskDrag(task) {
  task.style.transform = "";
  task.classList.remove("is-dragging");
  task.classList.add("is-dropping");
  task.closest(".task-list")?.classList.remove("is-reordering");
  setTimeout(() => task.classList.remove("is-dropping"), 380);

  const current = getAllTasks().find((item) => getTaskStatus(item) === "current");
  if (current) setFlowFromCurrent(current);
  refreshProject({ animate: false, center: false });
  saveProjectState();
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
      closeDialog();
      animateTaskStateChange(task, () => changeTaskStatus(task, status));
    });
    content.appendChild(button);
  });

  const editArea = createElement("div", "task-edit-area");
  const nameInput = createTextInput("タスク名");
  nameInput.value = getTaskName(task);
  const saveNameButton = createElement("button", "dialog-secondary", "タスク名を変更");
  saveNameButton.type = "button";
  saveNameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) return showInputError(nameInput, "タスク名を入力してくれ。");
    task.querySelector(".task-name").textContent = name;
    closeDialog();
    animateTaskStateChange(task, () => {
      refreshProject({ animate: false, center: false });
      saveProjectState();
    });
  });
  const deleteButton = createElement("button", "dialog-danger", "このタスクを削除");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => {
    if (!window.confirm(`「${getTaskName(task)}」を削除するか？`)) return;
    const wasCurrent = getTaskStatus(task) === "current";
    task.remove();
    if (wasCurrent) {
      const next = getAllTasks().find((item) => getTaskStatus(item) !== "complete");
      if (next) setFlowFromCurrent(next);
    }
    closeDialog();
    refreshProject({ animate: true, center: true });
    saveProjectState();
  });
  editArea.append(nameInput, saveNameButton, deleteButton);
  content.after(editArea);

  const wrapper = createElement("div", "task-dialog-content");
  wrapper.append(content, editArea);
  openDialog({ label: "タスクの状態", title: getTaskName(task), content: wrapper });
}

// ========================================
// ▼ タスク状態変更アニメーション
//
// ① きゅっと縮む
// ② 状態を変更
// ③ 大きくぽよん
// ④ 少し縮む
// ⑤ もう一度膨らむ
// ⑥ 元の大きさへ
// ========================================

function animateTaskStateChange(
  task,
  update
) {

  task.classList.remove(
    "is-state-changing",
    "is-state-changed"
  );


  // 最初にきゅっと縮む
  task.classList.add(
    "is-state-changing"
  );


  setTimeout(() => {

    // 実際の状態をここで変更
    update();


    task.classList.remove(
      "is-state-changing"
    );


    // 強めのぽよん
    task.classList.add(
      "is-state-changed"
    );


    setTimeout(() => {

      task.classList.remove(
        "is-state-changed"
      );

    }, 620);

  }, 130);
}

// ========================================
// ▼ タスク状態変更
//
// 状態が変わってロードマップ全体が
// 再計算されても、操作したタスクの
// マイルストーンを中央に維持する。
// ========================================

function changeTaskStatus(
  task,
  status
) {

  const milestone =
    task.closest(".milestone");


  const wasCurrent =
    getTaskStatus(task) ===
    "current";


  renderTaskStatus(
    task,
    status
  );


  if (status === "current") {

    setFlowFromCurrent(task);

  } else if (
    status === "complete" &&
    wasCurrent
  ) {

    advanceFromCompletedTask(
      task
    );

  } else if (
    status === "next"
  ) {

    getAllTasks()

      .filter(
        (item) =>
          item !== task &&
          getTaskStatus(item) ===
            "next"
      )

      .forEach(
        (item) =>
          renderTaskStatus(
            item,
            "future"
          )
      );

  } else if (
    status === "future" &&
    wasCurrent
  ) {

    const nextIncomplete =
      getAllTasks().find(
        (item) =>
          getTaskStatus(item) !==
          "complete"
      );


    if (nextIncomplete) {

      setFlowFromCurrent(
        nextIncomplete
      );
    }
  }


  // ========================================
  // ▼ 操作したマイルストーンを
  // 選択対象として維持
  // ========================================

  selectMilestone(
    milestone,
    false
  );


  // 自動中央移動はここでは行わせない
  refreshProject({
    animate: true,
    center: false
  });


  // DOM更新後にもう一度中央位置を合わせる
  requestAnimationFrame(() => {

    centerMilestone(
      milestone,
      true
    );
  });


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

function refreshProject({
  animate = true,
  center = false
} = {}) {

  refreshMilestoneStatuses();

  refreshRoadmapLines(
    animate
  );

  refreshProgressPanel();


  // ========================================
  // マイルストーンの順番が変わった場合、
  // その新しい順位に応じて
  // 色も割り当て直す。
  // ========================================

  applyMilestoneOrderColors();


  if (center) {

    requestAnimationFrame(
      () =>
        centerCurrentMilestone(
          animate
        )
    );
  }
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

function openMilestoneEditDialog(milestone) {
  if (!milestone) return;
  const nameInput = createTextInput("マイルストーン名");
  nameInput.value = milestone.querySelector(".milestone-name")?.textContent.trim() || "";
  const picker = createIconPicker(milestone.dataset.iconKey || "compass");
  const fields = createElement("div", "dialog-fields");
  fields.append(nameInput, picker.element);

  const saveButton = createElement("button", "dialog-submit", "変更を保存");
  saveButton.type = "button";
  saveButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) return showInputError(nameInput, "マイルストーン名を入力してくれ。");
    milestone.querySelector(".milestone-name").textContent = name;
    milestone.dataset.iconKey = picker.getValue();
    milestone.querySelector(".milestone-icon").innerHTML = MILESTONE_ICONS[picker.getValue()];
    closeDialog();
    refreshProgressPanel();
    saveProjectState();
  });

  const reorder = createElement("div", "milestone-reorder-controls");
  const moveLeft = createElement("button", "dialog-secondary", "← 左へ入れ替え");
  const moveRight = createElement("button", "dialog-secondary", "右へ入れ替え →");
  moveLeft.type = moveRight.type = "button";
  moveLeft.addEventListener("click", () => moveMilestone(milestone, -1));
  moveRight.addEventListener("click", () => moveMilestone(milestone, 1));
  reorder.append(moveLeft, moveRight);

  const content = createElement("div", "milestone-edit-content");
  content.append(fields, saveButton, reorder);
  openDialog({ label: "MILESTONE", title: "マイルストーンを編集", content, focus: nameInput });
}

function moveMilestone(milestone, direction) {
  const roadmap = document.getElementById("roadmap");
  const milestones = getMilestones();
  const lines = [...roadmap.querySelectorAll(":scope > .roadmap-line")];
  const index = milestones.indexOf(milestone);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= milestones.length) return;

  [milestones[index], milestones[targetIndex]] = [milestones[targetIndex], milestones[index]];
  roadmap.replaceChildren();
  milestones.forEach((item, itemIndex) => {
    roadmap.appendChild(item);
    if (lines[itemIndex]) roadmap.appendChild(lines[itemIndex]);
  });
closeDialog();


// ========================================
// 並び替え後の表示をまとめて更新
// ========================================

refreshProject({
  animate: false,
  center: false
});


// 新しい順位のマイルストーンを選択
selectMilestone(milestone);


// 保存
saveProjectState();
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
  ensureMilestoneControls(milestone);
  selectMilestone(milestone);
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

function createIconPicker(selectedKey = "compass") {
  const element = createElement("fieldset", "icon-picker");
  element.appendChild(createElement("legend", "", "アイコンを選ぶ"));
  Object.entries(MILESTONE_ICONS).forEach(([key, svg], index) => {
    const label = createElement("label", "icon-choice");
    const input = createElement("input");
    input.type = "radio";
    input.name = "milestone-icon";
    input.value = key;
    input.checked = key === selectedKey || (!MILESTONE_ICONS[selectedKey] && index === 0);
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
window.openMilestoneEditor = (button) => {
  const milestone = button.closest(".milestone");
  selectMilestone(milestone);
  openMilestoneEditDialog(milestone);
};

