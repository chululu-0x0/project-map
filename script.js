/* =========================================================
   Project Map v30
   - 既存 project-map-state-v5 と互換
   - マイルストーン横移動
   - タスク縦スクロール
   - 現在タスク自動フォーカス
   - タスクメモ
   - 複数行タイトル
   - 長押しタスク並び替え
========================================================= */

const STORAGE_KEY = "project-map-state-v5";
const PROJECT_TITLE_KEY = "project-map-title-v1";

let selectedMilestone = null;
let selectedTask = null;

let suppressTaskClickUntil = 0;
let suppressRoadmapClickUntil = 0;
let suppressNextTaskClick = null;

const MILESTONE_ORDER_COLORS = [
  { main: "#f29ab2", soft: "#fff1f5" },
  { main: "#8fcde8", soft: "#eef9fe" },
  { main: "#9bd7b0", soft: "#effaf3" },
  { main: "#c9afe8", soft: "#f7f1fc" },
  { main: "#f2c887", soft: "#fff8e9" },
  { main: "#f2a79a", soft: "#fff2ef" }
];

const MILESTONE_ICONS = {
  compass: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="17"/>
      <path d="M29.5 18.5 26 26l-7.5 3.5L22 22z"/>
      <circle cx="24" cy="24" r="2"/>
    </svg>
  `,
  flag: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 39V10"/>
      <path d="M16 11h18l-5 7 5 7H16z"/>
      <path d="M10 39h12"/>
    </svg>
  `,
  star: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m24 8 4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.6L24 32.3l-9.4 4.9 1.8-10.6-7.7-7.5 10.6-1.5z"/>
    </svg>
  `
};

const DEFAULT_PROJECT = [
  {
    id: "planning",
    name: "企画",
    iconHtml: "💡",
    tasks: [
      { name: "作りたいものを決める", status: "complete", memo: "" },
      { name: "必要な機能を整理する", status: "complete", memo: "" },
      { name: "Ver.1.0の完成条件を決める", status: "complete", memo: "" }
    ]
  },
  {
    id: "base",
    name: "基本画面",
    iconHtml: "⚙️",
    tasks: [
      { name: "専用フォルダを作る", status: "complete", memo: "" },
      { name: "GitHubリポジトリを作る", status: "complete", memo: "" },
      { name: "基本ファイルを用意する", status: "complete", memo: "" },
      { name: "基本画面を組み立てる", status: "current", memo: "" },
      { name: "デザインを整える", status: "next", memo: "" }
    ]
  },
  {
    id: "roadmap",
    name: "ロードマップ機能",
    iconHtml: "🗺️",
    tasks: [
      { name: "マイルストーンを追加", status: "future", memo: "" },
      { name: "マイルストーンを線で接続", status: "future", memo: "" },
      { name: "完了部分の線を色付け", status: "future", memo: "" },
      { name: "今ここを表示", status: "future", memo: "" }
    ]
  },
  {
    id: "tasks",
    name: "タスク管理",
    iconHtml: "☑️",
    tasks: [
      { name: "タスクを追加・編集", status: "future", memo: "" },
      { name: "完了状態を変更", status: "future", memo: "" },
      { name: "今やっているタスクを指定", status: "future", memo: "" },
      { name: "次のタスクを表示", status: "future", memo: "" }
    ]
  },
  {
    id: "sync",
    name: "クラウド同期",
    iconHtml: "☁️",
    tasks: [
      { name: "Supabaseを準備", status: "future", memo: "" },
      { name: "ログイン機能", status: "future", memo: "" },
      { name: "データをクラウド保存", status: "future", memo: "" },
      { name: "PC・iPhone間で同期", status: "future", memo: "" }
    ]
  },
  {
    id: "complete",
    name: "Ver.1.0完成",
    iconHtml: "🏆",
    tasks: [
      { name: "Windowsで動作確認", status: "future", memo: "" },
      { name: "iPhoneで動作確認", status: "future", memo: "" },
      { name: "PWAとしてホーム画面に追加", status: "future", memo: "" }
    ]
  }
];

/* =========================================================
   ▼ アプリ起動 ここから
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  restoreProjectState();
  normalizeTaskStatuses();

  setupRoadmapControls();
  setupTaskReordering();
  setupRoadmapDragging();
  setupRoadmapSelectionSync();
  setupInteractionGuards();

  setupProjectTitleEditing();
  setupTaskMemoPanel();
  setupProjectMenu();
  setupTopToolButtonAnimation();

  refreshProject({
    animate: false,
    center: false
  });

  const initial =
    document.querySelector('.milestone[data-status="current"]')
    || getMilestones().find(
      milestone => milestone.dataset.status !== "complete"
    )
    || getMilestones()[0];

  if (initial) {
    selectMilestone(initial, false);

    requestAnimationFrame(() => {
      centerMilestone(initial, false);
      focusMilestoneDefault(initial, false);
    });
  }

  requestAnimationFrame(() => {
    document
      .getElementById("roadmap")
      ?.classList.add("is-ready");
  });

  window.addEventListener("resize", () => {
    if (selectedMilestone?.isConnected) {
      centerMilestone(selectedMilestone, false);
    }
  });
});

/* =========================================================
   ▲ アプリ起動 ここまで
========================================================= */

/* =========================================================
   ▼ ロードマップのクリック・編集操作 ここから
========================================================= */

function setupRoadmapControls() {
  const roadmap = document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  roadmap.addEventListener("click", event => {
    if (Date.now() < suppressRoadmapClickUntil) {
      return;
    }

    const task = event.target.closest(".task");

    if (task) {
      if (suppressNextTaskClick === task) {
        suppressNextTaskClick = null;
        return;
      }

      if (Date.now() < suppressTaskClickUntil) {
        return;
      }

      const milestone = task.closest(".milestone");

      /*
        中央以外のタスクを選んだ時も、
        「親だけ中央へ移動」ではなく
        タスク自身をその場で選択状態にする。

        ・親マイルストーン → 横中央へ
        ・選んだタスク → 膨らんだ選択状態を維持
        ・メモ → 即時切り替え
        ・タスク → 縦中央へ
      */
      if (!canEditMilestone(milestone)) {
        selectMilestone(
          milestone,
          true,
          false
        );

        selectTask(
          task,
          true
        );

        return;
      }

      /*
        1回目は選択。
        2回目は、すでにそのタスクが選択中なら
        縦中央判定に左右されず編集画面を開く。

        smooth scrollの微妙な座標差で
        「反応したりしなかったり」する問題を防ぐ。
      */
      if (selectedTask !== task) {
        selectTask(task, true);
        return;
      }

      openTaskEditDialog(task);
      return;
    }

    const addTaskButton =
      event.target.closest(".add-task-button");

    if (addTaskButton) {
      const milestone =
        addTaskButton.closest(".milestone");

      if (!canEditMilestone(milestone)) {
        selectMilestone(milestone, true);
        return;
      }

      openAddTaskDialog(milestone);
      return;
    }

    const milestoneButton =
      event.target.closest(".milestone-button");

    if (milestoneButton) {
      const milestone =
        milestoneButton.closest(".milestone");

      if (!canEditMilestone(milestone)) {
        selectMilestone(milestone, true);
        return;
      }

      openMilestoneEditDialog(milestone);
    }
  });

  document
    .getElementById("add-milestone-button")
    ?.addEventListener(
      "click",
      openAddMilestoneDialog
    );
}

/* =========================================================
   ▲ ロードマップのクリック・編集操作 ここまで
========================================================= */

/* =========================================================
   ▼ マイルストーン選択と中央移動 ここから
========================================================= */

function isMilestoneCentered(milestone) {
  if (!milestone) {
    return false;
  }

  const roadmap = document.getElementById("roadmap");

  if (!roadmap) {
    return false;
  }

  const roadmapRect =
    roadmap.getBoundingClientRect();

  const milestoneRect =
    milestone.getBoundingClientRect();

  const roadmapCenter =
    roadmapRect.left + roadmapRect.width / 2;

  const milestoneCenter =
    milestoneRect.left + milestoneRect.width / 2;

  return Math.abs(
    roadmapCenter - milestoneCenter
  ) <= 44;
}

function canEditMilestone(milestone) {
  return Boolean(
    milestone
    && selectedMilestone === milestone
    && isMilestoneCentered(milestone)
  );
}

function selectMilestone(
  milestone,
  center = true,
  focusDefault = true
) {
  if (!milestone) {
    return;
  }

  const changed =
    selectedMilestone !== milestone;

  getMilestones().forEach(item => {
    item.classList.remove("is-selected");
  });

  milestone.classList.add("is-selected");
  selectedMilestone = milestone;

  if (center) {
    centerMilestone(milestone, true);
  }

  if (changed && focusDefault) {
    requestAnimationFrame(() => {
      focusMilestoneDefault(
        milestone,
        true
      );
    });
  }
}

function centerMilestone(
  milestone,
  smooth = true
) {
  if (!milestone) {
    return;
  }

  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  const roadRect =
    roadmap.getBoundingClientRect();

  const itemRect =
    milestone.getBoundingClientRect();

  const delta =
    (itemRect.left + itemRect.width / 2)
    -
    (roadRect.left + roadRect.width / 2);

  roadmap.scrollTo({
    left: roadmap.scrollLeft + delta,
    behavior: smooth ? "smooth" : "auto"
  });
}

function getNearestMilestone() {
  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return null;
  }

  const rect =
    roadmap.getBoundingClientRect();

  const center =
    rect.left + rect.width / 2;

  let nearest = null;
  let nearestDistance = Infinity;

  getMilestones().forEach(
    milestone => {
      const itemRect =
        milestone.getBoundingClientRect();

      const itemCenter =
        itemRect.left + itemRect.width / 2;

      const distance =
        Math.abs(center - itemCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = milestone;
      }
    }
  );

  return nearest;
}

function setupRoadmapSelectionSync() {
  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  let timer = null;

  roadmap.addEventListener(
    "scroll",
    () => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        const nearest =
          getNearestMilestone();

        if (
          nearest
          && isMilestoneCentered(nearest)
        ) {
          selectMilestone(
            nearest,
            false,
            true
          );
        }
      }, 120);
    },
    { passive: true }
  );
}

/* =========================================================
   ▲ マイルストーン選択と中央移動 ここまで
========================================================= */

/* =========================================================
   ▼ タスク選択と縦中央表示 ここから
========================================================= */

function clearSelectedTask() {
  document
    .querySelectorAll(
      ".task.is-selected-task"
    )
    .forEach(task => {
      task.classList.remove(
        "is-selected-task"
      );
    });

  selectedTask = null;
  refreshTaskMemoPanel();
}

function selectTask(
  task,
  center = true
) {
  if (!task) {
    clearSelectedTask();
    return;
  }

  document
    .querySelectorAll(
      ".task.is-selected-task"
    )
    .forEach(item => {
      item.classList.remove(
        "is-selected-task"
      );
    });

  task.classList.add(
    "is-selected-task"
  );

  selectedTask = task;

  if (center) {
    centerTask(task, true);
  }

  refreshTaskMemoPanel();
}

/* =========================================================
   ▼ 選択中タスクを親マイルストーン直下へ寄せる処理 ここから
========================================================= */

function centerTask(
  task,
  smooth = true
) {
  if (!task) {
    return;
  }

  const branch =
    task.closest(".task-branch");

  if (!branch) {
    return;
  }

  const list =
    task.closest(".task-list");

  if (!list) {
    return;
  }

  const tasks = [
    ...list.querySelectorAll(
      ":scope > .task"
    )
  ];

  const index =
  tasks.indexOf(task);

/* ========================================
   ▼ 1～2番目タスクのフォーカス制御 ここから
======================================== */

/*
  1番目：
  常に位置固定。

  2番目：
  すでに上へスクロールされていて
  1番目が隠れている場合だけ、
  タスク列を初期位置へ戻す。

  3番目以降：
  選択タスクが2番目あたりに来るよう
  上へフォーカスする。
*/

if (index === 0) {
  return;
}

if (index === 1) {
  if (branch.scrollTop > 4) {
    branch.scrollTo({
      top: 0,
      behavior:
        smooth
          ? "smooth"
          : "auto"
    });
  }

  return;
}

const anchorTask =
  tasks[index - 1];

/* ========================================
   ▲ 1～2番目タスクのフォーカス制御 ここまで
======================================== */

  const branchRect =
    branch.getBoundingClientRect();

  const anchorRect =
    anchorTask.getBoundingClientRect();

  const anchorTopInScroll =
    branch.scrollTop
    + anchorRect.top
    - branchRect.top;

  const topPadding = 10;

  branch.scrollTo({
    top: Math.max(
      0,
      anchorTopInScroll - topPadding
    ),
    behavior:
      smooth
        ? "smooth"
        : "auto"
  });
}

function isTaskCentered(task) {
  if (!task) {
    return false;
  }

  const branch =
    task.closest(".task-branch");

  if (!branch) {
    return false;
  }

  const branchRect =
    branch.getBoundingClientRect();

  const taskRect =
    task.getBoundingClientRect();

  /*
    v28では「中央」ではなく
    親マイルストーン直下の上側領域に
    入っているかを見る。
  */
  const upperLimit =
    branchRect.top + 180;

  return (
    taskRect.top >= branchRect.top - 8
    && taskRect.top <= upperLimit
  );
}

/* =========================================================
   ▲ 選択中タスクを親マイルストーン直下へ寄せる処理 ここまで
========================================================= */

function focusMilestoneDefault(
  milestone,
  smooth = true
) {
  if (!milestone) {
    return;
  }

  const branch =
    milestone.querySelector(".task-branch");

  const currentTask =
    milestone.querySelector(
      '.task[data-status="current"]'
    );

  if (
    milestone.dataset.status === "current"
    && currentTask
  ) {
    selectTask(currentTask, smooth);
    return;
  }

  clearSelectedTask();

  branch?.scrollTo({
    top: 0,
    behavior: smooth ? "smooth" : "auto"
  });
}

/* =========================================================
   ▲ タスク選択と縦中央表示 ここまで
========================================================= */

/* =========================================================
   ▼ PCのロードマップ横ドラッグ ここから
========================================================= */

function setupRoadmapDragging() {
  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  let drag = null;

  roadmap.addEventListener(
    "pointerdown",
    event => {
      if (event.pointerType !== "mouse") {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (
        event.target.closest(".task")
        || event.target.closest(
          ".add-task-button"
        )
      ) {
        return;
      }

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: roadmap.scrollLeft,
        dragging: false
      };
    }
  );

  roadmap.addEventListener(
    "pointermove",
    event => {
      if (
        !drag
        || drag.pointerId !== event.pointerId
      ) {
        return;
      }

      const dx =
        event.clientX - drag.startX;

      const dy =
        event.clientY - drag.startY;

      if (!drag.dragging) {
        if (Math.abs(dx) < 7) {
          return;
        }

        if (
          Math.abs(dy) > Math.abs(dx)
        ) {
          drag = null;
          return;
        }

        drag.dragging = true;

        roadmap.classList.add(
          "is-pointer-dragging"
        );

        roadmap.setPointerCapture?.(
          event.pointerId
        );
      }

      event.preventDefault();

      roadmap.scrollLeft =
        drag.startScrollLeft - dx;
    }
  );

  const finish = event => {
    if (
      !drag
      || drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const wasDragging =
      drag.dragging;

    if (wasDragging) {
      roadmap.classList.remove(
        "is-pointer-dragging"
      );

      if (
        roadmap.hasPointerCapture?.(
          event.pointerId
        )
      ) {
        roadmap.releasePointerCapture(
          event.pointerId
        );
      }
    }

    drag = null;

    if (!wasDragging) {
      return;
    }

    suppressRoadmapClickUntil =
      Date.now() + 400;

    const nearest =
      getNearestMilestone();

    if (nearest) {
      selectMilestone(
        nearest,
        true,
        true
      );
    }
  };

  roadmap.addEventListener(
    "pointerup",
    finish
  );

  roadmap.addEventListener(
    "pointercancel",
    finish
  );
}

/* =========================================================
   ▲ PCのロードマップ横ドラッグ ここまで
========================================================= */

/* =========================================================
   ▼ タスク長押し並び替え ここから
========================================================= */

function setupTaskReordering() {
  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  /*
    iPhone / iPad:
    pointerイベントではなくtouchイベントを直接使う。

    通常:
    → Safariのネイティブ縦スクロールをそのまま使う。

    指を動かさず約380ms保持:
    → 長押し成立。

    長押し成立後に初めてtouchmoveをpreventDefaultし、
    タスク並び替えへ切り替える。

    これなら「スクロールしようとしただけなのに
    並び替え判定に邪魔される」と
    「長押し後にpointercancelで着地する」の
    両方を避けやすい。
  */

  let touchDrag = null;
  let mouseDrag = null;

  /* =====================================================
     Touch / iPhone
  ===================================================== */

  roadmap.addEventListener(
    "touchstart",
    event => {
      if (event.touches.length !== 1) {
        cancelTouchDrag();
        return;
      }

      const task =
        event.target.closest(".task");

      if (!task) {
        cancelTouchDrag();
        return;
      }

      const milestone =
        task.closest(".milestone");

      /*
        並び替え自体は中央マイルストーン限定。
        それ以外では何もしないので、
        普通のスクロールだけがそのまま動く。
      */
      if (!canEditMilestone(milestone)) {
        cancelTouchDrag();
        return;
      }

      const touch =
        event.touches[0];

      touchDrag = {
        task,
        milestone,
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        dragging: false,
        cancelled: false,
        timer: null,
        lastSwapTime: 0
      };

      touchDrag.timer =
        setTimeout(
          () => {
            if (
              !touchDrag
              || touchDrag.cancelled
            ) {
              return;
            }

            touchDrag.dragging =
              true;

            suppressTaskClickUntil =
              Date.now() + 900;

            touchDrag.task.classList.add(
              "is-dragging"
            );

            document.body.classList.add(
              "is-task-reordering"
            );

            navigator.vibrate?.(18);
          },
          380
        );
    },
    {
      passive: true
    }
  );

  roadmap.addEventListener(
    "touchmove",
    event => {
      if (
        !touchDrag
        || event.touches.length !== 1
      ) {
        return;
      }

      const touch =
        event.touches[0];

      const dx =
        touch.clientX
        - touchDrag.startX;

      const dy =
        touch.clientY
        - touchDrag.startY;

      touchDrag.lastY =
        touch.clientY;

      /*
        長押し成立前に指が動いたら、
        並び替え候補を解除して
        Safariの通常スクロールへ完全に任せる。

        preventDefaultはしない。
      */
      if (!touchDrag.dragging) {
        if (
          Math.hypot(dx, dy) > 12
        ) {
          clearTimeout(
            touchDrag.timer
          );

          touchDrag.cancelled =
            true;

          touchDrag = null;
        }

        return;
      }

      /*
        長押し成立後だけブラウザスクロールを止める。
      */
      event.preventDefault();

      touchDrag.task.style.transform =
        `translateY(${dy}px) scale(1.07)`;

      autoScrollTaskBranch(
        touchDrag.task,
        touch.clientY
      );

      maybeSwapTouchTask(
        touchDrag,
        touch.clientY
      );
    },
    {
      passive: false
    }
  );

  const finishTouch =
    () => {
      if (!touchDrag) {
        return;
      }

      clearTimeout(
        touchDrag.timer
      );

      const task =
        touchDrag.task;

      const wasDragging =
        touchDrag.dragging;

      touchDrag =
        null;

      if (!wasDragging) {
        return;
      }

      suppressNextTaskClick =
        task;

      suppressTaskClickUntil =
        Date.now() + 900;

      finishTaskDrag(task);
    };

  roadmap.addEventListener(
    "touchend",
    finishTouch,
    {
      passive: true
    }
  );

  roadmap.addEventListener(
    "touchcancel",
    () => {
      /*
        通常スクロールへ渡した結果のtouchcancelなら
        何もする必要はない。

        並び替え中にtouchcancelされた場合だけ
        見た目をきちんと戻す。
      */
      if (
        touchDrag
        && touchDrag.dragging
      ) {
        const task =
          touchDrag.task;

        touchDrag =
          null;

        finishTaskDrag(task);
      } else {
        cancelTouchDrag();
      }
    },
    {
      passive: true
    }
  );

  function cancelTouchDrag() {
    if (!touchDrag) {
      return;
    }

    clearTimeout(
      touchDrag.timer
    );

    touchDrag =
      null;
  }

  function maybeSwapTouchTask(
    state,
    pointerY
  ) {
    const now =
      performance.now();

    if (
      now - state.lastSwapTime < 150
    ) {
      return;
    }

    const task =
      state.task;

    const list =
      task.closest(".task-list");

    if (!list) {
      return;
    }

    const siblings = [
      ...list.querySelectorAll(
        ":scope > .task"
      )
    ];

    const index =
      siblings.indexOf(task);

    const previous =
      siblings[index - 1];

    const next =
      siblings[index + 1];

    if (next) {
      const rect =
        next.getBoundingClientRect();

      const center =
        rect.top + rect.height / 2;

      if (
        pointerY >
        center + 2
      ) {
        animateTaskSwap(
          list,
          task,
          () => {
            next.after(task);
          }
        );

        state.lastSwapTime =
          now;

        /*
          入れ替えた位置を
          新しいドラッグ基準にする。
        */
        state.startY =
          pointerY;

        task.style.transform =
          "translateY(0) scale(1.07)";

        return;
      }
    }

    if (previous) {
      const rect =
        previous.getBoundingClientRect();

      const center =
        rect.top + rect.height / 2;

      if (
        pointerY <
        center - 2
      ) {
        animateTaskSwap(
          list,
          task,
          () => {
            previous.before(task);
          }
        );

        state.lastSwapTime =
          now;

        state.startY =
          pointerY;

        task.style.transform =
          "translateY(0) scale(1.07)";
      }
    }
  }

  /* =====================================================
     Mouse / PC
  ===================================================== */

  roadmap.addEventListener(
    "pointerdown",
    event => {
      /*
        touchは上のtouchイベントだけで処理。
      */
      if (
        event.pointerType !== "mouse"
      ) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const task =
        event.target.closest(".task");

      if (!task) {
        return;
      }

      const milestone =
        task.closest(".milestone");

      if (!canEditMilestone(milestone)) {
        return;
      }

      mouseDrag = {
        task,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        timer: null,
        lastSwapTime: 0
      };

      mouseDrag.timer =
        setTimeout(
          () => {
            if (!mouseDrag) {
              return;
            }

            mouseDrag.dragging =
              true;

            mouseDrag.task.setPointerCapture?.(
              mouseDrag.pointerId
            );

            suppressTaskClickUntil =
              Date.now() + 900;

            mouseDrag.task.classList.add(
              "is-dragging"
            );

            document.body.classList.add(
              "is-task-reordering"
            );
          },
          380
        );
    }
  );

  roadmap.addEventListener(
    "pointermove",
    event => {
      if (
        event.pointerType !== "mouse"
        || !mouseDrag
        || mouseDrag.pointerId
          !== event.pointerId
      ) {
        return;
      }

      const dx =
        event.clientX
        - mouseDrag.startX;

      const dy =
        event.clientY
        - mouseDrag.startY;

      if (!mouseDrag.dragging) {
        if (
          Math.hypot(dx, dy) > 14
        ) {
          clearTimeout(
            mouseDrag.timer
          );

          mouseDrag =
            null;
        }

        return;
      }

      event.preventDefault();

      mouseDrag.task.style.transform =
        `translateY(${dy}px) scale(1.07)`;

      autoScrollTaskBranch(
        mouseDrag.task,
        event.clientY
      );

      maybeSwapMouseTask(
        mouseDrag,
        event.clientY
      );
    }
  );

  const finishMouse =
    event => {
      if (
        event.pointerType !== "mouse"
        || !mouseDrag
        || mouseDrag.pointerId
          !== event.pointerId
      ) {
        return;
      }

      clearTimeout(
        mouseDrag.timer
      );

      const task =
        mouseDrag.task;

      const wasDragging =
        mouseDrag.dragging;

      if (
        task.hasPointerCapture?.(
          event.pointerId
        )
      ) {
        task.releasePointerCapture(
          event.pointerId
        );
      }

      mouseDrag =
        null;

      if (!wasDragging) {
        return;
      }

      suppressNextTaskClick =
        task;

      suppressTaskClickUntil =
        Date.now() + 900;

      finishTaskDrag(task);
    };

  roadmap.addEventListener(
    "pointerup",
    finishMouse
  );

  roadmap.addEventListener(
    "pointercancel",
    finishMouse
  );

  function maybeSwapMouseTask(
    state,
    pointerY
  ) {
    const now =
      performance.now();

    if (
      now - state.lastSwapTime < 150
    ) {
      return;
    }

    const task =
      state.task;

    const list =
      task.closest(".task-list");

    if (!list) {
      return;
    }

    const siblings = [
      ...list.querySelectorAll(
        ":scope > .task"
      )
    ];

    const index =
      siblings.indexOf(task);

    const previous =
      siblings[index - 1];

    const next =
      siblings[index + 1];

    if (next) {
      const rect =
        next.getBoundingClientRect();

      const center =
        rect.top + rect.height / 2;

      if (
        pointerY >
        center + 3
      ) {
        animateTaskSwap(
          list,
          task,
          () => {
            next.after(task);
          }
        );

        state.lastSwapTime =
          now;

        state.startY =
          pointerY;

        task.style.transform =
          "translateY(0) scale(1.07)";

        return;
      }
    }

    if (previous) {
      const rect =
        previous.getBoundingClientRect();

      const center =
        rect.top + rect.height / 2;

      if (
        pointerY <
        center - 3
      ) {
        animateTaskSwap(
          list,
          task,
          () => {
            previous.before(task);
          }
        );

        state.lastSwapTime =
          now;

        state.startY =
          pointerY;

        task.style.transform =
          "translateY(0) scale(1.07)";
      }
    }
  }

  /* =====================================================
     Shared auto scroll
  ===================================================== */

  function autoScrollTaskBranch(
    task,
    pointerY
  ) {
    const branch =
      task.closest(".task-branch");

    if (!branch) {
      return;
    }

    const rect =
      branch.getBoundingClientRect();

    const edge = 54;
    const step = 10;

    if (
      pointerY <
      rect.top + edge
    ) {
      branch.scrollTop -= step;
    } else if (
      pointerY >
      rect.bottom - edge
    ) {
      branch.scrollTop += step;
    }
  }
}

function animateTaskSwap(
  list,
  draggedTask,
  move
) {
  const tasks = [
    ...list.querySelectorAll(
      ":scope > .task"
    )
  ];

  const before =
    new Map(
      tasks.map(task => [
        task,
        task
          .getBoundingClientRect()
          .top
      ])
    );

  move();

  tasks.forEach(task => {
    if (task === draggedTask) {
      return;
    }

    const oldTop =
      before.get(task);

    const newTop =
      task
        .getBoundingClientRect()
        .top;

    const distance =
      oldTop - newTop;

    if (!distance) {
      return;
    }

    task.animate(
      [
        {
          transform:
            `translateY(${distance}px)`
        },
        {
          transform:
            "translateY(0)"
        }
      ],
      {
        duration: 240,
        easing:
          "cubic-bezier(0.2, 0.9, 0.35, 1)"
      }
    );
  });
}

function finishTaskDrag(task) {
  task.style.transform = "";

  task.classList.remove(
    "is-dragging"
  );

  task.classList.add(
    "is-dropping"
  );

  document.body.classList.remove(
    "is-task-reordering"
  );

  setTimeout(() => {
    task.classList.remove(
      "is-dropping"
    );
  }, 380);

  const current =
    getAllTasks().find(
      item =>
        getTaskStatus(item) === "current"
    );

  if (current) {
    setFlowFromCurrent(current);
  }

  const milestone =
    task.closest(".milestone");

  refreshProject({
    animate: false,
    center: false
  });

  if (milestone) {
    selectMilestone(
      milestone,
      false,
      false
    );

    selectTask(
      task,
      false
    );
  }

  saveProjectState();
}

/* =========================================================
   ▲ タスク長押し並び替え ここまで
========================================================= */

/* =========================================================
   ▼ タスク編集ダイアログ ここから
========================================================= */

function openTaskEditDialog(task) {
  if (!task) {
    return;
  }

  const milestone =
    task.closest(".milestone");

  if (!canEditMilestone(milestone)) {
    selectMilestone(milestone, true);
    return;
  }

  const wrapper =
    createElement(
      "div",
      "task-dialog-content"
    );

  const options =
    createElement(
      "div",
      "task-status-options"
    );

  [
    ["complete", "✓", "完了"],
    ["current", "●", "今やってる"],
    ["next", "○", "次にやる"],
    ["future", "○", "未着手"]
  ].forEach(
    ([status, icon, label]) => {
      const button =
        createElement(
          "button",
          `task-status-option status-${status}`
        );

      button.type = "button";

      button.innerHTML = `
        <span class="status-option-icon">
          ${icon}
        </span>
        <span>${label}</span>
      `;

      button.addEventListener(
        "click",
        () => {
          closeDialog();

          animateTaskStateChange(
            task,
            () => {
              changeTaskStatus(
                task,
                status
              );
            }
          );
        }
      );

      options.appendChild(button);
    }
  );

  const editArea =
    createElement(
      "div",
      "task-edit-area"
    );

  const nameInput =
    createTextareaInput(
      "タスク名",
      160,
      2
    );

  nameInput.value =
    getTaskName(task);

  const memoInput =
    createTextareaInput(
      "タスクメモ",
      3000,
      5
    );

  memoInput.value =
    getTaskMemo(task);

  const nameField =
    createField(
      "タスク名",
      nameInput
    );

  const memoField =
    createField(
      "タスクメモ",
      memoInput
    );

  const saveButton =
    createElement(
      "button",
      "dialog-submit",
      "変更を保存"
    );

  saveButton.type = "button";

  saveButton.addEventListener(
    "click",
    () => {
      const name =
        nameInput.value.trim();

      if (!name) {
        showInputError(
          nameInput,
          "タスク名を入力してくれ。"
        );
        return;
      }

      setTaskName(task, name);
      task.dataset.memo =
        memoInput.value;

      closeDialog();

      refreshProject({
        animate: false,
        center: false
      });

      selectMilestone(
        milestone,
        false,
        false
      );

      selectTask(task, false);

      saveProjectState();
    }
  );

  const deleteButton =
    createElement(
      "button",
      "dialog-danger",
      "このタスクを削除"
    );

  deleteButton.type = "button";

  deleteButton.addEventListener(
    "click",
    () => {
      if (
        !window.confirm(
          `「${getTaskName(task)}」を削除するか？`
        )
      ) {
        return;
      }

      const wasCurrent =
        getTaskStatus(task) === "current";

      if (selectedTask === task) {
        selectedTask = null;
      }

      task.remove();

      if (wasCurrent) {
        const next =
          getAllTasks().find(
            item =>
              getTaskStatus(item)
              !== "complete"
          );

        if (next) {
          setFlowFromCurrent(next);
        }
      }

      closeDialog();

      refreshProject({
        animate: true,
        center: false
      });

      selectMilestone(
        milestone,
        false,
        false
      );

      focusMilestoneDefault(
        milestone,
        false
      );

      saveProjectState();
    }
  );

  editArea.append(
    nameField,
    memoField,
    saveButton,
    deleteButton
  );

  wrapper.append(
    options,
    editArea
  );

  openDialog({
    label: "TASK",
    title: getTaskName(task),
    content: wrapper
  });
}

function animateTaskStateChange(
  task,
  update
) {
  task.classList.remove(
    "is-state-changing",
    "is-state-changed"
  );

  task.classList.add(
    "is-state-changing"
  );

  setTimeout(() => {
    update();

    task.classList.remove(
      "is-state-changing"
    );

    task.classList.add(
      "is-state-changed"
    );

    setTimeout(() => {
      task.classList.remove(
        "is-state-changed"
      );
    }, 650);
  }, 130);
}

function changeTaskStatus(
  task,
  status
) {
  const milestone =
    task.closest(".milestone");

  const wasCurrent =
    getTaskStatus(task) === "current";

  renderTaskStatus(task, status);

  if (status === "current") {
    setFlowFromCurrent(task);
  } else if (
    status === "complete"
    && wasCurrent
  ) {
    advanceFromCompletedTask(task);
  } else if (status === "next") {
    getAllTasks()
      .filter(
        item =>
          item !== task
          && getTaskStatus(item) === "next"
      )
      .forEach(
        item => {
          renderTaskStatus(
            item,
            "future"
          );
        }
      );
  } else if (
    status === "future"
    && wasCurrent
  ) {
    const nextIncomplete =
      getAllTasks().find(
        item =>
          getTaskStatus(item)
          !== "complete"
      );

    if (nextIncomplete) {
      setFlowFromCurrent(
        nextIncomplete
      );
    }
  }

  refreshProject({
    animate: true,
    center: false
  });

  selectMilestone(
    milestone,
    false,
    false
  );

  const newCurrent =
    milestone.querySelector(
      '.task[data-status="current"]'
    );

  if (
    milestone.dataset.status === "current"
    && newCurrent
  ) {
    selectTask(newCurrent, true);
  } else {
    selectTask(task, true);
  }

  saveProjectState();
}

function setFlowFromCurrent(currentTask) {
  const tasks =
    getAllTasks();

  const index =
    tasks.indexOf(currentTask);

  tasks.forEach(task => {
    if (
      task !== currentTask
      && ["current", "next"].includes(
        getTaskStatus(task)
      )
    ) {
      renderTaskStatus(
        task,
        "future"
      );
    }
  });

  renderTaskStatus(
    currentTask,
    "current"
  );

  const next =
    tasks
      .slice(index + 1)
      .find(
        task =>
          getTaskStatus(task)
          !== "complete"
      );

  if (next) {
    renderTaskStatus(next, "next");
  }
}

function advanceFromCompletedTask(
  completedTask
) {
  const tasks =
    getAllTasks();

  const next =
    tasks
      .slice(
        tasks.indexOf(
          completedTask
        ) + 1
      )
      .find(
        task =>
          getTaskStatus(task)
          !== "complete"
      );

  tasks
    .filter(
      task =>
        ["current", "next"].includes(
          getTaskStatus(task)
        )
    )
    .forEach(
      task => {
        renderTaskStatus(
          task,
          "future"
        );
      }
    );

  if (next) {
    setFlowFromCurrent(next);
  }
}

function renderTaskStatus(
  task,
  status
) {
  const name =
    getTaskName(task);

  task.dataset.status = status;

  task.classList.remove(
    "task-complete",
    "task-current",
    "task-next"
  );

  task.replaceChildren();

  if (status === "complete") {
    task.classList.add(
      "task-complete"
    );

    task.append(
      createElement(
        "span",
        "task-check",
        "✓"
      ),
      createElement(
        "span",
        "task-name",
        name
      )
    );

    return;
  }

  if (
    status === "current"
    || status === "next"
  ) {
    const isCurrent =
      status === "current";

    task.classList.add(
      isCurrent
        ? "task-current"
        : "task-next"
    );

    const text =
      createElement(
        "div",
        "task-text"
      );

    text.append(
      createElement(
        "span",
        "task-name",
        name
      ),
      createElement(
        "span",
        "task-badge",
        isCurrent
          ? "今やってる"
          : "次はこれ"
      )
    );

    task.append(
      createElement(
        "span",
        "task-marker",
        isCurrent ? "●" : "○"
      ),
      text
    );

    return;
  }

  task.append(
    createElement(
      "span",
      "task-marker",
      "○"
    ),
    createElement(
      "span",
      "task-name",
      name
    )
  );
}

/* =========================================================
   ▲ タスク編集ダイアログ ここまで
========================================================= */

/* =========================================================
   ▼ タスク追加 ここから
========================================================= */

function openAddTaskDialog(milestone) {
  if (!milestone) {
    return;
  }

  if (!canEditMilestone(milestone)) {
    selectMilestone(milestone, true);
    return;
  }

  /*
    追加変更：
    タスク名だけでなく、最初から
    タスクメモも一緒に入力できる。
  */
  const nameInput =
    createTextareaInput(
      "追加するタスク名",
      160,
      2
    );

  const memoInput =
    createTextareaInput(
      "タスクメモ（任意）",
      3000,
      5
    );

  const fields =
    createElement(
      "div",
      "dialog-fields"
    );

  fields.append(
    createField(
      "タスク名",
      nameInput
    ),
    createField(
      "タスクメモ（任意）",
      memoInput
    )
  );

  const content =
    createFormContent(
      fields,
      "タスクを追加",
      () => {
        const name =
          nameInput.value.trim();

        if (!name) {
          showInputError(
            nameInput,
            "タスク名を入力してくれ。"
          );
          return;
        }

        const task =
          createTask(
            name,
            "future",
            memoInput.value
          );

        milestone
          .querySelector(".task-list")
          ?.appendChild(task);

        closeDialog();

        refreshProject({
          animate: false,
          center: false
        });

        selectMilestone(
          milestone,
          false,
          false
        );

        selectTask(
          task,
          true
        );

        saveProjectState();
      }
    );

  openDialog({
    label: "ADD TASK",
    title: "タスクを追加",
    content,
    focus: nameInput
  });
}

/* =========================================================
   ▲ タスク追加 ここまで
========================================================= */

/* =========================================================
   ▼ マイルストーン追加・編集 ここから
========================================================= */

function openAddMilestoneDialog() {
  const nameInput =
    createTextareaInput(
      "マイルストーン名",
      160,
      2
    );

  const taskInput =
    createTextareaInput(
      "最初のタスク名",
      160,
      2
    );

  const memoInput =
    createTextareaInput(
      "最初のタスクのメモ（任意）",
      3000,
      4
    );

  const picker =
    createIconPicker();

  const fields =
    createElement(
      "div",
      "dialog-fields"
    );

  fields.append(
    createField(
      "マイルストーン名",
      nameInput
    ),
    createField(
      "最初のタスク名",
      taskInput
    ),
    createField(
      "最初のタスクのメモ（任意）",
      memoInput
    ),
    picker.element
  );

  const content =
    createFormContent(
      fields,
      "マイルストーンを追加",
      () => {
        const name =
          nameInput.value.trim();

        const firstTask =
          taskInput.value.trim();

        if (!name) {
          showInputError(
            nameInput,
            "マイルストーン名を入力してくれ。"
          );
          return;
        }

        if (!firstTask) {
          showInputError(
            taskInput,
            "最初のタスク名を入力してくれ。"
          );
          return;
        }

        const milestone =
          appendMilestone({
            name,
            firstTask,
            firstTaskMemo:
              memoInput.value,
            iconKey:
              picker.getValue()
          });

        closeDialog();

        refreshProject({
          animate: false,
          center: false
        });

        selectMilestone(
          milestone,
          true,
          false
        );

        const task =
          milestone.querySelector(
            ".task"
          );

        if (task) {
          selectTask(task, true);
        }

        saveProjectState();
      }
    );

  openDialog({
    label: "ADD MILESTONE",
    title: "マイルストーンを追加",
    content,
    focus: nameInput
  });
}

function openMilestoneEditDialog(
  milestone
) {
  if (!milestone) {
    return;
  }

  if (!canEditMilestone(milestone)) {
    selectMilestone(milestone, true);
    return;
  }

  const nameInput =
    createTextareaInput(
      "マイルストーン名",
      160,
      2
    );

  nameInput.value =
    milestone
      .querySelector(".milestone-name")
      ?.textContent
      .trim()
    || "";

  const picker =
    createIconPicker(
      milestone.dataset.iconKey
      || "compass"
    );

  const fields =
    createElement(
      "div",
      "dialog-fields"
    );

  fields.append(
    createField(
      "マイルストーン名",
      nameInput
    ),
    picker.element
  );

  const saveButton =
    createElement(
      "button",
      "dialog-submit",
      "変更を保存"
    );

  saveButton.type = "button";

  saveButton.addEventListener(
    "click",
    () => {
      const name =
        nameInput.value.trim();

      if (!name) {
        showInputError(
          nameInput,
          "マイルストーン名を入力してくれ。"
        );
        return;
      }

      const iconKey =
        picker.getValue();

      milestone
        .querySelector(
          ".milestone-name"
        )
        .textContent = name;

      milestone.dataset.iconKey =
        iconKey;

      milestone
        .querySelector(
          ".milestone-icon"
        )
        .innerHTML =
        MILESTONE_ICONS[iconKey];

      closeDialog();

      refreshProject({
        animate: false,
        center: false
      });

      selectMilestone(
        milestone,
        false,
        false
      );

      saveProjectState();
    }
  );

  const reorder =
    createElement(
      "div",
      "milestone-reorder-controls"
    );

  const moveLeft =
    createElement(
      "button",
      "dialog-secondary",
      "← 左へ入れ替え"
    );

  const moveRight =
    createElement(
      "button",
      "dialog-secondary",
      "右へ入れ替え →"
    );

  moveLeft.type = "button";
  moveRight.type = "button";

  moveLeft.addEventListener(
    "click",
    () => {
      moveMilestone(milestone, -1);
    }
  );

  moveRight.addEventListener(
    "click",
    () => {
      moveMilestone(milestone, 1);
    }
  );

  reorder.append(
    moveLeft,
    moveRight
  );

  const content =
    createElement(
      "div",
      "milestone-edit-content"
    );

  content.append(
    fields,
    saveButton,
    reorder
  );

  openDialog({
    label: "MILESTONE",
    title: "マイルストーンを編集",
    content,
    focus: nameInput
  });
}

function moveMilestone(
  milestone,
  direction
) {
  const milestones =
    getMilestones();

  const index =
    milestones.indexOf(milestone);

  const target =
    index + direction;

  if (
    index < 0
    || target < 0
    || target >= milestones.length
  ) {
    return;
  }

  [
    milestones[index],
    milestones[target]
  ] = [
    milestones[target],
    milestones[index]
  ];

  rebuildRoadmapFromMilestones(
    milestones
  );

  closeDialog();

  refreshProject({
    animate: false,
    center: false
  });

  selectMilestone(
    milestone,
    true,
    true
  );

  saveProjectState();
}

function appendMilestone({
  name,
  firstTask,
  firstTaskMemo = "",
  iconKey
}) {
  const milestones =
    getMilestones();

  const goalIndex =
    milestones.findIndex(
      milestone =>
        milestone.dataset.milestoneId
        === "complete"
    );

  const milestone =
    createMilestone({
      id:
        `milestone-${Date.now()}`,
      name,
      iconKey,
      tasks: [
        {
          name: firstTask,
          status: "future",
          memo: firstTaskMemo
        }
      ]
    });

  if (goalIndex >= 0) {
    milestones.splice(
      goalIndex,
      0,
      milestone
    );
  } else {
    milestones.push(milestone);
  }

  rebuildRoadmapFromMilestones(
    milestones
  );

  return milestone;
}

/* =========================================================
   ▲ マイルストーン追加・編集 ここまで
========================================================= */

/* =========================================================
   ▼ 画面更新と全体進捗 ここから
========================================================= */

function refreshProject({
  animate = true,
  center = false
} = {}) {
  refreshMilestoneStatuses();
  applyMilestoneOrderColors();
  refreshRoadmapLines(animate);
  refreshProgress();
  refreshTaskMemoPanel();

  if (center) {
    requestAnimationFrame(() => {
      if (selectedMilestone) {
        centerMilestone(
          selectedMilestone,
          animate
        );
      }
    });
  }
}

function refreshMilestoneStatuses() {
  document
    .querySelectorAll(
      ".current-label"
    )
    .forEach(label => label.remove());

  getMilestones().forEach(
    milestone => {
      const tasks = [
        ...milestone.querySelectorAll(
          ".task"
        )
      ];

      const allComplete =
        tasks.length > 0
        && tasks.every(
          task =>
            getTaskStatus(task)
            === "complete"
        );

      const hasCurrent =
        tasks.some(
          task =>
            getTaskStatus(task)
            === "current"
        );

      const status =
        allComplete
          ? "complete"
          : hasCurrent
            ? "current"
            : "future";

      milestone.dataset.status =
        status;

      milestone.classList.remove(
        "milestone-complete",
        "milestone-current",
        "milestone-future"
      );

      milestone.classList.add(
        `milestone-${status}`
      );

      const statusText =
        milestone.querySelector(
          ".milestone-status"
        );

      if (statusText) {
        if (
          milestone.dataset.milestoneId
            === "complete"
          && status !== "complete"
        ) {
          statusText.textContent =
            "ゴール";
        } else {
          statusText.textContent =
            status === "complete"
              ? "完了"
              : status === "current"
                ? "進行中"
                : "未着手";
        }
      }

      if (status === "current") {
        milestone.insertBefore(
          createElement(
            "div",
            "current-label",
            "今ここ"
          ),
          milestone.querySelector(
            ".milestone-button"
          )
        );
      }
    }
  );
}

function applyMilestoneOrderColors() {
  getMilestones().forEach(
    (milestone, index) => {
      const color =
        MILESTONE_ORDER_COLORS[
          index
          % MILESTONE_ORDER_COLORS.length
        ];

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

function refreshRoadmapLines(animate) {
  const milestones =
    getMilestones();

  let pathIsComplete = true;

  document
    .querySelectorAll(
      ".roadmap-line"
    )
    .forEach((line, index) => {
      const complete =
        pathIsComplete
        && milestones[index]
          ?.dataset.status
          === "complete";

      pathIsComplete = complete;

      const wasComplete =
        line.classList.contains(
          "is-complete"
        );

      line.classList.toggle(
        "is-complete",
        complete
      );

      if (
        animate
        && complete !== wasComplete
      ) {
        line.classList.add(
          complete
            ? "is-advancing"
            : "is-retreating"
        );

        setTimeout(() => {
          line.classList.remove(
            "is-advancing",
            "is-retreating"
          );
        }, 750);
      }
    });
}

function refreshProgress() {
  const tasks =
    getAllTasks();

  const completed =
    tasks.filter(
      task =>
        getTaskStatus(task)
        === "complete"
    ).length;

  const percent =
    tasks.length
      ? Math.round(
          completed
          / tasks.length
          * 100
        )
      : 0;

  setText(
    "#progress-percent",
    `${percent}%`
  );

  const progressBar =
    document.querySelector(
      ".progress-bar"
    );

  progressBar?.setAttribute(
    "aria-valuenow",
    String(percent)
  );

  const fill =
    document.querySelector(
      ".progress-bar-fill"
    );

  if (fill) {
    fill.style.width =
      `${percent}%`;
  }
}

/* =========================================================
   ▲ 画面更新と全体進捗 ここまで
========================================================= */

/* =========================================================
   ▼ ロードマップDOM生成 ここから
========================================================= */

function rebuildRoadmapFromMilestones(
  milestones
) {
  const roadmap =
    document.getElementById("roadmap");

  if (!roadmap) {
    return;
  }

  roadmap.replaceChildren();

  milestones.forEach(
    (milestone, index) => {
      if (index > 0) {
        const line =
          createElement(
            "div",
            "roadmap-line"
          );

        line.setAttribute(
          "aria-hidden",
          "true"
        );

        roadmap.appendChild(line);
      }

      roadmap.appendChild(milestone);
    }
  );
}

function createMilestone({
  id,
  name,
  iconKey = "",
  iconHtml = "",
  tasks = []
}) {
  const milestone =
    createElement(
      "article",
      "milestone milestone-future"
    );

  milestone.dataset.milestoneId =
    id;

  milestone.dataset.status =
    "future";

  milestone.dataset.iconKey =
    iconKey;

  const button =
    createElement(
      "button",
      "milestone-button"
    );

  button.type = "button";

  const icon =
    createElement(
      "span",
      "milestone-icon"
    );

  if (
    iconKey
    && MILESTONE_ICONS[iconKey]
  ) {
    icon.innerHTML =
      MILESTONE_ICONS[iconKey];
  } else {
    icon.innerHTML =
      iconHtml || "🧭";
  }

  const title =
    createElement(
      "span",
      "milestone-name",
      name
    );

  const status =
    createElement(
      "span",
      "milestone-status",
      "未着手"
    );

  button.append(
    icon,
    title,
    status
  );

  const branch =
    createElement(
      "div",
      "task-branch"
    );

  const list =
    createElement(
      "div",
      "task-list"
    );

  tasks.forEach(item => {
    list.appendChild(
      createTask(
        item.name,
        item.status || "future",
        item.memo || ""
      )
    );
  });

  const addButton =
    createElement(
      "button",
      "add-task-button",
      "＋ タスクを追加"
    );

  addButton.type = "button";

  branch.append(
    list,
    addButton
  );

  milestone.append(
    button,
    branch
  );

  return milestone;
}

function createTask(
  name,
  status = "future",
  memo = ""
) {
  const task =
    createElement(
      "div",
      "task"
    );

  task.dataset.status =
    status;

  task.dataset.memo =
    typeof memo === "string"
      ? memo
      : "";

  task.dataset.taskName =
    name || "タスク";

  renderTaskStatus(
    task,
    status
  );

  return task;
}

/* =========================================================
   ▲ ロードマップDOM生成 ここまで
========================================================= */

/* =========================================================
   ▼ タスクメモ ここから
========================================================= */

function setupTaskMemoPanel() {
  const panel =
    document.getElementById(
      "task-memo-panel"
    );

  const toggle =
    document.getElementById(
      "task-memo-toggle"
    );

  const input =
    document.getElementById(
      "task-memo-input"
    );

  if (
    !panel
    || !toggle
    || !input
  ) {
    return;
  }

  toggle.addEventListener(
    "click",
    () => {
      if (
        window.matchMedia(
          "(min-width: 901px)"
        ).matches
      ) {
        return;
      }

      const expanded =
        panel.classList.toggle(
          "is-expanded"
        );

      toggle.setAttribute(
        "aria-expanded",
        String(expanded)
      );

      if (
        expanded
        && selectedTask
      ) {
        requestAnimationFrame(() => {
          input.focus();
        });
      }
    }
  );

  input.addEventListener(
    "input",
    () => {
      if (!selectedTask) {
        return;
      }

      selectedTask.dataset.memo =
        input.value;

      saveProjectState();
    }
  );

  refreshTaskMemoPanel();
}

function refreshTaskMemoPanel() {
  const panel =
    document.getElementById(
      "task-memo-panel"
    );

  const name =
    document.getElementById(
      "task-memo-task-name"
    );

  const input =
    document.getElementById(
      "task-memo-input"
    );

  if (
    !panel
    || !name
    || !input
  ) {
    return;
  }

  if (
    selectedTask
    && !selectedTask.isConnected
  ) {
    selectedTask = null;
  }

  if (!selectedTask) {
    panel.classList.remove(
      "has-task"
    );

    name.textContent =
      "タスクを選択";

    input.value = "";
    input.disabled = true;
    return;
  }

  panel.classList.add(
    "has-task"
  );

  name.textContent =
    getTaskName(selectedTask);

  input.disabled = false;

  if (
    document.activeElement !== input
  ) {
    input.value =
      getTaskMemo(selectedTask);
  }
}

/* =========================================================
   ▲ タスクメモ ここまで
========================================================= */

/* =========================================================
   ▼ プロジェクトタイトル ここから
========================================================= */

function setupProjectTitleEditing() {
  const title =
    document.getElementById(
      "project-title"
    );

  if (!title) {
    return;
  }

  const saved =
    localStorage.getItem(
      PROJECT_TITLE_KEY
    );

  if (saved) {
    title.textContent = saved;
  }

  const open = () => {
    openProjectTitleDialog();
  };

  title.addEventListener(
    "click",
    open
  );

  title.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
        || event.key === " "
      ) {
        event.preventDefault();
        open();
      }
    }
  );
}

function openProjectTitleDialog() {
  const title =
    document.getElementById(
      "project-title"
    );

  if (!title) {
    return;
  }

  const input =
    createTextareaInput(
      "プロジェクト名",
      200,
      2
    );

  input.value =
    title.textContent.trim();

  const content =
    createFormContent(
      createField(
        "プロジェクト名",
        input
      ),
      "プロジェクト名を保存",
      () => {
        const name =
          input.value.trim();

        if (!name) {
          showInputError(
            input,
            "プロジェクト名を入力してくれ。"
          );
          return;
        }

        title.textContent = name;

        localStorage.setItem(
          PROJECT_TITLE_KEY,
          name
        );

        closeDialog();
      }
    );

  openDialog({
    label: "PROJECT",
    title: "プロジェクト名を変更",
    content,
    focus: input
  });
}

/* =========================================================
   ▲ プロジェクトタイトル ここまで
========================================================= */

/* =========================================================
   ▼ 全体編集メニュー・一覧・バックアップ ここから
========================================================= */

/* =========================================================
   ▼ 上部操作ボタンの軽いぽよん演出 ここから
========================================================= */

function setupTopToolButtonAnimation() {
  const buttons = [
    document.getElementById(
      "add-milestone-button"
    ),
    document.getElementById(
      "project-menu-button"
    )
  ].filter(Boolean);

  buttons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        button.classList.remove(
          "is-tool-button-pop"
        );

        /*
          同じボタンを連続で押しても
          animationを毎回最初から再生する。
        */
        void button.offsetWidth;

        button.classList.add(
          "is-tool-button-pop"
        );
      }
    );

    button.addEventListener(
      "animationend",
      () => {
        button.classList.remove(
          "is-tool-button-pop"
        );
      }
    );
  });
}

/* =========================================================
   ▲ 上部操作ボタンの軽いぽよん演出 ここまで
========================================================= */

function setupProjectMenu() {
  document
    .getElementById(
      "project-menu-button"
    )
    ?.addEventListener(
      "click",
      openProjectMenu
    );
}

function openProjectMenu() {
  const wrapper =
    createElement(
      "div",
      "dialog-fields"
    );

  const overview =
    createElement(
      "button",
      "dialog-secondary",
      "全体一覧"
    );

  const exportButton =
    createElement(
      "button",
      "dialog-secondary",
      "バックアップを書き出す"
    );

  const importButton =
    createElement(
      "button",
      "dialog-secondary",
      "バックアップを読み込む"
    );

  const rename =
    createElement(
      "button",
      "dialog-secondary",
      "プロジェクト名を変更"
    );

  const reset =
    createElement(
      "button",
      "dialog-danger",
      "初期状態に戻す"
    );

  [
    overview,
    exportButton,
    importButton,
    rename,
    reset
  ].forEach(button => {
    button.type = "button";
  });

  overview.addEventListener(
    "click",
    openProjectOverview
  );

  exportButton.addEventListener(
    "click",
    exportProjectBackup
  );

  importButton.addEventListener(
    "click",
    openBackupImport
  );

  rename.addEventListener(
    "click",
    () => {
      closeDialog(true);
      openProjectTitleDialog();
    }
  );

  reset.addEventListener(
    "click",
    resetProject
  );

  wrapper.append(
    overview,
    exportButton,
    importButton,
    rename,
    reset
  );

  openDialog({
    label: "PROJECT",
    title: "プロジェクトメニュー",
    content: wrapper
  });
}

function openProjectOverview() {
  closeDialog(true);

  const wrapper =
    createElement(
      "div",
      "dialog-fields"
    );

  getMilestones().forEach(
    milestone => {
      const group =
        createElement(
          "div",
          "project-overview-group"
        );

      const milestoneButton =
        createElement(
          "button",
          "dialog-secondary overview-milestone-button",
          getMilestoneName(
            milestone
          )
        );

      milestoneButton.type =
        "button";

      milestoneButton.addEventListener(
        "click",
        () => {
          closeDialog();

          selectMilestone(
            milestone,
            true,
            true
          );
        }
      );

      group.appendChild(
        milestoneButton
      );

      milestone
        .querySelectorAll(".task")
        .forEach(task => {
          const button =
            createElement(
              "button",
              "dialog-secondary overview-task-button",
              `・${getTaskName(task)}`
            );

          button.type = "button";

          button.addEventListener(
            "click",
            () => {
              closeDialog();

              selectMilestone(
                milestone,
                true,
                false
              );

              setTimeout(() => {
                selectTask(
                  task,
                  true
                );
              }, 300);
            }
          );

          group.appendChild(button);
        });

      wrapper.appendChild(group);
    }
  );

  openDialog({
    label: "OVERVIEW",
    title: "全体一覧",
    content: wrapper
  });
}

function exportProjectBackup() {
  const data = {
    version: 1,
    projectTitle:
      document
        .getElementById("project-title")
        ?.textContent
        .trim()
      || "Project Map",
    milestones:
      serializeProject()
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href = url;

  link.download =
    `project-map-backup-${today}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  closeDialog();
}

