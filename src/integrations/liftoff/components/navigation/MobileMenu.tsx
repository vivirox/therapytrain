import { MobileMenuProps } from '../../types/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';

export const MobileMenu = ({ sections, className }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('md:hidden', className)}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80vw] p-0 sm:max-w-[350px]">
        <Sidebar
          sections={sections}
          className="border-none"
        />
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
