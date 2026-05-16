(function (global) {
    "use strict";

    // ------------------------------------------------------------------
    // Multi-user storage configuration
    // ------------------------------------------------------------------
    // For true multi-user data sharing, host a JSON document somewhere
    // that accepts GET (return current JSON) and POST (replace JSON).
    // Examples that work without auth: jsonblob.com, npoint.io, pantry.cloud.
    // 1. Create a blob and copy its URL.
    // 2. Replace REMOTE_URL below with your URL.
    // 3. Optionally tweak REMOTE_METHOD if your provider expects PUT.
    // If REMOTE_URL is empty, the leaderboard falls back to localStorage
    // (this device only).
    // ------------------------------------------------------------------
    const REMOTE_URL = "https://api.npoint.io/be0ef32ec9ecc6c30232";
    const REMOTE_METHOD_WRITE = "POST";

    const LOCAL_KEY = "treequest_leaderboard";
    const NAME_KEY = "treequest_player_name";

    const MODES = ["classic", "identify", "build", "speedrun"];
    const MODE_LABELS = {
        classic: "Classic",
        identify: "Identify",
        build: "Build",
        speedrun: "Speedrun"
    };

    function getName() {
        return localStorage.getItem(NAME_KEY) || "";
    }

    function setName(name) {
        const cleaned = String(name || "").trim().slice(0, 16).toUpperCase();
        if (cleaned) localStorage.setItem(NAME_KEY, cleaned);
        return cleaned;
    }

    function ensureName(promptText) {
        let name = getName();
        if (name) return Promise.resolve(name);
        if (!global.TQUI) {
            name = (window.prompt(promptText || "Enter a player name", "PLAYER") || "PLAYER").toUpperCase();
            return Promise.resolve(setName(name));
        }
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 16;
            input.placeholder = "Enter your name";
            input.className = "tq-name-input";
            input.value = "";
            const wrap = document.createElement("div");
            wrap.appendChild(input);
            TQUI.showModal({
                eyebrow: "Leaderboard",
                title: "Pick a player name",
                body: wrap,
                primary: "Save",
                secondary: null,
                dismissOnOverlay: false,
                onPrimary: () => {
                    const v = setName(input.value || "PLAYER");
                    resolve(v || "PLAYER");
                }
            });
            setTimeout(() => input.focus(), 50);
        });
    }

    function readLocal() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_KEY)) || emptyBoard();
        } catch (_) {
            return emptyBoard();
        }
    }

    function writeLocal(board) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(board));
    }

    function emptyBoard() {
        const b = {};
        MODES.forEach(m => b[m] = []);
        return b;
    }

    function mergeEntry(board, mode, entry) {
        board[mode] = board[mode] || [];
        const existing = board[mode].find(e => e.name === entry.name);
        if (existing) {
            if (entry.score > existing.score) {
                existing.score = entry.score;
                existing.ts = entry.ts;
            }
        } else {
            board[mode].push(entry);
        }
        board[mode].sort((a, b) => b.score - a.score);
        board[mode] = board[mode].slice(0, 50);
        return board;
    }

    function fetchRemote() {
        if (!REMOTE_URL) return Promise.resolve(null);
        return fetch(REMOTE_URL, { method: "GET", cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
    }

    function pushRemote(board) {
        if (!REMOTE_URL) return Promise.resolve(false);
        return fetch(REMOTE_URL, {
            method: REMOTE_METHOD_WRITE,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(board)
        }).then(r => r.ok).catch(() => false);
    }

    function get() {
        return fetchRemote().then(remote => {
            const local = readLocal();
            if (!remote) return local;
            // Merge remote into local view (local stays canonical for this device)
            const merged = emptyBoard();
            MODES.forEach(m => {
                const lst = (remote[m] || []).concat(local[m] || []);
                const seen = {};
                lst.forEach(e => {
                    if (!e || typeof e.name !== "string") return;
                    if (!seen[e.name] || seen[e.name].score < e.score) seen[e.name] = e;
                });
                merged[m] = Object.values(seen).sort((a, b) => b.score - a.score).slice(0, 50);
            });
            return merged;
        });
    }

    function submit(mode, score) {
        if (!MODES.includes(mode)) return;
        if (typeof score !== "number" || !isFinite(score) || score <= 0) return;
        const name = getName();
        if (!name) return; // wait until player has chosen a name
        const entry = { name, score: Math.floor(score), ts: Date.now() };
        const local = readLocal();
        mergeEntry(local, mode, entry);
        writeLocal(local);
        // Best-effort remote push (read-modify-write; last write wins)
        if (REMOTE_URL) {
            fetchRemote().then(remote => {
                const board = remote || emptyBoard();
                mergeEntry(board, mode, entry);
                pushRemote(board);
            });
        }
    }

    global.TQLeaderboard = {
        get,
        submit,
        getName,
        setName,
        ensureName,
        MODES,
        MODE_LABELS,
        hasRemote: () => !!REMOTE_URL
    };
})(window);
