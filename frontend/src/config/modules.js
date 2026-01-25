import React from 'react';
import { Files, Search, GitBranch, Database, LayoutGrid } from 'lucide-react';

/**
 * Registry of all available sidebar modules in the IDE.
 * New modules can be added by pushing to this array or updating the state.
 */
export const CORE_MODULES = [
    {
        id: 'explorer',
        title: 'Explorer',
        icon: Files,
        component: 'Explorer' // String identifier or the component itself
    },
    {
        id: 'search',
        title: 'Search',
        icon: Search,
        component: 'Search'
    },
    {
        id: 'git',
        title: 'Source Control',
        icon: GitBranch,
        component: 'Git'
    },
    {
        id: 'database',
        title: 'Database Explorer',
        icon: Database,
        component: 'Database'
    },
    {
        id: 'extensions',
        title: 'Extensions',
        icon: LayoutGrid,
        component: 'Extensions'
    }
];

export default CORE_MODULES;
