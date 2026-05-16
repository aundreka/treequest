document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "build" ? "build" : "identify";

    const eyebrowEl = document.getElementById("trial-eyebrow");
    const titleEl = document.getElementById("trial-title");
    const subheadEl = document.getElementById("trial-subhead");
    const headingEl = document.getElementById("trial-levels-heading");
    const container = document.getElementById("trial-levels-container");

    const labels = {
        identify: {
            eyebrow: "IDENTIFY MODE",
            title: "Identify Trial",
            subhead: "Each level has 5 questions. Get 80% correct to unlock the next.",
            heading: "Trial Levels"
        },
        build: {
            eyebrow: "BUILD MODE",
            title: "Build Trial",
            subhead: "Drag tiles into the correct slots to clear each level.",
            heading: "Trial Levels"
        }
    };
    const cfgLabels = labels[mode];
    eyebrowEl.textContent = cfgLabels.eyebrow;
    titleEl.textContent = cfgLabels.title;
    subheadEl.textContent = cfgLabels.subhead;
    headingEl.textContent = cfgLabels.heading;

    if (window.TQAudio) TQAudio.playBgm(mode);

    const TOTAL_LEVELS = 30;
    const progressKey = `treequest_${mode}_progress`;
    const currentKey = `treequest_${mode}_current`;

    const progress = JSON.parse(localStorage.getItem(progressKey)) || {};
    const currentLevel = parseInt(localStorage.getItem(currentKey), 10) || 1;

    container.innerHTML = "";
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        const data = progress[i] || { score: 0, stars: 0 };
        const unlocked = i <= currentLevel;
        const isCurrent = i === currentLevel;
        const card = document.createElement("article");
        card.className = "level-card trial-level-card";
        if (!unlocked) card.classList.add("locked");
        if (isCurrent) card.classList.add("is-current");
        card.innerHTML = `
            <div class="level-card__header">
                <p class="level-card__label">Level ${i}</p>
                ${isCurrent ? '<p class="level-card__mode">CURRENT</p>' : ''}
            </div>
            <div class="level-card__meta">
                <span class="level-card__stars">${"★".repeat(data.stars)}${"☆".repeat(3 - data.stars)}</span>
                <span class="level-card__score">${data.score}</span>
            </div>
            <button class="nes-btn ${unlocked ? "" : "is-locked"}" ${unlocked ? "" : "disabled"} type="button">
                ${unlocked ? "Play" : "Locked"}
            </button>
        `;
        if (unlocked) {
            card.querySelector("button").addEventListener("click", () => {
                if (window.TQAudio) sessionStorage.setItem("tq_pending_bgm", mode);
                window.location.href = `game.html?mode=${mode}&level=${i}`;
            });
        }
        container.appendChild(card);
    }
});
