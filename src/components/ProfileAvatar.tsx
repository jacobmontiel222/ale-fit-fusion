import { getAvatarIcon } from "./AvatarSelector";

interface ProfileAvatarProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', icon: 'w-6 h-6' },
  md: { container: 'w-20 h-20', icon: 'w-12 h-12' },
  lg: { container: 'w-28 h-28', icon: 'w-20 h-20' },
};

export const ProfileAvatar = ({ icon, color, size = 'lg', className = '' }: ProfileAvatarProps) => {
  const IconComponent = getAvatarIcon(icon);
  const sizes = sizeMap[size];
  
  return (
    <div 
      className={`${sizes.container} rounded-full flex items-center justify-center bg-card border-2 ${className}`}
      style={{ borderColor: color }}
    >
      <IconComponent 
        className={sizes.icon}
        style={{ color }}
        fill={color}
      />
    </div>
  );
};
