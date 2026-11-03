'use client'

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, SlidersHorizontal, ArrowUpDown, Columns3, X } from "lucide-react"
import { FilterAdd } from "../../dashboard/components/FilterAdd"
import { SortSelection } from "../../dashboard/components/SortSelection"
import { FieldSelection } from "../../dashboard/components/FieldSelection"
import { cn } from "@/lib/utils"
import { enhanceFields } from '../../dashboard/utils/enhanceFields'

interface PlatformFilterBarProps {
  list: any
  showDisplayButton?: boolean
  selectedFields?: Set<string>
  // Legacy props — kept for API compat, no longer rendered
  customCreateButton?: React.ReactNode
  createMode?: 'button' | 'dropdown'
  onCreateClick?: (mode?: 'scratch' | 'popular') => void
  createLabel?: string
}

export function PlatformFilterBar({
  list,
  showDisplayButton = false,
  selectedFields = new Set(),
}: PlatformFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchString, setSearchString] = useState(searchParams?.get("search") || "")

  const enhancedFields = useMemo(() => enhanceFields(list.fields, list.key), [list.fields, list.key])

  const createQueryString = (params: Record<string, string | number | null | undefined>) => {
    const next = new URLSearchParams(searchParams?.toString() || "")
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") next.delete(key)
      else next.set(key, String(value))
    })
    return next.toString()
  }

  const updateSearch = (value: string) => {
    router.push(`${pathname}?${createQueryString({ search: value.trim() || null, page: 1 })}`)
  }

  useEffect(() => {
    setSearchString(searchParams?.get("search") || "")
  }, [searchParams])

  const searchableFields = Object.values(enhancedFields).filter(
    (field: any) => field.controller?.filter && Object.keys(field.controller.filter.types || {}).length > 0
  )
  const placeholder = searchableFields.length
    ? `Search by ${searchableFields.map((f: any) => f.label).join(", ").toLowerCase()}…`
    : "Search…"

  return (
    <div className="flex items-center gap-3">
      {/* Borderless search — takes all remaining space */}
      <form
        className="flex items-center gap-2 flex-1 min-w-0"
        onSubmit={(e) => { e.preventDefault(); updateSearch(searchString) }}
      >
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={searchString}
          onChange={(e) => setSearchString(e.target.value)}
          onBlur={() => updateSearch(searchString)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/50 focus:ring-0 h-9"
        />
        {searchString && (
          <button
            type="button"
            onClick={() => { setSearchString(''); updateSearch('') }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </form>

      {/* Segmented Filter / Sort / Display — sharp connected buttons */}
      <div className="flex items-center border border-border rounded overflow-hidden text-[10px] shrink-0">
        <FilterAdd list={list}>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 h-8 border-r border-border font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors"
          >
            <SlidersHorizontal size={11} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </FilterAdd>

        <SortSelection listMeta={list}>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors",
              showDisplayButton && "border-r border-border"
            )}
          >
            <ArrowUpDown size={11} />
            <span className="hidden sm:inline">Sort</span>
          </button>
        </SortSelection>

        {showDisplayButton && (
          <FieldSelection listMeta={list} selectedFields={selectedFields}>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 h-8 font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors"
            >
              <Columns3 size={11} />
              <span className="hidden sm:inline">Display</span>
            </button>
          </FieldSelection>
        )}
      </div>
    </div>
  )
}
