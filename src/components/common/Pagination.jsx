import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn--outline btn--sm"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={14} /> Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pill${p === page ? ' pill--active' : ''}`}
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className="btn btn--outline btn--sm"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
      >
        Next <ChevronRight size={14} />
      </button>
    </nav>
  )
}