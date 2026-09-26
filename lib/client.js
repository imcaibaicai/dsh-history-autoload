window.__ModuleLoader__.load({
	id: "dsh-history-autoload",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// #region constants
		/** Locale namespace owned by this plugin (dictionary keys + slot `t`). */
		const NS = "historyAutoload";
		/** Host user-settings namespace owned by this plugin. */
		const SETTINGS_NAMESPACE = "ui-history-autoload";
		/** Field carrying the on/off preference. */
		const FIELD = "enabled";
		/** Default preference: on. */
		const DEFAULT_ENABLED = true;
		/** Hard page ceiling — ~50 messages per page, so 200 pages is far beyond any real session. */
		const PAGE_LIMIT = 200;
		/** Spacing between page pulls. */
		const STEP_DELAY_MS = 120;
		/** Retry spacing while the session is still opening or a page is in flight. */
		const WAIT_DELAY_MS = 200;
		/** Give up waiting for `open` after this many idle retries. */
		const WAIT_RETRY_LIMIT = 150;
		/** Session slot this plugin seats a zero-render component on. */
		const SESSION_SLOT = "conversation.session.header.utilities";
		const zh = {
			title: "自动加载全部历史",
			description: "进入会话后自动把更早的历史全部加载完（同时让回合过程区恢复可折叠）",
			on: "已开启",
			off: "已关闭"
		};
		const en = {
			title: "Auto-load full history",
			description: "Load every earlier message when a session opens (also restores turn-process folding)",
			on: "On",
			off: "Off"
		};
		// #endregion
		// #region styles
		const css = `
.ahl-row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}
.ahl-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}
.ahl-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.ahl-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}
.ahl-toggle{flex:none;min-width:58px;height:28px;padding:0 12px;border:none;border-radius:14px;cursor:pointer;
  font-size:13px;line-height:28px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.ahl-toggle[aria-pressed="true"]{background:var(--dsw-alias-state-business-primary,#4d6bfe);color:#fff}
`;
		try {
			if (typeof document !== "undefined") {
				const key = "dsh-history-autoload";
				if (document.querySelector("style[data-plugin-css=" + JSON.stringify(key) + "]") === null) {
					const tag = document.createElement("style");
					tag.dataset.plugin = key;
					tag.dataset.pluginCss = key;
					tag.textContent = css;
					document.head.appendChild(tag);
				}
			}
		} catch (error) {}
		// #endregion
		// #region session seat
		/**
		 * Zero-render seat mounted once per Session. Pulls one history page at a time
		 * until the Session reports no more history, so `hasMore` settles to false —
		 * which is also the condition the stock turn-process folding waits for.
		 * @param props - composed Session-scope slot props plus this plugin's injected face.
		 * @returns nothing; this component never renders UI.
		 */
		function AutoLoadSeat(props) {
			const enabled = props.getEnabled() === true;
			(0, react.useEffect)(() => {
				if (!enabled) return void 0;
				let cancelled = false;
				let timer = 0;
				let pages = 0;
				let idle = 0;
				const sessionId = props.sessionId;
				const api = props.sessionsApi;
				const step = () => {
					if (cancelled) return;
					let face;
					try {
						face = api.binding(sessionId).session;
					} catch (error) {
						return;
					}
					if (face === void 0) return;
					if (face.openState !== "open") {
						if (idle >= WAIT_RETRY_LIMIT) return;
						idle += 1;
						timer = window.setTimeout(step, WAIT_DELAY_MS);
						return;
					}
					if (!face.hasMore) return;
					if (face.loadingOlder) {
						timer = window.setTimeout(step, WAIT_DELAY_MS);
						return;
					}
					if (pages >= PAGE_LIMIT) return;
					pages += 1;
					try {
						const pulled = face.loadOlder();
						if (pulled !== void 0 && typeof pulled.then === "function") pulled.then(() => {}, () => {});
					} catch (error) {}
					timer = window.setTimeout(step, STEP_DELAY_MS);
				};
				timer = window.setTimeout(step, WAIT_DELAY_MS);
				return () => {
					cancelled = true;
					try {
						window.clearTimeout(timer);
					} catch (error) {}
				};
			}, [
				enabled,
				props.sessionId,
				props.sessionsApi
			]);
			return null;
		}
		// #endregion
		// #region settings row
		/**
		 * Settings → General row: one on/off switch for this plugin.
		 * @param props - composed Settings slot props plus this plugin's injected face.
		 * @returns the preference row.
		 */
		function AutoLoadRow(props) {
			const t = props.t;
			const [enabled, setLocal] = (0, react.useState)(() => props.getEnabled());
			(0, react.useEffect)(() => props.subscribeEnabled(() => setLocal(props.getEnabled())), [props]);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "ahl-row",
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: "ahl-rowText",
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: "ahl-title",
						children: t("title")
					}), (0, react_jsx_runtime.jsx)("div", {
						className: "ahl-desc",
						children: t("description")
					})]
				}), (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ahl-toggle",
					"aria-pressed": enabled,
					onClick: () => props.setEnabled(!enabled),
					children: enabled ? t("on") : t("off")
				})]
			});
		}
		// #endregion
		// #region plugin
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"sessions"
		];
		/**
		 * Client plugin body: own the preference, seat the Session pager, and expose
		 * the Settings row.
		 * @param ctx - client cordis context.
		 */
		function apply(ctx) {
			/** Durable preference scope; absent compositions fall back to process-local. */
			let host;
			try {
				host = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
			} catch (error) {
				host = void 0;
			}
			let current = DEFAULT_ENABLED;
			const listeners = /* @__PURE__ */ new Set();
			const publish = () => {
				for (const listener of [...listeners]) {
					try {
						listener();
					} catch (error) {}
				}
			};
			/** Adopt the scope's accepted durable value without writing it back. */
			const adopt = () => {
				const section = host === void 0 ? void 0 : host.getSnapshot().value;
				const raw = section === void 0 || section === null ? void 0 : section[FIELD];
				const next = typeof raw === "boolean" ? raw : DEFAULT_ENABLED;
				if (next === current) return;
				current = next;
				publish();
			};
			if (host !== void 0) {
				ctx.effect(() => host.subscribe(adopt), "history-autoload: settings scope adoption");
				adopt();
			}
			const getEnabled = () => current;
			const subscribeEnabled = (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			};
			const setEnabled = (value) => {
				const next = value === true;
				if (next === current) return;
				current = next;
				publish();
				if (host !== void 0) {
					try {
						host.set(FIELD, next);
					} catch (error) {}
				}
			};
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "history-autoload: dictionaries");
			ctx.slots.inject(SESSION_SLOT, () => ctx.slots.register({
				name: SESSION_SLOT,
				id: "history-autoload",
				order: 90,
				locale: NS,
				inject: () => ({
					sessionsApi: ctx.sessions,
					getEnabled,
					subscribeEnabled
				})
			}, AutoLoadSeat));
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "history-autoload",
				order: 14,
				locale: NS,
				inject: () => ({
					getEnabled,
					subscribeEnabled,
					setEnabled
				})
			}, AutoLoadRow));
		}
		// #endregion
		exports.AutoLoadSeat = AutoLoadSeat;
		exports.AutoLoadRow = AutoLoadRow;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