function openBackupImport() {
  closeDialog(true);

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept =
    "application/json,.json";

  input.addEventListener(
    "change",
    async () => {
      const file =
        input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text =
          await file.text();

        const parsed =
          JSON.parse(text);

        const milestones =
          Array.isArray(parsed)
            ? parsed
            : parsed?.milestones;

        if (
          !Array.isArray(milestones)
          || !milestones.length
        ) {
          throw new Error(
            "マイルストーンデータがありません。"
          );
        }

        if (
          !window.confirm(
            "現在の内容をバックアップの内容に置き換えます。よろしいですか？"
          )
        ) {
          return;
        }

        selectedMilestone = null;
        selectedTask = null;

        rebuildRoadmapFromMilestones(
          milestones.map(item =>
            createMilestone(
              normalizeMilestoneData(item)
            )
          )
        );

        if (
          parsed
          && !Array.isArray(parsed)
          && typeof parsed.projectTitle
            === "string"
        ) {
          const title =
            parsed.projectTitle.trim();

          if (title) {
            document
              .getElementById(
                "project-title"
              )
              .textContent = title;

            localStorage.setItem(
              PROJECT_TITLE_KEY,
              title
            );
          }
        }

        normalizeTaskStatuses();

        refreshProject({
          animate: false,
          center: false
        });

        const initial =
          document.querySelector(
            '.milestone[data-status="current"]'
          )
          || getMilestones()[0];

        if (initial) {
          selectMilestone(
            initial,
            false,
            true
          );

          requestAnimationFrame(() => {
            centerMilestone(
              initial,
              false
            );

            focusMilestoneDefault(
              initial,
              false
            );
          });
        }

        saveProjectState();
      } catch (error) {
        console.error(error);

        window.alert(
          "バックアップを読み込めませんでした。JSONファイルの内容を確認してください。"
        );
      }
    }
  );

  input.click();
}

