// Check if the browser supports passive event listeners
export function supportsPassiveEvents(): boolean {
    let supportsPassive = false;
    try {
        const options = {
            get passive() {
                supportsPassive = true;
                return true;
            }
        } as AddEventListenerOptions;
        window.addEventListener("test", null as any, options);
        window.removeEventListener("test", null as any, options);
    }
    catch (e) {
        supportsPassive = false;
    }
    return supportsPassive;
}
// Get event listener options based on browser support
export const getEventListenerOptions = (wantsPassive: boolean = true) => supportsPassiveEvents() ? { passive: wantsPassive } : false;
// Utility function to add event listener with passive option
export function addPassiveEventListener(
    element: HTMLElement | Window | Document,
    eventName: string,
    handler: EventListener,
    wantsPassive: boolean = false
): void {
    element.addEventListener(eventName, handler, {
        passive: wantsPassive,
    });
}
// Utility function to remove event listener with passive option
export function removePassiveEventListener(
    element: HTMLElement | Window | Document,
    eventName: string,
    handler: EventListener
): void {
    element.removeEventListener(eventName, handler);
}

export function preventDefault(event: Event): void {
    event.preventDefault();
}

export function stopPropagation(event: Event): void {
    event.stopPropagation();
}

export function isPassiveEventSupported(): boolean {
    let passiveSupported = false;
    try {
        const options = {
            get passive() {
                passiveSupported = true;
                return false;
            },
        };
        window.addEventListener('test', null as any, options);
        window.removeEventListener('test', null as any, options);
    } catch (err) {
        passiveSupported = false;
    }
    return passiveSupported;
}

export function getEventTarget(event: Event): EventTarget | null {
    return event.target;
}

export function getEventCurrentTarget(event: Event): EventTarget | null {
    return event.currentTarget;
}

export function getEventType(event: Event): string {
    return event.type;
}

export function getEventTimestamp(event: Event): number {
    return event.timeStamp;
}

export function isEventTrusted(event: Event): boolean {
    return event.isTrusted;
}

export function getEventPhase(event: Event): number {
    return event.eventPhase;
}

export function getEventBubbles(event: Event): boolean {
    return event.bubbles;
}

export function getEventCancelable(event: Event): boolean {
    return event.cancelable;
}

export function getEventDefaultPrevented(event: Event): boolean {
    return event.defaultPrevented;
}

export function getEventComposed(event: Event): boolean {
    return event.composed;
}

export function getEventPath(event: Event): EventTarget[] {
    return event.composedPath();
}
