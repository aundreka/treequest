document.addEventListener("DOMContentLoaded", () => {
    const PROGRESS_KEY = "treequest_progress";
    const ACHIEVEMENT_KEY = "treequest_achievements";
    const SCHEMA_KEY = "treequest_schema_v";

    // One-time migration
    if (localStorage.getItem(SCHEMA_KEY) !== "2") {
        localStorage.removeItem("treequest_traversals");
        localStorage.setItem(SCHEMA_KEY, "2");
    }

    const worldsContainer = document.getElementById("worlds-container");
    const chapterPanel = document.getElementById("chapter-levels-panel");
    const chapterTitle = document.getElementById("chapter-levels-title");
    const chapterLevels = document.getElementById("chapter-levels");
    const closeBtn = document.getElementById("close-chapter-btn");
    const achievementsList = document.getElementById("achievements-list");

    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};

    function highestUnlockedChapter() {
        let i = 0;
        while (TQLevels.isChapterUnlocked(i, progress)) {
            i++;
            if (i > 100) break;
        }
        return Math.max(0, i - 1);
    }

    function totalChaptersToShow() {
        return Math.max(6, highestUnlockedChapter() + 2);
    }

    function chapterStars(chapterIdx) {
        const start = chapterIdx * 10 + 1;
        const end = chapterIdx * 10 + 10;
        let total = 0;
        for (let i = start; i <= end; i++) {
            const data = progress[i];
            if (data && data.stars) total += data.stars;
        }
        return total;
    }

    function renderWorlds() {
        worldsContainer.innerHTML = "";
        const count = totalChaptersToShow();
        for (let i = 0; i < count; i++) {
            const meta = TQLevels.getChapterMeta(i);
            const unlocked = TQLevels.isChapterUnlocked(i, progress);
            const stars = chapterStars(i);
            const card = document.createElement("article");
            card.className = "world-card";
            if (!unlocked) card.classList.add("locked");
            card.innerHTML = `
                <div class="world-art" style="filter: hue-rotate(${meta.artHue}deg);">
                    <img src="../assets/tree-decoration.svg" alt="" aria-hidden="true">
                </div>
                <div class="world-info">
                    <p class="world-index">World ${i + 1}</p>
                    <h3 class="world-title">${meta.name}</h3>
                    <p class="world-range">Levels ${meta.levelStart} – ${meta.levelEnd}</p>
                    <p class="world-stars"><span class="star-icon">★</span> ${stars}<span class="star-total">/30</span></p>
                    <button class="nes-btn ${unlocked ? "" : "is-locked"}" type="button" ${unlocked ? "" : "disabled"}>
                        ${unlocked ? "Enter" : "Locked"}
                    </button>
                </div>
            `;
            if (unlocked) {
                card.querySelector("button").addEventListener("click", () => openChapter(i));
            }
            worldsContainer.appendChild(card);
        }
    }

    function openChapter(idx) {
        const meta = TQLevels.getChapterMeta(idx);
        chapterTitle.textContent = `${meta.name} — Levels ${meta.levelStart}–${meta.levelEnd}`;
        chapterLevels.innerHTML = "";
        for (let i = meta.levelStart; i <= meta.levelEnd; i++) {
            const cfg = TQLevels.getLevelConfig(i);
            const data = progress[i] || { score: 0, stars: 0 };
            const isFirst = i === 1;
            const prev = progress[i - 1];
            const unlocked = isFirst || cfg.isTutorial || (prev && prev.stars >= 1) || i <= 4;
            const card = document.createElement("article");
            card.className = "level-card";
            if (cfg.isBoss) card.classList.add("is-boss");
            if (!unlocked) card.classList.add("locked");
            card.innerHTML = `
                <div class="level-card__header">
                    <p class="level-card__label">Level ${i}${cfg.isBoss ? " — BOSS" : ""}</p>
                    <p class="level-card__traversal">${TQLevels.TRAVERSAL_LABELS[cfg.traversal]}</p>
                    <p class="level-card__mode">${TQLevels.MODE_LABELS[cfg.mode]}</p>
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
                    window.location.href = `game.html?level=${i}`;
                });
            }
            chapterLevels.appendChild(card);
        }
        chapterPanel.hidden = false;
        chapterPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    closeBtn.addEventListener("click", () => {
        chapterPanel.hidden = true;
        worldsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function renderAchievements() {
        const achievements = JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY)) || [];
        achievementsList.innerHTML = "";
        if (achievements.length === 0) {
            const empty = document.createElement("div");
            empty.className = "achievement-card achievement-card--empty";
            empty.textContent = "No trophies yet. Play to earn them!";
            achievementsList.appendChild(empty);
            return;
        }
        achievements.forEach(name => {
            const card = document.createElement("div");
            card.className = "achievement-card";
            card.innerHTML = `<span class="achievement-icon">★</span><span>${name}</span>`;
            achievementsList.appendChild(card);
        });
    }

    renderWorlds();
    renderAchievements();

    if (window.TQAudio) TQAudio.playBgm("menu");
});
