import Icon from '../Icon';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryGridProps {
  categories: Category[];
  onSelectCategory: (id: string) => void;
  selectedCategoryId: string | null;
}

export default function CategoryGrid({
  categories,
  onSelectCategory,
  selectedCategoryId,
}: CategoryGridProps) {
  return (
    <div className="categories-area">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: '50px',
            border: `2px solid ${selectedCategoryId === cat.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: 'var(--color-background)',
            color:
              selectedCategoryId === cat.id
                ? 'var(--color-primary)'
                : 'var(--color-text)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name={cat.icon} style={{ width: '20px', height: '20px' }} />
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
}
