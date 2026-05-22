import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type AdminPaginationProps = {
  disabled?: boolean;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
};

function getPaginationItems(currentPage: number, pageCount: number) {
  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
  const visible = Array.from(pages)
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((a, b) => a - b);

  return visible.reduce<Array<number | string>>((result, pageNumber, index) => {
    const previous = visible[index - 1];
    if (previous && pageNumber - previous > 1) {
      result.push(`ellipsis-${previous}`);
    }
    result.push(pageNumber);
    return result;
  }, []);
}

export function AdminPagination({ disabled, onPageChange, page, pageCount }: AdminPaginationProps) {
  return (
    <Pagination className="pagination-control">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious disabled={disabled || page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} type="button" />
        </PaginationItem>
        {getPaginationItems(page, pageCount).map((item) => (
          <PaginationItem key={item}>
            {typeof item === "number" ? (
              <PaginationButton
                aria-label={`Go to page ${item}`}
                disabled={disabled}
                isActive={item === page}
                onClick={() => onPageChange(item)}
                type="button"
              >
                {item}
              </PaginationButton>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext disabled={disabled || page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))} type="button" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