function resetProject() {
  if (
    !window.confirm(
      "プロジェクトのタスクとマイルストーンを初期状態に戻します。よろしいですか？"
    )
  ) {
    return;
  }

  if (
    !window.confirm(
      "保存中のプロジェクト内容が消えます。本当に初期化しますか？"
    )
  ) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );

  localStorage.removeItem(
    PROJECT_TITLE_KEY
  );

  selectedTask = null;
  selectedMilestone = null;

  const title =
    document.getElementById(
      "project-title"
    );

  if (title) {
    title.textContent =
      "サンプルプロジェクト";
  }

  rebuildRoadmapFromMilestones(
    DEFAULT_PROJECT.map(
      item =>
        createMilestone(
          normalizeMilestoneData(
            item
          )
        )
    )
  );

  normalizeTaskStatuses();

  refreshProject({
    animate: false,
    center: false
  });

  const initial =
    document.querySelector(
      '.milestone[data-status="current"]'
    )
    || getMilestones()[0];

  if (initial) {
    selectMilestone(
      initial,
      true,
      true
    );
  }

  saveProjectState();
  closeDialog();
}

/* =========================================================
   ▲ 全体編集メニュー・一覧・バックアップ ここまで
========================================================= */

/* =========================================================
   ▼ 共通ダイアログ処理 ここから
========================================================= */

