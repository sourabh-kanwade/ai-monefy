import React from 'react';
import {
  Award,
  Banknote,
  Book,
  Briefcase,
  Camera,
  Car,
  Circle,
  Coffee,
  CreditCard,
  Dog,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  Music,
  PiggyBank,
  Plane,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  banknote: Banknote,
  book: Book,
  briefcase: Briefcase,
  camera: Camera,
  car: Car,
  circle: Circle,
  coffee: Coffee,
  creditcard: CreditCard,
  dog: Dog,
  film: Film,
  gamepad2: Gamepad2,
  gift: Gift,
  graduationcap: GraduationCap,
  heartpulse: HeartPulse,
  home: Home,
  morehorizontal: MoreHorizontal,
  music: Music,
  piggybank: PiggyBank,
  plane: Plane,
  shield: Shield,
  shirt: Shirt,
  shoppingbag: ShoppingBag,
  shoppingcart: ShoppingCart,
  smartphone: Smartphone,
  smile: Smile,
  tag: Tag,
  trendingup: TrendingUp,
  utensils: Utensils,
  wallet: Wallet,
  zap: Zap,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className,
}) => {
  // Normalize icon key (case-insensitive, remove spaces/hyphens/underscores)
  const normalizedKey = (name || '').toLowerCase().replace(/[-_\s]/g, '');
  const IconComponent = ICON_MAP[normalizedKey] || Tag;

  const iconColor = color === 'inherit' ? 'currentColor' : color;
  return <IconComponent size={size} color={iconColor} className={className} />;
};

export const AVAILABLE_ICONS = [
  'Utensils',
  'Car',
  'Zap',
  'HeartPulse',
  'ShoppingCart',
  'Film',
  'GraduationCap',
  'Home',
  'Plane',
  'Gift',
  'Briefcase',
  'Award',
  'TrendingUp',
  'PiggyBank',
  'Gamepad2',
  'Coffee',
  'Music',
  'Book',
  'Smile',
  'Shield',
  'Smartphone',
  'Camera',
  'Shirt',
  'Tag',
];

export const MONEFY_PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#9B5DE5',
  '#F15BB5',
  '#00BBF9',
  '#00F5D4',
  '#FF9F1C',
  '#2EC4B6',
  '#E71D36',
  '#3A86FF',
  '#8338EC',
  '#2ECC71',
  '#3498DB',
  '#E67E22',
  '#1ABC9C',
];
