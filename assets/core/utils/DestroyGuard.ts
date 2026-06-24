import { CCObject, Node, isValid } from "cc";
import { DEBUG } from "cc/env";

type DestroyFunction = () => boolean;
type NodeOffFunction = (type: string, callback?: (...args: any[]) => void, target?: unknown, useCapture?: boolean) => void;

const DESTROY_GUARD_KEY = "__oopsDestroyGuardInstalled";
const NODE_OFF_GUARD_KEY = "__oopsNodeOffGuardInstalled";

/** Guards Cocos destroy calls that arrive after an object is already invalid. */
export class DestroyGuard {
    private static loggedTargets = new WeakSet<CCObject>();
    private static loggedNodeOffTargets = new WeakSet<Node>();

    static install(): void {
        this.installDestroyGuard();
        this.installNodeOffGuard();
    }

    private static installDestroyGuard(): void {
        const prototype = CCObject.prototype as CCObject & Record<string, unknown>;
        if (prototype[DESTROY_GUARD_KEY]) {
            return;
        }

        const originalDestroy = prototype.destroy as DestroyFunction;
        prototype.destroy = function destroyWithGuard(this: CCObject): boolean {
            if (!isValid(this, true)) {
                DestroyGuard.logDuplicateDestroy(this);
                return false;
            }

            return originalDestroy.call(this);
        };
        prototype[DESTROY_GUARD_KEY] = true;
    }

    private static installNodeOffGuard(): void {
        const prototype = Node.prototype as Node & Record<string, unknown>;
        if (prototype[NODE_OFF_GUARD_KEY]) {
            return;
        }

        const originalOff = prototype.off as NodeOffFunction;
        prototype.off = function offWithGuard(this: Node, type: string, callback?: (...args: any[]) => void, target?: unknown, useCapture?: boolean): void {
            const eventProcessor = (this as Node & { _eventProcessor?: unknown })._eventProcessor;
            if (!isValid(this, true) || eventProcessor == null) {
                DestroyGuard.logInvalidNodeOff(this, type);
                return;
            }

            originalOff.call(this, type, callback, target, useCapture);
        };
        prototype[NODE_OFF_GUARD_KEY] = true;
    }

    private static logDuplicateDestroy(target: CCObject): void {
        if (!DEBUG || this.loggedTargets.has(target)) {
            return;
        }

        this.loggedTargets.add(target);
        const stack = new Error().stack ?? "";
        console.warn(`[Oops DestroyGuard] Duplicate destroy ignored: ${this.describeTarget(target)}\n${stack}`);
    }

    private static logInvalidNodeOff(node: Node, type: string): void {
        if (!DEBUG || this.loggedNodeOffTargets.has(node)) {
            return;
        }

        this.loggedNodeOffTargets.add(node);
        const stack = new Error().stack ?? "";
        console.warn(`[Oops DestroyGuard] Node.off ignored after node event processor was destroyed: "${type}" on "${this.getNodePath(node)}"\n${stack}`);
    }

    private static describeTarget(target: CCObject): string {
        if (target instanceof Node) {
            return `Node "${target.name}" path "${this.getNodePath(target)}"`;
        }

        const targetWithNode = target as CCObject & { node?: unknown };
        if (targetWithNode.node instanceof Node) {
            return `${target.constructor.name} on "${this.getNodePath(targetWithNode.node)}"`;
        }

        return target.constructor.name;
    }

    private static getNodePath(node: Node): string {
        const names: string[] = [];
        let current: Node | null = node;
        while (current) {
            names.unshift(current.name);
            current = current.parent;
        }

        return names.join("/");
    }
}