function openDialog({
  label,
  title,
  content,
  focus
}) {
  closeDialog(true);

  const overlay =
    createElement(
      "div",
      "dialog-overlay"
    );

  const dialog =
    createElement(
      "div",
      "dialog"
    );

  dialog.setAttribute(
    "role",
    "dialog"
  );

  dialog.setAttribute(
    "aria-modal",
    "true"
  );

  dialog.append(
    createElement(
      "p",
      "dialog-label",
      label
    ),
    createElement(
      "h3",
      "",
      title
    ),
    content
  );

  const cancel =
    createElement(
      "button",
      "dialog-cancel",
      "キャンセル"
    );

  cancel.type = "button";

  cancel.addEventListener(
    "click",
    () => closeDialog()
  );

  dialog.appendChild(cancel);
  overlay.appendChild(dialog);

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        closeDialog();
      }
    }
  );

  document.body.appendChild(
    overlay
  );

  requestAnimationFrame(() => {
    overlay.classList.add(
      "is-visible"
    );

    focus?.focus();
  });
}

function closeDialog(
  immediate = false
) {
  const overlay =
    document.querySelector(
      ".dialog-overlay"
    );

  if (!overlay) {
    return;
  }

  overlay.classList.remove(
    "is-visible"
  );

  if (immediate) {
    overlay.remove();
    return;
  }

  setTimeout(() => {
    overlay.remove();
  }, 200);
}

