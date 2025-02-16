import { useState } from 'react';

export function useBlockSelector(): { isVisible: boolean; setIsVisible: (value: boolean) => void } {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  return {
    isVisible,
    setIsVisible,
  };
}
