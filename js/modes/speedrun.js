(function (global) {
    "use strict";

    const TOTAL_TIME = 60;

    function run(ctx) {
        const { els, svg, startTimer, stopTimer, saveBest, queueFeedback } = ctx;

        let round = 1;
        let totalScore = 0;
        let combo = 1;
        let ended = false;
        let currentSequence = [];
        let userIndex = 0;
        let timeBonus = 0;

        els.instructions.innerHTML = "Endless trees. Click nodes in the named traversal order. One mistake or timeout ends the run.";
        els.speedrunRound.textContent = round;
        els.scoreChip.textContent = "Score: 0";

        startTimer(TOTAL_TIME, () => endRun("Time's up!"));
        nextRound();

        function nextRound() {
            if (ended) return;
            els.speedrunRound.textContent = round;

            const size = Math.min(20, 6 + Math.floor(round * 0.7));
            const seed = ((Date.now() & 0xFFFF) ^ (round * 2654435761)) >>> 0;
            const rng = TQTree.mulberry32(seed);
            const tree = TQTree.generateRandomTree(size, rng);
            const traversalTypes = TQLevels.TRAVERSAL_TYPES;
            const traversal = traversalTypes[Math.floor(rng() * traversalTypes.length)];

            els.traversal.textContent = `Traversal: ${TQLevels.TRAVERSAL_LABELS[traversal]}`;
            currentSequence = TQTree.getTraversalOrder(tree, traversal);
            userIndex = 0;

            const render = TQTree.renderTreeSVG(tree, svg, { interactive: true });
            const groups = render.valueToGroup;
            Object.values(groups).forEach(g => {
                g.addEventListener("click", () => handleClick(parseInt(g.getAttribute("data-value"), 10), g, groups));
            });
        }

        function handleClick(value, group, groups) {
            if (ended || group.classList.contains("correct")) return;
            const expected = currentSequence[userIndex];
            if (value === expected) {
                group.classList.add("correct");
                userIndex++;
                totalScore += 10 * combo;
                combo++;
                els.scoreChip.textContent = `Score: ${totalScore}`;
                if (window.TQAudio) TQAudio.playSfx("correct");
                if (userIndex === currentSequence.length) {
                    timeBonus++;
                    queueFeedback(`Round ${round} cleared! +${10 * combo} bonus`);
                    totalScore += 25;
                    round++;
                    if (window.TQAudio) TQAudio.playSfx("win");
                    setTimeout(nextRound, 200);
                }
            } else {
                group.classList.add("wrong");
                if (window.TQAudio) TQAudio.playSfx("wrong");
                endRun(`Wrong node! You scored ${totalScore} in ${round - 1} round${round === 2 ? "" : "s"}.`);
            }
        }

        function endRun(reason) {
            if (ended) return;
            ended = true;
            stopTimer();
            els.feedback.textContent = reason;
            if (window.TQAudio) TQAudio.playSfx("lose");
            saveBest(totalScore);
            setTimeout(() => {
                TQUI.showModal({
                    eyebrow: "Speedrun Over",
                    title: reason,
                    stat: `Final Score: <strong>${totalScore}</strong> &nbsp; Rounds: <strong>${round - 1}</strong>`,
                    primary: "Run Again",
                    secondary: "Back to Menu",
                    onPrimary: () => location.reload(),
                    onSecondary: () => { window.location.href = "../index.html"; }
                });
            }, 400);
        }
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.speedrun = { run };
})(window);