function createFormContent(
  field,
  label,
  onSubmit
) {
  const form =
    createElement(
      "form",
      "dialog-form"
    );

  form.appendChild(field);

  const submit =
    createElement(
      "button",
      "dialog-submit",
      label
    );

  submit.type = "submit";

  form.appendChild(submit);

  form.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      onSubmit();
    }
  );

  return form;
}

function createTextareaInput(
  placeholder,
  maxLength = 160,
  rows = 2
) {
  const input =
    createElement(
      "textarea",
      "dialog-input"
    );

  input.placeholder =
    placeholder;

  input.maxLength =
    maxLength;

  input.rows =
    rows;

  return input;
}

function createField(
  labelText,
  input
) {
  const field =
    createElement(
      "label",
      "dialog-field"
    );

  field.append(
    createElement(
      "span",
      "dialog-field-label",
      labelText
    ),
    input
  );

  return field;
}

function createIconPicker(
  selectedKey = "compass"
) {
  const element =
    createElement(
      "fieldset",
      "icon-picker"
    );

  element.appendChild(
    createElement(
      "legend",
      "",
      "アイコンを選ぶ"
    )
  );

  Object.entries(
    MILESTONE_ICONS
  ).forEach(
    ([key, svg], index) => {
      const label =
        createElement(
          "label",
          "icon-choice"
        );

      const input =
        createElement("input");

      input.type = "radio";
      input.name = "milestone-icon";
      input.value = key;

      input.checked =
        key === selectedKey
        || (
          !MILESTONE_ICONS[
            selectedKey
          ]
          && index === 0
        );

      const preview =
        createElement(
          "span",
          "icon-choice-preview"
        );

      preview.innerHTML = svg;

      label.append(
        input,
        preview
      );

      element.appendChild(label);
    }
  );

  return {
    element,
    getValue: () =>
      element
        .querySelector(
          "input:checked"
        )
        ?.value
      || "compass"
  };
}

