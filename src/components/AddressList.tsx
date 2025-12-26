import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Address } from './AddressInput';
import AddressListItem from './AddressListItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface AddressListProps {
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
}

export default function AddressList({ addresses, setAddresses }: AddressListProps) {
  const [parent] = useAutoAnimate();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRemove = (id: string) => {
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === addresses.length - 1) return;

    const newAddresses = [...addresses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newAddresses[index], newAddresses[targetIndex]] = [newAddresses[targetIndex], newAddresses[index]];
    setAddresses(newAddresses);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = addresses.findIndex((item) => item.id === active.id);
      const newIndex = addresses.findIndex((item) => item.id === over.id);
      
      setAddresses(arrayMove(addresses, oldIndex, newIndex));
    }
  };

  if (addresses.length === 0) {
    return null;
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={addresses.map(a => a.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2" ref={parent}>
          {addresses.map((addr, index) => (
            <AddressListItem 
              key={addr.id} 
              address={addr} 
              index={index}
              isFirst={index === 0}
              isLast={index === addresses.length - 1}
              onRemove={handleRemove}
              onMoveUp={() => handleMove(index, 'up')}
              onMoveDown={() => handleMove(index, 'down')}
            />
          ))}
          {addresses.length > 2 && (
            <button
              onClick={() => setAddresses([])}
              className="w-full py-2 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-md transition-colors border border-transparent hover:border-destructive/20"
            >
              Clear all
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
