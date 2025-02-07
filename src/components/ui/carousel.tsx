import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>[0]

interface CarouselProps {
  opts?: UseCarouselParameters
  plugins?: UseEmblaCarouselType[2]
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
    className?: string;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )

    const [prevBtnDisabled, setPrevBtnDisabled] = React.useState(true)
    const [nextBtnDisabled, setNextBtnDisabled] = React.useState(true)
    const [selectedIndex, setSelectedIndex] = React.useState(0)

    const scrollPrev = React.useCallback(() => {
      if (emblaApi) emblaApi.scrollPrev()
    }, [emblaApi])

    const scrollNext = React.useCallback(() => {
      if (emblaApi) emblaApi.scrollNext()
    }, [emblaApi])

    const scrollTo = React.useCallback(
      (index: number) => {
        if (emblaApi) emblaApi.scrollTo(index)
      },
      [emblaApi]
    )

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (emblaApi) {
        setApi?.(emblaApi)
      }
    }, [emblaApi, setApi])

    React.useEffect(() => {
      if (emblaApi) {
        const onSelect = () => {
          setSelectedIndex(emblaApi.selectedScrollSnap())
          setPrevBtnDisabled(!emblaApi.canScrollPrev())
          setNextBtnDisabled(!emblaApi.canScrollNext())
        }

        emblaApi.on("reInit", onSelect)
        emblaApi.on("select", onSelect)

        onSelect()

        return () => {
          emblaApi.off("select", onSelect)
        }
      }
    }, [emblaApi])

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div
          ref={emblaRef}
          className="overflow-hidden"
          dir="ltr"
        >
          <div
            className={cn(
              "flex",
              orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
              className
            )}
          >
            {React.Children.map(children, (child) => (
              <div
                className={cn(
                  "min-w-0 flex-[0_0_100%]",
                  orientation === "horizontal" ? "pl-4" : "pt-4"
                )}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
        {/* Navigation Buttons */}
        <div className="flex justify-end gap-2 py-2">
          <Button
            variant="outline"
            size="icon"
            disabled={prevBtnDisabled}
            onClick={scrollPrev}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Previous slide</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={nextBtnDisabled}
            onClick={scrollNext}
          >
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">Next slide</span>
          </Button>
        </div>
      </div>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn("absolute left-4 top-1/2 -translate-y-1/2", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn("absolute right-4 top-1/2 -translate-y-1/2", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

const CarouselContext = React.createContext<{
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

export {
  type CarouselApi,
  Carousel,
  CarouselPrevious,
  CarouselNext,
  CarouselContext,
  useCarousel,
}
