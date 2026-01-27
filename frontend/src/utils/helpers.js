import { LANGUAGES } from '../config/languages';

export const getFileLanguage = (filename) => {
    if (!filename) return 'text';
    const ext = filename.split('.').pop()?.toLowerCase();
    const lang = Object.keys(LANGUAGES).find(lang => LANGUAGES[lang].ext === ext);
    return lang || 'text';
};

export const getFileIcon = (filename) => {
    const lang = getFileLanguage(filename);
    return LANGUAGES[lang]?.icon || '📄';
};

export const generateId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const stripAnsi = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};
