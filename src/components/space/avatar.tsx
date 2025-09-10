
import { motion } from 'framer-motion';
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '../ui/badge';

type AvatarProps = {
  x: number;
  y: number;
  name: string;
  status?: string;
  isPlayer?: boolean;
  src?: string;
};

export function Avatar({ x, y, name, status, isPlayer = false, src }: AvatarProps) {
  const size = 48; // Corresponds to h-12 w-12
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      initial={{ x, y }}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: size,
        height: size + 20,
      }}
    >
      <UiAvatar className="h-12 w-12 border-2" style={{ borderColor: isPlayer ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
        <AvatarImage src={src} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </UiAvatar>
      <div className="mt-1 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium shadow">
        {name}
        {status && <Badge variant="secondary" className="px-1 text-[10px]">{status}</Badge>}
      </div>
    </motion.div>
  );
}
