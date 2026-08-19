/* ========================================
   Project Map
======================================== */

document.addEventListener("DOMContentLoaded", () => {

  setupMilestoneToggle();

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


    /* ----------------------------------------
       初期状態
    ---------------------------------------- */

    const isExpanded =
      button.getAttribute("aria-expanded") === "true";


    if (isExpanded) {

      branch.hidden = false;

      requestAnimationFrame(() => {

        branch.classList.add("is-open");

      });

    }


    /* ----------------------------------------
       クリックで開閉
    ---------------------------------------- */

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


  /*
    アニメーション終了後に
    完全非表示にする
  */

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


  /*
    万一 transitionend が発生しなかった場合の
    保険
  */

  setTimeout(() => {

    if (
      button.getAttribute("aria-expanded") === "false"
    ) {

      branch.hidden = true;

    }

  }, 400);

}


/* ========================================
   プロジェクト進捗を更新
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


  /*
    タスクがまだ1個もない場合
  */

  if (tasks.length === 0) {

    setProgressDisplay(0);

    return;

  }


  /*
    完了タスクを数える
  */

  const completedTasks =
    tasks.filter((task) => {

      return getTaskStatus(task) === "complete";

    });


  /*
    完了数 ÷ 全タスク数
  */

  const percent =
    Math.round(
      (completedTasks.length / tasks.length) * 100
    );


  setProgressDisplay(percent);

}


/* ========================================
   進捗表示を書き換える
======================================== */

function setProgressDisplay(percent) {

  const percentText =
    document.getElementById("progress-percent");

  const progressBar =
    document.querySelector(".progress-bar");

  const progressFill =
    document.querySelector(".progress-bar-fill");


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
    current指定が無い場合は、
    最初の未完了マイルストーンを使う
  */

  if (!currentMilestone) {

    currentMilestone =
      [...document.querySelectorAll(".milestone")]
        .find((milestone) => {

          return (
            milestone.dataset.status !== "complete"
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
      milestoneName.textContent.trim();

  }

}


/* ========================================
   今やっているタスク
======================================== */

function updateCurrentTask() {

  const currentTask =
    [...document.querySelectorAll(".task")]
      .find((task) => {

        return getTaskStatus(task) === "current";

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
    currentTask.querySelector(".task-name");


  if (taskName) {

    panelText.textContent =
      taskName.textContent.trim();

  }

}


/* ========================================
   次にやるタスク
======================================== */

function updateNextTask() {

  let nextTask =
    [...document.querySelectorAll(".task")]
      .find((task) => {

        return getTaskStatus(task) === "next";

      });


  /*
    next指定が無い場合は
    最初の未着手タスクを候補にする
  */

  if (!nextTask) {

    nextTask =
      [...document.querySelectorAll(".task")]
        .find((task) => {

          return getTaskStatus(task) === "future";

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
    nextTask.querySelector(".task-name");


  if (taskName) {

    panelText.textContent =
      taskName.textContent.trim();

  }

}


/* ========================================
   タスク状態を取得

   HTMLの data-status と
   CSSクラスの両方を認識する
======================================== */

function getTaskStatus(task) {

  /*
    data-status があれば最優先
  */

  if (task.dataset.status) {

    return task.dataset.status;

  }


  /*
    classから判定
  */

  if (
    task.classList.contains("task-complete")
  ) {

    return "complete";

  }


  if (
    task.classList.contains("task-current")
  ) {

    return "current";

  }


  if (
    task.classList.contains("task-next")
  ) {

    return "next";

  }


  /*
    何も指定されていなければ未着手
  */

  return "future";

}


/* ========================================
   後から他の処理でも
   進捗更新を呼べるようにしておく
======================================== */

window.refreshProjectProgress =
  refreshProjectProgress;