/* =========================================================
   ▲ 共通ダイアログ処理 ここまで
========================================================= */

/* =========================================================
   ▼ 保存と復元 ここから
========================================================= */

function serializeProject() {
  return getMilestones().map(
    milestone => ({
      id:
        milestone.dataset.milestoneId,

      name:
        getMilestoneName(milestone),

      iconKey:
        milestone.dataset.iconKey
        || "",

      iconHtml:
        milestone
          .querySelector(
            ".milestone-icon"
          )
          ?.innerHTML
        || "🧭",

      tasks: [
        ...milestone.querySelectorAll(
          ".task"
        )
      ].map(task => ({
        name:
          getTaskName(task),

        status:
          getTaskStatus(task),

        memo:
          getTaskMemo(task)
      }))
    })
  );
}

function saveProjectState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      serializeProject()
    )
  );
}

function restoreProjectState() {
  let state = null;

  const saved =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (saved) {
    try {
      const parsed =
        JSON.parse(saved);

      if (
        Array.isArray(parsed)
        && parsed.length
      ) {
        state = parsed;
      }
    } catch (error) {
      console.warn(
        "保存データを読み込めませんでした。",
        error
      );
    }
  }

  if (!state) {
    state = DEFAULT_PROJECT;
  }

  rebuildRoadmapFromMilestones(
    state.map(item =>
      createMilestone(
        normalizeMilestoneData(item)
      )
    )
  );
}

