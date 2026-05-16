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
        // Build mode: render tree without values; player drags tiles into slots in tree order
        const render = TQTree.renderTreeSVG(tree, svg, { interactive: false, hideValues: true });
        const groups = render.valueToGroup;
        Object.values(groups).forEach(g => g.classList.add("slot"));

        // The "correct" sequence is preorder of the tree — we'll show the traversal sequence list
        // and require the player to place each value into ITS node based on which one matches.
        // To keep this learning-focused: the player must place each tile into the correct tree node.
        const valuesShuffled = shuffle(Object.keys(groups).map(v => parseInt(v, 10)), TQTree.mulberry32(cfg.seed));

        els.instructions.innerHTML = `Drag each number tile to the tree node where it belongs (matching the ${TQLevels.TRAVERSAL_LABELS[cfg.traversal]} sequence shown).`;

        // Show the traversal sequence as a row of numbered slots overhead in the tile bank label
        const sequence = TQTree.getTraversalOrder(tree, cfg.traversal);
        const sequenceRow = document.createElement("div");
        sequenceRow.className = "build-sequence";
        sequenceRow.innerHTML = `<p class="build-hint">Target ${TQLevels.TRAVERSAL_LABELS[cfg.traversal]} sequence:</p>` +
            `<p class="build-sequence-list">${sequence.join("  →  ")}</p>`;

        els.tileBank.innerHTML = "";
        els.tileBank.appendChild(sequenceRow);

        const tilesWrap = document.createElement("div");
        tilesWrap.className = "tiles-wrap";
        els.tileBank.appendChild(tilesWrap);
        els.tileBank.hidden = false;

        let placedCount = 0;
        const totalSlots = Object.keys(groups).length;

        valuesShuffled.forEach(v => {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.textContent = v;
            tile.dataset.value = v;
            attachPointerDrag(tile);
            tilesWrap.appendChild(tile);
        });

        if (!cfg.isTutorial) {
            startTimer(cfg.timeLimit, () => hooks.onTimeout());
        }

        function attachPointerDrag(tile) {
            let dragging = false;
            let offsetX = 0, offsetY = 0;
            let originalRect = null;
            let ghost = null;

            tile.addEventListener("pointerdown", (e) => {
                if (tile.classList.contains("placed")) return;
                e.preventDefault();
                dragging = true;
                originalRect = tile.getBoundingClientRect();
                offsetX = e.clientX - originalRect.left;
                offsetY = e.clientY - originalRect.top;

                ghost = tile.cloneNode(true);
                ghost.style.position = "fixed";
                ghost.style.left = (e.clientX - offsetX) + "px";
                ghost.style.top = (e.clientY - offsetY) + "px";
                ghost.style.zIndex = 9999;
                ghost.style.pointerEvents = "none";
                ghost.classList.add("dragging");
                document.body.appendChild(ghost);

                tile.style.opacity = "0.3";
                tile.setPointerCapture(e.pointerId);
            });

            tile.addEventListener("pointermove", (e) => {
                if (!dragging || !ghost) return;
                ghost.style.left = (e.clientX - offsetX) + "px";
                ghost.style.top = (e.clientY - offsetY) + "px";
            });

            tile.addEventListener("pointerup", (e) => {
                if (!dragging) return;
                dragging = false;
                tile.style.opacity = "";
                const tx = e.clientX;
                const ty = e.clientY;
                if (ghost) { ghost.remove(); ghost = null; }
                if (tile.hasPointerCapture(e.pointerId)) tile.releasePointerCapture(e.pointerId);

                // Hit test against slot rects in the SVG
                const hit = findSlotAt(tx, ty);
                if (!hit) return;
                const value = parseInt(tile.dataset.value, 10);
                const slotValue = parseInt(hit.getAttribute("data-value"), 10);

                if (value === slotValue) {
                    fillSlot(hit, value);
                    tile.classList.add("placed");
                    placedCount++;
                    hooks.onCorrect(15);
                    els.feedback.textContent = `Placed ${value} correctly!`;
                    if (placedCount === totalSlots) {
                        hooks.onComplete();
                    }
                } else {
                    tile.classList.add("shake");
                    hit.classList.add("wrong-flash");
                    setTimeout(() => {
                        tile.classList.remove("shake");
                        hit.classList.remove("wrong-flash");
                    }, 360);
                    hooks.onWrong(5);
                    els.feedback.textContent = `${value} doesn't belong there.`;
                }
            });

            tile.addEventListener("pointercancel", () => {
                dragging = false;
                tile.style.opacity = "";
                if (ghost) { ghost.remove(); ghost = null; }
            });
        }

        function findSlotAt(clientX, clientY) {
            const targets = document.elementsFromPoint(clientX, clientY);
            for (const el of targets) {
                const g = el.closest && el.closest(".tree-node");
                if (g && g.classList.contains("slot") && !g.classList.contains("filled")) {
                    return g;
                }
            }
            return null;
        }

        function fillSlot(slotGroup, value) {
            slotGroup.classList.add("filled");
            const SVG_NS = "http://www.w3.org/2000/svg";
            const rect = slotGroup.querySelector("rect");
            const size = rect ? parseFloat(rect.getAttribute("width")) : 64;
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", size / 2);
            text.setAttribute("y", size / 2);
            text.textContent = value;
            slotGroup.appendChild(text);
        }
    }

    global.TQModes = global.TQModes || {};
    global.TQModes.build = { run };
})(window);
