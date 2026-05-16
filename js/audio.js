(function (global) {
    "use strict";

    const BGM_VOLUME = 0.6;
    const SFX_VOLUME = 0.6;

    const SFX_FILES = {
        click:   "click.wav",
        correct: "correct.mp3",
        wrong:   "wrong.mp3",
        win:     "win.mp3",
        lose:    "lose.mp3"
    };

    const BGM_FILES = {
        menu:     "bgm_menu.mp3",
        classic:  "bgm_classic.mp3",
        identify: "bpm_identify.mp3",
        build:    "bgm_build.mp3",
        speedrun: "bgm_speedrun.mp3"
    };

    const BASE = (window.location.pathname.indexOf("/pages/") !== -1)
        ? "../assets/sfx/"
        : "assets/sfx/";

    const sfxCache = {};
    const bgmCache = {};
    let currentBgm = null;
    let currentBgmName = null;
    let pendingBgm = null;
    let unlocked = false;

    function makeSfx(file) {
        const a = new Audio(BASE + file);
        a.preload = "auto";
        a.volume = SFX_VOLUME;
        return a;
    }

    function makeBgm(file) {
        const a = new Audio(BASE + file);
        a.preload = "auto";
        a.loop = true;
        a.volume = BGM_VOLUME;
        return a;
    }

    function getSfx(name) {
        if (!SFX_FILES[name]) return null;
        if (!sfxCache[name]) sfxCache[name] = makeSfx(SFX_FILES[name]);
        return sfxCache[name];
    }

    function getBgm(name) {
        if (!BGM_FILES[name]) return null;
        if (!bgmCache[name]) bgmCache[name] = makeBgm(BGM_FILES[name]);
        return bgmCache[name];
    }

    function playSfx(name) {
        const original = getSfx(name);
        if (!original) return;
        // Clone so rapid repeats overlap cleanly
        const node = original.cloneNode(true);
        node.volume = SFX_VOLUME;
        node.play().catch(() => { /* ignore — likely blocked before first gesture */ });
    }

    function stopBgm() {
        if (currentBgm) {
            try { currentBgm.pause(); currentBgm.currentTime = 0; } catch (_) {}
        }
        currentBgm = null;
        currentBgmName = null;
    }

    function playBgm(name) {
        if (name === currentBgmName && currentBgm && !currentBgm.paused) return;
        stopBgm();
        const track = getBgm(name);
        if (!track) return;
        currentBgm = track;
        currentBgmName = name;
        track.volume = BGM_VOLUME;
        // Resume from saved offset if same track was just playing on previous page
        const savedTime = parseFloat(sessionStorage.getItem("tq_bgm_time_" + name));
        track.currentTime = (!isNaN(savedTime) && savedTime > 0) ? savedTime : 0;
        sessionStorage.removeItem("tq_bgm_time_" + name);
        const p = track.play();
        if (p && typeof p.catch === "function") {
            p.catch(() => {
                pendingBgm = name;
                queueUnlock();
            });
        }
    }

    window.addEventListener("pagehide", () => {
        if (currentBgm && currentBgmName && !currentBgm.paused) {
            sessionStorage.setItem("tq_bgm_time_" + currentBgmName, String(currentBgm.currentTime));
        }
    });

    const pending = sessionStorage.getItem("tq_pending_bgm");
    if (pending) {
        sessionStorage.removeItem("tq_pending_bgm");
        playBgm(pending);
    }

    // Inject a "rotate device" overlay (CSS controls when it's shown)
    function ensureRotateOverlay() {
        if (document.querySelector(".tq-rotate-overlay")) return;
        const overlay = document.createElement("div");
        overlay.className = "tq-rotate-overlay";
        overlay.innerHTML =
            '<div class="tq-rotate-overlay__inner">' +
            '  <div class="tq-rotate-overlay__icon">&#9696;</div>' +
            '  <div class="tq-rotate-overlay__title">Rotate Your Device</div>' +
            '  <div class="tq-rotate-overlay__sub">TreeQuest plays best in landscape. Turn your phone sideways.</div>' +
            '</div>';
        document.body.appendChild(overlay);
    }
    if (document.body) ensureRotateOverlay();
    else document.addEventListener("DOMContentLoaded", ensureRotateOverlay);

    function queueUnlock() {
        if (unlocked) return;
        const handler = () => {
            unlocked = true;
            document.removeEventListener("pointerdown", handler);
            document.removeEventListener("keydown", handler);
            if (pendingBgm) {
                const name = pendingBgm;
                pendingBgm = null;
                playBgm(name);
            }
        };
        document.addEventListener("pointerdown", handler, { once: true });
        document.addEventListener("keydown", handler, { once: true });
    }

    // Global click SFX on .nes-btn / .mode-tile (delegated)
    document.addEventListener("pointerdown", (e) => {
        if (!e.target || !e.target.closest) return;
        const target = e.target.closest(".nes-btn, .mode-tile");
        if (target && !target.disabled) {
            playSfx("click");
        }
    });

    global.TQAudio = {
        playSfx,
        playBgm,
        stopBgm,
        BGM_VOLUME,
        SFX_VOLUME
    };
})(window);
