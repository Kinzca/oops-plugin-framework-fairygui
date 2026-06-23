import { Node, SafeArea } from "cc";
import * as fgui from "fairygui-cc";
import { Collection } from "db://oops-framework/libs/collection/Collection";
import { oops } from "../../../Oops";
import { Uiid } from "../LayerEnum";
import { LayerUI } from "../LayerUI";
import { UIParam, UIState } from "../LayerUIElement";
import { getFairyComponentName, getFairyPackageName, getUIConfigKey, isFairyUIConfig, UIConfig } from "../UIConfig";
import { FairyLayerUIElement, FairyUIState } from "./FairyLayerUIElement";
import { FairyPackageLoader } from "./FairyPackageLoader";

/** FairyGUI界面层对象 */
export class FairyLayerUI extends LayerUI {
    /** FairyGUI层容器 */
    protected fguiContainer: fgui.GComponent = null!;
    /** 显示界面节点集合 */
    protected ui_nodes = new Collection<string, UIState>();
    /** 被移除的界面缓存数据 */
    protected ui_cache = new Map<string, UIState>();

    constructor(name: string) {
        super(name);

        this.fguiContainer = new fgui.GComponent();
        this.fguiContainer.name = `${name}_FairyContainer`;
        this.fguiContainer.makeFullScreen();
        fgui.GRoot.inst.addChild(this.fguiContainer);
    }

    add(uiid: Uiid, config: UIConfig, params?: UIParam): Promise<Node> {
        if (!isFairyUIConfig(config)) {
            return super.add(uiid, config, params);
        }

        return new Promise<Node>(async (resolve) => {
            const key = getUIConfigKey(config);
            const existing = this.ui_nodes.get(key);
            if (existing) {
                resolve(existing.node);
                return;
            }

            const state = this.initFairyUIConfig(uiid, config, params);
            await this.loadFairy(state);
            resolve(state.node);
        });
    }

    /** 初始化FairyGUI界面配置初始值 */
    protected initFairyUIConfig(uiid: Uiid, config: UIConfig, params?: UIParam) {
        const key = getUIConfigKey(config);
        let state = this.ui_cache.get(key) as FairyUIState;
        if (state == null) {
            if (config.destroy == null) config.destroy = true;
            if (config.vacancy == null) config.vacancy = false;
            if (config.mask == null) config.mask = false;
            if (config.safeArea == null) config.safeArea = false;
            if (config.fguiMakeFullScreen == null) config.fguiMakeFullScreen = true;

            state = new FairyUIState();
            state.uiid = uiid.toString();
            state.config = config;
            state.key = key;
        }
        state.params = params ?? {};
        state.valid = true;
        state.removing = false;
        this.ui_nodes.set(key, state);
        return state;
    }

    /** 加载FairyGUI界面资源 */
    protected async loadFairy(state: FairyUIState): Promise<Node> {
        return new Promise<Node>(async (resolve) => {
            if (state.node == null) {
                const timerId = setTimeout(this.onFairyLoadingTimeoutGui, oops.config.game.loadingTimeoutGui);

                try {
                    await FairyPackageLoader.load(state.config);

                    const view = fgui.UIPackage.createObject(
                        getFairyPackageName(state.config),
                        getFairyComponentName(state.config)
                    ).asCom;

                    if (!view) {
                        console.warn(`FairyGUI界面创建失败: ${state.key}`);
                        this.failure(state);
                        return;
                    }

                    if (state.config.fguiMakeFullScreen) view.makeFullScreen();

                    state.view = view;
                    state.node = view.node;

                    if (state.config.safeArea) state.node.addComponent(SafeArea);

                    const comp = state.node.addComponent(FairyLayerUIElement);
                    comp.state = state;
                    comp.view = view;
                    comp.onClose = this.closeUi.bind(this, state);
                }
                catch (error) {
                    console.warn(`FairyGUI界面加载失败: ${state.key}`, error);
                    this.failure(state);
                    return;
                }
                finally {
                    oops.gui.waitClose();
                    clearTimeout(timerId);
                }
            }

            await this.fairyUiInit(state);
            resolve(state.node);
        });
    }

    /** 创建FairyGUI界面节点 */
    protected fairyUiInit(state: FairyUIState): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            const comp = state.node.getComponent(FairyLayerUIElement)!;
            const r = await comp.add();
            if (r) {
                state.valid = true;
                if (!state.params.preload) {
                    state.params.preload = false;
                    this.attachFairyView(state);
                }
            }
            else {
                console.warn(`FairyGUI界面【${state.key}】自定义预处理逻辑异常`);
                this.failure(state);
            }
            resolve(r);
        });
    }

    /** 添加FairyGUI界面到当前层容器 */
    protected attachFairyView(state: FairyUIState) {
        if (state.view.parent !== this.fguiContainer) {
            this.fguiContainer.addChild(state.view);
        }

        if (state.config.siblingIndex != null) {
            this.fguiContainer.setChildIndex(state.view, state.config.siblingIndex);
        }
    }

    /** 加载超时事件 */
    private onFairyLoadingTimeoutGui() {
        oops.gui.waitOpen();
    }

    /** 窗口关闭事件 */
    protected closeUi(state: UIState) {
        if (state instanceof FairyUIState || (state as FairyUIState).view) {
            this.ui_nodes.delete((state as FairyUIState).key);
            return;
        }
        super.closeUi(state);
    }

    protected failure(state: UIState) {
        this.closeUi(state);
        this.onOpenFailure && this.onOpenFailure();
    }

    remove(key: string): void {
        const state = this.ui_nodes.get(key) as FairyUIState;
        if (!state || !state.view) {
            super.remove(key);
            return;
        }

        const release = state.config.destroy!;
        if (release === false) this.ui_cache.set(state.key, state);

        if (state.valid && !state.removing) {
            const comp = state.node.getComponent(FairyLayerUIElement);
            comp && comp.remove(release);
        }
    }

    removeCache(key: string) {
        const state = this.ui_cache.get(key) as FairyUIState;
        if (!state || !state.view) {
            super.removeCache(key);
            return;
        }

        this.ui_cache.delete(key);
        const comp = state.node.getComponent(FairyLayerUIElement);
        comp && comp.remove(true);
    }

    show(key: string) {
        const state = this.ui_nodes.get(key) as FairyUIState;
        if (!state || !state.view) {
            super.show(key);
            return;
        }
        this.attachFairyView(state);
    }

    get(key: string): Node {
        const state = this.ui_nodes.get(key);
        if (state) return state.node;
        return super.get(key);
    }

    has(key: string): boolean {
        return this.ui_nodes.has(key) || super.has(key);
    }

    clear(isDestroy: boolean): void {
        const length = this.ui_nodes.array.length - 1;
        for (let i = length; i >= 0; i--) {
            const state = this.ui_nodes.array[i];
            this.remove(getUIConfigKey(state.config));
        }
        this.ui_nodes.clear();

        if (isDestroy) {
            this.ui_cache.forEach((value, key) => {
                this.removeCache(key);
            });
        }
    }

    onDestroy() {
        this.clear(true);
        if (this.fguiContainer && !this.fguiContainer.isDisposed) {
            if (this.fguiContainer.parent) this.fguiContainer.removeFromParent();
            if (this.fguiContainer.node && this.fguiContainer.node.isValid) this.fguiContainer.node.destroy();
        }
    }
}
