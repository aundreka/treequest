(function (global) {
    "use strict";

    const QUESTIONS_PER_LEVEL = 5;
    const PASS_RATIO = 0.8;
    // Rotation across a level — variety keeps it from feeling rote
    const QUESTION_TYPES = ["traversal", "next-node", "root", "depth", "traversal"];

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
        let answered = false;
        let currentQuestion = null;
        let animationTimer = null;

        startTimer(cfg.timeLimit, () => {
            if (questionIndex < QUESTIONS_PER_LEVEL) finalize();
        });

        nextQuestion();

        function nextQuestion() {
            answered = false;
            if (animationTimer) {
                clearTimeout(animationTimer);
                animationTimer = null;
            }

            const qSeed = (cfg.seed + (questionIndex + 1) * 2654435761) >>> 0;
            currentQuestion = buildQuestion(questionIndex, qSeed, cfg);

            const render = TQTree.renderTreeSVG(currentQuestion.tree, svg, { interactive: false });
            const groups = render.valueToGroup;

            els.traversal.textContent = currentQuestion.badgeText;
            if (currentQuestion.badgeHidden) {
                els.traversal.classList.add("traversal-badge--hidden");
            } else {
                els.traversal.classList.remove("traversal-badge--hidden");
            }

            els.instructions.innerHTML =
                `Q <strong>${questionIndex + 1}/${QUESTIONS_PER_LEVEL}</strong> &mdash; ` +
                currentQuestion.questionText +
                ` &mdash; Score: <strong>${correctCount}/${questionIndex}</strong>`;

            // Choices visible from the start — clicking during animation is allowed.
            renderChoices();

            if (currentQuestion.animation && currentQuestion.animation.length > 0) {
                animateSequence(currentQuestion.animation, groups);
            }
        }

        function buildQuestion(idx, seed, cfg) {
            const rng = TQTree.mulberry32(seed);
            // Keep identify trees small enough for clear visuals
            const sz = Math.max(7, Math.min(13, cfg.size));
            const tree = TQTree.generateRandomTree(sz, rng);
            const types = TQLevels.TRAVERSAL_TYPES;
            const traversal = types[Math.floor(rng() * types.length)];
            const sequence = TQTree.getTraversalOrder(tree, traversal);
            const allValues = Array.from(new Set(sequence));

            const qType = QUESTION_TYPES[idx % QUESTION_TYPES.length];

            if (qType === "traversal") {
                const opts = shuffle(types.slice(), rng);
                return {
                    type: qType,
                    tree,
                    questionText: "Watch the highlight order and pick the traversal.",
                    animation: sequence,
                    badgeText: "Traversal: ???",
                    badgeHidden: true,
                    choices: opts.map(t => ({
                        label: TQLevels.TRAVERSAL_LABELS[t],
                        correct: t === traversal
                    }))
                };
            }

            if (qType === "next-node") {
                const cutoff = Math.max(2, Math.min(sequence.length - 1, Math.floor(sequence.length / 2)));
                const partial = sequence.slice(0, cutoff);
                const next = sequence[cutoff];
                const distractors = allValues.filter(v => v !== next);
                shuffle(distractors, rng);
                const optsValues = shuffle([next, ...distractors.slice(0, 3)], rng);
                return {
                    type: qType,
                    tree,
                    questionText: `Highlights are a partial <strong>${TQLevels.TRAVERSAL_LABELS[traversal]}</strong>. Which node comes <strong>NEXT</strong>?`,
                    animation: partial,
                    badgeText: `Traversal: ${TQLevels.TRAVERSAL_LABELS[traversal]}`,
                    badgeHidden: false,
                    choices: optsValues.map(v => ({
                        label: String(v),
                        correct: v === next
                    }))
                };
            }

            if (qType === "root") {
                const root = tree.value;
                const preSeq = TQTree.getTraversalOrder(tree, "preorder");
                const distractors = allValues.filter(v => v !== root);
                shuffle(distractors, rng);
                const optsValues = shuffle([root, ...distractors.slice(0, 3)], rng);
                return {
                    type: qType,
                    tree,
                    questionText: `Pre-order: <strong>${preSeq.join(" → ")}</strong>. Which value is the <strong>ROOT</strong>?`,
                    animation: null,
                    badgeText: "Find the Root",
                    badgeHidden: false,
                    choices: optsValues.map(v => ({
                        label: String(v),
                        correct: v === root
                    }))
                };
            }

            if (qType === "depth") {
                const depth = TQTree.treeDepth(tree);
                const candidates = new Set([depth]);
                let attempts = 0;
                while (candidates.size < 4 && attempts < 40) {
                    const delta = Math.floor(rng() * 3) + 1;
                    const sign = rng() < 0.5 ? -1 : 1;
                    const c = depth + delta * sign;
                    if (c >= 1 && c <= 20) candidates.add(c);
                    attempts++;
                }
                let bump = 1;
                while (candidates.size < 4) {
                    if (!candidates.has(depth + bump)) candidates.add(depth + bump);
                    bump++;
                }
                const optsValues = shuffle(Array.from(candidates), rng);
                return {
                    type: qType,
                    tree,
                    questionText: "What is the <strong>DEPTH</strong> (height in levels) of this tree?",
                    animation: null,
                    badgeText: "Tree Depth",
                    badgeHidden: false,
                    choices: optsValues.map(v => ({
                        label: String(v),
                        correct: v === depth
                    }))
                };
            }
        }

        function renderChoices() {
            els.choiceButtons.hidden = false;
            els.choiceButtons.innerHTML = "";
            currentQuestion.choices.forEach(c => {
                const btn = document.createElement("button");
                btn.className = "nes-btn";
                btn.type = "button";
                btn.textContent = c.label;
                btn.addEventListener("click", () => handleAnswer(c, btn));
                els.choiceButtons.appendChild(btn);
            });
        }

        function handleAnswer(choice, btn) {
            if (answered) return;
            answered = true;
            if (animationTimer) {
                clearTimeout(animationTimer);
                animationTimer = null;
            }

            if (choice.correct) {
                btn.classList.add("nes-btn--gold");
                correctCount++;
                hooks.onCorrect(40);
                els.feedback.textContent = "Correct!";
            } else {
                btn.classList.add("nes-btn--accent");
                hooks.onWrong(15);
                Array.from(els.choiceButtons.children).forEach(b => {
                    const matching = currentQuestion.choices.find(cc => cc.label === b.textContent);
                    if (matching && matching.correct) b.classList.add("nes-btn--gold");
                });
                els.feedback.textContent = "Wrong!";
            }

            setTimeout(() => {
                questionIndex++;
                if (questionIndex >= QUESTIONS_PER_LEVEL) {
                    finalize();
                } else {
                    nextQuestion();
                }
            }, 1300);
        }

        function finalize() {
            const passed = (correctCount / QUESTIONS_PER_LEVEL) >= PASS_RATIO;
            hooks.onComplete({
                identifyPassed: passed,
                correctCount,
                totalQuestions: QUESTIONS_PER_LEVEL
            });
        }

        function animateSequence(sequence, groups) {
            let i = 0;
            function step() {
                if (answered || i >= sequence.length) return;
                const g = groups[sequence[i]];
                if (g) g.classList.add("highlight");
                animationTimer = setTimeout(() => {
                    i++;
                    step();
                }, 550);
            }
            step();
        }
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.identify = { run };
})(window);
