import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string; // Support for controlled mode
  onChange?: (id: string) => void;
  className?: string;
  contentClassName?: string;
  variant?: 'solid' | 'pills'; // Add variant support
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  defaultTab, 
  activeTab: controlledActiveTab,
  onChange,
  className = "", 
  contentClassName = "",
  variant = 'solid'
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (id: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(id);
    }
    if (onChange) {
      onChange(id);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* Tab Navigation */}
      <div className={`
        flex space-x-1 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-hide
        ${variant === 'solid' ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-slate-100/50'}
      `}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg whitespace-nowrap
              ${activeTab === tab.id 
                ? (variant === 'solid' ? 'text-white' : 'text-purple-600 bg-white shadow-sm') 
                : (variant === 'solid' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:bg-slate-200/50')}
            `}
          >
            {activeTab === tab.id && variant === 'solid' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`relative min-h-[200px] ${contentClassName}`}>
        <AnimatePresence mode="wait">
          {tabs.map((tab) => (
            tab.id === activeTab && (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {tab.content}
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
