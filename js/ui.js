(function (global) {
    "use strict";

    let activeModal = null;
    let onCloseCb = null;

    function closeModal() {
        if (activeModal) {
            activeModal.remove();
            activeModal = null;
            document.body.classList.remove("tq-modal-open");
            const cb = onCloseCb;
            onCloseCb = null;
            if (cb) cb();
        }
    }

    function el(tag, className, parent) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (parent) parent.appendChild(e);
        return e;
    }

    function showModal(opts) {
        closeModal();
        const overlay = el("div", "tq-modal-overlay");
        const modal = el("div", "tq-modal nes-frame", overlay);
        if (opts.variant) modal.classList.add(`tq-modal--${opts.variant}`);

        if (opts.eyebrow) {
            const e = el("p", "eyebrow", modal);
            e.textContent = opts.eyebrow;
        }
        if (opts.title) {
            const t = el("h2", "tq-modal__title", modal);
            t.textContent = opts.title;
        }
        if (opts.body) {
            const b = el("div", "tq-modal__body", modal);
            if (typeof opts.body === "string") b.innerHTML = opts.body;
            else b.appendChild(opts.body);
        }
        if (opts.stat) {
            const s = el("p", "tq-modal__stat", modal);
            s.innerHTML = opts.stat;
        }

        const actions = el("div", "tq-modal__actions", modal);
        if (opts.primary) {
            const b = el("button", "nes-btn nes-btn--gold tq-modal__primary", actions);
            b.type = "button";
            b.textContent = opts.primary;
            b.addEventListener("click", () => {
                if (opts.onPrimary) opts.onPrimary();
                if (!opts.keepOpen) closeModal();
            });
        }
        if (opts.secondary) {
            const b = el("button", "nes-btn tq-modal__secondary", actions);
            b.type = "button";
            b.textContent = opts.secondary;
            b.addEventListener("click", () => {
                if (opts.onSecondary) opts.onSecondary();
                closeModal();
            });
        }

        document.body.appendChild(overlay);
        document.body.classList.add("tq-modal-open");
        activeModal = overlay;
        onCloseCb = opts.onClose || null;

        if (opts.dismissOnOverlay !== false) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    if (opts.onSecondary) opts.onSecondary();
                    closeModal();
                }
            });
        }

        return overlay;
    }

    global.TQUI = { showModal, closeModal };
})(window);
