(function (global) {
    "use strict";

    function shuffle(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor((rng || Math.random)() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function run(ctx) {
        const { cfg, tree, svg, els, hooks, startTimer } = ctx;
        const correctType = cfg.traversal;
        const sequence = TQTree.getTraversalOrder(tree, correctType);
        const render = TQTree.renderTreeSVG(tree, svg, { interactive: false });
        const groups = render.valueToGroup;

        els.instructions.innerHTML = "Watch the highlight sequence. Then pick which traversal it represents.";

        const rng = TQTree.mulberry32(cfg.seed ^ 0x9E3779B1);
        let answered = false;

        animateSequence(sequence, groups, () => {
            renderChoices();
            startTimer(cfg.timeLimit, () => {
                if (!answered) {
                    answered = true;
                    hooks.onWrong(5);
                    hooks.onTimeout();
                }
            });
        });

        function renderChoices() {
            const options = TQLevels.TRAVERSAL_TYPES.slice();
            shuffle(options, rng);
            els.choiceButtons.innerHTML = "";
            els.choiceButtons.hidden = false;
            options.forEach(type => {
                const btn = document.createElement("button");
                btn.className = "nes-btn";
                btn.type = "button";
                btn.textContent = TQLevels.TRAVERSAL_LABELS[type];
                btn.addEventListener("click", () => {
                    if (answered) return;
                    answered = true;
                    // Reveal the answer in the header badge
                    els.traversal.classList.remove("traversal-badge--hidden");
                    els.traversal.textContent = `Traversal: ${TQLevels.TRAVERSAL_LABELS[correctType]}`;
                    if (type === correctType) {
                        btn.classList.add("nes-btn--gold");
                        hooks.onCorrect(50);
                        els.feedback.textContent = `Correct! It was ${TQLevels.TRAVERSAL_LABELS[correctType]}.`;
                        hooks.onComplete();
                    } else {
                        btn.classList.add("nes-btn--accent");
                        hooks.onWrong(20);
                        els.feedback.textContent = `Wrong! That was ${TQLevels.TRAVERSAL_LABELS[correctType]}.`;
                        // Mark the right button
                        Array.from(els.choiceButtons.children).forEach(b => {
                            if (b.textContent === TQLevels.TRAVERSAL_LABELS[correctType]) b.classList.add("nes-btn--gold");
                        });
                        hooks.onComplete();
                    }
                });
                els.choiceButtons.appendChild(btn);
            });
        }
    }

    function animateSequence(sequence, groups, done) {
        let i = 0;
        function step() {
            if (i >= sequence.length) {
                Object.values(groups).forEach(g => g.classList.remove("highlight"));
                if (done) done();
                return;
            }
            // Clear previous highlight (cumulative trail is helpful; we keep them visible)
            const g = groups[sequence[i]];
            if (g) g.classList.add("highlight");
            setTimeout(() => {
                i++;
                step();
            }, 650);
        }
        step();
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.identify = { run };
})(window);
