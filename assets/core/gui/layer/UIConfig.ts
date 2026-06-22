import { Node, Vec3 } from "cc";

/** 
 * 界面配置结构体
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037986&doc_id=2873565
 * @example
// 界面唯一标识
export enum UIID {
    Loading = 1,
    Window,
    Netinstable
}

// 打开界面方式1
export var UIConfigData: { [key: number]: UIConfig } = {
    [UIID.Loading]: { layer: LayerType.UI, prefab: "loading/prefab/loading", bundle: "resources" },
    [UIID.Netinstable]: { layer: LayerType.PopUp, prefab: "common/prefab/netinstable" },
    [UIID.Window]: { layer: LayerType.Dialog, prefab: "common/prefab/window" }
}

// 打开界面方式2
export class InitializeUIConfig {
    static Loading = { layer: LayerType.UI, prefab: "gui/loading/loading" }
}
 */
export interface UIConfig {
    /** -----公共属性----- */
    /** 远程包名 */
    bundle?: string;
    /** 窗口层级 */
    layer: string;
    /** 预制资源相对路径 */
    prefab?: string;
    /** 是否自动施放（默认自动释放） */
    destroy?: boolean;

    /** -----FairyGUI属性----- */
    /** FairyGUI 包名 */
    fguiPackage?: string;
    /** FairyGUI 组件名 */
    fguiComponent?: string;
    /** FairyGUI 发布资源路径；默认 UI/{fguiPackage}，相对 resources 或 Asset Bundle 根目录 */
    fguiPackagePath?: string;
    /** 是否在打开时铺满 GRoot（默认铺满） */
    fguiMakeFullScreen?: boolean;
    /** 关闭并销毁界面时是否卸载 FairyGUI 包（默认不卸载，避免共享包被误释放） */
    fguiReleasePackage?: boolean;

    /** -----弹窗属性----- */
    /** 是否触摸非窗口区域关闭（默认关闭） */
    vacancy?: boolean,
    /** 是否打开窗口后显示背景遮罩（默认关闭） */
    mask?: boolean;
    /** 是否启动真机安全区域显示（默认关闭） */
    safeArea?: boolean;
    /** 界面弹出时的节点排序索引 */
    siblingIndex?: number;
}

/** 是否使用 FairyGUI 界面配置 */
export function isFairyUIConfig(config: UIConfig): boolean {
    return !!(config.fguiPackage || config.fguiComponent || config.fguiPackagePath);
}

/** 获取 FairyGUI 包名 */
export function getFairyPackageName(config: UIConfig): string {
    if (config.fguiPackage) return config.fguiPackage;
    if (config.fguiPackagePath) {
        const segments = config.fguiPackagePath.split("/");
        return segments[segments.length - 1];
    }
    throw new Error("FairyGUI界面配置缺少 fguiPackage");
}

/** 获取 FairyGUI 组件名 */
export function getFairyComponentName(config: UIConfig): string {
    if (config.fguiComponent) return config.fguiComponent;
    throw new Error("FairyGUI界面配置缺少 fguiComponent");
}

/** 获取 FairyGUI 包资源路径 */
export function getFairyPackagePath(config: UIConfig): string {
    return config.fguiPackagePath ?? `UI/${getFairyPackageName(config)}`;
}

/** 获取界面在层级管理器中的唯一键 */
export function getUIConfigKey(config: UIConfig): string {
    if (isFairyUIConfig(config)) {
        const bundle = config.bundle ?? "resources";
        return `${bundle}:${getFairyPackageName(config)}/${getFairyComponentName(config)}`;
    }
    if (config.prefab) return config.prefab;
    throw new Error("界面配置缺少 prefab 或 FairyGUI 配置信息");
}

/** 游戏元素配置 */
export interface GameElementConfig {
    /** 预制资源相对路径 */
    prefab?: string;
    /** 游戏元素副节点 */
    parent?: Node;
    /** 游戏元素位置 */
    position?: Vec3;
    /** 游戏元素旋转 */
    eulerAngles?: Vec3;
    /** 游戏元素缩放 */
    scale?: Vec3;
    /** 远程包名 */
    bundle?: string;
    /** 节点排序索引 */
    siblingIndex?: number;
}
