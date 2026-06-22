import { Component, Node, _decorator } from "cc";
import * as fgui from "fairygui-cc";
import { LayerUIElement, UIParam, UIState } from "../LayerUIElement";
import { FairyPackageLoader } from "./FairyPackageLoader";

const EventOnAdded: string = "onAdded";
const EventOnBeforeRemove: string = "onBeforeRemove";
const EventOnRemoved: string = "onRemoved";

const { ccclass } = _decorator;

/** 本类型仅供gui模块内部使用，请勿在功能逻辑中使用 */
export class FairyUIState extends UIState {
    /** FairyGUI界面对象 */
    view: fgui.GComponent = null!;
    /** 界面唯一键 */
    key: string = "";
}

/** FairyGUI窗口元素组件 */
@ccclass("FairyLayerUIElement")
export class FairyLayerUIElement extends LayerUIElement {
    /** FairyGUI界面对象 */
    view: fgui.GComponent = null!;
    /** 视图参数 */
    state: FairyUIState = null!;

    /** 添加界面且界面设置到父节点之前 */
    add(): Promise<boolean> {
        return new Promise(async (resolve) => {
            for (let i = 0; i < this.node.components.length; i++) {
                const component: any = this.node.components[i];
                const func = component[EventOnAdded];
                if (func) {
                    if (await func.call(component, this.state.params.data, this.view) == false) {
                        resolve(false);
                        return;
                    }
                }
            }

            if (typeof (this.state.params as FairyUIParam).onFairyAdded === "function") {
                (this.state.params as FairyUIParam).onFairyAdded!(this.node, this.state.params.data, this.view);
            }

            if (typeof this.state.params.onAdded === "function") {
                this.state.params.onAdded(this.node, this.state.params.data);
            }

            resolve(true);
        });
    }

    /** 删除节点，该方法只能调用一次，将会触发onBeforeRemoved回调 */
    remove(isDestroy: boolean) {
        if (this.state.valid) {
            this.applyFairyComponentsFunction(this.node, EventOnBeforeRemove, this.state.params.data);

            if (typeof this.state.params.onBeforeRemove === "function") {
                this.state.params.onBeforeRemove(this.node, this.onFairyBeforeRemoveNext.bind(this, isDestroy));
            }
            else {
                this.onFairyBeforeRemoveNext(isDestroy);
            }
        }
        else {
            this.onFairyBeforeRemoveNext(isDestroy);
        }
    }

    private onFairyBeforeRemoveNext(isDestroy: boolean) {
        this.state.valid = false;

        if (this.state.params && typeof this.state.params.onRemoved === "function") {
            this.state.params.onRemoved(this.node, this.state.params.data);
        }

        this.onClose && this.onClose();
        this.applyFairyComponentsFunction(this.node, EventOnRemoved, this.state.params.data);

        if (isDestroy) {
            if (this.view && !this.view.isDisposed) this.view.dispose();
            else if (this.node && this.node.isValid) this.node.destroy();

            FairyPackageLoader.remove(this.state.config);
        }
        else if (this.view && !this.view.isDisposed) {
            this.view.removeFromParent();
        }
    }

    private applyFairyComponentsFunction(node: Node, funName: string, params: any) {
        for (let i = 0; i < node.components.length; i++) {
            const component: Component & any = node.components[i];
            const func = component[funName];
            if (func) {
                func.call(component, params, this.view);
            }
        }
    }

    onDestroy() {
        this.view = null!;
        this.state = null!;
        this.onClose = null!;
    }
}

/** FairyGUI界面打开参数 */
export interface FairyUIParam extends UIParam {
    /**
     * 节点添加到层级以后的回调
     * @param node   当前界面节点
     * @param params 外部传递参数
     * @param view   FairyGUI界面对象
     */
    onFairyAdded?: (node: Node, params: any, view: fgui.GComponent) => void,
}
