(function (global) {
    "use strict";

    function getTraversalStepLabel(index, total, traversal) {
        // Best-effort hint label for tutorial mode
        if (traversal === "preorder") return ["Root", "Left", "Right"][index % 3];
        if (traversal === "inorder")  return ["Left", "Root", "Right"][index % 3];
        if (traversal === "postorder") return ["Left", "Right", "Root"][index % 3];
        return `#${index + 1}`;
    }

    function run(ctx) {
        const { cfg, tree, svg, els, hooks, startTimer } = ctx;
        const correctSequence = TQTree.getTraversalOrder(tree, cfg.traversal);
        const render = TQTree.renderTreeSVG(tree, svg, { interactive: true });
        const groups = render.valueToGroup;
        const userSequence = [];

        if (cfg.isTutorial) {
            els.instructions.innerHTML = `Watch the highlight, then repeat the <strong>${TQLevels.TRAVERSAL_LABELS[cfg.traversal]}</strong> order.`;
            playTutorialDemo(correctSequence, groups, cfg.traversal, () => {
                els.instructions.textContent = "Now your turn! Click the nodes in order.";
                attachListeners();
            });
        } else {
            els.instructions.innerHTML = `Click the nodes in <strong>${TQLevels.TRAVERSAL_LABELS[cfg.traversal]}</strong> order.`;
            attachListeners();
            startTimer(cfg.timeLimit, () => hooks.onTimeout());
        }

        function attachListeners() {
            Object.values(groups).forEach(g => {
                g.addEventListener("click", () => handleClick(parseInt(g.getAttribute("data-value"), 10), g));
            });
        }

        function handleClick(value, group) {
            if (group.classList.contains("correct") || group.classList.contains("locked")) return;
            // Strip stale wrong markings
            svg.querySelectorAll(".tree-node.wrong").forEach(n => n.classList.remove("wrong"));

            const expected = correctSequence[userSequence.length];
            if (value === expected) {
                group.classList.add("correct", "locked");
                userSequence.push(value);
                hooks.onCorrect();
                els.feedback.textContent = `Good! +${10 * Math.max(1, userSequence.length)} points`;
                if (userSequence.length === correctSequence.length) {
                    hooks.onComplete();
                }
            } else {
                group.classList.add("wrong");
                hooks.onWrong();
                els.feedback.textContent = `Wrong node. Expected something else!`;
            }
        }
    }

    function playTutorialDemo(sequence, groups, traversal, done) {
        let i = 0;
        function step() {
            if (i >= sequence.length) {
                Object.values(groups).forEach(g => g.classList.remove("highlight"));
                if (done) done();
                return;
            }
            const g = groups[sequence[i]];
            if (g) g.classList.add("highlight");
            setTimeout(() => {
                if (g) g.classList.remove("highlight");
                i++;
                step();
            }, 700);
        }
        step();
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.classic = { run };
})(window);
