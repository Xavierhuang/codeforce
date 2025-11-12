'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        'bg-background rounded-lg sm:rounded-xl shadow-lg w-full max-w-md mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h2 className={cn('text-2xl font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}

export function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-2', className)} {...props}>
      {children}
    </p>
  )
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div className={cn('mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogClose({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-2 top-2 sm:right-4 sm:top-4 h-8 w-8 sm:h-10 sm:w-10 touch-manipulation"
      onClick={() => onOpenChange(false)}
    >
      <X className="h-4 w-4 sm:h-5 sm:w-5" />
    </Button>
  )
}

interface DialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  return <>{children}</>
}

