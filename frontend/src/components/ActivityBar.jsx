import React from 'react';
import { Files, Search, GitBranch, Bug, LayoutGrid, Settings, UserCircle, Database } from 'lucide-react';
import './activityBar.css';

export default function ActivityBar({ activeView, onViewChange, modules = [] }) {
    return (
        <div className="activity-bar">
            {/* Top Actions */}
            <div className="activity-bar-top">
                {modules.map(mod => (
                    <ActivityItem
                        key={mod.id}
                        icon={mod.icon}
                        active={activeView === mod.id}
                        onClick={() => onViewChange(mod.id)}
                        title={mod.title}
                    />
                ))}
                <ActivityItem icon={Bug} title="Run and Debug" />
            </div>

            {/* Bottom Actions */}
            <div className="activity-bar-bottom">
                <ActivityItem icon={UserCircle} title="Accounts" />
                <ActivityItem icon={Settings} title="Settings" />
            </div>
        </div>
    );
}

function ActivityItem({ icon: Icon, active, onClick, title }) {
    return (
        <div
            className={`activity-item ${active ? 'active' : ''}`}
            onClick={onClick}
            title={title}
        >
            {active && <div className="active-indicator" />}
            <Icon size={24} />
        </div>
    );
}

