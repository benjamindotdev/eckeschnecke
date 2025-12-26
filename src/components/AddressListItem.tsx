import { X, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Address } from './AddressInput';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AddressListItemProps {
  address: Address;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function AddressListItem({ 
  address, 
  index, 
  isFirst, 
  isLast, 
  onRemove, 
  onMoveUp, 
  onMoveDown 
}: AddressListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: address.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center justify-between p-3 bg-muted rounded-md border border-border gap-2 ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
    >
      <button 
        className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...attributes} 
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="text-sm flex-1 min-w-0">
        <div className="font-medium text-foreground truncate" title={address.fullAddress}>
          {index + 1}. {address.fullAddress}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
          aria-label="Move up"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
          aria-label="Move down"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(address.id)}
          className="p-1 text-destructive hover:text-destructive/80 transition-colors ml-1"
          aria-label="Remove address"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
