/* =============================================================================
 * business-dashboard — src/services/app.js
 *
 * 패치 내용 (UI 개선패치 2)
 * 1) 잠금(자물쇠)은 삭제 방지 전용으로 동작. 내용은 항상 보이고 언제든 수정 가능.
 * 2) 소항목/과업 추가 시 클릭 1회당 1행만 생성. 중복 바인딩/버블링으로 인한 다중 생성 방지.
 *
 * 기존 기능 유지:
 * - 자물쇠/휴지통 시각 상태 동기화(잠금=휴지통 연함, 자물쇠 진함 / 해제=반대)
 * - 카테고리/일지 헤더 삭제 시 다음 동일 섹션 헤더 전까지 하위 항목 일괄 삭제
 * - 삭제 후 번호 재정렬
 * ===========================================================================*/

(function (global) {
  "use strict";

  // 컨테이너 중복 바인딩 방지용 심볼
  const BIND_KEY = Symbol("bindCommonHandlers");

  // ---- 유틸: 행 타입 판별 ---------------------------------------------------
  function isCategoryRow(row) {
    if (!row) return false;
    const cls = row.className || "";
    // 예: plan-category, roadmap-category 등 "category" 토큰 포함
    return /(^|\s)category(\s|$)/.test(cls) || /category/.test(cls);
  }

  function isJournalHeaderRow(row) {
    if (!row) return false;
    return row.classList.contains("journal-entry-header");
  }

  // ---- UI 상태 동기화 -------------------------------------------------------
  function syncRowUI(row) {
    if (!row) return;
    const locked = row.dataset.locked === "1";
    const lockBtn = row.querySelector(".lock-btn");
    const delBtn = row.querySelector(".delete-btn");

    // 자물쇠/휴지통 시각 상태 (해제시 unlocked 클래스 ON)
    if (lockBtn) lockBtn.classList.toggle("unlocked", !locked);

    if (delBtn) {
      delBtn.classList.toggle("unlocked", !locked);
      delBtn.setAttribute("aria-disabled", locked ? "true" : "false");
      // 삭제 금지: 시각/행동 일치
      if (locked) {
        delBtn.style.pointerEvents = "none";
        delBtn.style.opacity = "0.35";
      } else {
        delBtn.style.pointerEvents = "";
        delBtn.style.opacity = "";
      }
    }

    // 🔒 잠금은 "삭제 방지" 전용 → 내용은 항상 보이고 언제나 수정 가능
    row.querySelectorAll("[contenteditable]").forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.removeAttribute("aria-hidden");
      el.style.visibility = "";
      el.style.opacity = "";
    });
  }

  function syncAllRows(editorEl) {
    editorEl.querySelectorAll("tr").forEach(syncRowUI);
  }

  // ---- 섹션(카테고리/일지 헤더) 삭제: 하위 묶음 동시 제거 --------------------
  function deleteSectionRows(startRow) {
    if (!startRow) return;

    let cur = startRow.nextElementSibling;
    const isCat = isCategoryRow(startRow);
    const isHdr = isJournalHeaderRow(startRow);

    // 기준 행 먼저 삭제
    startRow.remove();

    if (isCat) {
      // 다음 카테고리 전까지 모두 삭제
      while (cur && !isCategoryRow(cur)) {
        const next = cur.nextElementSibling;
        cur.remove();
        cur = next;
      }
    } else if (isHdr) {
      // 다음 일지 헤더 전까지 모두 삭제
      while (cur && !isJournalHeaderRow(cur)) {
        const next = cur.nextElementSibling;
        cur.remove();
        cur = next;
      }
    }
  }

  // ---- 행 복제/삽입 (소항목·과업 추가용, 1회 클릭 = 1행 생성) ---------------
  function cleanClonedRow(clone, { type } = {}) {
    // 삭제 가능 상태로 초기화
    clone.dataset.locked = "0";

    // 카테고리/일지 헤더에서 "소항목/과업 추가" 시에는 일반 아이템으로 강등
    if (type === "subitem" || type === "task") {
      clone.classList.remove("journal-entry-header");
      // className에서 category 토큰 제거
      clone.className = clone.className
        .split(/\s+/)
        .filter((cls) => cls && !/category/.test(cls))
        .join(" ") || "draggable-item";
    }

    // 내용 초기화
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.innerHTML = "";
      el.setAttribute("contenteditable", "true");
    });
    clone.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
      // ID/NAME 중복 방지
      el.removeAttribute("id");
      el.removeAttribute("name");
    });

    // 행 id 및 내부 data-id 정리
    if (clone.id) clone.id = "";
    clone.querySelectorAll("[data-id]").forEach((el) =>
      el.removeAttribute("data-id")
    );

    // 시각 상태 반영
    syncRowUI(clone);
    return clone;
  }

  function insertRowBelow(row, { type } = {}) {
    const newRow = row.cloneNode(true);
    cleanClonedRow(newRow, { type });
    row.parentNode.insertBefore(newRow, row.nextElementSibling);
    return newRow;
  }

  // ---- 번호 재정렬(선택사항) -------------------------------------------------
  function updateNumbering(editorEl) {
    let n = 1;
    editorEl.querySelectorAll("tr").forEach((tr) => {
      if (isCategoryRow(tr) || isJournalHeaderRow(tr)) return;
      const numCell = tr.querySelector(".number, .number-cell, [data-number]");
      if (numCell) numCell.textContent = String(n++);
    });
  }

  // ---- 공통 핸들러 바인딩 (중복 바인딩 방지) ---------------------------------
  function bindCommonHandlers(docId, editorEl, feature) {
    if (!editorEl) return;

    // 같은 컨테이너에 1회만 바인딩
    if (editorEl[BIND_KEY]) return;
    editorEl[BIND_KEY] = true;

    // 초기 동기화
    syncAllRows(editorEl);

    editorEl.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest(
          'button, [role="button"], .control-btn, .lock-btn, .delete-btn'
        );
        if (!btn || !editorEl.contains(btn)) return;

        const row = btn.closest("tr");
        if (!row) return;

        let didMutate = false;

        // 1) 잠금 토글 (삭제 방지 전용)
        if (btn.classList.contains("lock-btn")) {
          const nowLocked = row.dataset.locked === "1" ? false : true;
          row.dataset.locked = nowLocked ? "1" : "0";
          // 내용 편집/표시 상태는 건드리지 않음
          syncRowUI(row);
          didMutate = true;
        }

        // 2) 소항목/과업 추가 (1회 클릭 = 1행)
        const isAddBtn =
          btn.classList.contains("add-subitem-btn") ||
          btn.classList.contains("add-task-btn") ||
          btn.dataset.action === "add-subitem" ||
          btn.dataset.action === "add-task";

        if (isAddBtn) {
          e.preventDefault();
          e.stopPropagation();

          // 버튼 단위 busy 가드로 다중 생성 방지
          if (btn.dataset.busy === "1") return;
          btn.dataset.busy = "1";
          setTimeout(() => {
            btn.dataset.busy = "0";
          }, 120); // 짧은 타임박스

          const type =
            btn.classList.contains("add-task-btn") ||
            btn.dataset.action === "add-task"
              ? "task"
              : "subitem";

          const newRow = insertRowBelow(row, { type });
          didMutate = true;

          // UX: 새 행의 첫 편집 가능한 셀에 포커스
          const firstEditable = newRow.querySelector(
            "[contenteditable], input, textarea, select"
          );
          if (firstEditable) {
            if (
              firstEditable.getAttribute("contenteditable") &&
              firstEditable.getAttribute("contenteditable") !== "false"
            ) {
              const range = document.createRange();
              range.selectNodeContents(firstEditable);
              range.collapse(false);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              firstEditable.focus();
            } else {
              firstEditable.focus();
            }
          }
        }

        // 3) 삭제 (섹션 헤더면 하위 묶음 포함)
        if (btn.classList.contains("delete-btn")) {
          e.preventDefault();
          // 잠금 상태면 삭제 불가
          if (row.dataset.locked === "1") return;

          if (isCategoryRow(row) || isJournalHeaderRow(row)) {
            deleteSectionRows(row);
          } else {
            row.remove();
          }
          didMutate = true;
        }

        if (didMutate) {
          updateNumbering(editorEl);
          // 선택적 외부 훅
          try {
            if (typeof feature?.onChange === "function") feature.onChange();
            if (typeof feature?.autosave === "function") feature.autosave();
          } catch (_) {}
        }
      },
      true // 캡처 단계에서 한 번만 처리 → 버블링 중복 처리 예방
    );
  }

  // ---- 자동 바인딩(옵션) -----------------------------------------------------
  function auto() {
    const editorEl = document.querySelector(
      "[data-editor-root], .editor-root, table.editor, .dashboard-editor"
    );
    if (editorEl) {
      bindCommonHandlers("auto", editorEl, {});
    }
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", auto, { once: true });
    } else {
      auto();
    }
  }

  // ---- 공개 API --------------------------------------------------------------
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      bindCommonHandlers,
      syncRowUI,
      syncAllRows,
      deleteSectionRows,
      insertRowBelow,
      updateNumbering,
    };
  } else {
    global.bindCommonHandlers = bindCommonHandlers;
  }
})(typeof window !== "undefined" ? window : globalThis);
