'use client'

import * as React from 'react'
import { ChevronRight, ChevronDown, Shield, ShieldCheck, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FB_PERMISSIONS, FB_PERMISSIONS_DONT_LIST } from '@/lib/constants'

export function PermissionsDisclosure() {
  const [isOpen, setIsOpen] = React.useState(false)

  const requiredPermissions = FB_PERMISSIONS.filter((p) => p.required)
  const optionalPermissions = FB_PERMISSIONS.filter((p) => !p.required)

  if (!FB_PERMISSIONS.length) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="p-4">
        {/* Header - always visible */}
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Jaká oprávnění potřebujeme?
              </h3>
              <Badge variant="outline" className="text-xs">
                {FB_PERMISSIONS.length} oprávnění
              </Badge>
            </div>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Pro analýzu vaší stránky potřebujeme přístup k těmto datům z Facebooku.
            </p>
          </div>
        </div>

        {/* Toggle button - WCAG AA compliant (min 44px touch target) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-blue-700 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-blue-300 dark:hover:bg-blue-900/30"
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {isOpen ? 'Skrýt podrobnosti oprávnění' : 'Zobrazit podrobnosti oprávnění'}
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="mt-4 space-y-4">
            {/* Required permissions */}
            <div className="space-y-3">
              {requiredPermissions.map((permission) => (
                <div key={permission.id} className="flex items-start gap-3">
                  <permission.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        {permission.title}
                      </span>
                      <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {permission.id}
                      </code>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {permission.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional permissions */}
            {optionalPermissions.length > 0 && (
              <div className="space-y-3 border-t border-blue-200 pt-3 dark:border-blue-800">
                <div className="text-xs font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">
                  Volitelné
                </div>
                {optionalPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-start gap-3">
                    <permission.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {permission.title}
                        </span>
                        <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {permission.id}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Volitelné
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        {permission.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* What we DON'T do section */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  Co s vašimi daty NEděláme
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {FB_PERMISSIONS_DONT_LIST.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
