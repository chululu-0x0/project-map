/* ========================================
   ▼ 保存・基本設定 ここから
======================================== */

const STORAGE_KEY =
  "project-map-state-v5";


const PROJECT_TITLE_KEY =
  "project-map-title-v1";


let selectedMilestone =
  null;


/*
  「現在タスク」とは別。

  ユーザーが現在見ている、
  中央選択中のタスク。
*/
let selectedTask =
  null;


/*
  誤クリック防止。
*/
let suppressTaskClickUntil =
  0;

let suppressRoadmapClickUntil =
  0;


/*
  タスクをドラッグした後、
  Safariで遅れて発生するclickを
  1回だけ無効化するために使う。
*/
let suppressNextTaskClick =
  null;


/*
  マイルストーンの順位カラー。
*/
const MILESTONE_ORDER_COLORS = [

  {
    main: "#f29ab2",
    soft: "#fff1f5"
  },

  {
    main: "#8fcde8",
    soft: "#eef9fe"
  },

  {
    main: "#9bd7b0",
    soft: "#effaf3"
  },

  {
    main: "#c9afe8",
    soft: "#f7f1fc"
  },

  {
    main: "#f2c887",
    soft: "#fff8e9"
  },

  {
    main: "#f2a79a",
    soft: "#fff2ef"
  }
];


/*
  SVGアイコン。
*/
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

/* ========================================
   ▲ 保存・基本設定 ここまで
======================================== */


/* ========================================
   ▼ 初期サンプルデータ ここから
======================================== */

const DEFAULT_PROJECT = [

  {
    id: "planning",
    name: "企画",
    iconHtml: "💡",

    tasks: [

      {
        name:
          "作りたいものを決める",

        status:
          "complete"
      },

      {
        name:
          "必要な機能を整理する",

        status:
          "complete"
      },

      {
        name:
          "Ver.1.0の完成条件を決める",

        status:
          "complete"
      }
    ]
  },


  {
    id: "base",
    name: "基本画面",
    iconHtml: "⚙️",

    tasks: [

      {
        name:
          "専用フォルダを作る",

        status:
          "complete"
      },

      {
        name:
          "GitHubリポジトリを作る",

        status:
          "complete"
      },

      {
        name:
          "基本ファイルを用意する",

        status:
          "complete"
      },

      {
        name:
          "基本画面を組み立てる",

        status:
          "current"
      },

      {
        name:
          "デザインを整える",

        status:
          "next"
      }
    ]
  },


  {
    id: "roadmap",
    name: "ロードマップ機能",
    iconHtml: "🗺️",

    tasks: [

      {
        name:
          "マイルストーンを追加",

        status:
          "future"
      },

      {
        name:
          "マイルストーンを線で接続",

        status:
          "future"
      },

      {
        name:
          "完了部分の線を色付け",

        status:
          "future"
      },

      {
        name:
          "今ここを表示",

        status:
          "future"
      }
    ]
  },


  {
    id: "tasks",
    name: "タスク管理",
    iconHtml: "☑️",

    tasks: [

      {
        name:
          "タスクを追加・編集",

        status:
          "future"
      },

      {
        name:
          "完了状態を変更",

        status:
          "future"
      },

      {
        name:
          "今やっているタスクを指定",

        status:
          "future"
      },

      {
        name:
          "次のタスクを表示",

        status:
          "future"
      }
    ]
  },


  {
    id: "sync",
    name: "クラウド同期",
    iconHtml: "☁️",

    tasks: [

      {
        name:
          "Supabaseを準備",

        status:
          "future"
      },

      {
        name:
          "ログイン機能",

        status:
          "future"
      },

      {
        name:
          "データをクラウド保存",

        status:
          "future"
      },

      {
        name:
          "PC・iPhone間で同期",

        status:
          "future"
      }
    ]
  },


  {
    id: "complete",
    name: "Ver.1.0完成",
    iconHtml: "🏆",

    tasks: [

      {
        name:
          "Windowsで動作確認",

        status:
          "future"
      },

      {
        name:
          "iPhoneで動作確認",

        status:
          "future"
      },

      {
        name:
          "PWAとしてホーム画面に追加",

        status:
          "future"
      }
    ]
  }
];

/* ========================================
   ▲ 初期サンプルデータ ここまで
======================================== */


/* ========================================
   ▼ アプリ起動 ここから
======================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    restoreProjectState();

    normalizeTaskStatuses();

    setupRoadmapControls();

    setupTaskReordering();

    setupRoadmapDragging();

setupRoadmapSelectionSync();

setupInteractionGuards();

/*
  v22追加
*/
setupProjectTitleEditing();

setupTaskMemoPanel();

setupProjectMenu();


refreshProject({
      animate:
        false,

      center:
        false
    });


    /*
      最初に中央へ持ってくる対象。

      current
      ↓
      未完了
      ↓
      先頭

      の順。
    */
    const initial =
      document.querySelector(
        '.milestone[data-status="current"]'
      )
      ||
      getMilestones().find(
        milestone =>
          milestone.dataset.status !==
          "complete"
      )
      ||
      getMilestones()[0];


    if (initial) {

      selectMilestone(
        initial,
        false
      );


      requestAnimationFrame(
        () => {

          centerMilestone(
            initial,
            false
          );

        }
      );
    }


    requestAnimationFrame(
      () => {

        document
          .getElementById(
            "roadmap"
          )
          ?.classList.add(
            "is-ready"
          );

      }
    );


    window.addEventListener(
      "resize",
      () => {

        if (
          selectedMilestone
            ?.isConnected
        ) {

          centerMilestone(
            selectedMilestone,
            false
          );
        }
      }
    );
  }
);

/* ========================================
   ▲ アプリ起動 ここまで
======================================== */


/* ========================================
   ▼ クリック・編集操作 ここから

   共通ルール：

   中央にない
   → 1回目は中央へ

   中央にある
   → 次のクリックで編集
======================================== */

