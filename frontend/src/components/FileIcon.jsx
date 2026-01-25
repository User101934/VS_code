import React from 'react';
import {
    FileCode,
    FileJson,
    FileText,
    Image,
    File as FileIconDefault,
    Activity,
    Box,
    Coffee,
    Hash,
    Terminal,
    ChevronRight
} from 'lucide-react';

const EXTENSION_MAP = {
    'js': { icon: FileCode, color: '#f7df1e' },
    'jsx': { icon: FileCode, color: '#61dafb' },
    'ts': { icon: FileCode, color: '#3178c6' },
    'tsx': { icon: FileCode, color: '#3178c6' },
    'py': { icon: Activity, color: '#3776ab' }, // Using Activity as a placeholder for Python snake-like feel or just FileCode
    'java': { icon: Coffee, color: '#f8981d' },
    'c': { icon: FileCode, color: '#a8b9cc' },
    'cpp': { icon: FileCode, color: '#00599c' },
    'cs': { icon: Hash, color: '#178600' },
    'go': { icon: Box, color: '#00add8' },
    'rs': { icon: Box, color: '#dea584' },
    'php': { icon: FileCode, color: '#777bb4' },
    'rb': { icon: FileCode, color: '#701516' },
    'swift': { icon: FileCode, color: '#ffac45' },
    'kt': { icon: FileCode, color: '#b125ea' },
    'scala': { icon: FileCode, color: '#dc322f' },
    'sh': { icon: Terminal, color: '#4eaa25' },
    'ps1': { icon: Terminal, color: '#012456' },
    'html': { icon: FileCode, color: '#e34c26' },
    'css': { icon: FileCode, color: '#1572b6' },
    'json': { icon: FileJson, color: '#cbcb41' },
    'md': { icon: FileText, color: '#0083ff' },
    'png': { icon: Image, color: '#a074c4' },
    'jpg': { icon: Image, color: '#a074c4' },
    'jpeg': { icon: Image, color: '#a074c4' },
    'svg': { icon: Image, color: '#ffb13b' },
};

// Override specifically for Python to look more iconic
const PythonIcon = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.897 2C8.611 2 8.835 3.424 8.835 3.424l.006 1.428h3.136v.44h-4.39s-2.028-.235-2.028 2.029v3.085s-.1 1.933 1.83 1.933h1.093v-1.545c0-1.745 1.503-1.649 1.503-1.649h3.048s1.603.018 1.603-1.523V5.539s.215-2.029-2.24-2.029h-2.399V2zm-2.016 1.012a.534.534 0 0 1 .533.534.534.534 0 0 1-.533.533.534.534 0 0 1-.534-.533.534.534 0 0 1 .534-.534z" fill={color || "#3776AB"} />
        <path d="M12.103 22c3.286 0 3.062-1.424 3.062-1.424l-.006-1.428h-3.136v-.44h4.39s2.028.235 2.028-2.029v-3.085s.1-1.933-1.83-1.933H15.52v1.545c0 1.745-1.503 1.649-1.503 1.649h-3.048s-1.603-.018-1.603 1.523v2.083s-.215 2.029 2.24 2.029h2.399V22zm2.016-1.012a.534.534 0 0 0-.533-.534.534.534 0 0 0 .533-.533.534.534 0 0 0 .534.533.534.534 0 0 0-.534.534z" fill={color || "#FFD343"} />
    </svg>
);

export default function FileIcon({ name, size = 16, isDir = false, isOpen = false }) {
    if (isDir) return null; // Folders are handled by FileTreeItem with specific icons

    const ext = name.split('.').pop().toLowerCase();
    const config = EXTENSION_MAP[ext];

    if (ext === 'py') {
        return <PythonIcon size={size} />;
    }

    if (config) {
        const Icon = config.icon;
        return <Icon size={size} color={config.color} />;
    }

    return <FileIconDefault size={size} color="#858585" />;
}
