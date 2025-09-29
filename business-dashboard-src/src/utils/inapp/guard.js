// src/utils/inapp/guard.js
// 인앱 브라우저 감지 + 시스템 브라우저로 열기 안내 모듈 (ES Module)
// - index.html에서 직접 script 태그로 불러오는 대신, src/main.js에서 import/호출

export function bootInAppGuard(options = {}) {
  const defaults = { loginPath: "/login", homeUrl: location.href, forceShow: false };
  const opts = { ...defaults, ...options };
  const ctx = detectInApp();
  if (!ctx.inapp && !opts.forceShow) return;
  const vendorName = pickVendorName(ctx);
  buildModal(vendorName, opts);
}

function detectInApp() {
  const ua = navigator.userAgent || "";
  const vendors = {
    kakao: /KAKAOTALK/i.test(ua),
    naver: /NAVER\(inapp;|NAVER/i.test(ua),
    instagram: /Instagram/i.test(ua),
    facebook: /FBAN|FBAV|FB_IAB/i.test(ua),
    line: /Line/i.test(ua),
    wechat: /MicroMessenger/i.test(ua)
  };
  const inapp = Object.values(vendors).some(Boolean);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  return { inapp, vendors, ios, android, ua };
}

function pickVendorName(ctx) {
  for (const k of Object.keys(ctx.vendors)) {
    if (ctx.vendors[k]) return k;
  }
  return "in-app";
}

function openInSystemBrowser(url, ctx) {
  try {
    if (ctx.android) {
      location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    } else if (ctx.ios) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      location.href = url;
    }
  } catch (_) {
    location.href = url;
  }
}

function buildModal(vendorName, opts) {
  const overlay = document.createElement("div");
  overlay.id = "iab-modal";
  overlay.setAttribute("data-vendor", vendorName);
  overlay.setAttribute("role", "dialog");
  overlay.style.cssText = [
    "position:fixed","inset:0","background:rgba(0,0,0,.6)",
    "display:flex","align-items:center","justify-content:center",
    "z-index:99999"
  ].join(";");

  const box = document.createElement("div");
  box.style.cssText = [
    "background:#fff","max-width:480px","width:90%","padding:20px",
    "border-radius:12px","box-shadow:0 10px 24px rgba(0,0,0,.2)",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  ].join(";");

  box.innerHTML = [
    '<h3 style="margin:0 0 8px 0;font-size:18px;">안전한 로그인을 위해 시스템 브라우저로 열기</h3>',
    `<p style="margin:0 0 12px 0;font-size:14px;color:#333;">현재 <strong>${vendorName}</strong> 내장 브라우저에서 접속했습니다. 로그인/결제 문제가 발생할 수 있습니다.</p>`,
    '<div style="display:flex;gap:8px;justify-content:flex-end;">',
    '  <button id="iab-continue" style="padding:10px 14px;border:1px solid #e5e5e5;background:#f7f7f7;border-radius:8px;font-size:14px;">계속 보기</button>',
    '  <button id="iab-open" style="padding:10px 14px;border:0;background:#111;color:#fff;border-radius:8px;font-size:14px;">시스템 브라우저로 열기</button>',
    '</div>',
    '<div style="margin-top:12px;font-size:12px;color:#666;line-height:1.4;">안드로이드: 크롬으로 이동. iOS: 공유 버튼 → Safari에서 열기 권장.</div>'
  ].join("");

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const ctx = detectInApp();
  document.getElementById("iab-open")?.addEventListener("click", () => openInSystemBrowser(opts.homeUrl, ctx));
  document.getElementById("iab-continue")?.addEventListener("click", () => {
    overlay.remove();
    if (location.pathname.startsWith(opts.loginPath)) {
      // 필요 시 경고 표시 가능
      // alert("인앱에서는 로그인이 원활하지 않을 수 있습니다. 문제가 발생하면 시스템 브라우저로 다시 시도하세요.");
    }
  });
}
