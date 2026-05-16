(function (global) {
    "use strict";

    const TRAVERSAL_TYPES = ["preorder", "inorder", "postorder", "levelorder"];
    const MODES = ["classic", "identify", "build"];

    const CHAPTER_NAMES = [
        "Sapling Grove",
        "Forest Edge",
        "Mystic Woods",
        "Ancient Canopy",
        "Sky Roots",
        "Star Branches"
    ];

    const CHAPTER_SUFFIXES = [
        "of the Void",
        "of Echoes",
        "of Whispers",
        "of the Dawn",
        "of the Deep",
        "of Eternity",
        "of Storms",
        "of Embers"
    ];

    const CHAPTER_HUES = [0, 40, 80, 200, 280, 320, 160, 20, 60, 240];

    const TRAVERSAL_LABELS = {
        preorder: "Pre-Order",
        inorder: "In-Order",
        postorder: "Post-Order",
        levelorder: "Level-Order"
    };

    const MODE_LABELS = {
        classic: "Classic",
        identify: "Identify",
        build: "Build"
    };

    function getChapterForLevel(levelId) {
        return Math.floor((Math.max(1, levelId) - 1) / 10);
    }

    function getChapterMeta(idx) {
        const fixed = CHAPTER_NAMES[idx];
        const name = fixed || `Chapter ${idx + 1} ${CHAPTER_SUFFIXES[idx % CHAPTER_SUFFIXES.length]}`;
        const hue = CHAPTER_HUES[idx % CHAPTER_HUES.length];
        return {
            idx,
            name,
            levelStart: idx * 10 + 1,
            levelEnd: idx * 10 + 10,
            artHue: hue
        };
    }

    function getLevelConfig(levelId) {
        const id = Math.max(1, parseInt(levelId, 10) || 1);
        const chapterIdx = getChapterForLevel(id);
        const chapter = getChapterMeta(chapterIdx);
        const positionInChapter = ((id - 1) % 10) + 1;
        const isTutorial = id <= 4;
        const seed = (id * 1000003) >>> 0;

        let traversal, mode, size, timeLimit, name, isBoss;

        if (isTutorial) {
            traversal = TRAVERSAL_TYPES[id - 1];
            mode = "classic";
            size = 7;
            timeLimit = Infinity;
            name = `Tutorial ${id}: ${TRAVERSAL_LABELS[traversal]}`;
            isBoss = false;
        } else {
            // Hard cap on node count so trees always stay tappable on small screens.
            // Beyond the cap, difficulty continues via a tighter timer instead.
            const MAX_NODES = 15;

            traversal = TRAVERSAL_TYPES[(id - 1) % 4];
            mode = "classic";
            const idealSize = 7 + Math.floor((id - 4) / 3);
            size = Math.min(MAX_NODES, idealSize);

            // Base timer drops by 1.5s per level, floor at 20s
            let timeBudget = Math.max(20, 90 - Math.floor((id - 4) * 1.5));
            // Past the node cap, every extra "ideal" node trims an extra second
            if (idealSize > MAX_NODES) {
                const overage = idealSize - MAX_NODES;
                timeBudget = Math.max(8, timeBudget - overage);
            }
            timeLimit = timeBudget;

            isBoss = id % 10 === 0;
            if (isBoss) {
                size = Math.min(MAX_NODES, size + 3);
                timeLimit = Math.max(8, timeLimit - 10);
                const bossIdx = seed % 4;
                traversal = TRAVERSAL_TYPES[bossIdx];
                name = `Boss: ${chapter.name}`;
            } else {
                name = `${chapter.name} ${chapterIdx + 1}-${positionInChapter}`;
            }
        }

        return {
            id,
            name,
            chapterIdx,
            chapterName: chapter.name,
            positionInChapter,
            traversal,
            mode,
            size,
            timeLimit,
            seed,
            isBoss,
            isTutorial
        };
    }

    function isChapterUnlocked(chapterIdx, progressMap) {
        if (chapterIdx <= 0) return true;
        const prevStart = (chapterIdx - 1) * 10 + 1;
        const prevEnd = chapterIdx * 10;
        let goodLevels = 0;
        for (let i = prevStart; i <= prevEnd; i++) {
            const data = progressMap && progressMap[i];
            if (data && data.stars >= 2) goodLevels++;
        }
        return goodLevels >= 7;
    }

    global.TQLevels = {
        TRAVERSAL_TYPES,
        MODES,
        TRAVERSAL_LABELS,
        MODE_LABELS,
        getChapterForLevel,
        getChapterMeta,
        getLevelConfig,
        isChapterUnlocked
    };
})(window);
