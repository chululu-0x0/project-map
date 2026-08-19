/* ========================================
   Project Map
======================================== */

document.addEventListener("DOMContentLoaded", () => {

  setupMilestoneToggle();

  setupTaskStatusControl();

  refreshMilestoneStatuses();

  refreshProjectProgress();

});


/* ========================================
   マイルストーン
   展開 / 折りたたみ
======================================== */

function setupMilestoneToggle() {

  const milestones =
    document.querySelectorAll(".milestone");


  milestones.forEach((milestone) => {

    const button =
      milestone.querySelector(".milestone-button");

    const branch =
      milestone.querySelector(".task-branch");


    if (!button || !branch) return;


    const isExpanded =
      button.getAttribute("aria-expanded") === "true";


    if (isExpanded) {

      branch.hidden = false;

      requestAnimationFrame(() => {

        branch.classList.add("is-open");

      });

    }


    button.addEventListener("click", () => {

      const currentlyExpanded =
        button.getAttribute("aria-expanded") === "true";


      if (currentlyExpanded) {

        closeBranch(button, branch);

      } else {

        openBranch(button, branch);

      }

    });

  });

}


/* ========================================
   マイルストーンを開く
======================================== */

function openBranch(button, branch) {

  button.setAttribute(
    "aria-expanded",
    "true"
  );


  branch.hidden = false;


  requestAnimationFrame(() => {

    requestAnimationFrame(() => {

      branch.classList.add("is-open");

    });

  });

}


/* ========================================
   マイルストーンを閉じる
======================================== */

function closeBranch(button, branch) {

  button.setAttribute(
    "aria-expanded",
    "false"
  );


  branch.classList.remove("is-open");


  const finishClose = () => {

    if (
      button.getAttribute("aria-expanded") === "false"
    ) {

      branch.hidden = true;

    }

  };


  const onTransitionEnd = (event) => {

    if (event.target !== branch) return;


    branch.removeEventListener(
      "transitionend",
      onTransitionEnd
    );


    finishClose();

  };


  branch.addEventListener(
    "transitionend",
    onTransitionEnd
  );


  setTimeout(() => {

    if (
      button.getAttribute("aria-expanded") === "false"
    ) {

      branch.hidden = true;

    }

  }, 400);

}


/* ========================================
   タスク状態変更
======================================== */

function setupTaskStatusControl() {

  const tasks =
    document.querySelectorAll(".task");


  tasks.forEach((task) => {

    task.addEventListener("click", () => {

      openTaskStatusDialog(task);

    });

  });

}


/* ========================================
   タスク状態選択画面
======================================== */

function openTaskStatusDialog(task) {

  closeTaskStatusDialog();


  const taskName =
    task.querySelector(".task-name")
      ?.textContent
      .trim() || "タスク";


  const overlay =
    document.createElement("div");

  overlay.className =
    "task-status-overlay";


  const dialog =
    document.createElement("div");

  dialog.className =
    "task-status-dialog";

  dialog.setAttribute(
    "role",
    "dialog"
  );

  dialog.setAttribute(
    "aria-modal",
    "true"
  );


  /* タイトル */

  const smallTitle =
    document.createElement("p");

  smallTitle.className =
    "task-status-dialog-label";

  smallTitle.textContent =
    "タスクの状態";


  const title =
    document.createElement("h3");

  title.textContent =
    taskName;


  /* 選択肢 */

  const buttonArea =
    document.createElement("div");

  buttonArea.className =
    "task-status-options";


  const options = [

    {
      status: "complete",
      icon: "✓",
      label: "完了"
    },

    {
      status: "current",
      icon: "●",
      label: "今やってる"
    },

    {
      status: "next",
      icon: "○",
      label: "次にやる"
    },

    {
      status: "future",
      icon: "○",
      label: "未着手"
    }

  ];


  options.forEach((option) => {

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      `task-status-option status-${option.status}`;

    button.dataset.status =
      option.status;


    button.innerHTML = `
      <span class="status-option-icon">
        ${option.icon}
      </span>

      <span>
        ${option.label}
      </span>
    `;


    button.addEventListener(
      "click",
      () => {

        changeTaskStatus(
          task,
          option.status
        );

        closeTaskStatusDialog();

      }
    );


    buttonArea.appendChild(button);

  });


  /* キャンセル */

  const cancelButton =
    document.createElement("button");

  cancelButton.type =
    "button";

  cancelButton.className =
    "task-status-cancel";

  cancelButton.textContent =
    "キャンセル";


  cancelButton.addEventListener(
    "click",
    closeTaskStatusDialog
  );


  dialog.appendChild(smallTitle);

  dialog.appendChild(title);

  dialog.appendChild(buttonArea);

  dialog.appendChild(cancelButton);


  overlay.appendChild(dialog);

  document.body.appendChild(overlay);


  /*
    背景を押して閉じる
  */

  overlay.addEventListener(
    "click",
    (event) => {

      if (event.target === overlay) {

        closeTaskStatusDialog();

      }

    }
  );


  /*
    表示アニメーション
  */

  requestAnimationFrame(() => {

    overlay.classList.add(
      "is-visible"
    );

  });

}


