import { useState, useRef, useEffect, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductTemplates } from "@/hooks/use-products";

export interface ProductTemplateSlim {
  id: number;
  name: string;
  categoryId: number | null;
  supplierId: number | null;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  lastPurchasePrice: string | null;
  usageCount: number;
  category?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
}

interface ProductComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onTemplateSelect?: (template: ProductTemplateSlim) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductCombobox({
  value,
  onChange,
  onTemplateSelect,
  placeholder = "Buscar o escribir producto...",
  disabled = false,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data: templates = [], isLoading } = useProductTemplates(
    debouncedSearch.length >= 1 ? debouncedSearch : undefined
  );

  // Reset search when popover opens
  useEffect(() => {
    if (open) {
      setSearch(value || "");
    }
  }, [open, value]);

  const handleSelect = useCallback(
    (template: ProductTemplateSlim) => {
      onChange(template.name);
      onTemplateSelect?.(template);
      setOpen(false);
      setSearch(template.name);
    },
    [onChange, onTemplateSelect]
  );

  const handleInputChange = useCallback(
    (val: string) => {
      onChange(val);
      setSearch(val);
      // If user clears, open popover
      if (!val) setOpen(true);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
            data-testid="input-product-combobox"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setOpen(!open)}
            type="button"
          >
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar producto..."
            value={search}
            onValueChange={handleInputChange}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : search.length >= 1 ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground">No se encontraron templates</p>
                  <p className="text-xs text-muted-foreground/70">
                    Se creará como nuevo producto: "{search}"
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Escribe para buscar productos existentes</p>
              )}
            </CommandEmpty>

            {templates.length > 0 && !isLoading && (
              <CommandGroup heading="Productos existentes">
                {templates.map((template: ProductTemplateSlim) => (
                  <CommandItem
                    key={template.id}
                    value={template.name}
                    onSelect={() => handleSelect(template)}
                    className="flex items-center gap-2"
                  >
                    {(template as any).images && (template as any).images.length > 0 ? (
                      <img src={(template as any).images[0]} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[template.brand, template.category?.name, template.supplier?.name]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalles"}
                      </p>
                    </div>
                    {template.usageCount > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        usado {template.usageCount}x
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
