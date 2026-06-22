import { Color } from "cc";
import * as fgui from "fairygui-cc";
import { UIParam, UIState } from "../LayerUIElement";
import { UIConfig } from "../UIConfig";
import { FairyLayerUI } from "./FairyLayerUI";
import { FairyUIState } from "./FairyLayerUIElement";

/** FairyGUI弹窗层，允许同时弹出多个窗口 */
export class FairyLayerPopUp extends FairyLayerUI {
    /** 半透明遮罩资源 */
    protected mask: fgui.GGraph = null!;

    protected fairyUiInit(state: FairyUIState): Promise<boolean> {
        return new Promise(async (resolve) => {
            const r = await super.fairyUiInit(state);
            if (r) {
                this.openVacancyRemove(state.config);
            }
            resolve(r);
        });
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);
        this.closeMask();
    }

    /** 打开遮罩与触摸非窗口区域关闭 */
    protected openVacancyRemove(config: UIConfig) {
        if (this.mask == null) {
            this.mask = new fgui.GGraph();
            this.mask.name = "FairyPopupMask";
            this.mask.makeFullScreen();
            this.mask.drawRect(0, Color.TRANSPARENT, new Color(0, 0, 0, 153));
            this.mask.onClick(this.onTouchMask, this);
        }

        if (config.mask && this.mask.parent !== this.fguiContainer) {
            this.fguiContainer.addChildAt(this.mask, Math.max(0, this.fguiContainer.numChildren - 1));
        }
        else if (config.mask) {
            this.fguiContainer.setChildIndex(this.mask, Math.max(0, this.fguiContainer.numChildren - 2));
        }
    }

    /** 关闭遮罩 */
    protected closeMask() {
        if (this.mask == null) return;

        let hasMask = false;
        for (let value of this.ui_nodes.values()) {
            if (value.config.mask) {
                hasMask = true;
                break;
            }
        }

        if (!hasMask) {
            this.mask.removeFromParent();
        }
    }

    /** 触摸非窗口区域关闭 */
    private onTouchMask() {
        if (this.ui_nodes.size > 0) {
            const state = this.ui_nodes.array[this.ui_nodes.size - 1];
            if (state.valid && state.config.vacancy) {
                this.remove((state as FairyUIState).key);
            }
        }
    }

    clear(isDestroy: boolean) {
        super.clear(isDestroy);
        this.closeMask();
    }
}