function normalizeMilestoneData(item) {
  return {
    id:
      item?.id
      || `milestone-${Date.now()}-${Math.random()}`,

    name:
      typeof item?.name === "string"
        ? item.name
        : "マイルストーン",

    iconKey:
      typeof item?.iconKey === "string"
        ? item.iconKey
        : "",

    iconHtml:
      typeof item?.iconHtml === "string"
        ? item.iconHtml
        : "",

    tasks:
      Array.isArray(item?.tasks)
        ? item.tasks.map(task => ({
            name:
              typeof task?.name === "string"
                ? task.name
                : "タスク",

            status:
              ["complete", "current", "next", "future"]
                .includes(task?.status)
                ? task.status
                : "future",

            memo:
              typeof task?.memo === "string"
                ? task.memo
                : ""
          }))
        : []
  };
}

/* =========================================================
   ▲ 保存と復元 ここまで
========================================================= */

/* =========================================================
   ▼ 共通補助関数 ここから
========================================================= */

function normalizeTaskStatuses() {
  getAllTasks().forEach(task => {
    renderTaskStatus(
      task,
      getTaskStatus(task)
    );
  });
}

function setupInteractionGuards() {
  document.addEventListener(
    "dblclick",
    event => {
      if (
        event.target.closest(
          "input, textarea, select"
        )
      ) {
        return;
      }

      event.preventDefault();
    },
    { passive: false }
  );

  document
    .getElementById("roadmap")
    ?.addEventListener(
      "contextmenu",
      event => {
        event.preventDefault();
      }
    );
}

