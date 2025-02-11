import { SidebarProps } from '../../types/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ExternalLinkIcon } from 'lucide-react';

export const Sidebar = ({ sections, className }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.title ?? sectionIndex} className="px-3 py-2">
            {section.title && (
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                {section.title}
              </h2>
            )}
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (sectionIndex * 5 + itemIndex) * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                      pathname === item.href ? 'bg-accent' : 'transparent',
                      item.disabled && 'pointer-events-none opacity-50'
                    )}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                  >
                    {item.icon && (
                      <item.icon className="mr-2 h-4 w-4" />
                    )}
                    <span>{item.title}</span>
                    {item.label && (
                      <span
                        className="ml-auto text-xs text-muted-foreground"
                      >
                        {item.label}
                      </span>
                    )}
                    {item.external && (
                      <ExternalLinkIcon className="ml-2 h-4 w-4" />
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
