import { AssetManager, assetManager } from "cc";
import * as fgui from "fairygui-cc";
import { getFairyPackageName, getFairyPackagePath, UIConfig } from "../UIConfig";

/** FairyGUI包加载器 */
export class FairyPackageLoader {
    private static loading: Map<string, Promise<fgui.UIPackage>> = new Map();

    /** 加载FairyGUI包 */
    static load(config: UIConfig): Promise<fgui.UIPackage> {
        const packageName = getFairyPackageName(config);
        const packagePath = getFairyPackagePath(config);
        const loaded = fgui.UIPackage.getByName(packageName);
        if (loaded) return Promise.resolve(loaded);

        const bundleName = config.bundle ?? "resources";
        const key = `${bundleName}:${packagePath}`;
        const current = this.loading.get(key);
        if (current) return current;

        const promise = new Promise<fgui.UIPackage>((resolve, reject) => {
            const complete = (error: any, pkg: fgui.UIPackage) => {
                this.loading.delete(key);
                if (error || !pkg) {
                    reject(error ?? new Error(`FairyGUI包加载失败: ${packagePath}`));
                    return;
                }
                resolve(pkg);
            };

            if (bundleName && bundleName !== "resources") {
                assetManager.loadBundle(bundleName, (error, bundle) => {
                    if (error || !bundle) {
                        complete(error ?? new Error(`AssetBundle加载失败: ${bundleName}`), null!);
                        return;
                    }
                    fgui.UIPackage.loadPackage(bundle as AssetManager.Bundle, packagePath, complete);
                });
            }
            else {
                fgui.UIPackage.loadPackage(packagePath, complete);
            }
        });

        this.loading.set(key, promise);
        return promise;
    }

    /** 按配置卸载FairyGUI包 */
    static remove(config: UIConfig) {
        if (config.fguiReleasePackage) {
            fgui.UIPackage.removePackage(getFairyPackageName(config));
        }
    }
}
