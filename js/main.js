document.addEventListener("DOMContentLoaded", () => {
    if (window.TQAudio) TQAudio.playBgm("menu");

    const nameInput = document.getElementById("player-name-input");
    if (nameInput && window.TQLeaderboard) {
        nameInput.value = TQLeaderboard.getName() || "";
        const saveName = () => {
            const v = (nameInput.value || "").trim();
            if (v) {
                const cleaned = TQLeaderboard.setName(v);
                nameInput.value = cleaned;
            }
        };
        nameInput.addEventListener("change", saveName);
        nameInput.addEventListener("blur", saveName);
        nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                saveName();
                nameInput.blur();
            }
        });
    }

    const htpBtn = document.getElementById("how-to-play-btn");
    if (htpBtn && window.TQUI) {
        htpBtn.addEventListener("click", () => {
            TQUI.showModal({
                eyebrow: "Tutorial",
                title: "How To Play",
                body: `
                    <ul>
                        <li><strong>Pre-Order:</strong> Root &rarr; Left &rarr; Right</li>
                        <li><strong>In-Order:</strong> Left &rarr; Root &rarr; Right</li>
                        <li><strong>Post-Order:</strong> Left &rarr; Right &rarr; Root</li>
                        <li><strong>Level-Order:</strong> Top to bottom, left to right (BFS)</li>
                    </ul>
                    <p style="margin-top:10px; font-size:9px; color:var(--c-muted);">Classic has worlds &amp; levels. Identify quizzes you on traversals. Build asks you to reconstruct a tree. Speedrun is endless.</p>
                `,
                primary: "Got It"
            });
        });
    }

    const MODE_INFO = {
        classic: {
            eyebrow: "Mode",
            title: "Classic Quest",
            body: "Click the nodes in the named traversal order. Beat every chapter to unlock the next.",
            bullets: [
                "Pick a world, then a level.",
                "Earn 2 stars on 7 of 10 levels to unlock the next chapter.",
                "Tutorials teach you Pre-, In-, Post-, and Level-Order."
            ],
            statLabel: null,
            statKey: null,
            href: "pages/levels.html",
            bgm: "classic"
        },
        identify: {
            eyebrow: "Mode",
            title: "Identify Trial",
            body: "Watch the highlight sequence move across the tree, then pick which traversal you just saw.",
            bullets: [
                "Each level has 5 questions.",
                "Score 80% (4 out of 5) to unlock the next level.",
                "Wrong guess plays a stinger; the correct answer is revealed."
            ],
            statLabel: "Best",
            statKey: "treequest_best_identify",
            href: "pages/trial-levels.html?mode=identify",
            bgm: "identify"
        },
        build: {
            eyebrow: "Mode",
            title: "Build Trial",
            body: "A scrambled set of tiles and an empty tree. Drag each tile to the node where it belongs to match the given traversal sequence.",
            bullets: [
                "Empty slots are dashed; drop tiles on them.",
                "Wrong drops bounce back &mdash; correct drops snap in.",
                "Place every tile to clear the level."
            ],
            statLabel: "Best",
            statKey: "treequest_best_build",
            href: "pages/trial-levels.html?mode=build",
            bgm: "build"
        },
        speedrun: {
            eyebrow: "Mode",
            title: "Speedrun",
            body: "Endless back-to-back trees with one global timer. Click nodes in the named traversal order.",
            bullets: [
                "60 seconds total &mdash; clearing a tree gives you a bonus.",
                "One wrong click ends the run.",
                "Best score persists across sessions."
            ],
            statLabel: "Best",
            statKey: "treequest_speedrun_best",
            href: "pages/game.html?mode=speedrun",
            bgm: "speedrun"
        }
    };

    document.querySelectorAll("[data-mode]").forEach(btn => {
        btn.addEventListener("click", () => openModeLobby(btn.dataset.mode));
    });

    function openModeLobby(mode) {
        const info = MODE_INFO[mode];
        if (!info || !window.TQUI) {
            window.location.href = info ? info.href : "pages/levels.html";
            return;
        }

        const body = document.createElement("div");
        const bodyText = document.createElement("p");
        bodyText.innerHTML = info.body;
        body.appendChild(bodyText);

        if (info.bullets) {
            const ul = document.createElement("ul");
            info.bullets.forEach(b => {
                const li = document.createElement("li");
                li.innerHTML = b;
                ul.appendChild(li);
            });
            body.appendChild(ul);
        }

        let stat = null;
        if (mode === "identify" || mode === "build") {
            const current = parseInt(localStorage.getItem(`treequest_${mode}_current`), 10) || 1;
            const best = parseInt(localStorage.getItem(`treequest_best_${mode}`), 10) || 0;
            stat = `Level: <strong>${current}</strong> &nbsp; Best: <strong>${best}</strong>`;
        } else if (info.statLabel && info.statKey) {
            const best = parseInt(localStorage.getItem(info.statKey), 10) || 0;
            stat = `${info.statLabel}: <strong>${best}</strong>`;
        }

        TQUI.showModal({
            eyebrow: info.eyebrow,
            title: info.title,
            body,
            stat,
            primary: "Play",
            secondary: "Back",
            onPrimary: () => {
                let href = info.href;
                if (mode === "identify" || mode === "build") {
                    const current = parseInt(localStorage.getItem(`treequest_${mode}_current`), 10) || 1;
                    href = `pages/game.html?mode=${mode}&level=${current}`;
                }
                // Start the mode BGM as part of the user's gesture so the next page
                // can resume it without needing another interaction.
                if (window.TQAudio) {
                    TQAudio.playBgm(info.bgm);
                    sessionStorage.setItem("tq_pending_bgm", info.bgm);
                }
                window.location.href = href;
            }
        });
    }
});
