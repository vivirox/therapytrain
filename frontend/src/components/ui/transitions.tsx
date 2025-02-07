import { Fragment, useRef, useState, useEffect } from "react";
import { Transition } from "@headlessui/react";

interface FadeProps {
  show?: boolean;
  appear?: boolean;
  children: React.ReactNode;
  className?: string;
  unmount?: boolean;
}

export function Fade({
  show = true,
  appear = false,
  children,
  className = "",
  unmount = true,
}: FadeProps) {
  return (
    <Transition
      as={Fragment}
      appear={appear}
      show={show}
      enter="transition-opacity duration-200"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-150"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      unmount={unmount}
    >
      <div className={className}>{children}</div>
    </Transition>
  );
}

interface SlideProps extends FadeProps {
  direction?: "up" | "down" | "left" | "right";
}

export function Slide({
  show = true,
  appear = false,
  children,
  className = "",
  direction = "right",
  unmount = true,
}: SlideProps) {
  const getSlideTransform = () => {
    switch (direction) {
      case "up":
        return "translate-y-2";
      case "down":
        return "-translate-y-2";
      case "left":
        return "translate-x-2";
      case "right":
        return "-translate-x-2";
      default:
        return "-translate-x-2";
    }
  };

  return (
    <Transition
      as={Fragment}
      appear={appear}
      show={show}
      enter="transform transition-all duration-200 ease-out"
      enterFrom={`opacity-0 ${getSlideTransform()}`}
      enterTo="opacity-100 translate-x-0 translate-y-0"
      leave="transform transition-all duration-150 ease-in"
      leaveFrom="opacity-100 translate-x-0 translate-y-0"
      leaveTo={`opacity-0 ${getSlideTransform()}`}
      unmount={unmount}
    >
      <div className={className}>{children}</div>
    </Transition>
  );
}

interface ScaleProps extends FadeProps {
  origin?: "center" | "top" | "bottom" | "left" | "right";
}

export function Scale({
  show = true,
  appear = false,
  children,
  className = "",
  origin = "center",
  unmount = true,
}: ScaleProps) {
  const getScaleOrigin = () => {
    switch (origin) {
      case "center":
        return "origin-center";
      case "top":
        return "origin-top";
      case "bottom":
        return "origin-bottom";
      case "left":
        return "origin-left";
      case "right":
        return "origin-right";
      default:
        return "origin-center";
    }
  };

  return (
    <Transition
      as={Fragment}
      appear={appear}
      show={show}
      enter={`transform transition-all duration-200 ease-out ${getScaleOrigin()}`}
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave={`transform transition-all duration-150 ease-in ${getScaleOrigin()}`}
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
      unmount={unmount}
    >
      <div className={className}>{children}</div>
    </Transition>
  );
}

export function useInView(options = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return { ref, isInView };
}