/* ========================================
   状態選択画面を閉じる
======================================== */

function closeTaskStatusDialog() {

  const overlay =
    document.querySelector(
      ".task-status-overlay"
    );


  if (!overlay) return;


  overlay.classList.remove(
    "is-visible"
  );


  setTimeout(() => {

    overlay.remove();

  }, 200);

}


/* ========================================
   タスク状態変更
======================================== */

function changeTaskStatus(task, status) {

  /*
    「今やってる」は
    プロジェクト内で1個だけ
  */

  if (status === "current") {

    document
      .querySelectorAll(
        '.task[data-status="current"]'
      )
      .forEach((otherTask) => {

        if (otherTask === task) return;


        renderTaskStatus(
          otherTask,
          "future"
        );

      });

  }


  /*
    「次にやる」も1個だけ
  */

  if (status === "next") {

    document
      .querySelectorAll(
        '.task[data-status="next"]'
      )
      .forEach((otherTask) => {

        if (otherTask === task) return;


        renderTaskStatus(
          otherTask,
          "future"
        );

      });

  }


  renderTaskStatus(
    task,
    status
  );


  /*
    マイルストーンと
    右側パネルを再計算
  */

  refreshMilestoneStatuses();

  refreshProjectProgress();

}


/* ========================================
   タスクの見た目を書き換える
======================================== */

function renderTaskStatus(task, status) {

  const taskName =
    task.querySelector(".task-name")
      ?.textContent
      .trim() || "タスク";


  task.dataset.status =
    status;


  task.classList.remove(
    "task-complete",
    "task-current",
    "task-next"
  );


  /*
    中身を一旦空にする
  */

  task.innerHTML = "";


  /* ----------------------------------------
     完了
  ---------------------------------------- */

  if (status === "complete") {

    task.classList.add(
      "task-complete"
    );


    const check =
      document.createElement("span");

    check.className =
      "task-check";

    check.textContent =
      "✓";


    const name =
      document.createElement("span");

    name.className =
      "task-name";

    name.textContent =
      taskName;


    task.appendChild(check);

    task.appendChild(name);

    return;

  }


  /* ----------------------------------------
     今やっている
  ---------------------------------------- */

  if (status === "current") {

    task.classList.add(
      "task-current"
    );


    createStatusTaskContent(
      task,
      taskName,
      "●",
      "今やってる"
    );

    return;

  }


  /* ----------------------------------------
     次にやる
  ---------------------------------------- */

  if (status === "next") {

    task.classList.add(
      "task-next"
    );


    createStatusTaskContent(
      task,
      taskName,
      "○",
      "次はこれ"
    );

    return;

  }


  /* ----------------------------------------
     未着手
  ---------------------------------------- */

  const marker =
    document.createElement("span");

  marker.className =
    "task-marker";

  marker.textContent =
    "○";


  const name =
    document.createElement("span");

  name.className =
    "task-name";

  name.textContent =
    taskName;


  task.appendChild(marker);

  task.appendChild(name);

}


/* ========================================
   現在 / 次タスクの中身
======================================== */

function createStatusTaskContent(
  task,
  taskName,
  markerText,
  badgeText
) {

  const marker =
    document.createElement("span");

  marker.className =
    "task-marker";

  marker.textContent =
    markerText;


  const textArea =
    document.createElement("div");

  textArea.className =
    "task-text";


  const name =
    document.createElement("span");

  name.className =
    "task-name";

  name.textContent =
    taskName;


  const badge =
    document.createElement("span");

  badge.className =
    "task-badge";

  badge.textContent =
    badgeText;


  textArea.appendChild(name);

  textArea.appendChild(badge);


  task.appendChild(marker);

  task.appendChild(textArea);

}


/* ========================================
   マイルストーン状態を自動更新
======================================== */

