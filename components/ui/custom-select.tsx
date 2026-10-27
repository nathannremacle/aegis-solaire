'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface CustomSelectOption {
  value: string
  label: string
  badge?: string | number
  badgeClass?: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  icon?: React.ComponentType<{ className?: string }>
  placeholder?: string
  ariaLabel?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'end' | 'center'
  size?: 'sm' | 'default'
  disabled?: boolean
}

/**
 * Composant de sélection / banderole déroulante haut de gamme Aegis Solaire.
 * Remplace les balises <select> natives d'OS en garantissant :
 * - Un style identique au bouton (rounded-xl, border-border, bg-card, shadow-2xs)
 * - Une popover / banderole harmonisée (rounded-2xl, border-border, bg-card, shadow-xl)
 * - Des options avec micro-transitions, survol slate doux et indicateur de sélection
 * - Rendu via Portal pour éviter tout rognage dans les conteneurs overflow-hidden / tableaux
 */
export function CustomSelect({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder = 'Sélectionner...',
  ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  align = 'start',
  size = 'default',
  disabled = false,
}: CustomSelectProps) {
  const selectedOption = options.find((o) => o.value === value) || options[0]

  return (
    <div className={cn('relative inline-block', className)}>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          size={size}
          aria-label={ariaLabel || selectedOption?.label}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary/70 h-9 px-3 text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer select-none',
            size === 'sm' && 'h-7 sm:h-8 px-2.5 text-xs rounded-lg',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
        </SelectTrigger>
        <SelectContent
          align={align}
          className={cn('min-w-[200px]', contentClassName)}
        >
          {options.map((option) => {
            const OptionIcon = option.icon
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {OptionIcon && (
                      <OptionIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {option.badge !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums shrink-0 ml-auto',
                        option.badgeClass || 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {option.badge}
                    </span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
