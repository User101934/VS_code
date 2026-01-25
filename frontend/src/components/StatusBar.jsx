import React from "react";
import {
    GitBranch,
    Bell,
    Loader2,
    XCircle,
    AlertTriangle,
    Save
} from "lucide-react";
import "./statusBar.css";

export default function StatusBar({
    language = "Plain Text",
    isExecuting = false,
    isSaving = false
}) {
    return (
        <div className="status-bar">
            {/* Left */}
            <div className="status-left">
                <div className="status-item branch">
                    <GitBranch size={14} />
                    <span>main*</span>
                </div>

                <div className="status-item errors">
                    <XCircle size={14} />
                    <span>0</span>
                    <AlertTriangle size={14} />
                    <span>0</span>
                </div>

                {isExecuting && (
                    <div className="status-item execution">
                        <Loader2 size={14} className="spin" />
                        <span>Running...</span>
                    </div>
                )}

                {isSaving && (
                    <div className="status-item saving">
                        <Save size={14} className="pulse" />
                        <span>Auto-saving...</span>
                    </div>
                )}
            </div>

            {/* Right */}
            <div className="status-right">
                <div className="status-item">Ln 1, Col 1</div>
                <div className="status-item">Spaces: 4</div>
                <div className="status-item">UTF-8</div>
                <div className="status-item">{language}</div>
                <div className="status-item">
                    <Bell size={12} />
                </div>
            </div>
        </div>
    );
}
