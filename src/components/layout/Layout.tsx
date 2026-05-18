import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { LayoutProvider, useLayout } from './LayoutContext'
import { cn } from '../../lib/utils'

const LayoutContent: React.FC = () => {
  const { isCollapsed } = useLayout()

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isCollapsed ? "md:ml-sidebar-collapsed" : "md:ml-sidebar"
        )}
      >
        <TopBar />
        
        <main className="flex-1 p-6 md:p-8 max-w-container-max mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const Layout: React.FC = () => {
  return (
    <LayoutProvider>
      <LayoutContent />
    </LayoutProvider>
  )
}
