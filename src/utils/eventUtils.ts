// Check if the browser supports passive event listeners
export const supportsPassive = (() => {
  let passiveSupported = false;

  try {
    const options = {
      get passive() {
        passiveSupported = true;
        return false;
      }
    };

    window.addEventListener("test", null as any, options);
    window.removeEventListener("test", null as any, options);
  } catch (err) {
    passiveSupported = false;
  }

  return passiveSupported;
})();

// Get event listener options based on browser support
export const getEventListenerOptions = (wantsPassive: boolean = true) => 
  supportsPassive ? { passive: wantsPassive } : false;

// Utility function to add event listener with passive option
export const addPassiveEventListener = (
  element: Element | Window | Document,
  eventName: string,
  callback: EventListenerOrEventListenerObject,
  wantsPassive: boolean = true
) => {
  element.addEventListener(
    eventName,
    callback,
    getEventListenerOptions(wantsPassive)
  );
};

// Utility function to remove event listener with passive option
export const removePassiveEventListener = (
  element: Element | Window | Document,
  eventName: string,
  callback: EventListenerOrEventListenerObject,
  wantsPassive: boolean = true
) => {
  element.removeEventListener(
    eventName,
    callback,
    getEventListenerOptions(wantsPassive)
  );
}; 