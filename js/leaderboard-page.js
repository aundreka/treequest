document.addEventListener("DOMContentLoaded", () => {
    if (!window.TQLeaderboard) return;

    if (window.TQAudio) TQAudio.playBgm("menu");

    const tabsEl = document.getElementById("lb-tabs");
    const tableEl = document.getElementById("lb-table");
    const sourceEl = document.getElementById("lb-source");
    const changeNameBtn = document.getElementById("lb-change-name");

    const modes = TQLeaderboard.MODES;
    let activeMode = "speedrun";

    sourceEl.textContent = TQLeaderboard.hasRemote()
        ? "Synced with the global leaderboard."
        : "Local device only — wire up REMOTE_URL in leaderboard.js to share globally.";

    function renderTabs() {
        tabsEl.innerHTML = "";
        modes.forEach(m => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "nes-btn lb-tab" + (m === activeMode ? " lb-tab--active" : "");
            btn.textContent = TQLeaderboard.MODE_LABELS[m];
            btn.addEventListener("click", () => {
                activeMode = m;
                renderTabs();
                renderTable();
            });
            tabsEl.appendChild(btn);
        });
    }

    function renderTable() {
        tableEl.innerHTML = '<p class="lb-loading">Loading...</p>';
        TQLeaderboard.get().then(board => {
            const rows = (board[activeMode] || []).slice(0, 25);
            if (rows.length === 0) {
                tableEl.innerHTML = '<p class="lb-empty">No scores yet. Play to get on the board!</p>';
                return;
            }
            const me = TQLeaderboard.getName();
            const html = [];
            html.push('<table class="lb-table__inner">');
            html.push('<thead><tr><th>#</th><th>Name</th><th>Score</th></tr></thead>');
            html.push('<tbody>');
            rows.forEach((r, idx) => {
                const isMe = me && r.name === me;
                html.push(`<tr class="${isMe ? 'lb-row--mine' : ''}">`);
                html.push(`<td>${idx + 1}</td>`);
                html.push(`<td>${escapeHtml(r.name)}</td>`);
                html.push(`<td>${r.score}</td>`);
                html.push('</tr>');
            });
            html.push('</tbody></table>');
            tableEl.innerHTML = html.join("");
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    changeNameBtn.addEventListener("click", () => {
        TQLeaderboard.setName("");
        TQLeaderboard.ensureName("Pick a new player name").then(() => renderTable());
    });

    renderTabs();
    renderTable();
});
