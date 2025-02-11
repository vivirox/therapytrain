import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  external?: boolean;
  label?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  sections: NavSection[];
  className?: string;
}

export interface HeaderProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export interface MobileMenuProps {
  sections: NavSection[];
  className?: string;
} 