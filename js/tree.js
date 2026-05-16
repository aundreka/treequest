(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    function mulberry32(seed) {
        let t = (seed >>> 0) || 1;
        return function () {
            t = (t + 0x6D2B79F5) >>> 0;
            let r = t;
            r = Math.imul(r ^ (r >>> 15), r | 1);
            r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffleArray(array, rng) {
        const rand = rng || Math.random;
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function generateRandomTree(size, rng) {
        const rand = rng || Math.random;
        const values = Array.from({ length: size }, (_, i) => i + 1);
        shuffleArray(values, rand);

        function build(arr, depth) {
            if (arr.length === 0) return null;
            const mid = Math.floor(arr.length / 2);
            return {
                value: arr[mid],
                left: build(arr.slice(0, mid), depth + 1),
                right: build(arr.slice(mid + 1), depth + 1)
            };
        }
        return build(values, 0);
    }

    function getTraversalOrder(tree, type) {
        const result = [];
        if (type === "levelorder") {
            if (!tree) return result;
            const queue = [tree];
            while (queue.length > 0) {
                const node = queue.shift();
                result.push(node.value);
                if (node.left) queue.push(node.left);
                if (node.right) queue.push(node.right);
            }
            return result;
        }
        function walk(node) {
            if (!node) return;
            if (type === "preorder") result.push(node.value);
            walk(node.left);
            if (type === "inorder") result.push(node.value);
            walk(node.right);
            if (type === "postorder") result.push(node.value);
        }
        walk(tree);
        return result;
    }

    function treeDepth(node) {
        if (!node) return 0;
        return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
    }

    function layoutTree(tree) {
        let counter = 0;
        let maxDepth = 0;
        function place(node, depth) {
            if (!node) return;
            place(node.left, depth + 1);
            node._x = counter++;
            node._y = depth;
            if (depth > maxDepth) maxDepth = depth;
            place(node.right, depth + 1);
        }
        place(tree, 0);
        return { leafCount: counter, depth: maxDepth + 1 };
    }

    function renderTreeSVG(tree, svgEl, opts) {
        const options = Object.assign({
            interactive: true,
            hideValues: false,
            nodeSize: 64,
            xSpacing: 96,
            ySpacing: 110,
            padding: 32
        }, opts || {});

        while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

        const { leafCount, depth } = layoutTree(tree);
        const w = Math.max(1, leafCount) * options.xSpacing + options.padding * 2;
        const h = depth * options.ySpacing + options.padding * 2;
        svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgEl.classList.add("tree-svg");

        const valueToGroup = {};

        // First pass: draw edges so nodes render on top
        const edgeGroup = document.createElementNS(SVG_NS, "g");
        edgeGroup.setAttribute("class", "tree-edges");
        svgEl.appendChild(edgeGroup);

        function nodeCenter(node) {
            const cx = options.padding + node._x * options.xSpacing + options.xSpacing / 2;
            const cy = options.padding + node._y * options.ySpacing + options.ySpacing / 2;
            return { cx, cy };
        }

        function drawEdges(node) {
            if (!node) return;
            const { cx, cy } = nodeCenter(node);
            [node.left, node.right].forEach(child => {
                if (!child) return;
                const c = nodeCenter(child);
                const line = document.createElementNS(SVG_NS, "line");
                line.setAttribute("class", "tree-edge");
                line.setAttribute("x1", cx);
                line.setAttribute("y1", cy);
                line.setAttribute("x2", c.cx);
                line.setAttribute("y2", c.cy);
                edgeGroup.appendChild(line);
                drawEdges(child);
            });
        }
        drawEdges(tree);

        // Second pass: nodes
        const nodeGroup = document.createElementNS(SVG_NS, "g");
        nodeGroup.setAttribute("class", "tree-nodes");
        svgEl.appendChild(nodeGroup);

        function drawNodes(node) {
            if (!node) return;
            const { cx, cy } = nodeCenter(node);
            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("class", "tree-node");
            g.setAttribute("data-value", node.value);
            g.setAttribute("transform", `translate(${cx - options.nodeSize / 2}, ${cy - options.nodeSize / 2})`);

            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("width", options.nodeSize);
            rect.setAttribute("height", options.nodeSize);
            g.appendChild(rect);

            if (!options.hideValues) {
                const text = document.createElementNS(SVG_NS, "text");
                text.setAttribute("x", options.nodeSize / 2);
                text.setAttribute("y", options.nodeSize / 2);
                text.textContent = node.value;
                g.appendChild(text);
            }

            if (options.interactive) {
                g.style.cursor = "pointer";
            }

            nodeGroup.appendChild(g);
            valueToGroup[node.value] = g;
            drawNodes(node.left);
            drawNodes(node.right);
        }
        drawNodes(tree);

        return { valueToGroup, viewBox: { w, h } };
    }

    function clearTree(svgEl) {
        while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    }

    global.TQTree = {
        mulberry32,
        shuffleArray,
        generateRandomTree,
        getTraversalOrder,
        layoutTree,
        renderTreeSVG,
        clearTree,
        treeDepth
    };
})(window);
