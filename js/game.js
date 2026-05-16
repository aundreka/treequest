document.addEventListener("DOMContentLoaded", () => {
    const PROGRESS_KEY = "treequest_progress";
    const ACHIEVEMENT_KEY = "treequest_achievements";
    const SCHEMA_KEY = "treequest_schema_v";
    const SPEEDRUN_BEST_KEY = "treequest_speedrun_best";

    // One-time migration: drop the now-stale traversals map
    if (localStorage.getItem(SCHEMA_KEY) !== "2") {
        localStorage.removeItem("treequest_traversals");
        localStorage.setItem(SCHEMA_KEY, "2");
    }

    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedLevel = params.get("level");
    const levelId = (function () {
        const fromUrl = parseInt(requestedLevel, 10);
        if (fromUrl) return fromUrl;
        if (requestedMode === "identify" || requestedMode === "build") {
            return parseInt(localStorage.getItem(`treequest_${requestedMode}_current`), 10) || 1;
        }
        return 1;
    })();

    function saveModeBest(cfg, extra) {
        if (!cfg) return;
        if (cfg.mode === "identify" || cfg.mode === "build") {
            const stars = calculateStars();
            const progKey = `treequest_${cfg.mode}_progress`;
            const currentKey = `treequest_${cfg.mode}_current`;
            const bestKey = `treequest_best_${cfg.mode}`;

            const progress = JSON.parse(localStorage.getItem(progKey)) || {};
            const prev = progress[cfg.id] || { score: 0, stars: 0 };
            progress[cfg.id] = {
                score: Math.max(state.score, prev.score),
                stars: Math.max(stars, prev.stars)
            };
            localStorage.setItem(progKey, JSON.stringify(progress));

            // Only advance current level when the run passed.
            // Identify uses the explicit identifyPassed flag from the mode.
            const passed = (cfg.mode === "identify")
                ? !!(extra && extra.identifyPassed)
                : true; // build advances on full completion (which only happens if all tiles correct)
            if (passed) {
                const current = parseInt(localStorage.getItem(currentKey), 10) || 1;
                if (cfg.id >= current) {
                    localStorage.setItem(currentKey, String(cfg.id + 1));
                }
            }

            const prevBest = parseInt(localStorage.getItem(bestKey), 10) || 0;
            if (state.score > prevBest) localStorage.setItem(bestKey, String(state.score));

            if (window.TQLeaderboard) {
                TQLeaderboard.submit(cfg.mode, state.score);
            }
        } else if (cfg.mode === "classic") {
            if (window.TQLeaderboard) TQLeaderboard.submit("classic", state.score);
        }
    }

    const els = {
        eyebrow: document.getElementById("game-eyebrow"),
        title: document.getElementById("level-title"),
        traversal: document.getElementById("traversal-indicator"),
        timer: document.getElementById("timer"),
        scoreChip: document.getElementById("score-chip"),
        restartBtn: document.getElementById("restart-btn"),
        svg: document.getElementById("tree-svg"),
        instructions: document.getElementById("instructions"),
        feedback: document.getElementById("feedback"),
        choiceButtons: document.getElementById("choice-buttons"),
        tileBank: document.getElementById("tile-bank"),
        speedrunHud: document.getElementById("speedrun-hud"),
        speedrunRound: document.getElementById("speedrun-round"),
        speedrunBest: document.getElementById("speedrun-best")
    };

    const state = {
        score: 0,
        combo: 1,
        mistakes: 0,
        timeRemaining: Infinity,
        timerInterval: null,
        config: null,
        tree: null,
        modeName: null,
        completed: false
    };

    function resetHUD() {
        state.score = 0;
        state.combo = 1;
        state.mistakes = 0;
        state.completed = false;
        updateScoreChip();
        if (els.feedback) els.feedback.textContent = "";
        if (els.choiceButtons) { els.choiceButtons.innerHTML = ""; els.choiceButtons.hidden = true; }
        if (els.tileBank) { els.tileBank.innerHTML = ""; els.tileBank.hidden = true; }
        if (els.speedrunHud) els.speedrunHud.hidden = true;
        clearInterval(state.timerInterval);
        const oldTry = document.querySelector(".try-again-btn");
        if (oldTry) oldTry.remove();
    }

    function updateScoreChip() {
        if (els.scoreChip) els.scoreChip.textContent = `Score: ${state.score}`;
    }

    function startTimer(seconds, onTimeout) {
        clearInterval(state.timerInterval);
        if (!isFinite(seconds)) {
            els.timer.style.display = "none";
            return;
        }
        els.timer.style.display = "block";
        state.timeRemaining = seconds;
        els.timer.textContent = `Time: ${state.timeRemaining}s`;
        state.timerInterval = setInterval(() => {
            state.timeRemaining--;
            els.timer.textContent = `Time: ${state.timeRemaining}s`;
            if (state.timeRemaining <= 0) {
                clearInterval(state.timerInterval);
                if (typeof onTimeout === "function") onTimeout();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(state.timerInterval);
    }

    function calculateStars() {
        if (state.mistakes === 0) return 3;
        if (state.mistakes <= 2) return 2;
        return 1;
    }

    function saveProgress(cfg) {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
        const stars = calculateStars();
        const prev = saved[cfg.id] || { score: 0, stars: 0 };
        saved[cfg.id] = {
            score: Math.max(state.score, prev.score),
            stars: Math.max(stars, prev.stars)
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(saved));

        if (state.mistakes === 0) unlockAchievement("Flawless Victory");
        if (cfg.timeLimit !== Infinity && state.timeRemaining > 10) unlockAchievement("Speed Runner");
        if (cfg.isBoss) unlockAchievement(`Boss Slayer: ${cfg.chapterName}`);
    }

    function unlockAchievement(name) {
        const list = JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY)) || [];
        if (!list.includes(name)) {
            list.push(name);
            localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(list));
            queueFeedback(`Achievement: ${name}!`);
        }
    }

    function queueFeedback(message) {
        if (!els.feedback) return;
        const original = els.feedback.textContent;
        els.feedback.textContent = message;
        setTimeout(() => {
            if (els.feedback.textContent === message) els.feedback.textContent = original;
        }, 1800);
    }

    function showTryAgain() {
        TQUI.showModal({
            eyebrow: "Time's Up",
            title: "Quest Failed",
            body: `You ran out of time. Score so far: <strong>${state.score}</strong>`,
            primary: "Try Again",
            secondary: "Back to Menu",
            onPrimary: () => location.reload(),
            onSecondary: () => { window.location.href = "../index.html"; }
        });
    }

    function hooksFor(cfg) {
        return {
            onCorrect: (delta) => {
                const d = typeof delta === "number" ? delta : 10 * state.combo;
                state.score += d;
                state.combo++;
                updateScoreChip();
                if (window.TQAudio) TQAudio.playSfx("correct");
            },
            onWrong: (penalty) => {
                const p = typeof penalty === "number" ? penalty : 5;
                state.score = Math.max(0, state.score - p);
                state.combo = 1;
                state.mistakes++;
                updateScoreChip();
                if (window.TQAudio) TQAudio.playSfx("wrong");
            },
            onComplete: (extra) => {
                if (state.completed) return;
                state.completed = true;
                stopTimer();
                if (cfg) saveProgress(cfg);
                if (window.TQLeaderboard && !TQLeaderboard.getName()) {
                    TQLeaderboard.ensureName().then(() => saveModeBest(cfg, extra));
                } else {
                    saveModeBest(cfg, extra);
                }

                const isIdentify = cfg && cfg.mode === "identify";
                const identifyFailed = isIdentify && extra && extra.identifyPassed === false;
                if (!identifyFailed) celebrateWin();
                if (window.TQAudio) TQAudio.playSfx(identifyFailed ? "lose" : "win");

                const stars = calculateStars();
                const star = "★".repeat(stars) + "☆".repeat(3 - stars);
                const next = cfg ? cfg.id + 1 : null;
                const modeQs = cfg && cfg.mode !== "classic" ? `&mode=${cfg.mode}` : "";

                let modalEyebrow, modalTitle, modalBody, primary, primaryAction;
                if (isIdentify) {
                    const c = extra ? extra.correctCount : 0;
                    const t = extra ? extra.totalQuestions : 0;
                    const pct = t ? Math.round((c / t) * 100) : 0;
                    if (extra && extra.identifyPassed) {
                        modalEyebrow = "Level Passed";
                        modalTitle = `${c}/${t} Correct (${pct}%)`;
                        modalBody = `You hit the 80% mark with <strong>${state.score} points</strong>! Next level unlocked.`;
                        primary = "Next Level";
                        primaryAction = () => { if (next) window.location.href = `game.html?level=${next}${modeQs}`; };
                    } else {
                        modalEyebrow = "Level Failed";
                        modalTitle = `${c}/${t} Correct (${pct}%)`;
                        modalBody = `You need <strong>80%</strong> to advance. Try this level again.`;
                        primary = "Retry";
                        primaryAction = () => location.reload();
                    }
                    els.feedback.innerHTML = modalBody;
                } else {
                    modalEyebrow = "Quest Complete";
                    modalTitle = `${star}  Score ${state.score}`;
                    modalBody = `You finished with <strong>${state.score} points</strong> and <strong>${stars} star${stars === 1 ? "" : "s"}</strong>!`;
                    primary = "Next Level";
                    primaryAction = () => { if (next) window.location.href = `game.html?level=${next}${modeQs}`; };
                    els.feedback.innerHTML = `Level Complete! ${star} &mdash; Score ${state.score}`;
                }

                setTimeout(() => {
                    TQUI.showModal({
                        eyebrow: modalEyebrow,
                        title: modalTitle,
                        body: modalBody,
                        primary,
                        secondary: "Back to Menu",
                        onPrimary: primaryAction,
                        onSecondary: () => { window.location.href = "../index.html"; }
                    });
                }, 600);
            },
            onTimeout: () => {
                els.feedback.textContent = "Time's up! Level failed.";
                els.svg.querySelectorAll(".tree-node").forEach(n => n.classList.add("wrong"));
                if (window.TQAudio) TQAudio.playSfx("lose");
                showTryAgain();
            },
            queueFeedback
        };
    }

    function setHeader(cfg) {
        const modeLabel = (TQLevels.MODE_LABELS[cfg.mode] || cfg.mode).toUpperCase();
        els.eyebrow.textContent = `${modeLabel} MODE`;

        let title;
        if (cfg.isTutorial) {
            title = `Tutorial - ${TQLevels.TRAVERSAL_LABELS[cfg.traversal]}`;
        } else if (cfg.isBoss) {
            title = `${cfg.chapterName} - Boss`;
        } else if (cfg.mode === "classic") {
            title = `${cfg.chapterName} - Level ${cfg.positionInChapter}`;
        } else {
            title = `Level ${cfg.id}`;
        }
        els.title.textContent = title;

        els.traversal.classList.remove("traversal-badge--hidden");
        if (cfg.mode === "identify") {
            els.traversal.textContent = "Traversal: ???";
            els.traversal.classList.add("traversal-badge--hidden");
        } else {
            els.traversal.textContent = `Traversal: ${TQLevels.TRAVERSAL_LABELS[cfg.traversal]}`;
        }
        setBodyMode(cfg.mode);
    }

    function setBodyMode(mode) {
        document.body.classList.remove("mode-classic", "mode-identify", "mode-build", "mode-speedrun");
        document.body.classList.add(`mode-${mode}`);
    }

    function celebrateWin() {
        if (!els.svg) return;
        const nodes = els.svg.querySelectorAll(".tree-node");
        nodes.forEach((n, i) => {
            setTimeout(() => {
                n.classList.add("win-celebrate");
                setTimeout(() => n.classList.remove("win-celebrate"), 600);
            }, i * 40);
        });
    }

    function runLevel() {
        resetHUD();
        const cfg = TQLevels.getLevelConfig(levelId);
        // URL override of mode (allows replay of same level in different mode)
        if (requestedMode && TQLevels.MODES.indexOf(requestedMode) !== -1) {
            cfg.mode = requestedMode;
        }
        state.config = cfg;
        state.modeName = cfg.mode;

        const rng = TQTree.mulberry32(cfg.seed);
        const tree = TQTree.generateRandomTree(cfg.size, rng);
        state.tree = tree;

        setHeader(cfg);

        const modeImpl = window.TQModes && window.TQModes[cfg.mode];
        if (!modeImpl) {
            els.feedback.textContent = `Mode "${cfg.mode}" not available.`;
            return;
        }

        modeImpl.run({
            cfg,
            tree,
            svg: els.svg,
            els,
            hooks: hooksFor(cfg),
            startTimer,
            stopTimer
        });

        if (window.TQAudio) TQAudio.playBgm(cfg.mode);

        els.restartBtn.style.display = cfg.isTutorial ? "none" : "inline-block";
    }

    function runSpeedrun() {
        resetHUD();
        setBodyMode("speedrun");
        els.eyebrow.textContent = "SPEEDRUN MODE";
        els.title.textContent = "Endless Run";
        els.traversal.classList.remove("traversal-badge--hidden");
        els.traversal.textContent = "Traversal: varies";

        const speedrun = window.TQModes && window.TQModes.speedrun;
        if (!speedrun) {
            els.feedback.textContent = "Speedrun mode not available.";
            return;
        }
        els.speedrunHud.hidden = false;
        els.speedrunBest.textContent = localStorage.getItem(SPEEDRUN_BEST_KEY) || "0";
        if (window.TQAudio) TQAudio.playBgm("speedrun");
        speedrun.run({
            els,
            svg: els.svg,
            startTimer,
            stopTimer,
            saveBest: (score) => {
                const best = parseInt(localStorage.getItem(SPEEDRUN_BEST_KEY), 10) || 0;
                if (score > best) {
                    localStorage.setItem(SPEEDRUN_BEST_KEY, String(score));
                    els.speedrunBest.textContent = String(score);
                    unlockAchievement("Speedrun Champion");
                }
                if (window.TQLeaderboard) TQLeaderboard.submit("speedrun", score);
            },
            queueFeedback
        });
    }

    els.restartBtn.addEventListener("click", () => {
        if (requestedMode === "speedrun") {
            runSpeedrun();
        } else {
            runLevel();
        }
    });

    if (requestedMode === "speedrun") {
        runSpeedrun();
    } else {
        runLevel();
    }
});
