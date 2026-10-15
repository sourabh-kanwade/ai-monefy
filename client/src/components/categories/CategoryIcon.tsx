import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className,
}) => {
  // Normalize icon name (e.g. Utensils, utensils, car -> Car)
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  const IconComponent = (Icons as Record<string, any>)[normalizedName] || Icons.Tag;

  return <IconComponent size={size} color={color} className={className} />;
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
