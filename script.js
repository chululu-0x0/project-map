/* ========================================
   Project Map
   マイルストーン展開 / 折りたたみ
======================================== */

document.addEventListener("DOMContentLoaded", () => {

  const milestones = document.querySelectorAll(".milestone");

  milestones.forEach((milestone) => {

    const button = milestone.querySelector(".milestone-button");
    const branch = milestone.querySelector(".task-branch");

    // タスクを持たない場合は何もしない
    if (!button || !branch) return;


    /* ========================================
       初期状態
    ======================================== */

    const isExpanded =
      button.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
      branch.hidden = false;

      requestAnimationFrame(() => {
        branch.classList.add("is-open");
      });
    }


    /* ========================================
       マイルストーンをクリック
    ======================================== */

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

});


/* ========================================
   開く
======================================== */

function openBranch(button, branch) {

  button.setAttribute(
    "aria-expanded",
    "true"
  );

  // hiddenを解除してから
  // アニメーション開始
  branch.hidden = false;

  requestAnimationFrame(() => {

    requestAnimationFrame(() => {
      branch.classList.add("is-open");
    });

  });

}


/* ========================================
   閉じる
======================================== */

function closeBranch(button, branch) {

  button.setAttribute(
    "aria-expanded",
    "false"
  );

  branch.classList.remove("is-open");


  /*
    CSSアニメーションが終わってから
    完全に非表示にする
  */

  const onTransitionEnd = (event) => {

    // task-branch自身のアニメーションだけを見る
    if (event.target !== branch) return;

    branch.hidden = true;

    branch.removeEventListener(
      "transitionend",
      onTransitionEnd
    );

  };

  branch.addEventListener(
    "transitionend",
    onTransitionEnd
  );

}
