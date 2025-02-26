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

interface EventOptions {
    passive?: boolean;
    capture?: boolean;
}

export function addPassiveEventListener(
    element: Window | Element,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options: EventOptions = {}
): void {
    let supportsPassive = false;
    try {
        const opts = Object.defineProperty({}, 'passive', {
            get: function() {
                supportsPassive = true;
                return true;
            },
        });
        window.addEventListener('test', null as any, opts);
    } catch (e) {
        // Do nothing
    }

    element.addEventListener(
        eventName,
        handler,
        supportsPassive ? { ...options, passive: true } : options.capture
    );
}

export function removePassiveEventListener(
    element: Window | Element,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options: EventOptions = {}
): void {
    element.removeEventListener(
        eventName,
        handler,
        options.capture
    );
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