function setupRoadmapControls() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  roadmap.addEventListener(
    "click",
    event => {

      if (
        Date.now() <
        suppressRoadmapClickUntil
      ) {
        return;
      }


      /* ========================================
         タスク
      ======================================== */

      const task =
        event.target.closest(
          ".task"
        );


      if (task) {

        if (
          suppressNextTaskClick ===
          task
        ) {

          suppressNextTaskClick =
            null;

          return;
        }


        if (
          Date.now() <
          suppressTaskClickUntil
        ) {
          return;
        }


        const milestone =
          task.closest(
            ".milestone"
          );


        /*
          まず親マイルストーンが
          中央でなければ、
          マイルストーンを中央へ。
        */
        if (
          !canEditMilestone(
            milestone
          )
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        /*
          親マイルストーンが中央でも、
          このタスク自身がまだ
          選択されていなければ

          1回目：
          タスクを縦中央へ。

          メモもこの時点で切り替える。
        */
        if (
          selectedTask !== task
          ||
          !isTaskCentered(
            task
          )
        ) {

          selectTask(
            task,
            true
          );

          return;
        }


        /*
          すでに選択＋中央。

          ここで初めて編集画面。
        */
        openTaskStatusDialog(
          task
        );

        return;
      }


      /* ========================================
         タスク追加
      ======================================== */

      const addTaskButton =
        event.target.closest(
          ".add-task-button"
        );


      if (addTaskButton) {

        const milestone =
          addTaskButton.closest(
            ".milestone"
          );


        if (
          !canEditMilestone(
            milestone
          )
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        openAddTaskDialog(
          milestone
        );

        return;
      }


      /* ========================================
         マイルストーン
      ======================================== */

      const milestoneButton =
        event.target.closest(
          ".milestone-button"
        );


      if (milestoneButton) {

        const milestone =
          milestoneButton.closest(
            ".milestone"
          );


        if (
          !canEditMilestone(
            milestone
          )
        ) {

          selectMilestone(
            milestone,
            true
          );

          return;
        }


        openMilestoneEditDialog(
          milestone
        );
      }
    }
  );


  document
    .getElementById(
      "add-milestone-button"
    )
    ?.addEventListener(
      "click",
      openAddMilestoneDialog
    );
}

/* ========================================
   ▲ クリック・編集操作 ここまで
======================================== */


/* ========================================
   ▼ 中央判定・選択 ここから
======================================== */

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


  if (!roadmap) {
    return false;
  }


  /*
    buttonではなくmilestone自体を測る。

    ホバーでbuttonが動いても
    中央判定には影響しない。
  */
  const roadmapRect =
    roadmap.getBoundingClientRect();


  const milestoneRect =
    milestone.getBoundingClientRect();


  const roadmapCenter =
    roadmapRect.left +
    roadmapRect.width / 2;


  const milestoneCenter =
    milestoneRect.left +
    milestoneRect.width / 2;


  return (
    Math.abs(
      roadmapCenter -
      milestoneCenter
    )
    <= 44
  );
}


function canEditMilestone(
  milestone
) {

  return (
    milestone &&
    selectedMilestone ===
      milestone &&
    isMilestoneCentered(
      milestone
    )
  );
}


function selectMilestone(
  milestone,
  center = true
) {

  if (!milestone) {
    return;
  }


  const changed =
    selectedMilestone !==
    milestone;


  getMilestones().forEach(
    item => {

      item.classList.remove(
        "is-selected"
      );

    }
  );


  milestone.classList.add(
    "is-selected"
  );


  selectedMilestone =
    milestone;


  if (center) {

    centerMilestone(
      milestone,
      true
    );
  }


  /*
    別のマイルストーンへ移った時だけ
    縦方向の表示を切り替える。
  */
  if (changed) {

    requestAnimationFrame(
      () => {

        focusMilestoneDefault(
          milestone,
          true
        );

      }
    );
  }
}


  milestone.classList.add(
    "is-selected"
  );


  selectedMilestone =
    milestone;


  if (center) {

    centerMilestone(
      milestone,
      true
    );
  }
}


function centerMilestone(
  milestone,
  smooth = true
) {

  if (!milestone) {
    return;
  }


/* ========================================
   ▼ v22 タスク選択・縦中央
======================================== */

function clearSelectedTask() {

  document
    .querySelectorAll(
      ".task.is-selected-task"
    )
    .forEach(
      task => {

        task.classList.remove(
          "is-selected-task"
        );

      }
    );


  selectedTask =
    null;


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
    .forEach(
      item => {

        item.classList.remove(
          "is-selected-task"
        );

      }
    );


  task.classList.add(
    "is-selected-task"
  );


  selectedTask =
    task;


  if (center) {

    centerTask(
      task,
      true
    );
  }


  refreshTaskMemoPanel();
}


function centerTask(
  task,
  smooth = true
) {

  if (!task) {
    return;
  }


  const branch =
    task.closest(
      ".task-branch"
    );


  if (!branch) {
    return;
  }


  /*
    scrollIntoViewだと
    横方向のロードマップまで
    一緒に動く場合がある。

    なので縦scrollTopだけを
    直接計算する。
  */
  const target =
    task.offsetTop
    -
    branch.clientHeight / 2
    +
    task.offsetHeight / 2;


  branch.scrollTo({

    top:
      Math.max(
        0,
        target
      ),

    behavior:
      smooth
        ?
        "smooth"
        :
        "auto"
  });
}


function isTaskCentered(
  task
) {

  if (!task) {
    return false;
  }


  const branch =
    task.closest(
      ".task-branch"
    );


  if (!branch) {
    return false;
  }


  const branchRect =
    branch
      .getBoundingClientRect();


  const taskRect =
    task
      .getBoundingClientRect();


  const branchCenter =
    branchRect.top
    +
    branchRect.height / 2;


  const taskCenter =
    taskRect.top
    +
    taskRect.height / 2;


  return (
    Math.abs(
      branchCenter -
      taskCenter
    )
    <= 55
  );
}


/*
  マイルストーンを横移動した時の
  初期縦位置。

  現在地：
  → currentタスクを中央。

  その他：
  → マイルストーンを見せ、
     タスクは先頭。
*/
function focusMilestoneDefault(
  milestone,
  smooth = true
) {

  if (!milestone) {
    return;
  }


  const branch =
    milestone.querySelector(
      ".task-branch"
    );


  const currentTask =
    milestone.querySelector(
      '.task[data-status="current"]'
    );


  if (
    milestone.dataset.status ===
      "current"
    &&
    currentTask
  ) {

    selectTask(
      currentTask,
      smooth
    );

    return;
  }


  clearSelectedTask();


  branch?.scrollTo({

    top:
      0,

    behavior:
      smooth
        ?
        "smooth"
        :
        "auto"
  });
}

/* ========================================
   ▲ v22 タスク選択・縦中央
======================================== */ 


  milestone.scrollIntoView({

    behavior:
      smooth
        ?
        "smooth"
        :
        "auto",

    block:
      "nearest",

    inline:
      "center"
  });
}