function refreshMilestoneStatuses() {

  const milestones =
    document.querySelectorAll(
      ".milestone"
    );


  /*
    古い「今ここ」を消す
  */

  document
    .querySelectorAll(
      ".current-label"
    )
    .forEach((label) => {

      label.remove();

    });


  milestones.forEach((milestone) => {

    const tasks =
      [...milestone.querySelectorAll(".task")];


    if (tasks.length === 0) return;


    const hasCurrent =
      tasks.some((task) => {

        return (
          getTaskStatus(task) === "current"
        );

      });


    const allComplete =
      tasks.every((task) => {

        return (
          getTaskStatus(task) === "complete"
        );

      });


    milestone.classList.remove(
      "milestone-complete",
      "milestone-current",
      "milestone-future"
    );


    const statusText =
      milestone.querySelector(
        ".milestone-status"
      );


    /* ----------------------------------------
       全タスク完了
    ---------------------------------------- */

    if (allComplete) {

      milestone.dataset.status =
        "complete";

      milestone.classList.add(
        "milestone-complete"
      );


      if (statusText) {

        statusText.textContent =
          "完了";

      }


      return;

    }


    /* ----------------------------------------
       現在タスクを含む
    ---------------------------------------- */

    if (hasCurrent) {

      milestone.dataset.status =
        "current";

      milestone.classList.add(
        "milestone-current"
      );


      if (statusText) {

        statusText.textContent =
          "進行中";

      }


      const currentLabel =
        document.createElement("div");

      currentLabel.className =
        "current-label";

      currentLabel.textContent =
        "今ここ";


      const button =
        milestone.querySelector(
          ".milestone-button"
        );


      milestone.insertBefore(
        currentLabel,
        button
      );


      return;

    }


    /* ----------------------------------------
       それ以外
    ---------------------------------------- */

    milestone.dataset.status =
      "future";

    milestone.classList.add(
      "milestone-future"
    );


    if (statusText) {

      if (
        milestone.dataset.milestoneId
        === "complete"
      ) {

        statusText.textContent =
          "ゴール";

      } else {

        statusText.textContent =
          "未着手";

      }

    }

  });

}


/* ========================================
   プロジェクト進捗更新
======================================== */

function refreshProjectProgress() {

  updateProgressPercent();

  updateCurrentMilestone();

  updateCurrentTask();

  updateNextTask();

}


/* ========================================
   全体進捗率
======================================== */

function updateProgressPercent() {

  const tasks =
    [...document.querySelectorAll(".task")];


  if (tasks.length === 0) {

    setProgressDisplay(0);

    return;

  }


  const completedTasks =
    tasks.filter((task) => {

      return (
        getTaskStatus(task)
        === "complete"
      );

    });


  const percent =
    Math.round(
      (
        completedTasks.length /
        tasks.length
      ) * 100
    );


  setProgressDisplay(percent);

}


/* ========================================
   進捗表示変更
======================================== */

function setProgressDisplay(percent) {

  const percentText =
    document.getElementById(
      "progress-percent"
    );

  const progressBar =
    document.querySelector(
      ".progress-bar"
    );

  const progressFill =
    document.querySelector(
      ".progress-bar-fill"
    );


  if (percentText) {

    percentText.textContent =
      `${percent}%`;

  }


  if (progressBar) {

    progressBar.setAttribute(
      "aria-valuenow",
      percent
    );

  }


  if (progressFill) {

    progressFill.style.width =
      `${percent}%`;

  }

}


/* ========================================
   現在のマイルストーン
======================================== */

function updateCurrentMilestone() {

  let currentMilestone =
    document.querySelector(
      '.milestone[data-status="current"]'
    );


  /*
    現在タスクが無い場合
    最初の未完了マイルストーン
  */

  if (!currentMilestone) {

    currentMilestone =
      [...document.querySelectorAll(
        ".milestone"
      )]
      .find((milestone) => {

        return (
          milestone.dataset.status
          !== "complete"
        );

      });

  }


  if (!currentMilestone) return;


  const milestoneName =
    currentMilestone.querySelector(
      ".milestone-name"
    );


  const panelName =
    document.querySelector(
      ".current-milestone strong"
    );


  if (
    milestoneName &&
    panelName
  ) {

    panelName.textContent =
      milestoneName
        .textContent
        .trim();

  }

}


/* ========================================
   今やっているタスク
======================================== */

function updateCurrentTask() {

  const currentTask =
    [...document.querySelectorAll(".task")]
      .find((task) => {

        return (
          getTaskStatus(task)
          === "current"
        );

      });


  const panelText =
    document.querySelector(
      ".current-task-box strong"
    );


  if (!panelText) return;


  if (!currentTask) {

    panelText.textContent =
      "現在のタスクはありません";

    return;

  }


  const taskName =
    currentTask.querySelector(
      ".task-name"
    );


  if (taskName) {

    panelText.textContent =
      taskName
        .textContent
        .trim();

  }

}


/* ========================================
   次にやるタスク
======================================== */

function updateNextTask() {

  let nextTask =
    [...document.querySelectorAll(".task")]
      .find((task) => {

        return (
          getTaskStatus(task)
          === "next"
        );

      });


  /*
    next指定がない場合
    最初の未着手を表示
  */

  if (!nextTask) {

    nextTask =
      [...document.querySelectorAll(".task")]
        .find((task) => {

          return (
            getTaskStatus(task)
            === "future"
          );

        });

  }


  const panelText =
    document.querySelector(
      ".next-task-box strong"
    );


  if (!panelText) return;


  if (!nextTask) {

    panelText.textContent =
      "次のタスクはありません";

    return;

  }


  const taskName =
    nextTask.querySelector(
      ".task-name"
    );


  if (taskName) {

    panelText.textContent =
      taskName
        .textContent
        .trim();

  }

}


/* ========================================
   タスク状態取得
======================================== */

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


/* ========================================
   外部から再計算可能
======================================== */

window.refreshProjectProgress =
  refreshProjectProgress;
