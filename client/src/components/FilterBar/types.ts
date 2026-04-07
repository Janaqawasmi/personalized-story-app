export interface FilterOption {
  value: string;
  label: string;
  dotColor?: string;
  category?: string;
}

export interface ChipFilterGroup {
  type: "chips";
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface DropdownFilterGroup {
  type: "dropdown";
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  grouped?: boolean;
}

export type FilterGroup = ChipFilterGroup | DropdownFilterGroup;

export interface LockedFilter {
  label: string;
  dotColor?: string;
}

export interface FilterBarProps {
  lockedFilters?: LockedFilter[];
  groups: FilterGroup[];
  onClearAll?: () => void;
}
