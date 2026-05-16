(function (global) {
    "use strict";

    const QUESTIONS_PER_LEVEL = 5;
    const PASS_RATIO = 0.8;

    function shuffle(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor((rng || Math.random)() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function run(ctx) {
        const { cfg, svg, els, hooks, startTimer } = ctx;
        let questionIndex = 0;
        let correctCount = 0;
        let answeredThisQuestion = false;
        let currentCorrectType = null;

        startTimer(cfg.timeLimit, () => {
            if (questionIndex < QUESTIONS_PER_LEVEL) finalize();
        });

        nextQuestion();

        function nextQuestion() {
            answeredThisQuestion = false;
            els.choiceButtons.innerHTML = "";
            els.choiceButtons.hidden = true;

            const qSeed = (cfg.seed + (questionIndex + 1) * 2654435761) >>> 0;
            const rng = TQTree.mulberry32(qSeed);
            const qTree = TQTree.generateRandomTree(cfg.size, rng);
            const types = TQLevels.TRAVERSAL_TYPES;
            currentCorrectType = types[Math.floor(rng() * types.length)];
            const sequence = TQTree.getTraversalOrder(qTree, currentCorrectType);

            const render = TQTree.renderTreeSVG(qTree, svg, { interactive: false });
            const groups = render.valueToGroup;

            els.instructions.innerHTML =
                `Question <strong>${questionIndex + 1}</strong> of <strong>${QUESTIONS_PER_LEVEL}</strong> &mdash; ` +
                `Watch the highlights, then pick the traversal. Score: <strong>${correctCount}/${questionIndex}</strong>`;

            animateSequence(sequence, groups, () => {
                renderChoices(rng);
            });
        }

        function renderChoices(rng) {
            const options = TQLevels.TRAVERSAL_TYPES.slice();
            shuffle(options, rng);
            els.choiceButtons.innerHTML = "";
            els.choiceButtons.hidden = false;
            options.forEach(type => {
                const btn = document.createElement("button");
                btn.className = "nes-btn";
                btn.type = "button";
                btn.textContent = TQLevels.TRAVERSAL_LABELS[type];
                btn.addEventListener("click", () => handleAnswer(type, btn));
                els.choiceButtons.appendChild(btn);
            });
        }

        function handleAnswer(type, btn) {
            if (answeredThisQuestion) return;
            answeredThisQuestion = true;

            els.traversal.classList.remove("traversal-badge--hidden");
            els.traversal.textContent = `Traversal: ${TQLevels.TRAVERSAL_LABELS[currentCorrectType]}`;

            const correct = type === currentCorrectType;
            if (correct) {
                btn.classList.add("nes-btn--gold");
                correctCount++;
                hooks.onCorrect(40);
                els.feedback.textContent = `Correct! It was ${TQLevels.TRAVERSAL_LABELS[currentCorrectType]}.`;
            } else {
                btn.classList.add("nes-btn--accent");
                hooks.onWrong(15);
                els.feedback.textContent = `Wrong! It was ${TQLevels.TRAVERSAL_LABELS[currentCorrectType]}.`;
                Array.from(els.choiceButtons.children).forEach(b => {
                    if (b.textContent === TQLevels.TRAVERSAL_LABELS[currentCorrectType]) {
                        b.classList.add("nes-btn--gold");
                    }
                });
            }

            // Restore identify "???" badge for next round and progress
            setTimeout(() => {
                questionIndex++;
                if (questionIndex >= QUESTIONS_PER_LEVEL) {
                    finalize();
                } else {
                    els.traversal.textContent = "Traversal: ???";
                    els.traversal.classList.add("traversal-badge--hidden");
                    nextQuestion();
                }
            }, 1300);
        }

        function finalize() {
            const passed = (correctCount / QUESTIONS_PER_LEVEL) >= PASS_RATIO;
            els.choiceButtons.hidden = true;
            els.choiceButtons.innerHTML = "";
            hooks.onComplete({
                identifyPassed: passed,
                correctCount,
                totalQuestions: QUESTIONS_PER_LEVEL
            });
        }
    }

    function animateSequence(sequence, groups, done) {
        let i = 0;
        function step() {
            if (i >= sequence.length) {
                if (done) done();
                return;
            }
            const g = groups[sequence[i]];
            if (g) g.classList.add("highlight");
            setTimeout(() => {
                i++;
                step();
            }, 600);
        }
        step();
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.identify = { run };
})(window);