function getNearestMilestone() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return null;
  }


  const roadmapRect =
    roadmap.getBoundingClientRect();


  const center =
    roadmapRect.left +
    roadmapRect.width / 2;


  let nearest =
    null;


  let nearestDistance =
    Infinity;


  getMilestones().forEach(
    milestone => {

      const rect =
        milestone
          .getBoundingClientRect();


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


  return nearest;
}

/* ========================================
   ▲ 中央判定・選択 ここまで
======================================== */


/* ========================================
   ▼ 横スクロール後の選択同期 ここから
======================================== */

function setupRoadmapSelectionSync() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  let timer =
    null;


  roadmap.addEventListener(
    "scroll",
    () => {

      clearTimeout(
        timer
      );


      timer =
        setTimeout(
          () => {

            const nearest =
              getNearestMilestone();


            if (
              nearest &&
              isMilestoneCentered(
                nearest
              )
            ) {

              selectMilestone(
                nearest,
                false
              );
            }

          },
          120
        );

    },
    {
      passive:
        true
    }
  );
}

/* ========================================
   ▲ 横スクロール後の選択同期 ここまで
======================================== */


/* ========================================
   ▼ PC横ドラッグ ここから
======================================== */

function setupRoadmapDragging() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  let drag =
    null;


  roadmap.addEventListener(
    "pointerdown",
    event => {

      if (
        event.pointerType !==
        "mouse"
      ) {
        return;
      }


      if (
        event.button !== 0
      ) {
        return;
      }


      /*
        タスク上は
        タスク並び替えを優先。
      */
      if (
        event.target.closest(
          ".task"
        )
      ) {
        return;
      }


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
    }
  );


  roadmap.addEventListener(
    "pointermove",
    event => {

      if (
        !drag ||
        drag.pointerId !==
        event.pointerId
      ) {
        return;
      }


      const dx =
        event.clientX -
        drag.startX;


      const dy =
        event.clientY -
        drag.startY;


      if (!drag.dragging) {

        /*
          少し動いただけなら
          普通のクリック。
        */
        if (
          Math.abs(dx) <
          7
        ) {
          return;
        }


        /*
          縦方向の方が大きければ
          横ドラッグにしない。
        */
        if (
          Math.abs(dy) >
          Math.abs(dx)
        ) {

          drag =
            null;

          return;
        }


        drag.dragging =
          true;


        roadmap.classList.add(
          "is-pointer-dragging"
        );


        /*
          実際にドラッグ開始してから
          pointer capture。

          PCクリックとの競合防止。
        */
        roadmap.setPointerCapture?.(
          event.pointerId
        );
      }


      event.preventDefault();


      roadmap.scrollLeft =
        drag.startScrollLeft -
        dx;
    }
  );


  const finish =
    event => {

      if (
        !drag ||
        drag.pointerId !==
        event.pointerId
      ) {
        return;
      }


      const wasDragging =
        drag.dragging;


      if (
        wasDragging
      ) {

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


      drag =
        null;


      if (!wasDragging) {
        return;
      }


      suppressRoadmapClickUntil =
        Date.now() +
        400;


      const nearest =
        getNearestMilestone();


      if (nearest) {

        selectMilestone(
          nearest,
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

/* ========================================
   ▲ PC横ドラッグ ここまで
======================================== */


/* ========================================
   ▼ タスク長押し上下移動 ここから

   今回の重要修正。

   ・中央だけ操作可能
   ・長押し約380ms
   ・隣タスクの中央を超えて交換
   ・交換直後に少し待つ
   ・境界で往復する「ぶるぶる」を防ぐ
   ・iPhoneの編集画面誤表示も防ぐ
======================================== */

function setupTaskReordering() {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  let drag =
    null;


  /* ========================================
     押し始め
  ======================================== */

  roadmap.addEventListener(
    "pointerdown",
    event => {

      const task =
        event.target.closest(
          ".task"
        );


      if (!task) {
        return;
      }


      if (
        event.pointerType ===
          "mouse"
        &&
        event.button !== 0
      ) {
        return;
      }


      const milestone =
        task.closest(
          ".milestone"
        );


      /*
        中央にない場合は
        並び替えを開始しない。
      */
      if (
        !canEditMilestone(
          milestone
        )
      ) {
        return;
      }


      drag = {

        task,

        milestone,

        pointerId:
          event.pointerId,

        startX:
          event.clientX,

        startY:
          event.clientY,

        dragging:
          false,

        timer:
          null,

        /*
          最後に交換した時刻。
          連続交換のぶるぶる防止。
        */
        lastSwapTime:
          0
      };


      task.setPointerCapture?.(
        event.pointerId
      );


      drag.timer =
        setTimeout(
          () => {

            startTaskDrag(
              task
            );

          },
          380
        );
    }
  );


  /* ========================================
     指・マウス移動
  ======================================== */

  roadmap.addEventListener(
    "pointermove",
    event => {

      if (
        !drag ||
        drag.pointerId !==
        event.pointerId
      ) {
        return;
      }


      const dx =
        event.clientX -
        drag.startX;


      const dy =
        event.clientY -
        drag.startY;


      /*
        長押し開始前。

        指が14px以上動いたら
        普通のスクロール・タップとみなし
        長押しをキャンセル。
      */
      if (!drag.dragging) {

        const distance =
          Math.hypot(
            dx,
            dy
          );


        if (
          distance >
          14
        ) {

          clearTimeout(
            drag.timer
          );


          releaseTaskPointer(
            drag.task,
            event.pointerId
          );


          drag =
            null;
        }


        return;
      }


      /*
        並び替え開始後。

        Safari側のスクロールを止める。
      */
      event.preventDefault();


      drag.task.style.transform =
        `translateY(${dy}px) scale(1.04)`;


      maybeSwapTask(
        drag,
        event.clientY
      );
    }
  );


  /* ========================================
     終了
  ======================================== */

  const finish =
    event => {

      if (
        !drag ||
        drag.pointerId !==
        event.pointerId
      ) {
        return;
      }


      clearTimeout(
        drag.timer
      );


      const task =
        drag.task;


      const wasDragging =
        drag.dragging;


      releaseTaskPointer(
        task,
        event.pointerId
      );


      drag =
        null;


      if (
        wasDragging
      ) {

        /*
          Safariでpointerup後に発生する
          clickを1回だけ無効化。
        */
        suppressNextTaskClick =
          task;


        suppressTaskClickUntil =
          Date.now() +
          900;


        finishTaskDrag(
          task
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


  /* ========================================
     長押し成立
  ======================================== */

  function startTaskDrag(
    task
  ) {

    if (
      !drag ||
      drag.task !==
      task
    ) {
      return;
    }


    drag.dragging =
      true;


    suppressTaskClickUntil =
      Date.now() +
      900;


    task.classList.add(
      "is-dragging"
    );


    document.body.classList.add(
      "is-task-reordering"
    );


    navigator.vibrate?.(
      18
    );
  }


  /* ========================================
     入れ替え判定

     隣タスクの「中央」を
     指が明確に超えた場合だけ交換。

     さらに交換後160msは
     次の交換を禁止。

     これがぶるぶる防止。
  ======================================== */

  function maybeSwapTask(
    state,
    pointerY
  ) {

    const now =
      performance.now();


    /*
      交換直後なら少し待つ。
    */
    if (
      now -
      state.lastSwapTime <
      160
    ) {
      return;
    }


    const task =
      state.task;


    const list =
      task.closest(
        ".task-list"
      );


    if (!list) {
      return;
    }


    const siblings =
      [
        ...list.querySelectorAll(
          ":scope > .task"
        )
      ];


    const index =
      siblings.indexOf(
        task
      );


    const previous =
      siblings[
        index - 1
      ];


    const next =
      siblings[
        index + 1
      ];


    /* ========================================
       下方向
    ======================================== */

    if (next) {

      const rect =
        next.getBoundingClientRect();


      const center =
        rect.top +
        rect.height / 2;


      /*
        タスク中央より少し下まで
        明確に超えた時だけ交換。
      */
      if (
        pointerY >
        center + 4
      ) {

        animateTaskSwap(
          list,
          task,
          () => {

            next.after(
              task
            );

          }
        );


        state.lastSwapTime =
          now;


        /*
          交換した位置を
          新しいドラッグ基準にする。
        */
        state.startY =
          pointerY;


        task.style.transform =
          "translateY(0) scale(1.04)";


        return;
      }
    }


    /* ========================================
       上方向
    ======================================== */

    if (previous) {

      const rect =
        previous
          .getBoundingClientRect();


      const center =
        rect.top +
        rect.height / 2;


      if (
        pointerY <
        center - 4
      ) {

        animateTaskSwap(
          list,
          task,
          () => {

            previous.before(
              task
            );

          }
        );


        state.lastSwapTime =
          now;


        state.startY =
          pointerY;


        task.style.transform =
          "translateY(0) scale(1.04)";
      }
    }
  }
}


/*
  pointer capture解除。
*/
function releaseTaskPointer(
  task,
  pointerId
) {

  if (
    task
      ?.hasPointerCapture
      ?.(
        pointerId
      )
  ) {

    task.releasePointerCapture(
      pointerId
    );
  }
}


/*
  周囲のタスクが
  スッと上下へ移動する演出。
*/
function animateTaskSwap(
  list,
  draggedTask,
  move
) {

  const tasks =
    [
      ...list.querySelectorAll(
        ":scope > .task"
      )
    ];


  const before =
    new Map(
      tasks.map(
        task => [

          task,

          task
            .getBoundingClientRect()
            .top
        ]
      )
    );


  move();


  tasks.forEach(
    task => {

      if (
        task ===
        draggedTask
      ) {
        return;
      }


      const oldTop =
        before.get(
          task
        );


      const newTop =
        task
          .getBoundingClientRect()
          .top;


      const distance =
        oldTop -
        newTop;


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
          duration:
            240,

          easing:
            "cubic-bezier(0.2, 0.9, 0.35, 1)"
        }
      );
    }
  );
}


/*
  ドロップ完了。
*/
function finishTaskDrag(
  task
) {

  task.style.transform =
    "";


  task.classList.remove(
    "is-dragging"
  );


  task.classList.add(
    "is-dropping"
  );


  document.body.classList.remove(
    "is-task-reordering"
  );


  setTimeout(
    () => {

      task.classList.remove(
        "is-dropping"
      );

    },
    380
  );


  const current =
    getAllTasks().find(
      item =>
        getTaskStatus(item) ===
        "current"
    );


  if (current) {

    setFlowFromCurrent(
      current
    );
  }


  const milestone =
    task.closest(
      ".milestone"
    );


  refreshProject({
    animate:
      false,

    center:
      false
  });


  if (milestone) {

    selectMilestone(
      milestone,
      false
    );
  }


  saveProjectState();
}

/* ========================================
   ▲ タスク長押し上下移動 ここまで
======================================== */


/* ========================================
   ▼ タスク編集 ここから
======================================== */

function openTaskStatusDialog(
  task
) {

  if (!task) {
    return;
  }


  const milestone =
    task.closest(
      ".milestone"
    );


  if (
    !canEditMilestone(
      milestone
    )
  ) {

    selectMilestone(
      milestone,
      true
    );

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
    [
      "complete",
      "✓",
      "完了"
    ],

    [
      "current",
      "●",
      "今やってる"
    ],

    [
      "next",
      "○",
      "次にやる"
    ],

    [
      "future",
      "○",
      "未着手"
    ]

  ].forEach(
    ([
      status,
      icon,
      label
    ]) => {

      const button =
        createElement(
          "button",
          `task-status-option status-${status}`
        );


      button.type =
        "button";


      button.innerHTML = `
        <span class="status-option-icon">
          ${icon}
        </span>

        <span>
          ${label}
        </span>
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


      options.appendChild(
        button
      );
    }
  );


  /* 名前変更 */

  const editArea =
    createElement(
      "div",
      "task-edit-area"
    );


  const nameInput =
    createTextInput(
      "タスク名"
    );


  nameInput.value =
    getTaskName(
      task
    );


  const saveNameButton =
    createElement(
      "button",
      "dialog-secondary",
      "タスク名を変更"
    );


  saveNameButton.type =
    "button";


  saveNameButton.addEventListener(
    "click",
    () => {

      const name =
        nameInput
          .value
          .trim();


      if (!name) {

        showInputError(
          nameInput,
          "タスク名を入力してくれ。"
        );

        return;
      }


      const element =
        task.querySelector(
          ".task-name"
        );


      if (element) {

        element.textContent =
          name;
      }


      closeDialog();


      refreshProject({
        animate:
          false,

        center:
          false
      });


      selectMilestone(
        milestone,
        false
      );


      saveProjectState();
    }
  );


  /* 削除 */

  const deleteButton =
    createElement(
      "button",
      "dialog-danger",
      "このタスクを削除"
    );


  deleteButton.type =
    "button";


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
        getTaskStatus(task) ===
        "current";


      task.remove();


      if (wasCurrent) {

        const next =
          getAllTasks().find(
            item =>
              getTaskStatus(item) !==
              "complete"
          );


        if (next) {

          setFlowFromCurrent(
            next
          );
        }
      }


      closeDialog();


      refreshProject({
        animate:
          true,

        center:
          false
      });


      selectMilestone(
        milestone,
        false
      );


      saveProjectState();
    }
  );


  editArea.append(
    nameInput,
    saveNameButton,
    deleteButton
  );


  wrapper.append(
    options,
    editArea
  );


  openDialog({

    label:
      "TASK",

    title:
      getTaskName(task),

    content:
      wrapper
  });
}

/* ========================================
   ▲ タスク編集 ここまで
======================================== */


/* ========================================
   ▼ タスク状態・ぽよん ここから
======================================== */

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


  setTimeout(
    () => {

      update();


      task.classList.remove(
        "is-state-changing"
      );


      task.classList.add(
        "is-state-changed"
      );


      setTimeout(
        () => {

          task.classList.remove(
            "is-state-changed"
          );

        },
        650
      );

    },
    130
  );
}


function changeTaskStatus(
  task,
  status
) {

  const milestone =
    task.closest(
      ".milestone"
    );


  const wasCurrent =
    getTaskStatus(task) ===
    "current";


  renderTaskStatus(
    task,
    status
  );


  if (
    status ===
    "current"
  ) {

    setFlowFromCurrent(
      task
    );
  }

  else if (
    status ===
      "complete"
    &&
    wasCurrent
  ) {

    advanceFromCompletedTask(
      task
    );
  }

  else if (
    status ===
    "next"
  ) {

    getAllTasks()
      .filter(
        item =>
          item !== task &&
          getTaskStatus(item) ===
          "next"
      )
      .forEach(
        item => {

          renderTaskStatus(
            item,
            "future"
          );

        }
      );
  }

  else if (
    status ===
      "future"
    &&
    wasCurrent
  ) {

    const nextIncomplete =
      getAllTasks().find(
        item =>
          getTaskStatus(item) !==
          "complete"
      );


    if (
      nextIncomplete
    ) {

      setFlowFromCurrent(
        nextIncomplete
      );
    }
  }


  selectMilestone(
    milestone,
    false
  );


  refreshProject({
    animate:
      true,

    center:
      false
  });


  requestAnimationFrame(
    () => {

      centerMilestone(
        milestone,
        true
      );

    }
  );


  saveProjectState();
}


function setFlowFromCurrent(
  currentTask
) {

  const tasks =
    getAllTasks();


  const index =
    tasks.indexOf(
      currentTask
    );


  tasks.forEach(
    task => {

      if (
        task !==
          currentTask
        &&
        [
          "current",
          "next"
        ].includes(
          getTaskStatus(task)
        )
      ) {

        renderTaskStatus(
          task,
          "future"
        );
      }
    }
  );


  renderTaskStatus(
    currentTask,
    "current"
  );


  const next =
    tasks
      .slice(
        index + 1
      )
      .find(
        task =>
          getTaskStatus(task) !==
          "complete"
      );


  if (next) {

    renderTaskStatus(
      next,
      "next"
    );
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
          getTaskStatus(task) !==
          "complete"
      );


  tasks
    .filter(
      task =>
        [
          "current",
          "next"
        ].includes(
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

    setFlowFromCurrent(
      next
    );
  }
}


function renderTaskStatus(
  task,
  status
) {

  const name =
    getTaskName(
      task
    );


  task.dataset.status =
    status;


  task.classList.remove(
    "task-complete",
    "task-current",
    "task-next"
  );


  task.replaceChildren();


  if (
    status ===
    "complete"
  ) {

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
    status ===
      "current"
    ||
    status ===
      "next"
  ) {

    const isCurrent =
      status ===
      "current";


    task.classList.add(
      isCurrent
        ?
        "task-current"
        :
        "task-next"
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
          ?
          "今やってる"
          :
          "次はこれ"
      )
    );


    task.append(

      createElement(
        "span",
        "task-marker",
        isCurrent
          ?
          "●"
          :
          "○"
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

/* ========================================
   ▲ タスク状態・ぽよん ここまで
======================================== */


/* ========================================
   ▼ 全体進捗更新 ここから
======================================== */

function refreshProgressPanel() {

  const tasks =
    getAllTasks();


  const completed =
    tasks.filter(
      task =>
        getTaskStatus(task) ===
        "complete"
    ).length;


  const percent =
    tasks.length
      ?
      Math.round(
        completed /
        tasks.length *
        100
      )
      :
      0;


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


  /*
    状態変更などで再描画した時も
    メモ表示を同期。
  */
  refreshTaskMemoPanel();
}

/* ========================================
   ▲ 全体進捗更新 ここまで
======================================== */


/* ========================================
   ▼ タスク追加 ここから
======================================== */

function openAddTaskDialog(
  milestone
) {

  if (!milestone) {
    return;
  }


  if (
    !canEditMilestone(
      milestone
    )
  ) {

    selectMilestone(
      milestone,
      true
    );

    return;
  }


  const input =
    createTextInput(
      "追加するタスク名"
    );


  const content =
    createFormContent(
      input,
      "タスクを追加",
      () => {

        const name =
          input
            .value
            .trim();


        if (!name) {

          showInputError(
            input,
            "タスク名を入力してくれ。"
          );

          return;
        }


        milestone
          .querySelector(
            ".task-list"
          )
          ?.appendChild(
            createTask(
              name,
              "future"
            )
          );


        closeDialog();


        refreshProject({
          animate:
            false,

          center:
            false
        });


        selectMilestone(
          milestone,
          false
        );


        saveProjectState();
      }
    );


  openDialog({

    label:
      "ADD TASK",

    title:
      "タスクを追加",

    content,

    focus:
      input
  });
}

/* ========================================
   ▲ タスク追加 ここまで
======================================== */


/* ========================================
   ▼ マイルストーン追加・編集 ここから
======================================== */

function openAddMilestoneDialog() {

  const nameInput =
    createTextInput(
      "マイルストーン名"
    );


  const taskInput =
    createTextInput(
      "最初のタスク名"
    );


  const picker =
    createIconPicker();


  const fields =
    createElement(
      "div",
      "dialog-fields"
    );


  fields.append(
    nameInput,
    taskInput,
    picker.element
  );


  const content =
    createFormContent(
      fields,
      "マイルストーンを追加",
      () => {

        const name =
          nameInput
            .value
            .trim();


        const firstTask =
          taskInput
            .value
            .trim();


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

            iconKey:
              picker.getValue()
          });


        closeDialog();


        refreshProject({
          animate:
            false,

          center:
            false
        });


        selectMilestone(
          milestone,
          true
        );


        saveProjectState();
      }
    );


  openDialog({

    label:
      "ADD MILESTONE",

    title:
      "マイルストーンを追加",

    content,

    focus:
      nameInput
  });
}


function openMilestoneEditDialog(
  milestone
) {

  if (!milestone) {
    return;
  }


  if (
    !canEditMilestone(
      milestone
    )
  ) {

    selectMilestone(
      milestone,
      true
    );

    return;
  }


  const nameInput =
    createTextInput(
      "マイルストーン名"
    );


  nameInput.value =
    milestone
      .querySelector(
        ".milestone-name"
      )
      ?.textContent
      .trim()
    ||
    "";


  const picker =
    createIconPicker(
      milestone.dataset.iconKey
      ||
      "compass"
    );


  const fields =
    createElement(
      "div",
      "dialog-fields"
    );


  fields.append(
    nameInput,
    picker.element
  );


  const saveButton =
    createElement(
      "button",
      "dialog-submit",
      "変更を保存"
    );


  saveButton.type =
    "button";


  saveButton.addEventListener(
    "click",
    () => {

      const name =
        nameInput
          .value
          .trim();


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
        .textContent =
        name;


      milestone.dataset.iconKey =
        iconKey;


      milestone
        .querySelector(
          ".milestone-icon"
        )
        .innerHTML =
        MILESTONE_ICONS[
          iconKey
        ];


      closeDialog();


      refreshProject({
        animate:
          false,

        center:
          false
      });


      selectMilestone(
        milestone,
        false
      );


      saveProjectState();
    }
  );


  /*
    左右並び替え。
  */
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


  moveLeft.type =
    "button";


  moveRight.type =
    "button";


  moveLeft.addEventListener(
    "click",
    () => {

      moveMilestone(
        milestone,
        -1
      );

    }
  );


  moveRight.addEventListener(
    "click",
    () => {

      moveMilestone(
        milestone,
        1
      );

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

    label:
      "MILESTONE",

    title:
      "マイルストーンを編集",

    content,

    focus:
      nameInput
  });
}


function moveMilestone(
  milestone,
  direction
) {

  const milestones =
    getMilestones();


  const index =
    milestones.indexOf(
      milestone
    );


  const target =
    index +
    direction;


  if (
    index < 0 ||
    target < 0 ||
    target >=
      milestones.length
  ) {
    return;
  }


  [
    milestones[index],
    milestones[target]
  ] =
  [
    milestones[target],
    milestones[index]
  ];


  rebuildRoadmapFromMilestones(
    milestones
  );


  closeDialog();


  refreshProject({
    animate:
      false,

    center:
      false
  });


  selectMilestone(
    milestone,
    true
  );


  saveProjectState();
}


function appendMilestone({
  name,
  firstTask,
  iconKey
}) {

  const milestones =
    getMilestones();


  const goalIndex =
    milestones.findIndex(
      milestone =>
        milestone.dataset
          .milestoneId ===
        "complete"
    );


  const milestone =
    createMilestone({

      id:
        `milestone-${Date.now()}`,

      name,

      iconKey,

      tasks: [

        {
          name:
            firstTask,

          status:
            "future"
        }
      ]
    });


  if (
    goalIndex >=
    0
  ) {

    milestones.splice(
      goalIndex,
      0,
      milestone
    );
  }

  else {

    milestones.push(
      milestone
    );
  }


  rebuildRoadmapFromMilestones(
    milestones
  );


  return milestone;
}

/* ========================================
   ▲ マイルストーン追加・編集 ここまで
======================================== */


/* ========================================
   ▼ DOM作成 ここから
======================================== */

function rebuildRoadmapFromMilestones(
  milestones
) {

  const roadmap =
    document.getElementById(
      "roadmap"
    );


  if (!roadmap) {
    return;
  }


  roadmap.replaceChildren();


  milestones.forEach(
    (
      milestone,
      index
    ) => {

      if (
        index >
        0
      ) {

        const line =
          createElement(
            "div",
            "roadmap-line"
          );


        line.setAttribute(
          "aria-hidden",
          "true"
        );


        roadmap.appendChild(
          line
        );
      }


      roadmap.appendChild(
        milestone
      );
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


  button.type =
    "button";


  const icon =
    createElement(
      "span",
      "milestone-icon"
    );


  if (
    iconKey &&
    MILESTONE_ICONS[
      iconKey
    ]
  ) {

    icon.innerHTML =
      MILESTONE_ICONS[
        iconKey
      ];
  }

  else {

    icon.innerHTML =
      iconHtml ||
      "🧭";
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


  tasks.forEach(
  item => {

    list.appendChild(
      createTask(
        item.name,
        item.status ||
        "future",
        item.memo ||
        ""
      )
    );

  }
);


  const addButton =
    createElement(
      "button",
      "add-task-button",
      "＋ タスクを追加"
    );


  addButton.type =
    "button";


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


  /*
    古い保存データにはmemoが無いため
    必ず空文字へフォールバック。
  */
  task.dataset.memo =
    typeof memo ===
      "string"
      ?
      memo
      :
      "";


  task.appendChild(
    createElement(
      "span",
      "task-name",
      name
    )
  );


  renderTaskStatus(
    task,
    status
  );


  return task;
}

  const task =
    createElement(
      "div",
      "task"
    );


  task.dataset.status =
    status;


  task.appendChild(
    createElement(
      "span",
      "task-name",
      name
    )
  );


  renderTaskStatus(
    task,
    status
  );


  return task;
}

/* ========================================
   ▲ DOM作成 ここまで
======================================== */


/* ========================================
   ▼ ダイアログ共通 ここから
======================================== */

function openDialog({
  label,
  title,
  content,
  focus
}) {

  closeDialog(
    true
  );


  const overlay =
    createElement(
      "div",
      "task-status-overlay"
    );


  const dialog =
    createElement(
      "div",
      "task-status-dialog"
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
      "task-status-dialog-label",
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
      "task-status-cancel",
      "キャンセル"
    );


  cancel.type =
    "button";


  cancel.addEventListener(
    "click",
    () => {

      closeDialog();

    }
  );


  dialog.appendChild(
    cancel
  );


  overlay.appendChild(
    dialog
  );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        closeDialog();
      }
    }
  );


  document.body.appendChild(
    overlay
  );


  requestAnimationFrame(
    () => {

      overlay.classList.add(
        "is-visible"
      );


      focus?.focus();

    }
  );
}


function closeDialog(
  immediate = false
) {

  const overlay =
    document.querySelector(
      ".task-status-overlay"
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


  setTimeout(
    () => {

      overlay.remove();

    },
    200
  );
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


  form.appendChild(
    field
  );


  const submit =
    createElement(
      "button",
      "dialog-submit",
      label
    );


  submit.type =
    "submit";


  form.appendChild(
    submit
  );


  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      onSubmit();

    }
  );


  return form;
}


function createTextInput(
  placeholder
) {

  /*
    名前欄をtextareaへ変更。

    既存コード側では
    createTextInput()という名前を
    そのまま使えるので、
    呼び出し箇所を大量修正しなくて済む。
  */
  const input =
    createElement(
      "textarea",
      "dialog-input"
    );


  input.placeholder =
    placeholder;


  input.maxLength =
    160;


  input.rows =
    2;


  return input;
}


function createIconPicker(
  selectedKey =
    "compass"
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
    (
      [
        key,
        svg
      ],
      index
    ) => {

      const label =
        createElement(
          "label",
          "icon-choice"
        );


      const input =
        createElement(
          "input"
        );


      input.type =
        "radio";


      input.name =
        "milestone-icon";


      input.value =
        key;


      input.checked =
        key ===
          selectedKey
        ||
        (
          !MILESTONE_ICONS[
            selectedKey
          ]
          &&
          index ===
          0
        );


      const preview =
        createElement(
          "span",
          "icon-choice-preview"
        );


      preview.innerHTML =
        svg;


      label.append(
        input,
        preview
      );


      element.appendChild(
        label
      );
    }
  );


  return {

    element,

    getValue:
      () =>
        element
          .querySelector(
            "input:checked"
          )
          ?.value
        ||
        "compass"
  };
}

/* ========================================
   ▲ ダイアログ共通 ここまで
======================================== */


/* ========================================
   ▼ 保存・復元 ここから
======================================== */

function saveProjectState() {

  const state =
    getMilestones().map(
      milestone => ({

        id:
          milestone.dataset
            .milestoneId,

        name:
          milestone
            .querySelector(
              ".milestone-name"
            )
            ?.textContent
            .trim()
          ||
          "マイルストーン",

        iconKey:
          milestone.dataset
            .iconKey
          ||
          "",

        iconHtml:
          milestone
            .querySelector(
              ".milestone-icon"
            )
            ?.innerHTML
          ||
          "🧭",

        tasks:
          [
            ...milestone.querySelectorAll(
              ".task"
            )
          ].map(
            task => ({

              name:
                getTaskName(
                  task
                ),

              status:
                getTaskStatus(
                  task
                ),

              /*
                v22
              */
              memo:
                task.dataset.memo
                ||
                ""
            })
          )
      })
    );


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      state
    )
  );
}

/* ========================================
   ▲ 保存・復元 ここまで
======================================== */


/* ========================================
   ▼ 共通便利関数 ここから
======================================== */

function normalizeTaskStatuses() {

  getAllTasks().forEach(
    task => {

      renderTaskStatus(
        task,
        getTaskStatus(
          task
        )
      );

    }
  );
}


function setupInteractionGuards() {

  /*
    PCダブルクリックでの
    文字選択などを防止。
  */
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
    {
      passive:
        false
    }
  );


  /*
    iPhone長押しメニューを
    ロードマップでは表示しない。
  */
  document
    .getElementById(
      "roadmap"
    )
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


function getTaskName(
  task
) {

  return (
    task
      .querySelector(
        ".task-name"
      )
      ?.textContent
      .trim()
    ||
    "タスク"
  );
}


function getTaskStatus(
  task
) {

  if (
    task.dataset.status
  ) {

    return (
      task.dataset.status
    );
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
    document.createElement(
      tag
    );


  if (
    className
  ) {

    element.className =
      className;
  }


  if (text) {

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

    element.textContent =
      text;
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

      input.setCustomValidity(
        ""
      );

    },
    {
      once:
        true
    }
  );
}


/*
  既存互換用。
*/
window.refreshProjectProgress =
  () => {

    refreshProject({

      animate:
        true,

      center:
        false
    });

  };

/* ========================================
   ▲ 共通便利関数 ここまで
======================================== */

/* =========================================================
   ▼ v22 プロジェクトタイトル
========================================================= */

function setupProjectTitleEditing() {

  const title =
    document.getElementById(
      "project-title"
    );


  if (!title) {
    return;
  }


  /*
    保存済みタイトルを復元。
  */
  const saved =
    localStorage.getItem(
      PROJECT_TITLE_KEY
    );


  if (saved) {

    title.textContent =
      saved;
  }


  const open =
    () => {

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
        event.key ===
          "Enter"
        ||
        event.key ===
          " "
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
    createTextInput(
      "プロジェクト名"
    );


  input.value =
    title.textContent
      .trim();


  const content =
    createFormContent(
      input,
      "プロジェクト名を保存",
      () => {

        const name =
          input.value
            .trim();


        if (!name) {

          showInputError(
            input,
            "プロジェクト名を入力してくれ。"
          );

          return;
        }


        title.textContent =
          name;


        localStorage.setItem(
          PROJECT_TITLE_KEY,
          name
        );


        closeDialog();
      }
    );


  openDialog({

    label:
      "PROJECT",

    title:
      "プロジェクト名を変更",

    content,

    focus:
      input
  });
}


/* =========================================================
   ▲ v22 プロジェクトタイトル
========================================================= */



/* =========================================================
   ▼ v22 タスクメモ
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
    !panel ||
    !toggle ||
    !input
  ) {
    return;
  }


  /*
    スマホ用開閉。
  */
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
        expanded &&
        selectedTask
      ) {

        requestAnimationFrame(
          () => {

            input.focus();

          }
        );
      }
    }
  );


  /*
    入力と同時にタスクへ保存。
  */
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
    !panel ||
    !name ||
    !input
  ) {
    return;
  }


  /*
    DOMの再構築などで
    選択中タスクが消えた場合。
  */
  if (
    selectedTask &&
    !selectedTask.isConnected
  ) {

    selectedTask =
      null;
  }


  if (!selectedTask) {

    panel.classList.remove(
      "has-task"
    );


    name.textContent =
      "タスクを選択";


    input.value =
      "";


    input.disabled =
      true;


    return;
  }


  panel.classList.add(
    "has-task"
  );


  name.textContent =
    getTaskName(
      selectedTask
    );


  input.disabled =
    false;


  /*
    入力中のカーソル位置を
    不必要に飛ばさない。
  */
  if (
    document.activeElement !==
    input
  ) {

    input.value =
      selectedTask.dataset.memo
      ||
      "";
  }
}


/* =========================================================
   ▲ v22 タスクメモ
========================================================= */



/* =========================================================
   ▼ v22 プロジェクトメニュー
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


  const backup =
    createElement(
      "button",
      "dialog-secondary",
      "バックアップを書き出す"
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
    backup,
    rename,
    reset
  ].forEach(
    button => {

      button.type =
        "button";

    }
  );


  overview.addEventListener(
    "click",
    openProjectOverview
  );


  backup.addEventListener(
    "click",
    exportProjectBackup
  );


  rename.addEventListener(
    "click",
    () => {

      closeDialog(
        true
      );

      openProjectTitleDialog();
    }
  );


  reset.addEventListener(
    "click",
    resetProject
  );


  wrapper.append(
    overview,
    backup,
    rename,
    reset
  );


  openDialog({

    label:
      "PROJECT",

    title:
      "プロジェクトメニュー",

    content:
      wrapper
  });
}


/* =========================================================
   ▼ 全体一覧
========================================================= */

function openProjectOverview() {

  closeDialog(
    true
  );


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
          "task-edit-area"
        );


      const milestoneButton =
        createElement(
          "button",
          "dialog-secondary",
          milestone
            .querySelector(
              ".milestone-name"
            )
            ?.textContent
            .trim()
          ||
          "マイルストーン"
        );


      milestoneButton.type =
        "button";


      milestoneButton.addEventListener(
        "click",
        () => {

          closeDialog();


          selectMilestone(
            milestone,
            true
          );
        }
      );


      group.appendChild(
        milestoneButton
      );


      milestone
        .querySelectorAll(
          ".task"
        )
        .forEach(
          task => {

            const button =
              createElement(
                "button",
                "dialog-secondary",
                `・${getTaskName(task)}`
              );


            button.type =
              "button";


            button.addEventListener(
              "click",
              () => {

                closeDialog();


                selectMilestone(
                  milestone,
                  true
                );


                /*
                  横中央移動後に
                  タスクを縦中央へ。
                */
                setTimeout(
                  () => {

                    selectTask(
                      task,
                      true
                    );

                  },
                  320
                );
              }
            );


            group.appendChild(
              button
            );
          }
        );


      wrapper.appendChild(
        group
      );
    }
  );


  openDialog({

    label:
      "OVERVIEW",

    title:
      "全体一覧",

    content:
      wrapper
  });
}


/* =========================================================
   ▼ バックアップ書き出し
========================================================= */

function exportProjectBackup() {

  const data = {

    version:
      1,

    projectTitle:
      document
        .getElementById(
          "project-title"
        )
        ?.textContent
        .trim()
      ||
      "Project Map",

    milestones:
      getMilestones().map(
        milestone => ({

          id:
            milestone.dataset
              .milestoneId,

          name:
            milestone
              .querySelector(
                ".milestone-name"
              )
              ?.textContent
              .trim()
            ||
            "マイルストーン",

          iconKey:
            milestone.dataset
              .iconKey
            ||
            "",

          iconHtml:
            milestone
              .querySelector(
                ".milestone-icon"
              )
              ?.innerHTML
            ||
            "🧭",

          tasks:
            [
              ...milestone.querySelectorAll(
                ".task"
              )
            ].map(
              task => ({

                name:
                  getTaskName(
                    task
                  ),

                status:
                  getTaskStatus(
                    task
                  ),

                memo:
                  task.dataset.memo
                  ||
                  ""
              })
            )
        })
      )
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
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  link.href =
    url;


  link.download =
    `project-map-backup-${today}.json`;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );


  closeDialog();
}


/* =========================================================
   ▼ 初期化
========================================================= */

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


  selectedTask =
    null;


  selectedMilestone =
    null;


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
          item
        )
    )
  );


  normalizeTaskStatuses();


  refreshProject({

    animate:
      false,

    center:
      false
  });


  const initial =
    document.querySelector(
      '.milestone[data-status="current"]'
    )
    ||
    getMilestones()[0];


  if (initial) {

    selectMilestone(
      initial,
      true
    );
  }


  saveProjectState();


  closeDialog();
}


/* =========================================================
   ▲ v22 プロジェクトメニュー
========================================================= */
