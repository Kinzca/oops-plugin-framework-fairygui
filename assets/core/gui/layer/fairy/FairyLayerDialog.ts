import { Node } from "cc";
import { UIParam, UIState } from "../LayerUIElement";
import { UIConfig } from "../UIConfig";
import { FairyLayerPopUp } from "./FairyLayerPopup";

/** FairyGUI模式弹窗数据 */
type DialogParam = {
    /** 弹窗唯一编号 */
    uiid: string;
    /** 窗口配置 */
    config: UIConfig;
    /** 窗口附加参数 */
    params?: UIParam;
}

/** FairyGUI模式弹窗层，该层的窗口同时只能显示一个 */
export class FairyLayerDialog extends FairyLayerPopUp {
    /** 窗口调用参数队列 */
    private params: Array<DialogParam> = [];
    /** 当前打开的界面 */
    private current: Node = null!;

    add(uiid: string, config: UIConfig, params?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve) => {
            if (this.ui_nodes.size > 0) {
                this.params.push({ uiid: uiid, config: config, params: params });
                resolve(this.current);
            }
            else {
                this.current = await this.showDialog(uiid, config, params);
                resolve(this.current);
            }
        });
    }

    /** 显示模式弹窗 */
    private showDialog(uiid: string, config: UIConfig, param?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve) => {
            const node = await super.add(uiid, config, param);
            resolve(node);
        });
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);
        setTimeout(this.next.bind(this), 0);
    }

    private next() {
        if (this.params.length > 0) {
            const param = this.params.shift()!;
            this.showDialog(param.uiid, param.config, param.params);
        }
    }
}