function getMilestones() {
  return [
    ...document.querySelectorAll(
      ".milestone"
    )
  ];
}

function getAllTasks() {
  return [
    ...document.querySelectorAll(
      ".task"
    )
  ];
}

function getMilestoneName(
  milestone
) {
  return (
    milestone
      ?.querySelector(
        ".milestone-name"
      )
      ?.textContent
      .trim()
    || "マイルストーン"
  );
}

function getTaskName(task) {
  return (
    task?.dataset.taskName
    || task
      ?.querySelector(
        ".task-name"
      )
      ?.textContent
      .trim()
    || "タスク"
  );
}

function setTaskName(
  task,
  name
) {
  task.dataset.taskName = name;

  const element =
    task.querySelector(
      ".task-name"
    );

  if (element) {
    element.textContent = name;
  }
}

function getTaskMemo(task) {
  return (
    task?.dataset.memo
    || ""
  );
}

function getTaskStatus(task) {
  if (task.dataset.status) {
    return task.dataset.status;
  }

  if (
    task.classList.contains(
      "task-complete"
    )
  ) {
    return "complete";
  }

  if (
    task.classList.contains(
      "task-current"
    )
  ) {
    return "current";
  }

  if (
    task.classList.contains(
      "task-next"
    )
  ) {
    return "next";
  }

  return "future";
}

function createElement(
  tag,
  className = "",
  text = ""
) {
  const element =
    document.createElement(tag);

  if (className) {
    element.className =
      className;
  }

  if (text !== "") {
    element.textContent =
      text;
  }

  return element;
}

function setText(
  selector,
  text
) {
  const element =
    document.querySelector(
      selector
    );

  if (element) {
    element.textContent = text;
  }
}

function showInputError(
  input,
  message
) {
  input.setCustomValidity(
    message
  );

  input.reportValidity();

  input.addEventListener(
    "input",
    () => {
      input.setCustomValidity("");
    },
    { once: true }
  );
}

/*
  旧コードから呼ばれた場合の互換用。
*/
window.refreshProjectProgress =
  () => {
    refreshProject({
      animate: true,
      center: false
    });
  };


/* =========================================================
   ▲ 共通補助関数 ここまで
========================================================= */
